import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import {
  installSkillForOrganization,
  listSkills,
  uninstallSkillForOrganization,
  updateOrganizationSkillConfig,
} from "../services/skills.js"

export function organizationRoutes(db: Db): Router {
  const router = Router()

  router.get("/", async (_req, res) => {
    try {
      const orgs = await db.select().from(schema.organizations)
      res.json(orgs)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch organizations" })
    }
  })

  // POST / — 새 조직 (학원) 생성
  router.post("/", async (req, res) => {
    try {
      const { name, description } = req.body
      if (!name || !name.trim()) {
        res.status(400).json({ error: "name required" })
        return
      }
      const prefix = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30) || `org-${Date.now()}`

      // prefix 충돌 방지
      const [existing] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.prefix, prefix))
      const finalPrefix = existing ? `${prefix}-${Date.now().toString(36).slice(-4)}` : prefix

      const [org] = await db
        .insert(schema.organizations)
        .values({
          name: name.trim(),
          prefix: finalPrefix,
          description: description ?? null,
        })
        .returning()

      res.status(201).json(org)
    } catch (err) {
      res.status(500).json({ error: "Failed to create organization" })
    }
  })

  router.get("/:id", async (req, res) => {
    try {
      const [org] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.id))

      if (!org) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      res.json(org)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch organization" })
    }
  })

  // DELETE /:id — 기관(학원) 삭제 (모든 하위 데이터 cascade)
  router.delete("/:id", async (req, res) => {
    try {
      const oid = req.params.id
      const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, oid))
      if (!org) { res.status(404).json({ error: "Organization not found" }); return }

      // FK 역순 삭제
      await db.delete(schema.activityEvents).where(eq(schema.activityEvents.organizationId, oid))
      await db.delete(schema.notifications).where(eq(schema.notifications.organizationId, oid))
      await db.delete(schema.approvals).where(eq(schema.approvals.organizationId, oid))
      await db.delete(schema.wakeupRequests).where(eq(schema.wakeupRequests.organizationId, oid))
      await db.delete(schema.agentRuns).where(eq(schema.agentRuns.organizationId, oid))
      const orgCases = await db.select({ id: schema.cases.id }).from(schema.cases).where(eq(schema.cases.organizationId, oid))
      for (const c of orgCases) {
        await db.delete(schema.caseComments).where(eq(schema.caseComments.caseId, c.id))
      }
      await db.delete(schema.cases).where(eq(schema.cases.organizationId, oid))
      await db.delete(schema.attendance).where(eq(schema.attendance.organizationId, oid))
      if (schema.studentSchedules) {
        await db.delete(schema.studentSchedules).where(eq(schema.studentSchedules.organizationId, oid))
      }
      await db.delete(schema.schedules).where(eq(schema.schedules.organizationId, oid))
      await db.delete(schema.parents).where(eq(schema.parents.organizationId, oid))
      await db.delete(schema.students).where(eq(schema.students.organizationId, oid))
      await db.delete(schema.instructors).where(eq(schema.instructors.organizationId, oid))
      await db.delete(schema.opsGoals).where(eq(schema.opsGoals.organizationId, oid))
      await db.delete(schema.opsGroups).where(eq(schema.opsGroups.organizationId, oid))
      await db.delete(schema.routines).where(eq(schema.routines.organizationId, oid))
      await db.delete(schema.documents).where(eq(schema.documents.organizationId, oid))
      await db.delete(schema.agents).where(eq(schema.agents.organizationId, oid))
      await db.delete(schema.organizations).where(eq(schema.organizations.id, oid))

      res.status(204).send()
    } catch (err) {
      res.status(500).json({ error: "Failed to delete organization" })
    }
  })

  router.get("/:orgId/skills", async (req, res) => {
    try {
      res.json(await listSkills(db, req.params.orgId))
    } catch {
      res.status(500).json({ error: "Failed to fetch organization skills" })
    }
  })

  router.post("/:orgId/skills/:slug/install", async (req, res) => {
    try {
      res.status(201).json(await installSkillForOrganization(db, req.params.orgId, req.params.slug))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to install skill" })
    }
  })

  router.delete("/:orgId/skills/:slug/install", async (req, res) => {
    try {
      await uninstallSkillForOrganization(db, req.params.orgId, req.params.slug)
      res.status(204).send()
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to uninstall skill" })
    }
  })

  router.put("/:orgId/skills/:slug/config", async (req, res) => {
    try {
      await updateOrganizationSkillConfig(db, req.params.orgId, req.params.slug, req.body ?? {})
      res.json({ ok: true })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update skill config" })
    }
  })

  return router
}
