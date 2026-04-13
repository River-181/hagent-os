import { and, desc, eq, inArray } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

type PendingApproval = typeof schema.approvals.$inferSelect
type AgentRun = typeof schema.agentRuns.$inferSelect
type Agent = typeof schema.agents.$inferSelect

type DedupeScope = {
  organizationId: string
  caseId?: string
  agentType?: string
}

function getRunAgentType(run: AgentRun | null) {
  if (!run?.input || typeof run.input !== "object" || Array.isArray(run.input)) return null
  const input = run.input as Record<string, unknown>
  return typeof input.agentType === "string" && input.agentType.trim().length > 0 ? input.agentType.trim() : null
}

function buildGroupKey(approval: PendingApproval, run: AgentRun | null, agent: Agent | null) {
  if (!approval.caseId) return null
  return `${approval.caseId}:${agent?.agentType ?? getRunAgentType(run) ?? run?.agentId ?? "unknown"}`
}

export async function dedupePendingApprovals(db: Db, scope: DedupeScope) {
  const conditions = [
    eq(schema.approvals.organizationId, scope.organizationId),
    eq(schema.approvals.status, "pending"),
  ]
  if (scope.caseId) conditions.push(eq(schema.approvals.caseId, scope.caseId))

  const pendingApprovals = await db
    .select()
    .from(schema.approvals)
    .where(and(...conditions))
    .orderBy(desc(schema.approvals.createdAt))

  if (pendingApprovals.length <= 1) return { removed: 0 }

  const runIds = pendingApprovals.map((item) => item.agentRunId).filter((value): value is string => Boolean(value))
  const runs = runIds.length
    ? await db.select().from(schema.agentRuns).where(inArray(schema.agentRuns.id, runIds))
    : []
  const agentIds = runs.map((item) => item.agentId).filter((value): value is string => Boolean(value))
  const agents = agentIds.length
    ? await db.select().from(schema.agents).where(inArray(schema.agents.id, agentIds))
    : []

  const runMap = new Map(runs.map((item) => [item.id, item]))
  const agentMap = new Map(agents.map((item) => [item.id, item]))

  const keep = new Set<string>()
  const removeApprovals: PendingApproval[] = []
  const removeRunIds = new Set<string>()

  for (const approval of pendingApprovals) {
    const run = runMap.get(approval.agentRunId) ?? null
    const agent = run?.agentId ? agentMap.get(run.agentId) ?? null : null
    const runAgentType = agent?.agentType ?? getRunAgentType(run)
    const key = buildGroupKey(approval, run, agent)
    if (!key) continue
    if (scope.agentType && runAgentType !== scope.agentType) continue
    if (!keep.has(key)) {
      keep.add(key)
      continue
    }
    removeApprovals.push(approval)
    if (approval.agentRunId) removeRunIds.add(approval.agentRunId)
  }

  if (removeApprovals.length === 0) return { removed: 0 }

  await db.delete(schema.approvals).where(inArray(schema.approvals.id, removeApprovals.map((item) => item.id)))

  if (removeRunIds.size > 0) {
    await db
      .update(schema.agentRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(schema.agentRuns.id, Array.from(removeRunIds)))
  }

  return { removed: removeApprovals.length }
}
