import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

type KakaoChannelBinding = {
  enabled?: boolean
  channelId?: string
  botId?: string
  searchId?: string
  displayName?: string
  channelUrl?: string
  chatUrl?: string
}

export interface KakaoOutboundResult {
  provider: "kakao_auto_send" | "kakao_operator_bridge"
  status: "ready_to_send" | "sent" | "failed"
  automated: boolean
  draft: string
  recipient: {
    senderId?: string | null
    senderName?: string | null
    threadId?: string | null
  }
  bridge?: {
    channelUrl?: string | null
    chatUrl?: string | null
    channelName?: string | null
    copyText: string
  }
  providerResponse?: {
    requestId?: string | null
    preview?: string | null
  }
  error?: string | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function resolveKakaoBinding(config: Record<string, unknown>): KakaoChannelBinding {
  const integrations = isPlainObject(config.integrations) ? config.integrations : {}
  const channels = isPlainObject(integrations.channels) ? integrations.channels : {}
  const kakao = isPlainObject(channels.kakao) ? channels.kakao : isPlainObject(config.channels) && isPlainObject(config.channels.kakao) ? config.channels.kakao : {}
  return kakao as KakaoChannelBinding
}

function getProviderConfig() {
  const url = process.env.KAKAO_OUTBOUND_PROVIDER_URL || ""
  const token = process.env.KAKAO_OUTBOUND_PROVIDER_TOKEN || ""
  return {
    url,
    token,
    enabled: Boolean(url),
  }
}

export function getKakaoOutboundReadiness() {
  const provider = getProviderConfig()
  return {
    connected: provider.enabled,
    missingEnv: provider.enabled ? [] : ["KAKAO_OUTBOUND_PROVIDER_URL"],
  }
}

export async function buildKakaoOutboundBridge(
  db: Db,
  input: {
    organizationId: string
    caseRecord: typeof schema.cases.$inferSelect
    draft: string
  },
): Promise<KakaoOutboundResult> {
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))

  const config = isPlainObject(organization?.agentTeamConfig) ? organization.agentTeamConfig : {}
  const binding = resolveKakaoBinding(config)
  const metadata = isPlainObject(input.caseRecord.metadata) ? input.caseRecord.metadata : {}

  return {
    provider: "kakao_operator_bridge",
    status: "ready_to_send",
    automated: false,
    draft: input.draft,
    recipient: {
      senderId: typeof metadata.senderId === "string" ? metadata.senderId : null,
      senderName: typeof metadata.senderName === "string" ? metadata.senderName : null,
      threadId: typeof metadata.threadId === "string" ? metadata.threadId : null,
    },
    bridge: {
      channelUrl: binding.channelUrl ?? null,
      chatUrl: binding.chatUrl ?? null,
      channelName: binding.displayName ?? organization?.name ?? null,
      copyText: input.draft,
    },
  }
}

export async function sendKakaoMessage(
  db: Db,
  input: {
    organizationId: string
    caseRecord: typeof schema.cases.$inferSelect
    approvalId: string
    draft: string
    mode?: "auto" | "bridge" | "confirm_bridge"
  },
): Promise<KakaoOutboundResult> {
  const mode = input.mode ?? "auto"

  if (mode === "confirm_bridge") {
    const bridge = await buildKakaoOutboundBridge(db, {
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
    return buildKakaoOutboundBridge(db, {
      organizationId: input.organizationId,
      caseRecord: input.caseRecord,
      draft: input.draft,
    })
  }

  const provider = getProviderConfig()
  if (!provider.enabled) {
    return buildKakaoOutboundBridge(db, {
      organizationId: input.organizationId,
      caseRecord: input.caseRecord,
      draft: input.draft,
    })
  }

  const metadata = isPlainObject(input.caseRecord.metadata) ? input.caseRecord.metadata : {}
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))
  const config = isPlainObject(organization?.agentTeamConfig) ? organization.agentTeamConfig : {}
  const binding = resolveKakaoBinding(config)

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(provider.token ? { Authorization: `Bearer ${provider.token}` } : {}),
      },
      body: JSON.stringify({
        approvalId: input.approvalId,
        organizationId: input.organizationId,
        caseId: input.caseRecord.id,
        identifier: input.caseRecord.identifier,
        channel: {
          channelId: binding.channelId ?? null,
          botId: binding.botId ?? null,
          searchId: binding.searchId ?? null,
          displayName: binding.displayName ?? organization?.name ?? null,
          channelUrl: binding.channelUrl ?? null,
          chatUrl: binding.chatUrl ?? null,
        },
        recipient: {
          senderId: typeof metadata.senderId === "string" ? metadata.senderId : null,
          senderName: typeof metadata.senderName === "string" ? metadata.senderName : null,
          threadId: typeof metadata.threadId === "string" ? metadata.threadId : null,
        },
        message: {
          text: input.draft,
        },
      }),
    })

    const text = await response.text()
    if (!response.ok) {
      return {
        ...(await buildKakaoOutboundBridge(db, {
          organizationId: input.organizationId,
          caseRecord: input.caseRecord,
          draft: input.draft,
        })),
        status: "failed",
        provider: "kakao_auto_send",
        error: text || `HTTP ${response.status}`,
      }
    }

    let payload: Record<string, unknown> = {}
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      payload = {}
    }

    return {
      provider: "kakao_auto_send",
      status: "sent",
      automated: true,
      draft: input.draft,
      recipient: {
        senderId: typeof metadata.senderId === "string" ? metadata.senderId : null,
        senderName: typeof metadata.senderName === "string" ? metadata.senderName : null,
        threadId: typeof metadata.threadId === "string" ? metadata.threadId : null,
      },
      providerResponse: {
        requestId: typeof payload.requestId === "string" ? payload.requestId : null,
        preview: typeof payload.preview === "string" ? payload.preview : text.slice(0, 240),
      },
    }
  } catch (error) {
    return {
      ...(await buildKakaoOutboundBridge(db, {
        organizationId: input.organizationId,
        caseRecord: input.caseRecord,
        draft: input.draft,
      })),
      status: "failed",
      provider: "kakao_auto_send",
      error: error instanceof Error ? error.message : "Failed to send Kakao message",
    }
  }
}
