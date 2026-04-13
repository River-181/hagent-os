import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { getTelegramCustomerBinding } from "../telegram-bindings.js"

export interface TelegramOutboundResult {
  provider: "telegram_auto_send" | "telegram_operator_bridge"
  status: "ready_to_send" | "sent" | "failed"
  automated: boolean
  draft: string
  recipient: {
    senderId?: string | null
    senderName?: string | null
    threadId?: string | null
    chatId?: string | null
  }
  bridge?: {
    botUsername?: string | null
    chatUrl?: string | null
    copyText: string
  }
  providerResponse?: {
    messageId?: string | null
    preview?: string | null
  }
  error?: string | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function resolveTelegramBinding(config: Record<string, unknown>) {
  return getTelegramCustomerBinding(config) ?? {}
}

function getProviderConfig(botToken?: string) {
  const token =
    botToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_API_TOKEN ||
    ""
  return {
    token,
    enabled: Boolean(token),
  }
}

export function getTelegramOutboundReadiness(botToken?: string) {
  const provider = getProviderConfig(botToken)
  return {
    connected: provider.enabled,
    missingEnv: provider.enabled ? [] : ["TELEGRAM_BOT_TOKEN"],
  }
}

export async function buildTelegramOutboundBridge(
  db: Db,
  input: {
    organizationId: string
    caseRecord: typeof schema.cases.$inferSelect
    draft: string
  },
): Promise<TelegramOutboundResult> {
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))

  const config = isPlainObject(organization?.agentTeamConfig) ? organization.agentTeamConfig : {}
  const binding = resolveTelegramBinding(config)
  const metadata = isPlainObject(input.caseRecord.metadata) ? input.caseRecord.metadata : {}
  const botUsername = binding.botUsername ?? null

  return {
    provider: "telegram_operator_bridge",
    status: "ready_to_send",
    automated: false,
    draft: input.draft,
    recipient: {
      senderId: typeof metadata.senderId === "string" ? metadata.senderId : null,
      senderName: typeof metadata.senderName === "string" ? metadata.senderName : null,
      threadId: typeof metadata.threadId === "string" ? metadata.threadId : null,
      chatId:
        (typeof metadata.threadId === "string" && metadata.threadId) ||
        (typeof metadata.senderId === "string" && metadata.senderId) ||
        null,
    },
    bridge: {
      botUsername,
      chatUrl: botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}` : null,
      copyText: input.draft,
    },
  }
}

export async function sendTelegramMessage(
  db: Db,
  input: {
    organizationId: string
    caseRecord: typeof schema.cases.$inferSelect
    approvalId: string
    draft: string
    mode?: "auto" | "bridge" | "confirm_bridge"
  },
): Promise<TelegramOutboundResult> {
  const mode = input.mode ?? "auto"
  const metadata = isPlainObject(input.caseRecord.metadata) ? input.caseRecord.metadata : {}
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))
  const config = isPlainObject(organization?.agentTeamConfig) ? organization.agentTeamConfig : {}
  const binding = resolveTelegramBinding(config)
  const provider = getProviderConfig(binding.botToken)

  if (mode === "confirm_bridge") {
    const bridge = await buildTelegramOutboundBridge(db, {
      organizationId: input.organizationId,
      caseRecord: input.caseRecord,
      draft: input.draft,
    })
    return {
      ...bridge,
      status: "sent",
      automated: false,
    }
  }

  if (mode === "bridge") {
    return buildTelegramOutboundBridge(db, {
      organizationId: input.organizationId,
      caseRecord: input.caseRecord,
      draft: input.draft,
    })
  }

  const chatId =
    (typeof metadata.threadId === "string" && metadata.threadId) ||
    (typeof metadata.senderId === "string" && metadata.senderId) ||
    null

  if (!provider.enabled || !chatId) {
    const bridge = await buildTelegramOutboundBridge(db, {
      organizationId: input.organizationId,
      caseRecord: input.caseRecord,
      draft: input.draft,
    })
    return !chatId
      ? {
          ...bridge,
          status: "failed",
          provider: "telegram_auto_send",
          error: "Telegram chat id is missing",
        }
      : bridge
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${provider.token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: input.draft,
        disable_web_page_preview: true,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok || payload.ok === false) {
      return {
        ...(await buildTelegramOutboundBridge(db, {
          organizationId: input.organizationId,
          caseRecord: input.caseRecord,
          draft: input.draft,
        })),
        status: "failed",
        provider: "telegram_auto_send",
        error:
          typeof payload.description === "string"
            ? payload.description
            : `HTTP ${response.status}`,
      }
    }

    const result = isPlainObject(payload.result) ? payload.result : {}
    return {
      provider: "telegram_auto_send",
      status: "sent",
      automated: true,
      draft: input.draft,
      recipient: {
        senderId: typeof metadata.senderId === "string" ? metadata.senderId : null,
        senderName: typeof metadata.senderName === "string" ? metadata.senderName : null,
        threadId: typeof metadata.threadId === "string" ? metadata.threadId : null,
        chatId,
      },
      bridge: {
        botUsername: binding.botUsername ?? null,
        chatUrl: binding.botUsername ? `https://t.me/${binding.botUsername.replace(/^@/, "")}` : null,
        copyText: input.draft,
      },
      providerResponse: {
        messageId:
          typeof result.message_id === "number"
            ? String(result.message_id)
            : null,
        preview: input.draft.slice(0, 240),
      },
    }
  } catch (error) {
    return {
      ...(await buildTelegramOutboundBridge(db, {
        organizationId: input.organizationId,
        caseRecord: input.caseRecord,
        draft: input.draft,
      })),
      status: "failed",
      provider: "telegram_auto_send",
      error: error instanceof Error ? error.message : "Failed to send Telegram message",
    }
  }
}
