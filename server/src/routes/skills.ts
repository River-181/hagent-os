import { Router } from "express"
import type { Db } from "@hagent/db"
import {
  createSkillPackage,
  exportSkillPackage,
  forkSkillPackage,
  getSkillDetail,
  getSkillFileContent,
  getSkillFileTree,
  importSkillPackage,
  listSkills,
  runSkillSyncCheck,
} from "../services/skills.js"

export function skillRoutes(_db: Db): Router {
  const router = Router()

  router.get("/", async (req, res) => {
    try {
      const orgId = typeof req.query.orgId === "string" ? req.query.orgId : undefined
      res.json(await listSkills(_db, orgId))
    } catch (error) {
      res.status(500).json({ error: "Failed to load skills" })
    }
  })

  router.get("/:slug", async (req, res) => {
    try {
      const orgId = typeof req.query.orgId === "string" ? req.query.orgId : undefined
      res.json(await getSkillDetail(_db, req.params.slug, orgId))
    } catch (error) {
      res.status(404).json({ error: "Skill not found" })
    }
  })

  router.get("/:slug/files", async (req, res) => {
    try {
      res.json({ files: await getSkillFileTree(_db, req.params.slug) })
    } catch {
      res.status(404).json({ error: "Skill not found" })
    }
  })

  router.get("/:slug/file", async (req, res) => {
    try {
      const requestedPath = typeof req.query.path === "string" ? req.query.path : "SKILL.md"
      res.json(await getSkillFileContent(_db, req.params.slug, requestedPath))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to read skill file" })
    }
  })

  router.post("/import", async (req, res) => {
    try {
      res.status(201).json(await importSkillPackage(_db, req.body))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import skill" })
    }
  })

  router.post("/create", async (req, res) => {
    try {
      res.status(201).json(await createSkillPackage(_db, req.body))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create skill" })
    }
  })

  router.post("/:slug/fork", async (req, res) => {
    try {
      res.status(201).json(await forkSkillPackage(_db, req.params.slug))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fork skill" })
    }
  })

  router.post("/:slug/export", async (req, res) => {
    try {
      const target = req.body?.target
      if (target !== "codex" && target !== "claude-code" && target !== "cursor") {
        res.status(400).json({ error: "Invalid export target" })
        return
      }
      res.json(await exportSkillPackage(_db, req.params.slug, target))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to export skill" })
    }
  })

  router.post("/:slug/sync-check", async (req, res) => {
    try {
      res.json(await runSkillSyncCheck(_db, req.params.slug))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to run sync check" })
    }
  })

  return router
}
