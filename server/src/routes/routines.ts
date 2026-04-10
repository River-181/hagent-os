// v0.2.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

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

  return router
}
