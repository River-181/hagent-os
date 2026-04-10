import { Router } from "express"
import type { Db } from "@hagent/db"

export function healthRoutes(_db: Db): Router {
  const router = Router()

  router.get("/", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.3.0",
    })
  })

  return router
}
