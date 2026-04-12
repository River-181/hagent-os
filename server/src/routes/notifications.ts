// v0.3.0
import { Router } from "express"
import { eq, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

function normalizeNotificationText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase()
}

function getNotificationDedupeKey(item: typeof schema.notifications.$inferSelect) {
  if (item.entityType && item.entityId) {
    return `${item.type}|${item.entityType}|${item.entityId}`
  }

  return `${item.type}|${normalizeNotificationText(item.title)}|${normalizeNotificationText(item.body)}`
}

function dedupeNotifications(items: typeof schema.notifications.$inferSelect[]) {
  const groups = new Map<string, typeof schema.notifications.$inferSelect[]>()

  for (const item of items) {
    const key = getNotificationDedupeKey(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(item)
  }

  return Array.from(groups.values())
    .map((group) => {
      const latest = [...group].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      return {
        ...latest,
        read: group.every((item) => item.read),
        duplicateCount: group.length,
        duplicateIds: group.map((item) => item.id),
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function notificationRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/notifications", async (req, res) => {
    try {
      const notifications = await db.select().from(schema.notifications)
        .where(eq(schema.notifications.organizationId, req.params.orgId))
        .orderBy(desc(schema.notifications.createdAt))
      res.json(dedupeNotifications(notifications))
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" })
    }
  })

  router.patch("/notifications/:id/read", async (req, res) => {
    try {
      const [target] = await db.select().from(schema.notifications)
        .where(eq(schema.notifications.id, req.params.id))

      if (!target) {
        res.status(404).json({ error: "Notification not found" })
        return
      }

      const notifications = await db.select().from(schema.notifications)
        .where(eq(schema.notifications.organizationId, target.organizationId))
      const matchingIds = notifications
        .filter((item) => getNotificationDedupeKey(item) === getNotificationDedupeKey(target))
        .map((item) => item.id)

      let updated = target
      for (const notificationId of matchingIds) {
        const [row] = await db.update(schema.notifications)
          .set({ read: true })
          .where(eq(schema.notifications.id, notificationId))
          .returning()
        if (row && row.id === target.id) updated = row
      }

      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to mark notification" })
    }
  })

  return router
}
