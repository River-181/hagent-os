import { Router } from "express"
import { and, desc, eq, isNull } from "drizzle-orm"
import pino from "pino"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { executeAgentRun } from "../services/execution.js"
import { getApprovalLevelForAgentType, inferCaseType } from "../services/orchestration.js"
import { recoverStaleRuns } from "../services/run-recovery.js"

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

      const recovery = await recoverStaleRuns(db, organizationId)

      // Load all agents for org
      const agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, organizationId))

      // Load pending cases
      const pendingCases = await db
        .select()
        .from(schema.cases)
        .where(and(
          eq(schema.cases.organizationId, organizationId),
          isNull(schema.cases.archivedAt),
        ))
        .orderBy(desc(schema.cases.priority), desc(schema.cases.createdAt))
      const runs = await db
        .select()
        .from(schema.agentRuns)
        .where(eq(schema.agentRuns.organizationId, organizationId))
      const approvals = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.organizationId, organizationId))

      const activeRunCaseIds = new Set(
        runs
          .filter((item) => item.status === "queued" || item.status === "running" || item.status === "pending_approval")
          .map((item) => item.caseId)
          .filter((value): value is string => typeof value === "string"),
      )
      const activeRunAgentIds = new Set(
        runs
          .filter((item) => item.status === "queued" || item.status === "running")
          .map((item) => item.agentId),
      )
      const pendingApprovalCaseIds = new Set(
        approvals
          .filter((item) => item.status === "pending")
          .map((item) => item.caseId)
          .filter((value): value is string => typeof value === "string"),
      )

      const openCases = pendingCases.filter(
        (c: typeof schema.cases.$inferSelect) =>
          !c.archivedAt &&
          c.status !== "done" &&
          c.status !== "in_review" &&
          c.assigneeAgentId === null &&
          !activeRunCaseIds.has(c.id) &&
          !pendingApprovalCaseIds.has(c.id),
      )

      const triggeredRunIds: string[] = []

      for (const agent of agents) {
        if (activeRunAgentIds.has(agent.id)) {
          continue
        }
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

      res.json({ triggeredRuns: triggeredRunIds.length, runIds: triggeredRunIds, recoveredStaleRuns: recovery })
    } catch (err) {
      logger.error({ err }, "Heartbeat trigger error")
      res.status(500).json({ error: "Heartbeat trigger failed" })
    }
  })

  return router
}
