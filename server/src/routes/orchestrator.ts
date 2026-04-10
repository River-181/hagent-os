import { Router } from "express"
import pino from "pino"
import type { Db } from "@hagent/db"
import { dispatchInstruction } from "../services/orchestration.js"

const logger = pino({ level: "info" })

export function orchestratorRoutes(db: Db): Router {
  const router = Router()

  // POST /api/orchestrator/dispatch
  router.post("/dispatch", async (req, res) => {
    try {
      const { instruction, organizationId } = req.body as {
        instruction: string
        organizationId: string
      }

      if (!instruction || !organizationId) {
        res.status(400).json({ error: "instruction and organizationId are required" })
        return
      }

      const result = await dispatchInstruction(db, { organizationId, instruction })

      logger.info(
        { organizationId, instruction: instruction.slice(0, 80), runCount: result.runIds.length },
        "Orchestrator dispatch completed",
      )

      res.json(result)
    } catch (err) {
      logger.error({ err }, "Orchestrator dispatch error")
      res.status(500).json({ error: "Dispatch failed" })
    }
  })

  return router
}
