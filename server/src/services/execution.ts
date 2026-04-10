import pino from "pino"
import { eq, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "./live-events.js"
import { runComplaintAgent } from "../lib/agents/complaint.js"
import { runRetentionAgent } from "../lib/agents/retention.js"

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

  // 1. Create AgentRun (queued)
  const [run] = await db
    .insert(schema.agentRuns)
    .values({
      organizationId,
      agentId,
      caseId,
      status: "queued",
      approvalLevel,
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

    let studentRecord: typeof schema.students.$inferSelect | undefined
    if (caseRecord.studentId) {
      const rows = await db
        .select()
        .from(schema.students)
        .where(eq(schema.students.id, caseRecord.studentId))
      studentRecord = rows[0]
    }

    // 5. Call agent function with context
    let agentOutput: Record<string, unknown>
    let tokensUsed = 0

    if (agentType === "complaint") {
      const result = await runComplaintAgent({
        caseId,
        organizationId,
        title: caseRecord.title,
        description: caseRecord.description ?? "",
        reporterId: caseRecord.reporterId ?? undefined,
        studentId: caseRecord.studentId ?? undefined,
      })
      agentOutput = result.analysis as unknown as Record<string, unknown>
      tokensUsed = result.tokensUsed
    } else if (agentType === "retention") {
      if (!caseRecord.studentId || !studentRecord) {
        throw new Error("Retention agent requires a student linked to the case")
      }

      const attendanceRows = await db
        .select()
        .from(schema.attendance)
        .where(eq(schema.attendance.studentId, caseRecord.studentId))
        .orderBy(desc(schema.attendance.date))

      const result = await runRetentionAgent({
        organizationId,
        studentId: caseRecord.studentId,
        studentName: studentRecord.name,
        attendanceHistory: attendanceRows.map((r) => ({
          date: r.date,
          status: r.status,
        })),
        currentRiskScore: studentRecord.riskScore ?? 0,
      })
      agentOutput = result.assessment as unknown as Record<string, unknown>
      tokensUsed = result.tokensUsed
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

      await db
        .update(schema.agentRuns)
        .set({
          status: "pending_approval",
          output: agentOutput,
          tokensUsed,
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
      } else if (agentType === "retention") {
        const output = agentOutput as {
          riskLevel?: string
          reasoning?: string
        }
        pendingCommentContent = `[이탈분석] 위험도: ${output.riskLevel ?? "-"}\n\n${output.reasoning ?? ""}`
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
      } else if (agentType === "retention") {
        const output = agentOutput as {
          riskLevel?: string
          reasoning?: string
        }
        commentContent = `[이탈분석] 위험도: ${output.riskLevel ?? "-"}\n\n${output.reasoning ?? ""}`
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
      action: "agent.run.completed",
      entityType: "agent_run",
      entityId: runId,
      entityTitle: `${agentType} run on case ${caseRecord.identifier}`,
      metadata: {
        agentType,
        caseId,
        approvalLevel,
        tokensUsed,
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

    throw err
  }
}
