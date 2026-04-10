import { Router } from "express"
import { eq, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function runRoutes(db: Db): Router {
  const router = Router()

  router.get("/:id", async (req, res) => {
    try {
      const [run] = await db
        .select()
        .from(schema.agentRuns)
        .where(eq(schema.agentRuns.id, req.params.id))

      if (!run) {
        res.status(404).json({ error: "Agent run not found" })
        return
      }

      const [agent] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, run.agentId))
      const [caseRecord] = run.caseId
        ? await db.select().from(schema.cases).where(eq(schema.cases.id, run.caseId))
        : [null]
      const [approval] = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.agentRunId, run.id))
      const activity = await db
        .select()
        .from(schema.activityEvents)
        .where(eq(schema.activityEvents.entityId, run.id))
        .orderBy(desc(schema.activityEvents.createdAt))

      res.json({
        ...run,
        agent,
        case: caseRecord,
        approval: approval ?? null,
        adapter: {
          adapterType: agent?.adapterType ?? "mock_local",
          model: (agent?.adapterConfig as { model?: string } | null)?.model ?? null,
        },
        transcript: [
          run.input ? { role: "user", type: "input", content: run.input, createdAt: run.createdAt } : null,
          run.output ? { role: "assistant", type: "output", content: run.output, createdAt: run.completedAt ?? run.updatedAt } : null,
        ].filter(Boolean),
        usage: {
          totalTokens: run.tokensUsed,
          inputTokens: run.inputTokens,
          outputTokens: run.outputTokens,
        },
        activity,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch agent run" })
    }
  })

  return router
}
