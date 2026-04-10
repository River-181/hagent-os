import { Router } from "express"
import { getPluginStatuses } from "../services/control-plane-registry.js"

export function pluginRoutes(): Router {
  const router = Router()

  router.get("/", (_req, res) => {
    res.json(getPluginStatuses())
  })

  return router
}
