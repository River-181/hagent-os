import { Router } from "express"
import type { Db } from "@hagent/db"
import { buildOrganizationCostSummary } from "../services/costs.js"

export function costRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/costs/summary", async (req, res) => {
    try {
      const summary = await buildOrganizationCostSummary(db, req.params.orgId)
      res.json(summary)
    } catch {
      res.status(500).json({ error: "Failed to fetch cost summary" })
    }
  })

  return router
}
