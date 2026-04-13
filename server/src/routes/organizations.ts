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
import { RICH_CASES, CEO_MEMORY, DEMO_DOCUMENTS } from "../data/rich-demo-seed.js"
import { createCaseWithRetry } from "../lib/case-create.js"

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
          primaryAdapterType: z.enum(["codex_qauth", "codex_local", "claude_local", "mock_local"]).optional(),
          primaryModel: z.string().optional(),
          apiKey: z.string().optional(),
          fallbackAdapterType: z.enum(["codex_qauth", "codex_local", "claude_local", "mock_local"]).optional(),
          autoRun: z.boolean().optional(),
          allowDegradedMode: z.boolean().optional(),
          applyToExistingAgents: z.boolean().optional(),
          monthlyBudgetKrw: z.number().optional(),
          modelPricing: z.record(
            z.string(),
            z.object({
              inputPer1kKrw: z.number().optional(),
              outputPer1kKrw: z.number().optional(),
            }).partial(),
          ).optional(),
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
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

const SECRET_MASK = "***"
const SECRET_KEY_EXACT = new Set(["apikey", "password", "passwordhash", "secret", "token", "credential", "credentials"])
const SECRET_KEY_SUFFIXES = ["apikey", "password", "token", "secret"]

function isSecretFieldKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!normalized) return false
  if (SECRET_KEY_EXACT.has(normalized)) return true
  return SECRET_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

function maskSecretsDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => maskSecretsDeep(item)) as T
  }

  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (isSecretFieldKey(key) && item !== null && item !== undefined && item !== "") {
        next[key] = SECRET_MASK
        continue
      }
      next[key] = maskSecretsDeep(item)
    }
    return next as T
  }

  return value
}

function sanitizeChannelsForClient(channels: Record<string, unknown>) {
  const next = JSON.parse(JSON.stringify(channels)) as Record<string, unknown>
  const telegram = isPlainObject(next.telegram) ? next.telegram : null
  if (telegram) {
    if (typeof telegram.botToken === "string" && telegram.botToken.trim()) {
      delete telegram.botToken
      telegram.botTokenConfigured = true
    }
    if (typeof telegram.webhookSecret === "string" && telegram.webhookSecret.trim()) {
      delete telegram.webhookSecret
      telegram.webhookSecretConfigured = true
    }
    const ownerControl = isPlainObject(telegram.ownerControl) ? telegram.ownerControl : null
    if (ownerControl) {
      if (typeof ownerControl.passwordHash === "string" && ownerControl.passwordHash.trim()) {
        delete ownerControl.passwordHash
        ownerControl.passwordConfigured = true
      }
    }
  }
  return next
}

function sanitizeProvidersForClient(providers: Record<string, unknown>) {
  const next = JSON.parse(JSON.stringify(providers)) as Record<string, unknown>
  const koreanLaw = isPlainObject(next.koreanLaw) ? next.koreanLaw : null
  if (koreanLaw) {
    if (typeof koreanLaw.apiKey === "string" && koreanLaw.apiKey.trim()) {
      delete koreanLaw.apiKey
      koreanLaw.apiKeyConfigured = true
    }
  }
  return next
}

function getChannelsFromConfig(config: Record<string, unknown>) {
  const integrations = isPlainObject(config.integrations) ? config.integrations : {}
  const integrationChannels = isPlainObject(integrations.channels) ? integrations.channels : {}
  if (Object.keys(integrationChannels).length > 0) {
    return sanitizeChannelsForClient(integrationChannels)
  }
  return isPlainObject(config.channels) ? sanitizeChannelsForClient(config.channels) : {}
}

function sanitizeOrganizationForClient(organization: typeof schema.organizations.$inferSelect) {
  const config = getOrganizationConfig(organization)
  if (!Object.keys(config).length) return organization

  const nextConfig = JSON.parse(JSON.stringify(config)) as Record<string, unknown>
  const aiPolicy = isPlainObject(nextConfig.aiPolicy) ? nextConfig.aiPolicy : null
  if (aiPolicy) {
    if (typeof aiPolicy.apiKey === "string" && aiPolicy.apiKey.trim()) {
      delete aiPolicy.apiKey
      aiPolicy.apiKeyConfigured = true
    }
  }

  const integrations = isPlainObject(nextConfig.integrations) ? nextConfig.integrations : null
  if (integrations && isPlainObject(integrations.channels)) {
    integrations.channels = sanitizeChannelsForClient(integrations.channels)
  }
  if (integrations && isPlainObject(integrations.providers)) {
    integrations.providers = sanitizeProvidersForClient(integrations.providers)
  }

  if (isPlainObject(nextConfig.channels)) {
    nextConfig.channels = sanitizeChannelsForClient(nextConfig.channels)
  }

  return {
    ...organization,
    agentTeamConfig: nextConfig,
  }
}

export function organizationRoutes(db: Db): Router {
  const router = Router()

  router.get("/", async (_req, res) => {
    try {
      const orgs = await db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt))
      res.json(orgs.map(sanitizeOrganizationForClient))
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

      res.status(201).json(sanitizeOrganizationForClient(org))
    } catch (err) {
      res.status(500).json({ error: "Failed to create organization" })
    }
  })

  router.post("/bootstrap", async (req, res) => {
    try {
      const result = await runBootstrap(db, req.body)
      if (result && typeof result === "object" && "organization" in result && result.organization) {
        res.status(201).json({
          ...maskSecretsDeep(result),
          organization: sanitizeOrganizationForClient(result.organization as typeof schema.organizations.$inferSelect),
        })
        return
      }
      res.status(201).json(maskSecretsDeep(result))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to bootstrap organization"
      const stack = err instanceof Error ? err.stack : undefined
      req.log?.error({ err: { message, stack } }, "bootstrap organization failed")
      res.status(400).json({ error: message, detail: stack?.split("\n").slice(0, 6).join("\n") })
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

      res.json(sanitizeOrganizationForClient(org))
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

      res.json(sanitizeOrganizationForClient(updated))
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
      await db.delete(schema.tokenUsageEvents).where(eq(schema.tokenUsageEvents.organizationId, oid))
      await db.delete(schema.tokenBudgets).where(eq(schema.tokenBudgets.organizationId, oid))
      await db.delete(schema.skillSyncJobs).where(eq(schema.skillSyncJobs.organizationId, oid))
      await db.delete(schema.organizationSkills).where(eq(schema.organizationSkills.organizationId, oid))
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
      const orgAgents = await db.select({ id: schema.agents.id }).from(schema.agents).where(eq(schema.agents.organizationId, oid))
      for (const agent of orgAgents) {
        await db.delete(schema.agentSkills).where(eq(schema.agentSkills.agentId, agent.id))
      }
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
      res.json(maskSecretsDeep(payload))
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

  /** 심사용 풍부한 데모 데이터 시드 — 기존 org에 직접 주입 */
  router.post("/:orgId/seed-demo", async (req, res) => {
    try {
      const { orgId } = req.params
      const agents = await db.select({ id: schema.agents.id, slug: schema.agents.slug, agentType: schema.agents.agentType })
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, orgId))

      const ceoAgent = agents.find((a) => a.slug === "ceo" || a.slug === "orchestrator")
      const complaintAgent = agents.find((a) => a.slug === "complaint" || a.slug === "counseling")
      const schedulerAgent = agents.find((a) => a.slug === "scheduler")

      let seeded = 0
      for (const seed of RICH_CASES) {
        const daysAgo = seed.daysAgo ?? 0
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        const assigneeAgent =
          seed.type === "schedule" ? schedulerAgent :
          (seed.type === "complaint" || seed.type === "refund" || seed.type === "churn") ? complaintAgent :
          ceoAgent
        try {
          const caseRecord = await createCaseWithRetry(db, {
            organizationId: orgId,
            title: seed.title,
            type: seed.type,
            status: seed.status,
            severity: seed.severity,
            source: seed.source as "manual" | "kakao" | "telegram" | "web",
            agentDraft: seed.agentDraft,
            assigneeAgentId: assigneeAgent?.id ?? null,
            metadata: { caseKind: seed.caseKind, seeded: true } as Record<string, unknown>,
            createdAt,
            updatedAt: new Date(createdAt.getTime() + (seed.comments.length > 0 ? seed.comments[seed.comments.length - 1].offsetHours * 3600000 : 0)),
          })
          for (const comment of seed.comments) {
            const commentAt = new Date(createdAt.getTime() + comment.offsetHours * 3600000)
            await db.insert(schema.caseComments).values({
              caseId: caseRecord.id,
              authorType: comment.authorType,
              authorId: comment.authorType === "agent" ? (assigneeAgent?.id ?? "system") : "system",
              content: comment.content,
              createdAt: commentAt,
            }).catch(() => null)
          }
          seeded++
        } catch { /* skip individual failures */ }
      }

      if (ceoAgent) {
        await db.update(schema.agents)
          .set({ memory: CEO_MEMORY as unknown as Record<string, unknown> })
          .where(eq(schema.agents.id, ceoAgent.id))
          .catch(() => null)
      }

      // 문서 12개 시딩 (기존 시드 문서 제외하고 추가)
      let docSeeded = 0
      for (const doc of DEMO_DOCUMENTS) {
        try {
          await db.insert(schema.documents).values({
            organizationId: orgId,
            title: doc.title,
            body: doc.body,
            category: doc.category,
            tags: doc.tags,
          })
          docSeeded++
        } catch { /* skip individual failures */ }
      }

      res.json({ ok: true, seeded, docs: docSeeded, agents: agents.length })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Seed failed" })
    }
  })

  return router
}
