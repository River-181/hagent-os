import { count, desc, eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { runOrchestrator } from "../lib/agents/orchestrator.js"
import { executeAgentRun } from "./execution.js"

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
    .where(eq(schema.cases.organizationId, input.organizationId))
    .orderBy(desc(schema.cases.createdAt))

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
        (item.assigneeAgentId === null || item.assigneeAgentId === agent.id) &&
        item.status !== "done" &&
        item.status !== "in_review" &&
        item.type === inferCaseType(agent.agentType),
    )

    let caseRecord = matchingOpenCase

    if (!caseRecord) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, input.organizationId))

      const [created] = await db
        .insert(schema.cases)
        .values({
          organizationId: input.organizationId,
          opsGroupId: input.preferredProjectId ?? null,
          identifier: `C-${String(total + 1).padStart(3, "0")}`,
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
        .returning()

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
