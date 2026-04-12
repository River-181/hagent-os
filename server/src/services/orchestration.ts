import { and, desc, eq, isNull } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { runOrchestrator } from "../lib/agents/orchestrator.js"
import { executeAgentRun } from "./execution.js"
import { createCaseWithRetry } from "../lib/case-create.js"
import { recoverStaleRuns } from "./run-recovery.js"

export function getApprovalLevelForAgentType(agentType: string) {
  if (agentType === "complaint" || agentType === "scheduler") return 1
  if (agentType === "retention") return 0
  return 0
}

export function inferCaseType(agentType: string): (typeof schema.caseTypeEnum.enumValues)[number] {
  if (agentType === "complaint") return "complaint"
  if (agentType === "retention") return "churn"
  if (agentType === "scheduler") return "schedule"
  return "inquiry"
}

export async function dispatchInstruction(
  db: Db,
  input: {
    organizationId: string
    instruction: string
    preferredProjectId?: string | null
  },
) {
  await recoverStaleRuns(db, input.organizationId)
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))

  if (!org) throw new Error("Organization not found")

  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, input.organizationId))

  const pendingCases = await db
    .select()
    .from(schema.cases)
    .where(and(
      eq(schema.cases.organizationId, input.organizationId),
      isNull(schema.cases.archivedAt),
    ))
    .orderBy(desc(schema.cases.createdAt))
  const existingRuns = await db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.organizationId, input.organizationId))
  const existingApprovals = await db
    .select()
    .from(schema.approvals)
    .where(eq(schema.approvals.organizationId, input.organizationId))

  const activeRunCaseIds = new Set(
    existingRuns
      .filter((item) => item.status === "queued" || item.status === "running" || item.status === "pending_approval")
      .map((item) => item.caseId)
      .filter((value): value is string => typeof value === "string"),
  )
  const pendingApprovalCaseIds = new Set(
    existingApprovals
      .filter((item) => item.status === "pending")
      .map((item) => item.caseId)
      .filter((value): value is string => typeof value === "string"),
  )

  const orchestratorAgent = agents.find(
    (agent: typeof schema.agents.$inferSelect) => agent.agentType === "orchestrator",
  )

  const orchestratorResult = await runOrchestrator({
    organizationId: input.organizationId,
    agents: agents.map((agent: typeof schema.agents.$inferSelect) => ({
      id: agent.id,
      agentType: agent.agentType,
      name: agent.name,
    })),
    context: JSON.stringify({
      instruction: input.instruction,
      orgName: org.name,
      pendingCases: pendingCases.slice(0, 10).map((item: typeof schema.cases.$inferSelect) => ({
        id: item.id,
        identifier: item.identifier,
        title: item.title,
        type: item.type,
        status: item.status,
        severity: item.severity,
      })),
    }),
    adapterType: orchestratorAgent?.adapterType,
    model: (orchestratorAgent?.adapterConfig as { model?: string } | null)?.model,
  })

  const assignments = []
  const createdCaseIds: string[] = []
  const runIds: string[] = []

  for (const assignment of orchestratorResult.assignments) {
    const agent = agents.find((item: typeof schema.agents.$inferSelect) => item.id === assignment.agentId)
    if (!agent) continue

    const matchingOpenCase = pendingCases.find(
      (item: typeof schema.cases.$inferSelect) =>
        !item.archivedAt &&
        (item.assigneeAgentId === null || item.assigneeAgentId === agent.id) &&
        item.status !== "done" &&
        item.status !== "in_review" &&
        !activeRunCaseIds.has(item.id) &&
        !pendingApprovalCaseIds.has(item.id) &&
        item.type === inferCaseType(agent.agentType),
    )

    let caseRecord = matchingOpenCase

    if (!caseRecord) {
      const created = await createCaseWithRetry(db, {
        organizationId: input.organizationId,
        opsGroupId: input.preferredProjectId ?? null,
        title: `[자동생성] ${assignment.reason}`,
        description: input.instruction,
        type: inferCaseType(agent.agentType),
        severity: "normal",
        status: "todo",
        priority: 2,
        source: "manual",
        metadata: {
          generatedBy: "orchestrator",
          assignmentReason: assignment.reason,
        } as Record<string, unknown>,
      })

      caseRecord = created
      createdCaseIds.push(created.id)
      await db.insert(schema.activityEvents).values({
        organizationId: input.organizationId,
        actorType: "system",
        actorId: "orchestrator",
        action: "case.created",
        entityType: "case",
        entityId: created.id,
        entityTitle: created.title,
        metadata: {
          generatedBy: "orchestrator",
        } as Record<string, unknown>,
      })
    }

    const { runId } = await executeAgentRun(db, {
      organizationId: input.organizationId,
      agentId: agent.id,
      caseId: caseRecord.id,
      agentType: agent.agentType,
      approvalLevel: getApprovalLevelForAgentType(agent.agentType),
    })

    runIds.push(runId)
    assignments.push({
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.agentType,
      reason: assignment.reason,
      caseId: caseRecord.id,
      runId,
    })
  }

  return {
    plan: orchestratorResult.plan,
    assignments,
    runIds,
    createdCaseIds,
  }
}
