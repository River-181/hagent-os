import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function agentHireRoutes(db: Db): Router {
  const router = Router()

  // POST /api/organizations/:orgId/agent-hires
  // Creates a pending approval for hiring a new agent
  router.post("/organizations/:orgId/agent-hires", async (req, res) => {
    try {
      const { name, agentType, title, reportsTo, model } = req.body as {
        name: string
        agentType: string
        title?: string
        reportsTo?: string
        model?: string
      }

      if (!name || !agentType) {
        res.status(400).json({ error: "name and agentType are required" })
        return
      }

      // We need a sentinel agent run to attach the approval to.
      // Look for an existing agent in the org to use as the run owner,
      // or create a stub run record if one already exists.
      const [existingAgent] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, req.params.orgId))

      if (!existingAgent) {
        res.status(422).json({ error: "No agents found in organization. Create at least one agent first." })
        return
      }

      // Create a sentinel agent run to satisfy the not-null constraint on approvals.agentRunId
      const [run] = await db
        .insert(schema.agentRuns)
        .values({
          organizationId: req.params.orgId,
          agentId: existingAgent.id,
          status: "queued",
          input: { type: "agent_hire", name, agentType, title, reportsTo, model },
        })
        .returning()

      const [approval] = await db
        .insert(schema.approvals)
        .values({
          organizationId: req.params.orgId,
          agentRunId: run.id,
          level: 0,
          status: "pending",
          payload: {
            type: "agent_hire",
            name,
            agentType,
            title,
            reportsTo,
            model,
          },
        })
        .returning()

      res.status(201).json({ approvalId: approval.id, runId: run.id, status: "pending" })
    } catch (err) {
      res.status(500).json({ error: "Failed to create agent hire request" })
    }
  })

  return router
}
