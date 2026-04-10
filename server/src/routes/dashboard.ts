// v0.2.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function dashboardRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/dashboard/summary", async (req, res) => {
    try {
      const orgId = req.params.orgId
      const [agents, cases, approvals, runs] = await Promise.all([
        db.select().from(schema.agents).where(eq(schema.agents.organizationId, orgId)),
        db.select().from(schema.cases).where(eq(schema.cases.organizationId, orgId)),
        db.select().from(schema.approvals).where(eq(schema.approvals.organizationId, orgId)),
        db.select().from(schema.agentRuns).where(eq(schema.agentRuns.organizationId, orgId)),
      ])

      const runningAgents = agents.filter(a => a.status === "running").length
      const activeCases = cases.filter(c => c.status === "in_progress" || c.status === "todo").length
      const pendingApprovals = approvals.filter(a => a.status === "pending").length
      const totalTokens = runs.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0)

      res.json({
        agents: { total: agents.length, running: runningAgents },
        cases: { total: cases.length, active: activeCases },
        approvals: { total: approvals.length, pending: pendingApprovals },
        tokens: { total: totalTokens },
        runs: { total: runs.length, recent: runs.slice(-10) },
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dashboard summary" })
    }
  })

  return router
}
