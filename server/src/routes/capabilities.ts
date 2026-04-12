import { Router } from "express"
import type { Db } from "@hagent/db"
import { getCapabilityDetail, listCapabilities } from "../services/capabilities.js"

export function capabilityRoutes(db: Db): Router {
  const router = Router()

  router.get("/", async (req, res) => {
    try {
      const orgId = typeof req.query.orgId === "string" ? req.query.orgId : undefined
      res.json(await listCapabilities(db, orgId))
    } catch (error) {
      res.status(500).json({ error: "Failed to load capabilities" })
    }
  })

  router.get("/:kind/:slug", async (req, res) => {
    try {
      const orgId = typeof req.query.orgId === "string" ? req.query.orgId : undefined
      res.json(await getCapabilityDetail(db, req.params.kind, req.params.slug, orgId))
    } catch (error) {
      res.status(404).json({ error: "Capability not found" })
    }
  })

  return router
}
