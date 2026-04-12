import { eq, and, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import pino from "pino"
import { runWithAdapter } from "../lib/runtime.js"

const logger = pino({ level: "info" })

/**
 * 케이스가 `done` 으로 전환될 때 오케스트레이터 에이전트의 메모리를 실시간 갱신한다.
 *
 * - 학생 관련 케이스 → studentInsights[studentName] 갱신 (2-3줄 요약)
 * - 전체 → lastInsight 갱신 (오늘의 가장 중요한 판단 1줄)
 * - monthlyStats 자동 증가
 *
 * 실패해도 케이스 완료 흐름은 계속 (best-effort).
 */
export async function updateOrchestratorMemoryOnCaseDone(
  db: Db,
  caseId: string,
): Promise<void> {
  try {
    const [caseRecord] = await db
      .select()
      .from(schema.cases)
      .where(eq(schema.cases.id, caseId))
    if (!caseRecord || caseRecord.status !== "done") return

    // 조직의 오케스트레이터 에이전트 찾기
    const [orchestrator] = await db
      .select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.organizationId, caseRecord.organizationId),
          eq(schema.agents.agentType, "orchestrator"),
        ),
      )
    if (!orchestrator) return

    // 학생 정보 (있으면)
    let studentName: string | null = null
    if (caseRecord.studentId) {
      const [student] = await db
        .select({ name: schema.students.name })
        .from(schema.students)
        .where(eq(schema.students.id, caseRecord.studentId))
      studentName = student?.name ?? null
    }

    // 최근 완료 케이스 5건 (맥락)
    const recentDone = await db
      .select()
      .from(schema.cases)
      .where(
        and(
          eq(schema.cases.organizationId, caseRecord.organizationId),
          eq(schema.cases.status, "done"),
        ),
      )
      .orderBy(desc(schema.cases.updatedAt))
      .limit(5)

    // 현재 메모리
    const currentMemory =
      typeof orchestrator.memory === "object" && orchestrator.memory && !Array.isArray(orchestrator.memory)
        ? (orchestrator.memory as Record<string, unknown>)
        : {}
    const studentInsights =
      typeof currentMemory.studentInsights === "object" && currentMemory.studentInsights && !Array.isArray(currentMemory.studentInsights)
        ? (currentMemory.studentInsights as Record<string, string>)
        : {}
    const monthlyStats =
      typeof currentMemory.monthlyStats === "object" && currentMemory.monthlyStats && !Array.isArray(currentMemory.monthlyStats)
        ? (currentMemory.monthlyStats as Record<string, number>)
        : { resolvedCases: 0, pendingCases: 0, escalatedCases: 0 }

    // LLM 요약 호출
    const adapterConfig =
      typeof orchestrator.adapterConfig === "object" && orchestrator.adapterConfig && !Array.isArray(orchestrator.adapterConfig)
        ? (orchestrator.adapterConfig as Record<string, unknown>)
        : {}

    // 조직 API 키 로드 (BYO)
    const [org] = await db
      .select({ agentTeamConfig: schema.organizations.agentTeamConfig })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, caseRecord.organizationId))
    const orgConfig = (org?.agentTeamConfig as Record<string, unknown> | null) ?? {}
    const aiPolicy = (orgConfig.aiPolicy as Record<string, unknown> | undefined) ?? {}
    const apiKey = typeof aiPolicy.apiKey === "string" && aiPolicy.apiKey.length > 0 ? aiPolicy.apiKey : undefined

    const systemPrompt = `당신은 학원 운영 오케스트레이터 AI입니다. 방금 완료된 케이스와 최근 이력을 보고, 원장에게 전달할 인사이트를 업데이트합니다.
응답은 반드시 순수 JSON 객체로만 출력 (설명/코드펜스 금지). 형식:
{
  "studentInsight": "<해당 학생 관련 2-3줄 요약 or null>",
  "lastInsight": "<오늘 가장 중요한 운영 판단 1줄>"
}`

    const userMessage = JSON.stringify(
      {
        justCompleted: {
          title: caseRecord.title,
          type: caseRecord.type,
          severity: caseRecord.severity,
          agentDraft: caseRecord.agentDraft,
          studentName,
        },
        recent: recentDone.slice(0, 5).map((c) => ({ title: c.title, type: c.type })),
        previousStudentInsight: studentName ? studentInsights[studentName] ?? null : null,
      },
      null,
      2,
    )

    let studentInsight: string | null = null
    let lastInsight = "최근 완료 케이스를 기반으로 이번 주 운영 이슈를 검토했습니다."

    try {
      const response = await runWithAdapter(systemPrompt, userMessage, {
        adapterType: typeof adapterConfig.adapterType === "string" ? adapterConfig.adapterType : (orchestrator.adapterType ?? "mock_local"),
        model: typeof adapterConfig.model === "string" ? adapterConfig.model : "gpt-5-codex",
        apiKey,
        maxTokens: 400,
      })
      const parsed = JSON.parse(response.content.trim()) as {
        studentInsight?: string | null
        lastInsight?: string
      }
      studentInsight = parsed.studentInsight ?? null
      if (parsed.lastInsight) lastInsight = parsed.lastInsight
    } catch (err) {
      logger.warn({ err: String(err), caseId }, "orchestrator memory LLM update failed — using heuristic fallback")
      // fallback: 결정론적 요약
      studentInsight = studentName
        ? `${caseRecord.title.slice(0, 50)} 처리 완료 (${caseRecord.severity})`
        : null
      lastInsight = `"${caseRecord.title.slice(0, 40)}..." ${caseRecord.type} 케이스 완료. 후속 모니터링 필요 여부 확인.`
    }

    // 메모리 조립
    const nextStudentInsights = { ...studentInsights }
    if (studentName && studentInsight) {
      nextStudentInsights[studentName] = studentInsight
    }
    const nextMemory = {
      ...currentMemory,
      studentInsights: nextStudentInsights,
      monthlyStats: {
        ...monthlyStats,
        resolvedCases: (monthlyStats.resolvedCases ?? 0) + 1,
      },
      lastInsight,
      updatedAt: new Date().toISOString(),
    }

    await db
      .update(schema.agents)
      .set({ memory: nextMemory, updatedAt: new Date() })
      .where(eq(schema.agents.id, orchestrator.id))

    await db.insert(schema.activityEvents).values({
      organizationId: caseRecord.organizationId,
      actorType: "system",
      actorId: orchestrator.id,
      action: "agent.memory_updated",
      entityType: "agent",
      entityId: orchestrator.id,
      entityTitle: `${orchestrator.name} memory updated`,
      metadata: {
        caseId,
        caseTitle: caseRecord.title,
        studentName,
        lastInsight,
      } as Record<string, unknown>,
    })

    logger.info(
      { caseId, orchestratorId: orchestrator.id, studentName },
      "Orchestrator memory updated after case completion",
    )
  } catch (error) {
    logger.warn(
      { err: String(error), caseId },
      "Orchestrator memory update failed (non-fatal)",
    )
  }
}
