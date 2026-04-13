import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function runRoutes(db: Db): Router {
  const router = Router()

  router.get("/:id", async (req, res) => {
    try {
      const [run] = await db
        .select()
        .from(schema.agentRuns)
        .where(eq(schema.agentRuns.id, req.params.id))

      if (!run) {
        res.status(404).json({ error: "Agent run not found" })
        return
      }

      res.json(run)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch agent run" })
    }
  })

  return router
}
