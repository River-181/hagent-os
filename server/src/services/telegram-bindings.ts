type JsonRecord = Record<string, unknown>

export type TelegramOwnerControlShape = {
  enabled?: boolean
  passwordHash?: string | null
  sessionTtlMinutes?: number
  allowNaturalLanguage?: boolean
  confirmDangerousMutations?: boolean
  authorizedChats?: unknown[]
  pendingConfirmations?: unknown[]
  botToken?: string
  botUsername?: string
  webhookSecret?: string
  transportMode?: "poll" | "webhook"
}

export type TelegramChannelBindingShape = {
  enabled?: boolean
  botToken?: string
  botUsername?: string
  webhookSecret?: string
  transportMode?: "poll" | "webhook"
  autoReply?: boolean
  displayName?: string
  channelId?: string
  chatUrl?: string
  lastUpdateId?: number
  ownerControl?: TelegramOwnerControlShape
  customer?: TelegramChannelBindingShape
  ops?: TelegramChannelBindingShape
}

function isPlainObject(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function getOrganizationConfig(input: { agentTeamConfig?: unknown } | JsonRecord | unknown): JsonRecord {
  if (isPlainObject(input) && "agentTeamConfig" in input) {
    return isPlainObject(input.agentTeamConfig) ? input.agentTeamConfig : {}
  }
  return isPlainObject(input) ? input : {}
}

export function getTelegramSection(input: { agentTeamConfig?: unknown } | JsonRecord | unknown): TelegramChannelBindingShape | null {
  const config = getOrganizationConfig(input)
  const integrations = isPlainObject(config.integrations) ? config.integrations : {}
  const channels = isPlainObject(integrations.channels) ? integrations.channels : {}
  const telegram =
    isPlainObject(channels.telegram)
      ? channels.telegram
      : isPlainObject(config.channels) && isPlainObject(config.channels.telegram)
        ? config.channels.telegram
        : null
  return telegram as TelegramChannelBindingShape | null
}

export function getTelegramCustomerBinding(input: { agentTeamConfig?: unknown } | JsonRecord | unknown): TelegramChannelBindingShape | null {
  const telegram = getTelegramSection(input)
  if (!telegram) return null
  const customer = isPlainObject(telegram.customer) ? (telegram.customer as TelegramChannelBindingShape) : null
  if (!customer) return telegram
  return {
    ...telegram,
    ...customer,
    ownerControl: undefined,
    customer: undefined,
    ops: undefined,
  }
}

export function getTelegramOpsBinding(input: { agentTeamConfig?: unknown } | JsonRecord | unknown): TelegramChannelBindingShape | null {
  const telegram = getTelegramSection(input)
  if (!telegram) return null
  const ops = isPlainObject(telegram.ops) ? (telegram.ops as TelegramChannelBindingShape) : null
  const inheritedOwnerControl = isPlainObject(telegram.ownerControl) ? telegram.ownerControl : undefined
  if (!ops) {
    const ownerToken =
      inheritedOwnerControl && typeof inheritedOwnerControl.botToken === "string" && inheritedOwnerControl.botToken.trim()
        ? inheritedOwnerControl.botToken
        : undefined
    const ownerUsername =
      inheritedOwnerControl && typeof inheritedOwnerControl.botUsername === "string" && inheritedOwnerControl.botUsername.trim()
        ? inheritedOwnerControl.botUsername
        : undefined
    const ownerSecret =
      inheritedOwnerControl && typeof inheritedOwnerControl.webhookSecret === "string" && inheritedOwnerControl.webhookSecret.trim()
        ? inheritedOwnerControl.webhookSecret
        : undefined
    const ownerTransport =
      inheritedOwnerControl && (inheritedOwnerControl.transportMode === "webhook" || inheritedOwnerControl.transportMode === "poll")
        ? inheritedOwnerControl.transportMode
        : undefined
    return {
      ...telegram,
      ...(ownerToken ? { botToken: ownerToken } : {}),
      ...(ownerUsername ? { botUsername: ownerUsername } : {}),
      ...(ownerSecret ? { webhookSecret: ownerSecret } : {}),
      ...(ownerTransport ? { transportMode: ownerTransport } : {}),
    }
  }
  const ownOwnerControl = isPlainObject(ops.ownerControl) ? ops.ownerControl : undefined
  return {
    ...telegram,
    ...ops,
    ownerControl: ownOwnerControl ?? inheritedOwnerControl,
    customer: undefined,
    ops: undefined,
  }
}
