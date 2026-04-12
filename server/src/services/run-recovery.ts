import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "./live-events.js"

const STALE_QUEUED_MS = 2 * 60 * 1000
const STALE_RUNNING_MS = 10 * 60 * 1000

function isRecoverableStatus(status: string) {
  return status === "queued" || status === "running"
}

function isStaleRun(run: typeof schema.agentRuns.$inferSelect, nowMs = Date.now()) {
  if (!isRecoverableStatus(run.status)) return false

  const referenceTime =
    run.status === "running"
      ? run.startedAt?.getTime() ?? run.updatedAt.getTime()
      : run.updatedAt.getTime()
  const staleThreshold = run.status === "running" ? STALE_RUNNING_MS : STALE_QUEUED_MS
  return nowMs - referenceTime >= staleThreshold
}

export async function recoverStaleRuns(db: Db, organizationId: string) {
  const runs = await db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.organizationId, organizationId))

  const now = new Date()
  const staleRuns = runs.filter((run) => isStaleRun(run, now.getTime()))
  if (staleRuns.length === 0) {
    return { recoveredCount: 0, runIds: [] as string[] }
  }

  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]))

  for (const run of staleRuns) {
    const recoveryMessage =
      run.status === "running"
        ? "Stale running run recovered automatically after timeout window"
        : "Stale queued run recovered automatically after timeout window"

    await db
      .update(schema.agentRuns)
      .set({
        status: "failed",
        error: recoveryMessage,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.agentRuns.id, run.id))

    publishEvent(organizationId, "agent.run.recovered_stale", {
      runId: run.id,
      agentId: run.agentId,
      caseId: run.caseId,
      previousStatus: run.status,
      error: recoveryMessage,
    })

    await db.insert(schema.activityEvents).values({
      organizationId,
      actorType: "system",
      actorId: run.agentId,
      action: "run.recovered_stale",
      entityType: "agent_run",
      entityId: run.id,
      entityTitle: `${agentNameById.get(run.agentId) ?? "Agent"} stale recovery`,
      metadata: {
        caseId: run.caseId,
        previousStatus: run.status,
        recoveredBy: "system",
        reason: recoveryMessage,
      } as Record<string, unknown>,
    })
  }

  return {
    recoveredCount: staleRuns.length,
    runIds: staleRuns.map((run) => run.id),
  }
}
