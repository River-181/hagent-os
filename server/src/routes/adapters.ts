import { Router } from "express"
import { getAdapterStatuses, getIntegrationStatuses } from "../services/control-plane-registry.js"

export function adapterRoutes(): Router {
  const router = Router()

  router.get("/", (_req, res) => {
    res.json({
      adapters: getAdapterStatuses(),
      integrations: getIntegrationStatuses(),
    })
  })

  return router
}
