import { Router } from "express"
import type { Db } from "@hagent/db"
import { processKakaoApprovalDelivery } from "../services/kakao-approval-delivery.js"

export function messageRoutes(db: Db): Router {
  const router = Router()

  router.post("/messages/kakao/send", async (req, res) => {
    try {
      const approvalId = String(req.body?.approvalId ?? "")
      const mode = req.body?.mode

      if (!approvalId) {
        res.status(400).json({ error: "approvalId is required" })
        return
      }

      const normalizedMode =
        mode === "bridge" || mode === "confirm_bridge" || mode === "auto" ? mode : "auto"

      const approval = await processKakaoApprovalDelivery(db, approvalId, {
        mode: normalizedMode,
        actor: normalizedMode === "confirm_bridge" ? "user" : "system",
      })

      res.json(approval)
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to send Kakao message",
      })
    }
  })

  return router
}
