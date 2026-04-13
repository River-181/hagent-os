import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { inferCaseType } from "./orchestration.js"

function agentAllowsAutoRun(agent: typeof schema.agents.$inferSelect) {
  const config =
    agent.adapterConfig && typeof agent.adapterConfig === "object" && !Array.isArray(agent.adapterConfig)
      ? (agent.adapterConfig as Record<string, unknown>)
      : {}
  return config.autoRun !== false
}

export async function resolveAutoRunAgent(
  db: Db,
  organizationId: string,
  caseType: (typeof schema.caseTypeEnum.enumValues)[number],
  assigneeAgentId?: string,
) {
  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))

  const byId = assigneeAgentId
    ? agents.find((agent) => agent.id === assigneeAgentId) ?? null
    : null
  if (byId && agentAllowsAutoRun(byId)) {
    return byId
  }

  return (
    agents.find((agent) => agentAllowsAutoRun(agent) && agent.agentType === "complaint" && (caseType === "refund" || caseType === "inquiry"))
    ?? agents.find((agent) => agentAllowsAutoRun(agent) && inferCaseType(agent.agentType) === caseType)
    ?? null
  )
}

export async function resolveCaseRunAgent(
  db: Db,
  caseRecord: typeof schema.cases.$inferSelect,
) {
  let currentAssignee: typeof schema.agents.$inferSelect | null = null
  if (caseRecord.assigneeAgentId) {
    const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, caseRecord.assigneeAgentId))
    currentAssignee = agent ?? null
  }

  if (currentAssignee && currentAssignee.agentType !== "orchestrator") {
    return currentAssignee
  }

  const fallback = await resolveAutoRunAgent(
    db,
    caseRecord.organizationId,
    caseRecord.type,
    currentAssignee?.agentType === "orchestrator" ? undefined : currentAssignee?.id,
  )
  if (fallback) return fallback

  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, caseRecord.organizationId))

  return (
    agents.find((agent) => agent.agentType === "complaint" && (caseRecord.type === "refund" || caseRecord.type === "inquiry"))
    ?? agents.find((agent) => inferCaseType(agent.agentType) === caseRecord.type)
    ?? agents.find((agent) => agent.agentType === "complaint")
    ?? agents.find((agent) => agent.agentType === "orchestrator")
    ?? agents[0]
    ?? currentAssignee
    ?? null
  )
}
