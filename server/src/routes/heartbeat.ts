import { Router } from "express"
import { eq, desc } from "drizzle-orm"
import pino from "pino"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { executeAgentRun } from "../services/execution.js"
import { getApprovalLevelForAgentType, inferCaseType } from "../services/orchestration.js"

const logger = pino({ level: "info" })

export function heartbeatRoutes(db: Db): Router {
  const router = Router()

  // POST /api/heartbeat/trigger
  router.post("/trigger", async (req, res) => {
    try {
      const { organizationId } = req.body as { organizationId: string }

      if (!organizationId) {
        res.status(400).json({ error: "organizationId is required" })
        return
      }

      // Load all agents for org
      const agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, organizationId))

      // Load pending cases
      const pendingCases = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, organizationId))
        .orderBy(desc(schema.cases.priority), desc(schema.cases.createdAt))

      const openCases = pendingCases.filter(
        (c: typeof schema.cases.$inferSelect) =>
          c.status !== "done" &&
          c.status !== "in_review" &&
          c.assigneeAgentId === null,
      )

      const triggeredRunIds: string[] = []

      for (const agent of agents) {
        const matchingCaseIndex = openCases.findIndex(
          (item: typeof schema.cases.$inferSelect) =>
            item.type === inferCaseType(agent.agentType) ||
            (agent.agentType === "complaint" && (item.type === "refund" || item.type === "inquiry")),
        )
        const openCase =
          matchingCaseIndex >= 0 ? openCases.splice(matchingCaseIndex, 1)[0] : openCases.shift()

        if (!openCase) break

        try {
          const { runId } = await executeAgentRun(db, {
            organizationId,
            agentId: agent.id,
            caseId: openCase.id,
            agentType: agent.agentType,
            approvalLevel: getApprovalLevelForAgentType(agent.agentType),
          })
          triggeredRunIds.push(runId)
        } catch (err) {
          logger.error({ err, agentId: agent.id, caseId: openCase.id }, "Heartbeat run failed")
        }
      }

      logger.info(
        { organizationId, triggeredRuns: triggeredRunIds.length },
        "Heartbeat trigger completed",
      )

      res.json({ triggeredRuns: triggeredRunIds.length, runIds: triggeredRunIds })
    } catch (err) {
      logger.error({ err }, "Heartbeat trigger error")
      res.status(500).json({ error: "Heartbeat trigger failed" })
    }
  })

  return router
}
