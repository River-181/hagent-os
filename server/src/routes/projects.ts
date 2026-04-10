// v0.3.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export function projectRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/projects", async (req, res) => {
    try {
      const projects = await db.select().from(schema.opsGroups)
        .where(eq(schema.opsGroups.organizationId, req.params.orgId))
      // Get case counts per project
      const cases = await db.select().from(schema.cases)
        .where(eq(schema.cases.organizationId, req.params.orgId))

      const enriched = projects.map(p => ({
        ...p,
        caseCount: cases.filter(c => c.opsGroupId === p.id).length,
        activeCases: cases.filter(c => c.opsGroupId === p.id && c.status !== "done").length,
      }))
      res.json(enriched)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch projects" })
    }
  })

  router.get("/projects/:id", async (req, res) => {
    try {
      const [project] = await db.select().from(schema.opsGroups)
        .where(eq(schema.opsGroups.id, req.params.id))
      if (!project) { res.status(404).json({ error: "Not found" }); return }

      const cases = await db.select().from(schema.cases)
        .where(eq(schema.cases.opsGroupId, req.params.id))

      res.json({ ...project, cases })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project" })
    }
  })

  router.post("/organizations/:orgId/projects", async (req, res) => {
    try {
      const [project] = await db.insert(schema.opsGroups).values({
        organizationId: req.params.orgId,
        name: req.body.name,
        description: req.body.description ?? null,
        color: req.body.color ?? null,
      }).returning()
      res.status(201).json(project)
    } catch (err) {
      res.status(500).json({ error: "Failed to create project" })
    }
  })

  return router
}
