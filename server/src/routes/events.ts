import { Router } from "express"
import type { Db } from "@hagent/db"
import { subscribeEvents } from "../services/live-events.js"

export function eventsRoutes(_db: Db): Router {
  const router = Router()

  // GET /api/organizations/:orgId/events/sse
  router.get("/organizations/:orgId/events/sse", (req, res) => {
    const { orgId } = req.params

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no")
    res.flushHeaders()

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: "connected", organizationId: orgId })}\n\n`)

    // Subscribe to org events
    const unsubscribe = subscribeEvents(orgId, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    })

    // Keepalive ping every 30 seconds
    const keepalive = setInterval(() => {
      res.write(`: ping\n\n`)
    }, 30_000)

    // Handle client disconnect
    req.on("close", () => {
      clearInterval(keepalive)
      unsubscribe()
    })
  })

  return router
}
