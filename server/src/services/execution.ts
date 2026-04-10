import pino from "pino"
import { eq, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "./live-events.js"
import { runOrchestrator } from "../lib/agents/orchestrator.js"
import { runComplaintAgent } from "../lib/agents/complaint.js"
import { runRetentionAgent } from "../lib/agents/retention.js"
import { runSchedulerAgent } from "../lib/agents/scheduler.js"

const logger = pino({ level: "info" })

export interface ExecuteAgentRunOpts {
  organizationId: string
  agentId: string
  caseId: string
  agentType: string
  approvalLevel: number
}

export async function executeAgentRun(
  db: Db,
  opts: ExecuteAgentRunOpts,
): Promise<{ runId: string }> {
  const { organizationId, agentId, caseId, agentType, approvalLevel } = opts
  const [agent] = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.id, agentId))

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  // 1. Create AgentRun (queued)
  const [run] = await db
    .insert(schema.agentRuns)
    .values({
      organizationId,
      agentId,
      caseId,
      status: "queued",
      approvalLevel,
      input: {
        caseId,
        agentType,
      } as Record<string, unknown>,
    })
    .returning()

  const runId = run.id

  // 2. Publish queued event
  publishEvent(organizationId, "agent.run.queued", {
    runId,
    agentId,
    caseId,
    agentType,
  })
  await db.insert(schema.activityEvents).values({
    organizationId,
    actorType: "system",
    actorId: agentId,
    action: "run.queued",
    entityType: "agent_run",
    entityId: runId,
    entityTitle: `${agent.name} queued`,
    metadata: { caseId, agentType } as Record<string, unknown>,
  })

  try {
    // 3. Update to running
    await db
      .update(schema.agentRuns)
      .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.agentRuns.id, runId))

    publishEvent(organizationId, "agent.run.started", {
      runId,
      agentId,
      caseId,
      agentType,
    })
    await db.insert(schema.activityEvents).values({
      organizationId,
      actorType: "agent",
      actorId: agentId,
      action: "run.started",
      entityType: "agent_run",
      entityId: runId,
      entityTitle: `${agent.name} started`,
      metadata: { caseId, agentType } as Record<string, unknown>,
    })

    // 4. Load case + student + org context from DB
    const [caseRecord] = await db
      .select()
      .from(schema.cases)
      .where(eq(schema.cases.id, caseId))

    if (!caseRecord) {
      throw new Error(`Case not found: ${caseId}`)
    }

    const [org] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, organizationId))

    let linkedStudentId = caseRecord.studentId ?? null
    if (!linkedStudentId && (agentType === "retention" || agentType === "scheduler")) {
      const fallbackStudents = await db
        .select()
        .from(schema.students)
        .where(eq(schema.students.organizationId, organizationId))
        .orderBy(desc(schema.students.riskScore))

      const fallbackStudent = fallbackStudents[0]
      if (fallbackStudent) {
        linkedStudentId = fallbackStudent.id
        await db
          .update(schema.cases)
          .set({
            studentId: fallbackStudent.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.cases.id, caseId))
      }
    }

    let studentRecord: typeof schema.students.$inferSelect | undefined
    if (linkedStudentId) {
      const rows = await db
        .select()
        .from(schema.students)
        .where(eq(schema.students.id, linkedStudentId))
      studentRecord = rows[0]
    }

    // 5. Call agent function with context
    let agentOutput: Record<string, unknown>
    let tokensUsed = 0
    let inputTokens = 0
    let outputTokens = 0
    let reasoning: string | null = null
    const selectedModel = (agent.adapterConfig as { model?: string } | null)?.model ?? null
    const runtimeBinding = {
      adapterType: agent.adapterType,
      model: selectedModel,
    }

    if (agentType === "orchestrator") {
      const orgAgents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, organizationId))
      const pendingCases = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, organizationId))

      const result = await runOrchestrator({
        organizationId,
        agents: orgAgents.map((item) => ({
          id: item.id,
          agentType: item.agentType,
          name: item.name,
        })),
        context: JSON.stringify({
          instruction: `${caseRecord.title}\n${caseRecord.description ?? ""}`.trim(),
          orgName: org?.name ?? null,
          pendingCases: pendingCases
            .filter((item) => item.status !== "done" && item.status !== "closed")
            .slice(0, 5),
        }),
        ...runtimeBinding,
      })
      agentOutput = result as unknown as Record<string, unknown>
      reasoning = result.plan
    } else if (agentType === "complaint") {
      const result = await runComplaintAgent({
        caseId,
        organizationId,
        title: caseRecord.title,
        description: caseRecord.description ?? "",
        reporterId: caseRecord.reporterId ?? undefined,
        studentId: caseRecord.studentId ?? undefined,
        ...runtimeBinding,
      })
      agentOutput = result.analysis as unknown as Record<string, unknown>
      tokensUsed = result.tokensUsed
      inputTokens = Math.floor(tokensUsed * 0.55)
      outputTokens = tokensUsed - inputTokens
      reasoning = `complaint:${result.analysis.category}:${result.analysis.urgency}`
    } else if (agentType === "retention") {
      if (!linkedStudentId || !studentRecord) {
        throw new Error("Retention agent requires a student linked to the case")
      }

      const attendanceRows = await db
        .select()
        .from(schema.attendance)
        .where(eq(schema.attendance.studentId, caseRecord.studentId))
        .orderBy(desc(schema.attendance.date))

      const result = await runRetentionAgent({
        organizationId,
        studentId: linkedStudentId,
        studentName: studentRecord.name,
        attendanceHistory: attendanceRows.map((r: typeof schema.attendance.$inferSelect) => ({
          date: r.date,
          status: r.status,
        })),
        currentRiskScore: studentRecord.riskScore ?? 0,
        ...runtimeBinding,
      })
      agentOutput = result.assessment as unknown as Record<string, unknown>
      tokensUsed = result.tokensUsed
      inputTokens = Math.floor(tokensUsed * 0.55)
      outputTokens = tokensUsed - inputTokens
      reasoning = `retention:${result.assessment.riskLevel}:${result.assessment.riskScore}`
    } else if (agentType === "scheduler") {
      const currentSchedules = await db
        .select()
        .from(schema.schedules)
        .where(eq(schema.schedules.organizationId, organizationId))

      const result = await runSchedulerAgent({
        organizationId,
        caseId,
        title: caseRecord.title,
        description: caseRecord.description ?? "",
        studentId: linkedStudentId ?? undefined,
        reporterId: caseRecord.reporterId ?? undefined,
        schedules: currentSchedules.map((schedule: typeof schema.schedules.$inferSelect) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: schedule.room,
        })),
        adapterType: runtimeBinding.adapterType ?? undefined,
        model: runtimeBinding.model ?? undefined,
      })
      agentOutput = result.plan as unknown as Record<string, unknown>
      tokensUsed = result.tokensUsed
      inputTokens = Math.floor(tokensUsed * 0.55)
      outputTokens = tokensUsed - inputTokens
      reasoning = `scheduler:${String(result.plan.calendarAction?.status ?? "pending_sync")}`
    } else {
      throw new Error(`Unsupported agentType: ${agentType}`)
    }

    const completedAt = new Date()

    // 6. Store result, create approval or auto-complete
    if (approvalLevel >= 1) {
      // Create Approval record, status pending_approval
      await db.insert(schema.approvals).values({
        organizationId,
        agentRunId: runId,
        caseId,
        level: approvalLevel,
        status: "pending",
        payload: agentOutput,
      })
      await db.insert(schema.activityEvents).values({
        organizationId,
        actorType: "system",
        actorId: agentId,
        action: "approval.created",
        entityType: "agent_run",
        entityId: runId,
        entityTitle: `${agent.name} approval`,
        metadata: { caseId, agentType, level: approvalLevel } as Record<string, unknown>,
      })

      await db
        .update(schema.agentRuns)
        .set({
          status: "pending_approval",
          output: agentOutput,
          tokensUsed,
          inputTokens,
          outputTokens,
          reasoning,
          completedAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.agentRuns.id, runId))

      // Update case status and assignee even when pending approval
      const pendingStatus =
        agentType === "complaint"
          ? "in_review"
          : agentType === "retention"
            ? "in_progress"
            : "in_progress"

      await db
        .update(schema.cases)
        .set({
          status: pendingStatus,
          assigneeAgentId: agentId,
          updatedAt: new Date(),
        })
        .where(eq(schema.cases.id, caseId))

      // Insert agent comment summarising analysis (pending approval)
      let pendingCommentContent: string
      if (agentType === "complaint") {
        const output = agentOutput as {
          category?: string
          severity?: string
          suggestedReply?: string
        }
        pendingCommentContent = `[민원분석] 카테고리: ${output.category ?? "-"}, 심각도: ${output.severity ?? "-"}\n\n초안: ${output.suggestedReply ?? ""}`
      } else if (agentType === "orchestrator") {
        const output = agentOutput as {
          plan?: string
          assignments?: Array<{ agentId?: string; reason?: string }>
        }
        const assignments = Array.isArray(output.assignments)
          ? output.assignments.map((item) => `- ${item.agentId ?? "unknown"}: ${item.reason ?? ""}`).join("\n")
          : ""
        pendingCommentContent = `[오케스트레이션 계획]\n${output.plan ?? "실행 계획을 정리했습니다."}${assignments ? `\n\n${assignments}` : ""}`
      } else if (agentType === "retention") {
        const output = agentOutput as {
          riskLevel?: string
          reasoning?: string
        }
        pendingCommentContent = `[이탈분석] 위험도: ${output.riskLevel ?? "-"}\n\n${output.reasoning ?? ""}`
      } else if (agentType === "scheduler") {
        const output = agentOutput as {
          summary?: string
          reasoning?: string
        }
        pendingCommentContent = `[일정제안] ${output.summary ?? "일정 초안을 작성했습니다."}\n\n${output.reasoning ?? ""}`
      } else {
        pendingCommentContent = JSON.stringify(agentOutput, null, 2)
      }

      await db.insert(schema.caseComments).values({
        caseId,
        authorType: "agent",
        authorId: agentId,
        content: pendingCommentContent,
      })

      publishEvent(organizationId, "agent.run.pending_approval", {
        runId,
        agentId,
        caseId,
        agentType,
        output: agentOutput,
      })
    } else {
      // Auto-complete
      await db
        .update(schema.agentRuns)
        .set({
          status: "completed",
          output: agentOutput,
          tokensUsed,
          inputTokens,
          outputTokens,
          reasoning,
          completedAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.agentRuns.id, runId))

      // Update case with agent draft if complaint type
      if (agentType === "complaint" && agentOutput.suggestedReply) {
        await db
          .update(schema.cases)
          .set({
            agentDraft: String(agentOutput.suggestedReply),
            updatedAt: new Date(),
          })
          .where(eq(schema.cases.id, caseId))
      }

      // Update case status and assignee
      const newStatus =
        agentType === "complaint"
          ? "in_review"
          : agentType === "retention"
            ? "in_progress"
            : "in_progress"

      await db
        .update(schema.cases)
        .set({
          status: newStatus,
          assigneeAgentId: agentId,
          updatedAt: new Date(),
        })
        .where(eq(schema.cases.id, caseId))

      // Insert agent comment on the case
      let commentContent: string
      if (agentType === "complaint") {
        const output = agentOutput as {
          category?: string
          severity?: string
          draft?: string
        }
        commentContent = `[민원분석] 카테고리: ${output.category ?? "-"}, 심각도: ${output.severity ?? "-"}\n\n${output.draft ?? ""}`
      } else if (agentType === "orchestrator") {
        const output = agentOutput as {
          plan?: string
          assignments?: Array<{ agentId?: string; reason?: string }>
        }
        const assignments = Array.isArray(output.assignments)
          ? output.assignments.map((item) => `- ${item.agentId ?? "unknown"}: ${item.reason ?? ""}`).join("\n")
          : ""
        commentContent = `[오케스트레이션 계획]\n${output.plan ?? "실행 계획을 정리했습니다."}${assignments ? `\n\n${assignments}` : ""}`
      } else if (agentType === "retention") {
        const output = agentOutput as {
          riskLevel?: string
          reasoning?: string
        }
        commentContent = `[이탈분석] 위험도: ${output.riskLevel ?? "-"}\n\n${output.reasoning ?? ""}`
      } else if (agentType === "scheduler") {
        const output = agentOutput as {
          summary?: string
          reasoning?: string
        }
        commentContent = `[일정제안] ${output.summary ?? "일정 초안을 생성했습니다."}\n\n${output.reasoning ?? ""}`
      } else {
        commentContent = JSON.stringify(agentOutput, null, 2)
      }

      await db.insert(schema.caseComments).values({
        caseId,
        authorType: "agent",
        authorId: agentId,
        content: commentContent,
      })

      // 7. Publish completed event
      publishEvent(organizationId, "agent.run.completed", {
        runId,
        agentId,
        caseId,
        agentType,
        output: agentOutput,
      })
    }

    // 8. Create ActivityEvent records
    await db.insert(schema.activityEvents).values({
      organizationId,
      actorType: "agent",
      actorId: agentId,
      action: "run.completed",
      entityType: "agent_run",
      entityId: runId,
      entityTitle: `${agentType} run on case ${caseRecord.identifier}`,
      metadata: {
        agentType,
        caseId,
        approvalLevel,
        tokensUsed,
        adapterType: agent.adapterType,
        model: selectedModel,
      },
    })

    logger.info(
      { runId, agentType, caseId, tokensUsed },
      "Agent run completed",
    )

    return { runId }
  } catch (err) {
    logger.error({ runId, agentType, caseId, err }, "Agent run failed")

    await db
      .update(schema.agentRuns)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(schema.agentRuns.id, runId))

    publishEvent(organizationId, "agent.run.failed", {
      runId,
      agentId,
      caseId,
      agentType,
      error: err instanceof Error ? err.message : String(err),
    })
    await db.insert(schema.activityEvents).values({
      organizationId,
      actorType: "agent",
      actorId: agentId,
      action: "run.failed",
      entityType: "agent_run",
      entityId: runId,
      entityTitle: `${agent.name} failed`,
      metadata: {
        caseId,
        agentType,
        error: err instanceof Error ? err.message : String(err),
      } as Record<string, unknown>,
    })

    throw err
  }
}
