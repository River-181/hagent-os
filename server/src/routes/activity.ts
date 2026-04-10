import { Router } from "express"
import { eq, and, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function activityRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/activity", async (req, res) => {
    try {
      const { type } = req.query

      const conditions = [
        eq(schema.activityEvents.organizationId, req.params.orgId),
      ]

      if (type && typeof type === "string") {
        conditions.push(eq(schema.activityEvents.entityType, type))
      }

      const events = await db
        .select()
        .from(schema.activityEvents)
        .where(and(...conditions))
        .orderBy(desc(schema.activityEvents.createdAt))

      res.json(events)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch activity events" })
    }
  })

  router.get("/activity/:id", async (req, res) => {
    try {
      const [event] = await db
        .select()
        .from(schema.activityEvents)
        .where(eq(schema.activityEvents.id, req.params.id))

      if (!event) {
        res.status(404).json({ error: "Activity event not found" })
        return
      }

      res.json(event)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch activity event" })
    }
  })

  return router
}
