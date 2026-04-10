// v0.2.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function goalRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/goals", async (req, res) => {
    try {
      const goals = await db.select().from(schema.opsGoals)
        .where(eq(schema.opsGoals.organizationId, req.params.orgId))
      res.json(goals)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch goals" })
    }
  })

  router.post("/organizations/:orgId/goals", async (req, res) => {
    try {
      const [goal] = await db.insert(schema.opsGoals).values({
        organizationId: req.params.orgId,
        title: req.body.title,
        description: req.body.description ?? null,
        parentGoalId: req.body.parentGoalId ?? null,
        opsGroupId: req.body.opsGroupId ?? null,
        status: req.body.status ?? "active",
        targetDate: req.body.targetDate ?? null,
      }).returning()
      res.status(201).json(goal)
    } catch (err) {
      res.status(500).json({ error: "Failed to create goal" })
    }
  })

  router.patch("/goals/:id", async (req, res) => {
    try {
      const updates: Record<string, unknown> = {}
      for (const f of ["title", "description", "status", "parentGoalId", "targetDate"] as const) {
        if (f in req.body) updates[f] = req.body[f]
      }
      const [updated] = await db.update(schema.opsGoals)
        .set({ ...(updates as any), updatedAt: new Date() })
        .where(eq(schema.opsGoals.id, req.params.id))
        .returning()
      if (!updated) { res.status(404).json({ error: "Not found" }); return }
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to update goal" })
    }
  })

  return router
}
