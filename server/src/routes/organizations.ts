import { Router } from "express"
import { desc, eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { z } from "zod"
import {
  installSkillForOrganization,
  listSkills,
  uninstallSkillForOrganization,
  updateOrganizationSkillConfig,
} from "../services/skills.js"
import { bootstrapOrganization as runBootstrap } from "../services/bootstrap.js"

const organizationPatchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  settings: z
    .object({
      general: z
        .object({
          institutionType: z.string().optional(),
          institutionSize: z.string().optional(),
          topGoal: z.string().optional(),
          principalName: z.string().optional(),
        })
        .partial()
        .optional(),
      aiPolicy: z
        .object({
          primaryAdapterType: z.enum(["codex_local", "claude_local", "mock_local"]).optional(),
          primaryModel: z.string().optional(),
          fallbackAdapterType: z.enum(["codex_local", "claude_local", "mock_local"]).optional(),
          autoRun: z.boolean().optional(),
          allowDegradedMode: z.boolean().optional(),
          applyToExistingAgents: z.boolean().optional(),
        })
        .partial()
        .optional(),
      integrations: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
      instance: z.record(z.string(), z.unknown()).optional(),
    })
    .partial()
    .optional(),
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function mergeJsonConfig(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...base }

  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeJsonConfig(next[key] as Record<string, unknown>, value)
      continue
    }
    next[key] = value
  }

  return next
}

function getOrganizationConfig(organization: typeof schema.organizations.$inferSelect) {
  return isPlainObject(organization.agentTeamConfig) ? organization.agentTeamConfig : {}
}

function getChannelsFromConfig(config: Record<string, unknown>) {
  const integrations = isPlainObject(config.integrations) ? config.integrations : {}
  const integrationChannels = isPlainObject(integrations.channels) ? integrations.channels : {}
  if (Object.keys(integrationChannels).length > 0) {
    return integrationChannels
  }
  return isPlainObject(config.channels) ? config.channels : {}
}

export function organizationRoutes(db: Db): Router {
  const router = Router()

  router.get("/", async (_req, res) => {
    try {
      const orgs = await db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt))
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

  router.post("/bootstrap", async (req, res) => {
    try {
      const result = await runBootstrap(db, req.body)
      res.status(201).json(result)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Failed to bootstrap organization" })
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

  router.patch("/:id", async (req, res) => {
    try {
      const input = organizationPatchSchema.parse(req.body ?? {})
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.id))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const normalizedSettings = input.settings
        ? {
            ...input.settings,
            ...(input.settings.aiPolicy
              ? {
                  aiPolicy: Object.fromEntries(
                    Object.entries(input.settings.aiPolicy).filter(([key]) => key !== "applyToExistingAgents"),
                  ),
                }
              : {}),
          }
        : undefined

      const nextConfig = mergeJsonConfig(
        isPlainObject(organization.agentTeamConfig) ? organization.agentTeamConfig : {},
        normalizedSettings ?? {},
      )
      if (isPlainObject(nextConfig.aiPolicy) && "applyToExistingAgents" in nextConfig.aiPolicy) {
        const { applyToExistingAgents: _discarded, ...rest } = nextConfig.aiPolicy
        nextConfig.aiPolicy = rest
      }

      const [updated] = await db
        .update(schema.organizations)
        .set({
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(Object.prototype.hasOwnProperty.call(input, "description")
            ? { description: input.description ?? null }
            : {}),
          agentTeamConfig: nextConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organization.id))
        .returning()

      const aiPolicy = input.settings?.aiPolicy
      if (aiPolicy?.primaryAdapterType || aiPolicy?.primaryModel || Object.prototype.hasOwnProperty.call(aiPolicy ?? {}, "autoRun")) {
        const adapterType =
          aiPolicy?.primaryAdapterType ??
          ((nextConfig.aiPolicy as Record<string, unknown> | undefined)?.primaryAdapterType as string | undefined) ??
          "codex_local"
        const selectedModel =
          aiPolicy?.primaryModel ??
          ((nextConfig.aiPolicy as Record<string, unknown> | undefined)?.primaryModel as string | undefined) ??
          null
        const autoRun =
          typeof aiPolicy?.autoRun === "boolean"
            ? aiPolicy.autoRun
            : ((nextConfig.aiPolicy as Record<string, unknown> | undefined)?.autoRun as boolean | undefined) ?? true

        if (aiPolicy?.applyToExistingAgents !== false) {
          const orgAgents = await db
            .select()
            .from(schema.agents)
            .where(eq(schema.agents.organizationId, organization.id))

          for (const agent of orgAgents) {
            const currentConfig = isPlainObject(agent.adapterConfig) ? agent.adapterConfig : {}
            await db
              .update(schema.agents)
              .set({
                adapterType,
                adapterConfig: {
                  ...currentConfig,
                  model: selectedModel ?? currentConfig.model ?? null,
                  autoRun,
                },
                updatedAt: new Date(),
              })
              .where(eq(schema.agents.id, agent.id))
          }
        }
      }

      await db.insert(schema.activityEvents).values({
        organizationId: organization.id,
        actorType: "user",
        actorId: "settings",
        action: "organization.updated",
        entityType: "organization",
        entityId: organization.id,
        entityTitle: updated.name,
        metadata: {
          fields: Object.keys(input),
          settingsSections: Object.keys(normalizedSettings ?? {}),
        } as Record<string, unknown>,
      })

      if (normalizedSettings?.integrations) {
        await db.insert(schema.activityEvents).values({
          organizationId: organization.id,
          actorType: "user",
          actorId: "settings",
          action: "integration.checked",
          entityType: "organization",
          entityId: organization.id,
          entityTitle: updated.name,
          metadata: {
            integrations: Object.keys(normalizedSettings.integrations),
          } as Record<string, unknown>,
        })
      }

      res.json(updated)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update organization" })
    }
  })

  router.get("/:id/channels", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.id))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const config = getOrganizationConfig(organization)
      const channels = getChannelsFromConfig(config)
      res.json(channels)
    } catch {
      res.status(500).json({ error: "Failed to fetch channels" })
    }
  })

  router.put("/:id/channels/:channelKey", async (req, res) => {
    try {
      const channelKey = req.params.channelKey
      if (!["kakao", "telegram", "sms", "naver"].includes(channelKey)) {
        res.status(400).json({ error: "Unsupported channelKey" })
        return
      }

      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.id))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const config = getOrganizationConfig(organization)
      const nextConfig = mergeJsonConfig(config, {
        integrations: {
          channels: {
            [channelKey]: req.body ?? {},
          },
        },
      })

      const [updated] = await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: nextConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organization.id))
        .returning()

      await db.insert(schema.activityEvents).values({
        organizationId: organization.id,
        actorType: "user",
        actorId: "settings",
        action: "integration.checked",
        entityType: "organization",
        entityId: organization.id,
        entityTitle: updated.name,
        metadata: {
          channelKey,
          mode: "channel_binding_updated",
        } as Record<string, unknown>,
      })

      const updatedConfig = getOrganizationConfig(updated)
      res.json(getChannelsFromConfig(updatedConfig) as Record<string, unknown>)
    } catch {
      res.status(400).json({ error: "Failed to update channel binding" })
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

  // GET /:id/export — 기관 전체 데이터 JSON 내보내기
  router.get("/:id/export", async (req, res) => {
    try {
      const oid = req.params.id
      const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, oid))
      if (!org) { res.status(404).json({ error: "Organization not found" }); return }

      const [agents, cases, approvals, students, instructors, schedules, routines, opsGoals, documents, agentRuns] =
        await Promise.all([
          db.select().from(schema.agents).where(eq(schema.agents.organizationId, oid)),
          db.select().from(schema.cases).where(eq(schema.cases.organizationId, oid)),
          db.select().from(schema.approvals).where(eq(schema.approvals.organizationId, oid)),
          db.select().from(schema.students).where(eq(schema.students.organizationId, oid)),
          db.select().from(schema.instructors).where(eq(schema.instructors.organizationId, oid)),
          db.select().from(schema.schedules).where(eq(schema.schedules.organizationId, oid)),
          db.select().from(schema.routines).where(eq(schema.routines.organizationId, oid)),
          db.select().from(schema.opsGoals).where(eq(schema.opsGoals.organizationId, oid)),
          db.select().from(schema.documents).where(eq(schema.documents.organizationId, oid)),
          db.select().from(schema.agentRuns).where(eq(schema.agentRuns.organizationId, oid)),
        ])

      const caseIds = cases.map((c) => c.id)
      const caseComments = caseIds.length > 0
        ? (await Promise.all(caseIds.map((cid) => db.select().from(schema.caseComments).where(eq(schema.caseComments.caseId, cid))))).flat()
        : []

      const payload = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        organization: org,
        agents,
        cases,
        caseComments,
        approvals,
        students,
        instructors,
        schedules,
        routines,
        opsGoals,
        documents,
        agentRuns,
      }

      const safeName = (org.name ?? oid).replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
      const filename = `hagent-export-${safeName}-${new Date().toISOString().slice(0, 10)}.json`
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
      res.setHeader("Content-Type", "application/json")
      res.json(payload)
    } catch (err) {
      res.status(500).json({ error: "Failed to export organization data" })
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
