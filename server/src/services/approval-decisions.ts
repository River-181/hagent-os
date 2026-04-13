import { mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "./live-events.js"
import { syncGoogleCalendarEvent } from "./integrations/google-calendar.js"
import { processKakaoApprovalDelivery } from "./kakao-approval-delivery.js"
import { processTelegramApprovalDelivery } from "./telegram-approval-delivery.js"

const AGENT_DATA_DIR = join(import.meta.dirname, "../../data/agents")

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function buildSoulMd(name: string, agentType: string): string {
  const roleDescriptions: Record<string, string> = {
    orchestrator: "전체 운영을 조율하고 다른 에이전트에게 작업을 위임하는 오케스트레이터 역할",
    complaint: "학생 및 학부모의 불만 사항을 접수하고 처리하는 고충 처리 역할",
    retention: "학생 이탈 방지와 재등록 유도를 위한 리텐션 관리 역할",
    scheduler: "수업 일정과 강사 스케줄을 효율적으로 관리하는 스케줄러 역할",
    intake: "신규 학생 등록 및 초기 상담을 담당하는 인테이크 역할",
    staff: "학원 직원으로서 일반 행정 및 운영 업무를 지원하는 역할",
    compliance: "규정 준수 및 내부 정책 이행을 감독하는 컴플라이언스 역할",
    notification: "학생, 학부모, 직원에게 중요한 알림을 전달하는 알림 담당 역할",
  }

  const role = roleDescriptions[agentType] ?? `${agentType}에 해당하는 역할`

  return `# ${name}

## 역할
${role}

## 원칙
- 학원 운영의 효율성을 최우선으로 합니다
- 모든 판단은 학생과 학부모의 이익을 고려합니다
- 불확실한 사안은 반드시 원장에게 보고합니다
`
}

export async function processApprovalDecision(
  db: Db,
  approvalId: string,
  decision: "approved" | "rejected" | "revision_requested",
  comment?: string,
) {
  const [existing] = await db
    .select()
    .from(schema.approvals)
    .where(eq(schema.approvals.id, approvalId))

  if (!existing) {
    throw new Error("Approval not found")
  }

  let decisionPayload: Record<string, unknown> = comment ? { comment } : {}

  await db
    .update(schema.approvals)
    .set({
      status: decision,
      decidedBy: "board",
      decidedAt: new Date(),
      decision: decisionPayload,
      updatedAt: new Date(),
    })
    .where(eq(schema.approvals.id, approvalId))
    .returning()

  let caseIdentifier: string | null = null
  let caseRecord: typeof schema.cases.$inferSelect | null = null
  if (existing.caseId) {
    const [foundCase] = await db
      .select()
      .from(schema.cases)
      .where(eq(schema.cases.id, existing.caseId))
    caseRecord = foundCase ?? null
    caseIdentifier = foundCase?.identifier ?? null
  }

  const payload = isPlainObject(existing.payload) ? existing.payload : null
  if (decision === "approved" && payload?.type === "agent_hire") {
    const hireName = payload.name as string
    const hireAgentType = payload.agentType as string
    const hireReportsTo = payload.reportsTo as string | undefined
    const hireSlug = hireName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

    const [newAgent] = await db
      .insert(schema.agents)
      .values({
        organizationId: existing.organizationId,
        name: hireName,
        slug: hireSlug,
        agentType: hireAgentType as (typeof schema.agentTypeEnum.enumValues)[number],
        ...(hireReportsTo ? { reportsTo: hireReportsTo } : {}),
      })
      .returning()

    const agentDir = join(AGENT_DATA_DIR, newAgent.id)
    mkdirSync(agentDir, { recursive: true })
    writeFileSync(join(agentDir, "SOUL.md"), buildSoulMd(hireName, hireAgentType), "utf-8")

    publishEvent(existing.organizationId, "agent.hired", {
      agentId: newAgent.id,
      name: hireName,
      agentType: hireAgentType,
      approvalId: existing.id,
    })

    decisionPayload = {
      ...decisionPayload,
      sideEffects: {
        ...(decisionPayload.sideEffects as Record<string, unknown> | undefined),
        agentHire: {
          status: "created",
          agentId: newAgent.id,
        },
      },
    }
  }

  let requiresOutboundDelivery = false
  if (decision === "approved" && existing.caseId) {
    if (caseRecord?.source === "kakao" || caseRecord?.source === "telegram") {
      requiresOutboundDelivery = true
    }

    if (caseRecord?.type === "schedule") {
      const schedulePayload = payload?.suggestedSchedule as Record<string, unknown> | undefined
      if (schedulePayload) {
        const [createdSchedule] = await db
          .insert(schema.schedules)
          .values({
            organizationId: existing.organizationId,
            title: String(schedulePayload.title ?? caseRecord?.title ?? "상담 일정"),
            type: String(schedulePayload.type ?? "special"),
            dayOfWeek: Number(schedulePayload.dayOfWeek ?? 2),
            startTime: String(schedulePayload.startTime ?? "18:30"),
            endTime: String(schedulePayload.endTime ?? "19:00"),
            room: schedulePayload.room ? String(schedulePayload.room) : "상담실",
          })
          .returning()

        if (caseRecord?.studentId) {
          await db.insert(schema.studentSchedules).values({
            organizationId: existing.organizationId,
            studentId: caseRecord.studentId,
            scheduleId: createdSchedule.id,
          })
        }

        const calendarSync = await syncGoogleCalendarEvent({
          title: createdSchedule.title,
          description: caseRecord?.description ?? null,
          location: createdSchedule.room ?? null,
          dayOfWeek: createdSchedule.dayOfWeek,
          startTime: createdSchedule.startTime,
          endTime: createdSchedule.endTime,
        })

        decisionPayload = {
          ...decisionPayload,
          sideEffects: {
            ...(decisionPayload.sideEffects as Record<string, unknown> | undefined),
            googleCalendar: {
              ...calendarSync,
              scheduleId: createdSchedule.id,
              schedule: {
                id: createdSchedule.id,
                title: createdSchedule.title,
                type: createdSchedule.type,
                dayOfWeek: createdSchedule.dayOfWeek,
                startTime: createdSchedule.startTime,
                endTime: createdSchedule.endTime,
                room: createdSchedule.room,
              },
            },
          },
        }

        await db.insert(schema.activityEvents).values({
          organizationId: existing.organizationId,
          actorType: "system",
          actorId: "google-calendar",
          action: `integration.calendar_${calendarSync.status}`,
          entityType: "schedule",
          entityId: createdSchedule.id,
          entityTitle: createdSchedule.title,
          metadata: {
            approvalId: existing.id,
            caseId: existing.caseId,
            ...calendarSync,
          },
        })
      }
    }

    if (!requiresOutboundDelivery) {
      await db
        .update(schema.cases)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(schema.cases.id, existing.caseId))

      const { updateOrchestratorMemoryOnCaseDone } = await import("./agent-memory-update.js")
      void updateOrchestratorMemoryOnCaseDone(db, existing.caseId)
    }
  }

  if (decision === "rejected" && existing.caseId) {
    await db
      .update(schema.cases)
      .set({ status: "todo", updatedAt: new Date() })
      .where(eq(schema.cases.id, existing.caseId))
  }

  const entityTitle = caseIdentifier
    ? `approval ${decision} on case ${caseIdentifier}`
    : `approval ${decision}`

  if (Object.keys(decisionPayload).length > 0) {
    await db
      .update(schema.approvals)
      .set({
        decision: decisionPayload,
        updatedAt: new Date(),
      })
      .where(eq(schema.approvals.id, approvalId))
  }

  await db.insert(schema.activityEvents).values({
    organizationId: existing.organizationId,
    actorType: "board",
    actorId: "board",
    action: `approval.${decision}`,
    entityType: "approval",
    entityId: existing.id,
    entityTitle,
    metadata: comment ? { comment } : {},
  })

  publishEvent(existing.organizationId, "approval.decided", {
    approvalId: existing.id,
    caseId: existing.caseId ?? null,
    decision,
    comment: comment ?? null,
  })

  let [latest] = await db
    .select()
    .from(schema.approvals)
    .where(eq(schema.approvals.id, approvalId))

  if (decision === "approved" && caseRecord?.source === "kakao") {
    latest = await processKakaoApprovalDelivery(db, approvalId, {
      mode: "auto",
      actor: "system",
    })
  } else if (decision === "approved" && caseRecord?.source === "telegram") {
    latest = await processTelegramApprovalDelivery(db, approvalId, {
      mode: "auto",
      actor: "system",
    })
  }

  return latest
}
