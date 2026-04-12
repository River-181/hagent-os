import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { classifyInboundMessage } from "../lib/channel-message-heuristics.js"
import { processChannelInbound } from "../routes/webhook.js"

type TelegramChannelBinding = {
  enabled?: boolean
  botToken?: string
  botUsername?: string
  webhookSecret?: string
  transportMode?: "poll" | "webhook"
  lastUpdateId?: number
}

type TelegramUpdate = {
  update_id?: number
  message?: Record<string, unknown>
  edited_message?: Record<string, unknown>
}

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

export function getTelegramBinding(organization: typeof schema.organizations.$inferSelect): TelegramChannelBinding | null {
  const config = getOrganizationConfig(organization)
  const integrations = isPlainObject(config.integrations) ? config.integrations : {}
  const channels = isPlainObject(integrations.channels) ? integrations.channels : {}
  const telegram = isPlainObject(channels.telegram)
    ? channels.telegram
    : isPlainObject(config.channels) && isPlainObject(config.channels.telegram)
      ? config.channels.telegram
      : null
  return telegram as TelegramChannelBinding | null
}

function buildSenderName(message: Record<string, unknown>) {
  const from = isPlainObject(message.from) ? message.from : {}
  const username = typeof from.username === "string" ? from.username : null
  const firstName = typeof from.first_name === "string" ? from.first_name : null
  const lastName = typeof from.last_name === "string" ? from.last_name : null
  const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim()
  return username ?? (fallbackName || null)
}

export function normalizeTelegramUpdate(update: TelegramUpdate) {
  const message = isPlainObject(update.message)
    ? update.message
    : isPlainObject(update.edited_message)
      ? update.edited_message
      : null
  if (!message) return null

  const chat = isPlainObject(message.chat) ? message.chat : {}
  const from = isPlainObject(message.from) ? message.from : {}
  if (from.is_bot === true) return null
  if (typeof message.text !== "string" || !message.text.trim()) return null

  const chatId = chat.id != null ? String(chat.id) : null
  if (!chatId) return null

  return {
    updateId: typeof update.update_id === "number" ? update.update_id : null,
    message: message.text.trim(),
    senderId: chatId,
    senderName: buildSenderName(message) ?? chatId,
    threadId: chatId,
    username: typeof from.username === "string" ? from.username : null,
  }
}

function shouldIgnoreTelegramMessage(message: string) {
  return classifyInboundMessage(message).kind === "ignore"
}

async function persistLastUpdateId(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  lastUpdateId: number,
) {
  const nextConfig = mergeJsonConfig(getOrganizationConfig(organization), {
    integrations: {
      channels: {
        telegram: {
          lastUpdateId,
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
}

export async function syncTelegramInboundForOrganization(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
) {
  const binding = getTelegramBinding(organization)
  if (!binding?.enabled || !binding.botToken) {
    return { organizationId: organization.id, processed: 0, ignored: 0, skipped: true, reason: "telegram_not_configured" }
  }
  if (binding.transportMode === "webhook") {
    return { organizationId: organization.id, processed: 0, ignored: 0, skipped: true, reason: "webhook_mode" }
  }

  const offset = typeof binding.lastUpdateId === "number" ? binding.lastUpdateId + 1 : undefined
  const url = new URL(`https://api.telegram.org/bot${binding.botToken}/getUpdates`)
  if (typeof offset === "number") {
    url.searchParams.set("offset", String(offset))
  }
  url.searchParams.set("limit", "20")
  url.searchParams.set("timeout", "0")

  const response = await fetch(url)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || payload.ok === false) {
    throw new Error(typeof payload.description === "string" ? payload.description : `Telegram getUpdates failed (${response.status})`)
  }

  const updates = Array.isArray(payload.result) ? (payload.result as TelegramUpdate[]) : []
  let processed = 0
  let ignored = 0
  let lastSeenUpdateId = typeof binding.lastUpdateId === "number" ? binding.lastUpdateId : null

  for (const update of updates) {
    if (typeof update.update_id === "number") {
      lastSeenUpdateId = update.update_id
    }
    const normalized = normalizeTelegramUpdate(update)
    if (!normalized) {
      ignored += 1
      continue
    }
    if (shouldIgnoreTelegramMessage(normalized.message)) {
      ignored += 1
      continue
    }

    await processChannelInbound(db, "telegram", {
      message: normalized.message,
      senderId: normalized.senderId,
      senderName: normalized.senderName,
      threadId: normalized.threadId,
      origin: "telegram-poll",
      scenarioKey: "telegram-live-poll",
      botToken: binding.botToken,
      botUsername: binding.botUsername,
    }, {
      awaitRouting: true,
      organization,
    })
    processed += 1
  }

  if (typeof lastSeenUpdateId === "number") {
    await persistLastUpdateId(db, organization, lastSeenUpdateId)
  }

  return {
    organizationId: organization.id,
    processed,
    ignored,
    skipped: false,
    lastUpdateId: lastSeenUpdateId,
  }
}

export async function syncTelegramInbound(
  db: Db,
  options?: { organizationId?: string },
) {
  const organizations = options?.organizationId
    ? await db.select().from(schema.organizations).where(eq(schema.organizations.id, options.organizationId))
    : await db.select().from(schema.organizations)

  const results = []
  for (const organization of organizations) {
    const binding = getTelegramBinding(organization)
    if (!binding?.enabled || !binding.botToken) continue
    const result = await syncTelegramInboundForOrganization(db, organization)
    results.push(result)
  }

  return results
}

export function startTelegramInboundPolling(db: Db, intervalMs = 15000) {
  const timer = setInterval(() => {
    void syncTelegramInbound(db).catch(() => null)
  }, intervalMs)
  timer.unref?.()

  void syncTelegramInbound(db).catch(() => null)

  return () => clearInterval(timer)
}
