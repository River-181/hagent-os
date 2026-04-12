import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { classifyInboundMessage } from "../lib/channel-message-heuristics.js"
import { processChannelInbound } from "./webhook.js"
import { getTelegramBinding, normalizeTelegramUpdate, syncTelegramInbound } from "../services/telegram-inbound-sync.js"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function mergeJsonConfig(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
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

async function getTelegramApiJson(botToken: string, method: string, init?: RequestInit) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, init)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || payload.ok === false) {
    throw new Error(typeof payload.description === "string" ? payload.description : `Telegram ${method} failed (${response.status})`)
  }
  return payload
}

export function telegramRoutes(db: Db): Router {
  const router = Router()

  router.post("/channels/telegram/sync", async (req, res) => {
    try {
      const organizationId = typeof req.body?.organizationId === "string" ? req.body.organizationId : undefined
      const results = await syncTelegramInbound(db, { organizationId })
      res.json({ results })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to sync Telegram inbound" })
    }
  })

  router.post("/channels/telegram/webhook/:orgId", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const binding = getTelegramBinding(organization)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const secretHeader = req.header("x-telegram-bot-api-secret-token")
      if (binding.webhookSecret && secretHeader !== binding.webhookSecret) {
        res.status(403).json({ error: "Invalid Telegram webhook secret" })
        return
      }

      const update = isPlainObject(req.body) ? req.body : {}
      const normalized = normalizeTelegramUpdate(update)
      if (!normalized) {
        res.json({ ok: true, ignored: true })
        return
      }
      const inboundClass = classifyInboundMessage(normalized.message)
      if (inboundClass.kind === "ignore") {
        res.json({ ok: true, ignored: true, reason: inboundClass.reason })
        return
      }

      const result = await processChannelInbound(db, "telegram", {
        message: normalized.message,
        senderId: normalized.senderId,
        senderName: normalized.senderName,
        threadId: normalized.threadId,
        origin: "telegram-webhook",
        scenarioKey: "telegram-live-webhook",
        botToken: binding.botToken,
        botUsername: binding.botUsername,
      }, {
        awaitRouting: true,
        organization,
      })

      res.json({ ok: true, result })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Telegram webhook processing failed" })
    }
  })

  router.get("/channels/telegram/webhook/:orgId/status", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const binding = getTelegramBinding(organization)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const payload = await getTelegramApiJson(binding.botToken, "getWebhookInfo")
      res.json({
        transportMode: binding.transportMode ?? "poll",
        webhookInfo: payload.result ?? null,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fetch Telegram webhook status" })
    }
  })

  router.post("/channels/telegram/webhook/:orgId/register", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const binding = getTelegramBinding(organization)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const webhookUrl = typeof req.body?.webhookUrl === "string" ? req.body.webhookUrl.trim() : ""
      const secretToken = typeof req.body?.secretToken === "string" ? req.body.secretToken.trim() : ""
      if (!webhookUrl) {
        res.status(400).json({ error: "webhookUrl is required" })
        return
      }

      const payload = await getTelegramApiJson(binding.botToken, "setWebhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          ...(secretToken ? { secret_token: secretToken } : {}),
          allowed_updates: ["message", "edited_message"],
        }),
      })

      const nextConfig = mergeJsonConfig(getOrganizationConfig(organization), {
        integrations: {
          channels: {
            telegram: {
              transportMode: "webhook",
              webhookSecret: secretToken || binding.webhookSecret || null,
              webhookUrl,
            },
          },
        },
      })

      await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: nextConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organization.id))

      res.json({
        ok: true,
        transportMode: "webhook",
        webhookUrl,
        telegram: payload.result ?? true,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to register Telegram webhook" })
    }
  })

  router.post("/channels/telegram/webhook/:orgId/unregister", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const binding = getTelegramBinding(organization)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const payload = await getTelegramApiJson(binding.botToken, "deleteWebhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          drop_pending_updates: false,
        }),
      })

      const nextConfig = mergeJsonConfig(getOrganizationConfig(organization), {
        integrations: {
          channels: {
            telegram: {
              transportMode: "poll",
            },
          },
        },
      })

      await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: nextConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organization.id))

      res.json({
        ok: true,
        transportMode: "poll",
        telegram: payload.result ?? true,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to unregister Telegram webhook" })
    }
  })

  return router
}
