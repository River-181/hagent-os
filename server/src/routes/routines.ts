// v0.2.0
import { Router } from "express"
import { and, eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { executeAgentRun } from "../services/execution.js"
import { getApprovalLevelForAgentType, inferCaseType } from "../services/orchestration.js"
import { recoverStaleRuns } from "../services/run-recovery.js"

function getRoutineCaseId(
  cases: typeof schema.cases.$inferSelect[],
  agentType: string,
  requestedCaseId?: string,
) {
  const isEligible = (item: typeof schema.cases.$inferSelect) =>
    !item.archivedAt &&
    item.status !== "done" &&
    item.status !== "in_review" &&
    item.assigneeAgentId === null &&
    (item.type === inferCaseType(agentType) ||
      (agentType === "complaint" && (item.type === "refund" || item.type === "inquiry")))

  if (requestedCaseId) {
    return cases.find((item) => item.id === requestedCaseId && isEligible(item)) ?? null
  }

  return cases.find(isEligible) ?? null
}

export function routineRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/routines", async (req, res) => {
    try {
      const routines = await db.select().from(schema.routines)
        .where(eq(schema.routines.organizationId, req.params.orgId))
      res.json(routines)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch routines" })
    }
  })

  router.post("/organizations/:orgId/routines", async (req, res) => {
    try {
      const [routine] = await db.insert(schema.routines).values({
        organizationId: req.params.orgId,
        name: req.body.name,
        schedule: req.body.schedule ?? "0 7 * * *",
        agentId: req.body.agentId ?? null,
        enabled: req.body.enabled ?? true,
      }).returning()
      res.status(201).json(routine)
    } catch (err) {
      res.status(500).json({ error: "Failed to create routine" })
    }
  })

  router.patch("/routines/:id", async (req, res) => {
    try {
      const updates: Record<string, unknown> = {}
      for (const f of ["name", "schedule", "agentId", "enabled"] as const) {
        if (f in req.body) updates[f] = req.body[f]
      }
      const [updated] = await db.update(schema.routines)
        .set({ ...(updates as any), updatedAt: new Date() })
        .where(eq(schema.routines.id, req.params.id))
        .returning()
      if (!updated) { res.status(404).json({ error: "Not found" }); return }
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to update routine" })
    }
  })

  router.delete("/routines/:id", async (req, res) => {
    try {
      await db.delete(schema.routines).where(eq(schema.routines.id, req.params.id))
      res.status(204).send()
    } catch (err) {
      res.status(500).json({ error: "Failed to delete routine" })
    }
  })

  router.post("/organizations/:orgId/routines/:id/trigger", async (req, res) => {
    try {
      await recoverStaleRuns(db, req.params.orgId)
      const [routine] = await db.select().from(schema.routines).where(and(
        eq(schema.routines.id, req.params.id),
        eq(schema.routines.organizationId, req.params.orgId),
      ))

      if (!routine) {
        res.status(404).json({ error: "Not found" })
        return
      }

      if (!routine.agentId) {
        res.status(422).json({ error: "Routine has no assigned agent" })
        return
      }

      const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, routine.agentId))
      if (!agent) {
        res.status(404).json({ error: "Assigned agent not found" })
        return
      }

      const cases = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, req.params.orgId))

      const requestedCaseId = typeof req.body?.caseId === "string" ? req.body.caseId : undefined
      const caseRecord = getRoutineCaseId(cases, agent.agentType, requestedCaseId)

      if (!caseRecord) {
        res.status(422).json({ error: "No eligible case found for routine trigger" })
        return
      }

      const { runId } = await executeAgentRun(db, {
        organizationId: req.params.orgId,
        agentId: agent.id,
        caseId: caseRecord.id,
        agentType: agent.agentType,
        approvalLevel: getApprovalLevelForAgentType(agent.agentType),
      })

      const now = new Date()
      const [updated] = await db.update(schema.routines)
        .set({ lastRunAt: now, updatedAt: now })
        .where(eq(schema.routines.id, routine.id))
        .returning()

      await db.insert(schema.activityEvents).values({
        organizationId: req.params.orgId,
        actorType: "system",
        actorId: agent.id,
        action: "routine.triggered",
        entityType: "routine",
        entityId: routine.id,
        entityTitle: routine.name,
        metadata: {
          runId,
          caseId: caseRecord.id,
          agentId: agent.id,
          agentType: agent.agentType,
        } as Record<string, unknown>,
      })

      res.status(202).json({
        routine: updated ?? routine,
        runId,
        caseId: caseRecord.id,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to trigger routine" })
    }
  })

  return router
}
