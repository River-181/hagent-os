// v0.3.0
import { Router } from "express"
import { eq, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function notificationRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/notifications", async (req, res) => {
    try {
      const notifications = await db.select().from(schema.notifications)
        .where(eq(schema.notifications.organizationId, req.params.orgId))
        .orderBy(desc(schema.notifications.createdAt))
      res.json(notifications)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" })
    }
  })

  router.patch("/notifications/:id/read", async (req, res) => {
    try {
      const [updated] = await db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, req.params.id))
        .returning()
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to mark notification" })
    }
  })

  return router
}
