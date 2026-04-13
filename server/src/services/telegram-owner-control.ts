import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { resolveCaseRunAgent } from "./case-run-routing.js"
import { executeAgentRun } from "./execution.js"
import { publishEvent } from "./live-events.js"
import { processApprovalDecision } from "./approval-decisions.js"
import { getApprovalLevelForAgentType, inferCaseType } from "./orchestration.js"
import { dedupePendingApprovals } from "./approval-dedupe.js"

type TelegramBinding = {
  enabled?: boolean
  botToken?: string
  botUsername?: string
  ownerControl?: TelegramOwnerControlConfig
}

export type TelegramOwnerAuthorizedChat = {
  chatId: string
  username?: string | null
  displayName?: string | null
  authorizedAt: string
  expiresAt: string
  lastCommandAt?: string | null
  lastCommandText?: string | null
}

type PendingConfirmation =
  | {
      token: string
      chatId: string
      createdAt: string
      expiresAt: string
      summary: string
      kind: "case_status"
      caseId: string
      nextStatus: string
    }
  | {
      token: string
      chatId: string
      createdAt: string
      expiresAt: string
      summary: string
      kind: "case_priority"
      caseId: string
      nextPriority: number
    }
  | {
      token: string
      chatId: string
      createdAt: string
      expiresAt: string
      summary: string
      kind: "case_assignee"
      caseId: string
      assigneeAgentId: string | null
    }
  | {
      token: string
      chatId: string
      createdAt: string
      expiresAt: string
      summary: string
      kind: "case_project"
      caseId: string
      opsGroupId: string | null
    }
  | {
      token: string
      chatId: string
      createdAt: string
      expiresAt: string
      summary: string
      kind: "approval_decision"
      approvalId: string
      decision: "approved" | "rejected"
    }
  | {
      token: string
      chatId: string
      createdAt: string
      expiresAt: string
      summary: string
      kind: "case_rerun"
      caseId: string
    }

type PendingConfirmationDraft =
  | {
      kind: "case_status"
      caseId: string
      nextStatus: string
      summary: string
    }
  | {
      kind: "case_priority"
      caseId: string
      nextPriority: number
      summary: string
    }
  | {
      kind: "case_assignee"
      caseId: string
      assigneeAgentId: string | null
      summary: string
    }
  | {
      kind: "case_project"
      caseId: string
      opsGroupId: string | null
      summary: string
    }
  | {
      kind: "approval_decision"
      approvalId: string
      decision: "approved" | "rejected"
      summary: string
    }
  | {
      kind: "case_rerun"
      caseId: string
      summary: string
    }

type StoredConfirmationResult = {
  token: string
  reused: boolean
}

export type TelegramOwnerControlConfig = {
  enabled?: boolean
  passwordHash?: string | null
  sessionTtlMinutes?: number
  allowNaturalLanguage?: boolean
  confirmDangerousMutations?: boolean
  authorizedChats?: TelegramOwnerAuthorizedChat[]
  pendingConfirmations?: PendingConfirmation[]
}

type TelegramOwnerControlPublicConfig = {
  enabled: boolean
  passwordConfigured: boolean
  sessionTtlMinutes: number
  allowNaturalLanguage: boolean
  confirmDangerousMutations: boolean
  authorizedChats: TelegramOwnerAuthorizedChat[]
  authorizedChatCount: number
  lastAuthorizedChat: TelegramOwnerAuthorizedChat | null
}

type TelegramOwnerControlUpdate =
  | {
      kind: "message"
      chatId: string
      username: string | null
      displayName: string | null
      text: string
      messageId: string | null
    }
  | {
      kind: "callback"
      chatId: string
      username: string | null
      displayName: string | null
      callbackQueryId: string
      data: string
      messageId: string | null
    }

type OwnerIntent =
  | { kind: "help" }
  | { kind: "login"; password: string }
  | { kind: "logout" }
  | { kind: "list_cases" }
  | { kind: "list_pending_approvals" }
  | { kind: "list_today_schedules" }
  | { kind: "show_case"; identifier: string }
  | { kind: "mutate_case_status"; identifier: string; status: string }
  | { kind: "mutate_case_priority"; identifier: string; priority: number }
  | { kind: "mutate_case_assignee"; identifier: string; agentQuery: string }
  | { kind: "mutate_case_project"; identifier: string; projectQuery: string }
  | { kind: "approval_decision"; identifier: string; decision: "approved" | "rejected" }
  | { kind: "rerun_case"; identifier: string }

const CALLBACK_PREFIX = "ownerctl:"
const DEFAULT_TTL_MINUTES = 240
const DEFAULT_CONFIRMATION_TTL_MINUTES = 10
const MAX_AUTHORIZED_CHATS = 10
const MAX_PENDING_CONFIRMATIONS = 30

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

function getTelegramBinding(organization: typeof schema.organizations.$inferSelect): TelegramBinding {
  const config = getOrganizationConfig(organization)
  const integrations = isPlainObject(config.integrations) ? config.integrations : {}
  const channels = isPlainObject(integrations.channels) ? integrations.channels : {}
  const telegram =
    isPlainObject(channels.telegram)
      ? channels.telegram
      : isPlainObject(config.channels) && isPlainObject(config.channels.telegram)
        ? config.channels.telegram
        : {}
  return telegram as TelegramBinding
}

function normalizeAuthorizedChats(chats: unknown): TelegramOwnerAuthorizedChat[] {
  if (!Array.isArray(chats)) return []
  return chats
    .filter((item) => isPlainObject(item) && typeof item.chatId === "string" && typeof item.expiresAt === "string")
    .map((item) => ({
      chatId: String(item.chatId),
      username: typeof item.username === "string" ? item.username : null,
      displayName: typeof item.displayName === "string" ? item.displayName : null,
      authorizedAt: typeof item.authorizedAt === "string" ? item.authorizedAt : new Date().toISOString(),
      expiresAt: String(item.expiresAt),
      lastCommandAt: typeof item.lastCommandAt === "string" ? item.lastCommandAt : null,
      lastCommandText: typeof item.lastCommandText === "string" ? item.lastCommandText : null,
    }))
}

function normalizePendingConfirmations(entries: unknown): PendingConfirmation[] {
  if (!Array.isArray(entries)) return []
  return entries.filter((item) => {
    if (!isPlainObject(item)) return false
    return typeof item.token === "string" && typeof item.chatId === "string" && typeof item.kind === "string"
  }) as PendingConfirmation[]
}

function getOwnerControlConfig(organization: typeof schema.organizations.$inferSelect): TelegramOwnerControlConfig {
  const telegram = getTelegramBinding(organization)
  const ownerControl = isPlainObject(telegram.ownerControl) ? telegram.ownerControl : {}
  return {
    enabled: ownerControl.enabled === true,
    passwordHash: typeof ownerControl.passwordHash === "string" ? ownerControl.passwordHash : null,
    sessionTtlMinutes:
      typeof ownerControl.sessionTtlMinutes === "number" && ownerControl.sessionTtlMinutes > 0
        ? ownerControl.sessionTtlMinutes
        : DEFAULT_TTL_MINUTES,
    allowNaturalLanguage: ownerControl.allowNaturalLanguage !== false,
    confirmDangerousMutations: ownerControl.confirmDangerousMutations !== false,
    authorizedChats: normalizeAuthorizedChats(ownerControl.authorizedChats),
    pendingConfirmations: normalizePendingConfirmations(ownerControl.pendingConfirmations),
  }
}

function buildOwnerControlPublicConfig(config: TelegramOwnerControlConfig): TelegramOwnerControlPublicConfig {
  const authorizedChats = cleanupExpiredChats(config.authorizedChats ?? [])
  return {
    enabled: config.enabled === true,
    passwordConfigured: Boolean(config.passwordHash),
    sessionTtlMinutes: config.sessionTtlMinutes ?? DEFAULT_TTL_MINUTES,
    allowNaturalLanguage: config.allowNaturalLanguage !== false,
    confirmDangerousMutations: config.confirmDangerousMutations !== false,
    authorizedChatCount: authorizedChats.length,
    authorizedChats,
    lastAuthorizedChat: authorizedChats[0] ?? null,
  }
}

function buildConfigPatch(config: Partial<TelegramOwnerControlConfig>) {
  return {
    integrations: {
      channels: {
        telegram: {
          ownerControl: config,
        },
      },
    },
  }
}

export function hashTelegramOwnerControlPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const digest = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${digest}`
}

function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false
  const [scheme, salt, digest] = passwordHash.split("$")
  if (scheme !== "scrypt" || !salt || !digest) return false
  const incoming = scryptSync(password, salt, 64)
  const stored = Buffer.from(digest, "hex")
  if (incoming.length !== stored.length) return false
  return timingSafeEqual(incoming, stored)
}

function cleanupExpiredChats(chats: TelegramOwnerAuthorizedChat[]) {
  const now = Date.now()
  return chats
    .filter((chat) => new Date(chat.expiresAt).getTime() > now)
    .sort((left, right) => right.authorizedAt.localeCompare(left.authorizedAt))
    .slice(0, MAX_AUTHORIZED_CHATS)
}

function cleanupExpiredConfirmations(confirmations: PendingConfirmation[]) {
  const now = Date.now()
  return confirmations
    .filter((entry) => new Date(entry.expiresAt).getTime() > now)
    .slice(-MAX_PENDING_CONFIRMATIONS)
}

function isSameConfirmationDraft(left: PendingConfirmation, right: PendingConfirmationDraft) {
  if (left.kind !== right.kind) return false
  if (left.kind === "case_status" && right.kind === "case_status") {
    return left.caseId === right.caseId && left.nextStatus === right.nextStatus
  }
  if (left.kind === "case_priority" && right.kind === "case_priority") {
    return left.caseId === right.caseId && left.nextPriority === right.nextPriority
  }
  if (left.kind === "case_assignee" && right.kind === "case_assignee") {
    return left.caseId === right.caseId && left.assigneeAgentId === right.assigneeAgentId
  }
  if (left.kind === "case_project" && right.kind === "case_project") {
    return left.caseId === right.caseId && left.opsGroupId === right.opsGroupId
  }
  if (left.kind === "approval_decision" && right.kind === "approval_decision") {
    return left.approvalId === right.approvalId && left.decision === right.decision
  }
  if (left.kind === "case_rerun" && right.kind === "case_rerun") {
    return left.caseId === right.caseId
  }
  return false
}

function isSameConfirmationScope(left: PendingConfirmation, right: PendingConfirmationDraft) {
  if (left.kind !== right.kind) return false
  if ("caseId" in left && "caseId" in right) return left.caseId === right.caseId
  if (left.kind === "approval_decision" && right.kind === "approval_decision") return left.approvalId === right.approvalId
  return false
}

function buildDisplayName(value: Record<string, unknown>) {
  const username = typeof value.username === "string" ? value.username : null
  const firstName = typeof value.first_name === "string" ? value.first_name : null
  const lastName = typeof value.last_name === "string" ? value.last_name : null
  return username ?? ([firstName, lastName].filter(Boolean).join(" ").trim() || null)
}

function normalizeTelegramOwnerControlUpdate(update: Record<string, unknown>): TelegramOwnerControlUpdate | null {
  const callbackQuery = isPlainObject(update.callback_query) ? update.callback_query : null
  if (callbackQuery) {
    const message = isPlainObject(callbackQuery.message) ? callbackQuery.message : {}
    const chat = isPlainObject(message.chat) ? message.chat : {}
    const from = isPlainObject(callbackQuery.from) ? callbackQuery.from : {}
    const chatId = chat.id != null ? String(chat.id) : null
    const data = typeof callbackQuery.data === "string" ? callbackQuery.data.trim() : ""
    if (from.is_bot === true || !chatId || !data) return null
    return {
      kind: "callback",
      chatId,
      username: typeof from.username === "string" ? from.username : null,
      displayName: buildDisplayName(from),
      callbackQueryId: typeof callbackQuery.id === "string" ? callbackQuery.id : "",
      data,
      messageId: message.message_id != null ? String(message.message_id) : null,
    }
  }

  const message = isPlainObject(update.message)
    ? update.message
    : isPlainObject(update.edited_message)
      ? update.edited_message
      : null
  if (!message) return null
  const chat = isPlainObject(message.chat) ? message.chat : {}
  const from = isPlainObject(message.from) ? message.from : {}
  const chatId = chat.id != null ? String(chat.id) : null
  const text = typeof message.text === "string" ? message.text.trim() : ""
  if (from.is_bot === true || !chatId || !text) return null
  return {
    kind: "message",
    chatId,
    username: typeof from.username === "string" ? from.username : null,
    displayName: buildDisplayName(from),
    text,
    messageId: message.message_id != null ? String(message.message_id) : null,
  }
}

function looksLikeOwnerControlTrigger(text: string) {
  return /^\/(login|logout|help|cases|approvals|today|status)\b/i.test(text)
    || /(도움말|미승인|승인 대기|오늘 일정|최근 케이스|케이스\s+C-\d+|우선순위|담당|프로젝트|다시 실행|재실행|로그아웃|로그인)/.test(text)
}

function mapStatusLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (["backlog", "백로그"].includes(normalized)) return "backlog"
  if (["todo", "할일", "대기"].includes(normalized)) return "todo"
  if (["in_progress", "진행", "진행중", "진행 중"].includes(normalized)) return "in_progress"
  if (["in_review", "검토", "검토중", "검토 중"].includes(normalized)) return "in_review"
  if (["blocked", "보류", "막힘"].includes(normalized)) return "blocked"
  if (["done", "완료"].includes(normalized)) return "done"
  return normalized
}

function buildHelpText() {
  return [
    "HagentOS Telegram Owner Control",
    "",
    "로그인:",
    "/login <password>",
    "",
    "조회 예시:",
    "- 미승인 보여줘",
    "- 오늘 일정 보여줘",
    "- 최근 케이스 보여줘",
    "- 케이스 C-101 보여줘",
    "",
    "변경 예시:",
    "- 케이스 C-101 상태 완료",
    "- 케이스 C-101 우선순위 1",
    "- 케이스 C-101 담당 orchestrator",
    "- 케이스 C-101 프로젝트 환불 대응",
    "- 케이스 C-101 승인",
    "- 케이스 C-101 반려",
    "- 케이스 C-101 다시 실행",
    "",
    "변경 작업은 Confirm 버튼을 한 번 더 눌러야 실행됩니다.",
  ].join("\n")
}

function parseIntent(text: string): OwnerIntent | null {
  const trimmed = text.trim()
  const loginMatch = trimmed.match(/^\/login\s+(.+)$/i) ?? trimmed.match(/^로그인\s+(.+)$/)
  if (loginMatch) return { kind: "login", password: loginMatch[1].trim() }
  if (/^\/logout\b/i.test(trimmed) || trimmed === "로그아웃") return { kind: "logout" }
  if (/^\/help\b/i.test(trimmed) || /(도움말|사용법)/.test(trimmed)) return { kind: "help" }
  if (/^\/approvals\b/i.test(trimmed) || /(미승인|승인 대기)/.test(trimmed)) return { kind: "list_pending_approvals" }
  if (/^\/cases\b/i.test(trimmed) || /최근 케이스|케이스 목록/.test(trimmed)) return { kind: "list_cases" }
  if (/^\/today\b/i.test(trimmed) || /오늘 일정/.test(trimmed)) return { kind: "list_today_schedules" }

  const approvalMatch = trimmed.match(/(?:케이스\s+)?(C-\d+).*(승인|반려)/i)
  if (approvalMatch) {
    return {
      kind: "approval_decision",
      identifier: approvalMatch[1].toUpperCase(),
      decision: approvalMatch[2].includes("반려") ? "rejected" : "approved",
    }
  }

  const rerunMatch = trimmed.match(/(?:케이스\s+)?(C-\d+).*(다시 실행|재실행|초안 생성)/i)
  if (rerunMatch) return { kind: "rerun_case", identifier: rerunMatch[1].toUpperCase() }

  const statusMatch = trimmed.match(/(?:케이스\s+)?(C-\d+).*상태\s+([^\s]+(?:\s*[^\s]+)?)/i)
  if (statusMatch) {
    return {
      kind: "mutate_case_status",
      identifier: statusMatch[1].toUpperCase(),
      status: mapStatusLabel(statusMatch[2]),
    }
  }

  const priorityMatch = trimmed.match(/(?:케이스\s+)?(C-\d+).*우선순위\s+(\d+)/i)
  if (priorityMatch) {
    return {
      kind: "mutate_case_priority",
      identifier: priorityMatch[1].toUpperCase(),
      priority: Number(priorityMatch[2]),
    }
  }

  const assigneeMatch = trimmed.match(/(?:케이스\s+)?(C-\d+).*(?:담당|에이전트)\s+(.+)$/i)
  if (assigneeMatch) {
    return {
      kind: "mutate_case_assignee",
      identifier: assigneeMatch[1].toUpperCase(),
      agentQuery: assigneeMatch[2].trim(),
    }
  }

  const projectMatch = trimmed.match(/(?:케이스\s+)?(C-\d+).*프로젝트\s+(.+)$/i)
  if (projectMatch) {
    return {
      kind: "mutate_case_project",
      identifier: projectMatch[1].toUpperCase(),
      projectQuery: projectMatch[2].trim(),
    }
  }

  const showCaseMatch = trimmed.match(/(?:케이스\s+)?(C-\d+)(?:\s+보여줘|\s+상세|\s+조회)?$/i)
  if (showCaseMatch) return { kind: "show_case", identifier: showCaseMatch[1].toUpperCase() }

  return null
}

async function updateOwnerControlConfig(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  updater: (config: TelegramOwnerControlConfig) => TelegramOwnerControlConfig,
) {
  const current = getOwnerControlConfig(organization)
  const next = updater(current)
  const nextConfig = mergeJsonConfig(getOrganizationConfig(organization), buildConfigPatch({
    ...next,
    authorizedChats: cleanupExpiredChats(next.authorizedChats ?? []),
    pendingConfirmations: cleanupExpiredConfirmations(next.pendingConfirmations ?? []),
  }))
  const [updated] = await db
    .update(schema.organizations)
    .set({
      agentTeamConfig: nextConfig,
      updatedAt: new Date(),
    })
    .where(eq(schema.organizations.id, organization.id))
    .returning()
  return updated
}

async function getOrganizationById(db: Db, organizationId: string) {
  const [organization] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId))
  if (!organization) throw new Error("Organization not found")
  return organization
}

async function callTelegramApi(botToken: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || payload.ok === false) {
    throw new Error(typeof payload.description === "string" ? payload.description : `Telegram ${method} failed (${response.status})`)
  }
  return payload
}

async function sendOwnerMessage(binding: TelegramBinding, chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  if (!binding.botToken) throw new Error("Telegram bot token is not configured")
  await callTelegramApi(binding.botToken, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  })
}

async function answerCallback(binding: TelegramBinding, callbackQueryId: string, text?: string) {
  if (!binding.botToken) throw new Error("Telegram bot token is not configured")
  await callTelegramApi(binding.botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  })
}

async function recordActivity(
  db: Db,
  organizationId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  entityTitle: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(schema.activityEvents).values({
    organizationId,
    actorType: "external",
    actorId,
    action,
    entityType,
    entityId,
    entityTitle,
    metadata,
  })
  publishEvent(organizationId, action, { entityType, entityId, entityTitle, ...(metadata ?? {}) })
}

async function findCaseByIdentifier(db: Db, organizationId: string, identifier: string) {
  const [caseRecord] = await db
    .select()
    .from(schema.cases)
    .where(and(
      eq(schema.cases.organizationId, organizationId),
      eq(schema.cases.identifier, identifier),
      isNull(schema.cases.archivedAt),
    ))
  return caseRecord ?? null
}

async function findMatchingProject(db: Db, organizationId: string, projectQuery: string) {
  const projects = await db.select().from(schema.opsGroups).where(eq(schema.opsGroups.organizationId, organizationId))
  const normalized = projectQuery.trim().toLowerCase()
  const exact = projects.find((item) => item.name.trim().toLowerCase() === normalized)
  if (exact) return { match: exact, all: [exact] }
  const partial = projects.filter((item) => item.name.trim().toLowerCase().includes(normalized))
  return { match: partial.length === 1 ? partial[0] : null, all: partial }
}

async function findMatchingAgent(db: Db, organizationId: string, agentQuery: string) {
  const agents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, organizationId))
  const normalized = agentQuery.trim().toLowerCase()
  const exact = agents.find((item) => item.name.trim().toLowerCase() === normalized || item.agentType.toLowerCase() === normalized)
  if (exact) return { match: exact, all: [exact] }
  const partial = agents.filter((item) =>
    item.name.trim().toLowerCase().includes(normalized) || item.agentType.toLowerCase().includes(normalized))
  return { match: partial.length === 1 ? partial[0] : null, all: partial }
}

function buildConfirmationKeyboard(token: string) {
  return {
    inline_keyboard: [[
      { text: "Confirm", callback_data: `${CALLBACK_PREFIX}confirm:${token}` },
      { text: "Cancel", callback_data: `${CALLBACK_PREFIX}cancel:${token}` },
    ]],
  }
}

function buildToken() {
  return randomBytes(12).toString("hex")
}

function formatCaseLine(caseRecord: typeof schema.cases.$inferSelect) {
  return `${caseRecord.identifier} · ${caseRecord.title} · ${caseRecord.status} · P${caseRecord.priority}`
}

async function listRecentCasesText(db: Db, organizationId: string) {
  const cases = await db
    .select()
    .from(schema.cases)
    .where(and(eq(schema.cases.organizationId, organizationId), isNull(schema.cases.archivedAt)))
    .orderBy(desc(schema.cases.updatedAt))
  if (cases.length === 0) return "현재 열린 케이스가 없습니다."
  return ["최근 케이스", "", ...cases.slice(0, 8).map(formatCaseLine)].join("\n")
}

async function listPendingApprovalsText(db: Db, organizationId: string) {
  await dedupePendingApprovals(db, { organizationId })
  const approvals = await db
    .select()
    .from(schema.approvals)
    .where(and(eq(schema.approvals.organizationId, organizationId), eq(schema.approvals.status, "pending")))
    .orderBy(desc(schema.approvals.createdAt))
  if (approvals.length === 0) return "현재 승인 대기 건이 없습니다."
  const latestByCase = new Map<string, typeof schema.approvals.$inferSelect>()
  for (const approval of approvals) {
    if (!approval.caseId) continue
    if (!latestByCase.has(approval.caseId)) {
      latestByCase.set(approval.caseId, approval)
    }
  }
  const uniqueApprovals = Array.from(latestByCase.values())
  const caseIds = uniqueApprovals.map((item) => item.caseId).filter((value): value is string => typeof value === "string")
  const cases = caseIds.length
    ? await db.select().from(schema.cases).where(inArray(schema.cases.id, caseIds))
    : []
  const caseMap = new Map(cases.map((item) => [item.id, item]))
  return [
    "승인 대기",
    "",
    ...uniqueApprovals.slice(0, 8).map((approval) => {
      const caseRecord = approval.caseId ? caseMap.get(approval.caseId) ?? null : null
      return `${caseRecord?.identifier ?? approval.id.slice(0, 8)} · ${caseRecord?.title ?? "approval"}`
    }),
  ].join("\n")
}

async function listTodaySchedulesText(db: Db, organizationId: string) {
  const jsDay = new Date().getDay()
  const dayCandidates = jsDay === 0 ? [0, 7] : [jsDay]
  const schedules = await db
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.organizationId, organizationId))
  const today = schedules.filter((item) => dayCandidates.includes(item.dayOfWeek))
  if (today.length === 0) return "오늘 일정이 없습니다."
  return [
    "오늘 일정",
    "",
    ...today
      .sort((left, right) => `${left.startTime}`.localeCompare(`${right.startTime}`))
      .map((item) => `${item.startTime}-${item.endTime} · ${item.title}${item.room ? ` · ${item.room}` : ""}`),
  ].join("\n")
}

async function showCaseText(db: Db, organizationId: string, identifier: string) {
  const caseRecord = await findCaseByIdentifier(db, organizationId, identifier)
  if (!caseRecord) return `케이스 ${identifier}를 찾지 못했습니다.`
  return [
    `${caseRecord.identifier} · ${caseRecord.title}`,
    `상태: ${caseRecord.status}`,
    `우선순위: P${caseRecord.priority}`,
    `유형: ${caseRecord.type}`,
    caseRecord.description ? `설명: ${caseRecord.description}` : null,
  ].filter(Boolean).join("\n")
}

async function storeConfirmation(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  chatId: string,
  entry: PendingConfirmationDraft,
) : Promise<StoredConfirmationResult> {
  const config = getOwnerControlConfig(organization)
  const cleaned = cleanupExpiredConfirmations(config.pendingConfirmations ?? [])
  const existing = cleaned.find((item) => item.chatId === chatId && isSameConfirmationDraft(item, entry))
  if (existing) {
    return { token: existing.token, reused: true }
  }

  const token = buildToken()
  const now = new Date()
  const pending: PendingConfirmation = {
    ...entry,
    token,
    chatId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DEFAULT_CONFIRMATION_TTL_MINUTES * 60_000).toISOString(),
  } as PendingConfirmation

  await updateOwnerControlConfig(db, organization, (config) => ({
    ...config,
    pendingConfirmations: [
      ...cleanupExpiredConfirmations(config.pendingConfirmations ?? []).filter(
        (item) => !(item.chatId === chatId && isSameConfirmationScope(item, entry)),
      ),
      pending,
    ],
  }))
  return { token, reused: false }
}

function formatAmbiguousMatches(label: string, items: { id: string; name?: string | null; agentType?: string | null }[]) {
  return [
    `${label} 후보가 여러 개입니다.`,
    "",
    ...items.slice(0, 5).map((item) => `- ${item.name ?? item.agentType ?? item.id}`),
  ].join("\n")
}

async function executeCaseMutation(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  actorId: string,
  confirmation: PendingConfirmation,
) {
  if (confirmation.kind === "approval_decision") {
    await processApprovalDecision(db, confirmation.approvalId, confirmation.decision)
    return confirmation.decision === "approved" ? "승인을 완료했습니다." : "반려를 완료했습니다."
  }

  const [caseRecord] = await db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.id, confirmation.caseId))
  if (!caseRecord) return "대상 케이스를 찾지 못했습니다."

  if (confirmation.kind === "case_status") {
    await db.update(schema.cases).set({ status: confirmation.nextStatus as any, updatedAt: new Date() }).where(eq(schema.cases.id, caseRecord.id))
    await recordActivity(db, organization.id, actorId, "telegram.case_status_changed", "case", caseRecord.id, caseRecord.title, {
      from: caseRecord.status,
      to: confirmation.nextStatus,
      source: "telegram_owner_control",
    })
    return `${caseRecord.identifier} 상태를 ${confirmation.nextStatus}로 변경했습니다.`
  }

  if (confirmation.kind === "case_priority") {
    await db.update(schema.cases).set({ priority: confirmation.nextPriority, updatedAt: new Date() }).where(eq(schema.cases.id, caseRecord.id))
    await recordActivity(db, organization.id, actorId, "telegram.case_priority_changed", "case", caseRecord.id, caseRecord.title, {
      from: caseRecord.priority,
      to: confirmation.nextPriority,
      source: "telegram_owner_control",
    })
    return `${caseRecord.identifier} 우선순위를 P${confirmation.nextPriority}로 변경했습니다.`
  }

  if (confirmation.kind === "case_assignee") {
    await db.update(schema.cases).set({ assigneeAgentId: confirmation.assigneeAgentId, updatedAt: new Date() }).where(eq(schema.cases.id, caseRecord.id))
    await recordActivity(db, organization.id, actorId, "telegram.case_assignee_changed", "case", caseRecord.id, caseRecord.title, {
      to: confirmation.assigneeAgentId,
      source: "telegram_owner_control",
    })
    return `${caseRecord.identifier} 담당 에이전트를 변경했습니다.`
  }

  if (confirmation.kind === "case_project") {
    await db.update(schema.cases).set({ opsGroupId: confirmation.opsGroupId, updatedAt: new Date() }).where(eq(schema.cases.id, caseRecord.id))
    await recordActivity(db, organization.id, actorId, "telegram.case_project_changed", "case", caseRecord.id, caseRecord.title, {
      to: confirmation.opsGroupId,
      source: "telegram_owner_control",
    })
    return `${caseRecord.identifier} 프로젝트 연결을 변경했습니다.`
  }

  const fallback = await resolveCaseRunAgent(db, caseRecord)
  if (!fallback) return "실행 가능한 에이전트를 찾지 못했습니다."
  const { runId } = await executeAgentRun(db, {
    organizationId: organization.id,
    agentId: fallback.id,
    caseId: caseRecord.id,
    agentType: fallback.agentType,
    approvalLevel: getApprovalLevelForAgentType(fallback.agentType),
  })
  await recordActivity(db, organization.id, actorId, "telegram.case_rerun_requested", "agent_run", runId, `${caseRecord.identifier} rerun`, {
    caseId: caseRecord.id,
    agentId: fallback.id,
    source: "telegram_owner_control",
  })
  return `${caseRecord.identifier}를 ${fallback.name} 에이전트로 다시 실행했습니다.`
}

async function handleIntent(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  binding: TelegramBinding,
  update: Extract<TelegramOwnerControlUpdate, { kind: "message" }>,
  config: TelegramOwnerControlConfig,
  actorId: string,
  intent: OwnerIntent,
) {
  const sendConfirmationPrompt = async (message: string, stored: StoredConfirmationResult) => {
    const text = stored.reused
      ? `${message}\n\n이미 같은 요청이 대기 중입니다. 아래 Confirm 또는 Cancel 버튼을 눌러 주세요.`
      : message
    await sendOwnerMessage(binding, update.chatId, text, buildConfirmationKeyboard(stored.token))
  }

  if (intent.kind === "help") {
    await sendOwnerMessage(binding, update.chatId, buildHelpText())
    return
  }

  if (intent.kind === "login") {
    if (!config.passwordHash) {
      await sendOwnerMessage(binding, update.chatId, "아직 Telegram owner-control 비밀번호가 설정되지 않았습니다. 웹 Settings에서 먼저 설정해 주세요.")
      return
    }
    if (!verifyPassword(intent.password, config.passwordHash)) {
      await sendOwnerMessage(binding, update.chatId, "비밀번호가 일치하지 않습니다.")
      await recordActivity(db, organization.id, actorId, "telegram.owner_control_auth_failed", "organization", organization.id, organization.name, {
        chatId: update.chatId,
        source: "telegram_owner_control",
      })
      return
    }
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (config.sessionTtlMinutes ?? DEFAULT_TTL_MINUTES) * 60_000).toISOString()
    const updatedOrg = await updateOwnerControlConfig(db, organization, (current) => ({
      ...current,
      authorizedChats: [
        {
          chatId: update.chatId,
          username: update.username,
          displayName: update.displayName,
          authorizedAt: now.toISOString(),
          expiresAt,
          lastCommandAt: now.toISOString(),
          lastCommandText: "login",
        },
        ...cleanupExpiredChats((current.authorizedChats ?? []).filter((item) => item.chatId !== update.chatId)),
      ],
    }))
    await recordActivity(db, updatedOrg.id, actorId, "telegram.owner_control_auth_success", "organization", updatedOrg.id, updatedOrg.name, {
      chatId: update.chatId,
      source: "telegram_owner_control",
    })
    await sendOwnerMessage(binding, update.chatId, `인증되었습니다. 세션은 ${config.sessionTtlMinutes ?? DEFAULT_TTL_MINUTES}분 동안 유지됩니다.`)
    return
  }

  const activeChat = cleanupExpiredChats(config.authorizedChats ?? []).find((item) => item.chatId === update.chatId)
  if (!activeChat) {
    await sendOwnerMessage(binding, update.chatId, "먼저 /login <password> 로 인증해 주세요.")
    return
  }

  if (intent.kind === "logout") {
    await updateOwnerControlConfig(db, organization, (current) => ({
      ...current,
      authorizedChats: cleanupExpiredChats(current.authorizedChats ?? []).filter((item) => item.chatId !== update.chatId),
    }))
    await sendOwnerMessage(binding, update.chatId, "세션을 종료했습니다.")
    return
  }

  await updateOwnerControlConfig(db, organization, (current) => ({
    ...current,
    authorizedChats: cleanupExpiredChats((current.authorizedChats ?? []).map((item) =>
      item.chatId === update.chatId
        ? {
            ...item,
            lastCommandAt: new Date().toISOString(),
            lastCommandText: update.text,
          }
        : item,
    )),
  }))

  if (intent.kind === "list_cases") {
    await sendOwnerMessage(binding, update.chatId, await listRecentCasesText(db, organization.id))
    return
  }
  if (intent.kind === "list_pending_approvals") {
    await sendOwnerMessage(binding, update.chatId, await listPendingApprovalsText(db, organization.id))
    return
  }
  if (intent.kind === "list_today_schedules") {
    await sendOwnerMessage(binding, update.chatId, await listTodaySchedulesText(db, organization.id))
    return
  }
  if (intent.kind === "show_case") {
    await sendOwnerMessage(binding, update.chatId, await showCaseText(db, organization.id, intent.identifier))
    return
  }

  const caseRecord = await findCaseByIdentifier(db, organization.id, intent.identifier)
  if (!caseRecord) {
    await sendOwnerMessage(binding, update.chatId, `케이스 ${intent.identifier}를 찾지 못했습니다.`)
    return
  }

  if (intent.kind === "mutate_case_status") {
    const confirmation = await storeConfirmation(db, organization, update.chatId, {
      kind: "case_status",
      caseId: caseRecord.id,
      nextStatus: intent.status,
      summary: `${caseRecord.identifier} 상태를 ${intent.status}로 변경`,
    })
    await sendConfirmationPrompt(`${caseRecord.identifier} 상태를 ${intent.status}로 변경할까요?`, confirmation)
    return
  }

  if (intent.kind === "mutate_case_priority") {
    const confirmation = await storeConfirmation(db, organization, update.chatId, {
      kind: "case_priority",
      caseId: caseRecord.id,
      nextPriority: intent.priority,
      summary: `${caseRecord.identifier} 우선순위를 P${intent.priority}로 변경`,
    })
    await sendConfirmationPrompt(`${caseRecord.identifier} 우선순위를 P${intent.priority}로 변경할까요?`, confirmation)
    return
  }

  if (intent.kind === "mutate_case_assignee") {
    const lookup = await findMatchingAgent(db, organization.id, intent.agentQuery)
    if (!lookup.match) {
      await sendOwnerMessage(
        binding,
        update.chatId,
        lookup.all.length > 1 ? formatAmbiguousMatches("에이전트", lookup.all) : `에이전트 '${intent.agentQuery}'를 찾지 못했습니다.`,
      )
      return
    }
    const confirmation = await storeConfirmation(db, organization, update.chatId, {
      kind: "case_assignee",
      caseId: caseRecord.id,
      assigneeAgentId: lookup.match.id,
      summary: `${caseRecord.identifier} 담당을 ${lookup.match.name}로 변경`,
    })
    await sendConfirmationPrompt(`${caseRecord.identifier} 담당을 ${lookup.match.name}로 변경할까요?`, confirmation)
    return
  }

  if (intent.kind === "mutate_case_project") {
    const lookup = await findMatchingProject(db, organization.id, intent.projectQuery)
    if (!lookup.match) {
      await sendOwnerMessage(
        binding,
        update.chatId,
        lookup.all.length > 1 ? formatAmbiguousMatches("프로젝트", lookup.all) : `프로젝트 '${intent.projectQuery}'를 찾지 못했습니다.`,
      )
      return
    }
    const confirmation = await storeConfirmation(db, organization, update.chatId, {
      kind: "case_project",
      caseId: caseRecord.id,
      opsGroupId: lookup.match.id,
      summary: `${caseRecord.identifier} 프로젝트를 ${lookup.match.name}로 변경`,
    })
    await sendConfirmationPrompt(`${caseRecord.identifier} 프로젝트를 ${lookup.match.name}로 연결할까요?`, confirmation)
    return
  }

  if (intent.kind === "approval_decision") {
    await dedupePendingApprovals(db, { organizationId: organization.id, caseId: caseRecord.id })
    const approvals = await db
      .select()
      .from(schema.approvals)
      .where(and(eq(schema.approvals.organizationId, organization.id), eq(schema.approvals.caseId, caseRecord.id), eq(schema.approvals.status, "pending")))
      .orderBy(desc(schema.approvals.createdAt))
    const approval = approvals[0]
    if (!approval) {
      await sendOwnerMessage(binding, update.chatId, `${caseRecord.identifier}에는 현재 승인 대기 건이 없습니다.`)
      return
    }
    const confirmation = await storeConfirmation(db, organization, update.chatId, {
      kind: "approval_decision",
      approvalId: approval.id,
      decision: intent.decision,
      summary: `${caseRecord.identifier} 승인 ${intent.decision}`,
    })
    await sendConfirmationPrompt(
      `${caseRecord.identifier} 승인 요청을 ${intent.decision === "approved" ? "승인" : "반려"}할까요?`,
      confirmation,
    )
    return
  }

  const confirmation = await storeConfirmation(db, organization, update.chatId, {
    kind: "case_rerun",
    caseId: caseRecord.id,
    summary: `${caseRecord.identifier} 다시 실행`,
  })
  await sendConfirmationPrompt(`${caseRecord.identifier}를 다시 실행할까요?`, confirmation)
}

async function handleCallback(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  binding: TelegramBinding,
  update: Extract<TelegramOwnerControlUpdate, { kind: "callback" }>,
  actorId: string,
) {
  const [action, token] = update.data.replace(CALLBACK_PREFIX, "").split(":")
  if (!action || !token) return false

  const config = getOwnerControlConfig(organization)
  const activeChat = cleanupExpiredChats(config.authorizedChats ?? []).find((item) => item.chatId === update.chatId)
  if (!activeChat) {
    await answerCallback(binding, update.callbackQueryId, "세션이 만료되었습니다")
    await sendOwnerMessage(binding, update.chatId, "세션이 만료되었습니다. /login <password> 로 다시 인증해 주세요.")
    return true
  }

  const pending = cleanupExpiredConfirmations(config.pendingConfirmations ?? []).find((item) => item.token === token && item.chatId === update.chatId)
  if (!pending) {
    await answerCallback(binding, update.callbackQueryId, "이미 처리되었거나 새 요청으로 갱신되었습니다")
    return true
  }

  await updateOwnerControlConfig(db, organization, (current) => ({
    ...current,
    pendingConfirmations: cleanupExpiredConfirmations(
      (current.pendingConfirmations ?? []).filter(
        (item) => !(item.chatId === update.chatId && isSameConfirmationScope(item, pending)),
      ),
    ),
  }))

  if (action === "cancel") {
    await answerCallback(binding, update.callbackQueryId, "취소되었습니다")
    await sendOwnerMessage(binding, update.chatId, "요청을 취소했습니다.")
    return true
  }

  const message = await executeCaseMutation(db, organization, actorId, pending)
  await answerCallback(binding, update.callbackQueryId, "실행되었습니다")
  await sendOwnerMessage(binding, update.chatId, message)
  return true
}

export function getTelegramOwnerControlState(organization: typeof schema.organizations.$inferSelect) {
  return buildOwnerControlPublicConfig(getOwnerControlConfig(organization))
}

export async function saveTelegramOwnerControlConfig(
  db: Db,
  organizationId: string,
  input: {
    enabled?: boolean
    password?: string
    sessionTtlMinutes?: number
    allowNaturalLanguage?: boolean
    confirmDangerousMutations?: boolean
  },
) {
  const organization = await getOrganizationById(db, organizationId)
  const updated = await updateOwnerControlConfig(db, organization, (current) => ({
    ...current,
    ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    ...(typeof input.sessionTtlMinutes === "number" ? { sessionTtlMinutes: input.sessionTtlMinutes } : {}),
    ...(typeof input.allowNaturalLanguage === "boolean" ? { allowNaturalLanguage: input.allowNaturalLanguage } : {}),
    ...(typeof input.confirmDangerousMutations === "boolean" ? { confirmDangerousMutations: input.confirmDangerousMutations } : {}),
    ...(typeof input.password === "string" && input.password.trim().length > 0 ? { passwordHash: hashTelegramOwnerControlPassword(input.password.trim()), authorizedChats: [] } : {}),
  }))
  await recordActivity(db, updated.id, "settings", "telegram.owner_control_updated", "organization", updated.id, updated.name, {
    source: "telegram_owner_control",
  })
  return getTelegramOwnerControlState(updated)
}

export async function revokeTelegramOwnerControlSessions(db: Db, organizationId: string) {
  const organization = await getOrganizationById(db, organizationId)
  const updated = await updateOwnerControlConfig(db, organization, (current) => ({
    ...current,
    authorizedChats: [],
    pendingConfirmations: [],
  }))
  await recordActivity(db, updated.id, "settings", "telegram.owner_control_sessions_revoked", "organization", updated.id, updated.name, {
    source: "telegram_owner_control",
  })
  return getTelegramOwnerControlState(updated)
}

export async function sendTelegramOwnerControlTest(db: Db, organizationId: string) {
  const organization = await getOrganizationById(db, organizationId)
  const binding = getTelegramBinding(organization)
  const config = getOwnerControlConfig(organization)
  const chat = cleanupExpiredChats(config.authorizedChats ?? [])[0]
  if (!binding.botToken) throw new Error("Telegram bot token is not configured")
  if (!chat) throw new Error("No authorized Telegram chat is available")
  await sendOwnerMessage(binding, chat.chatId, "HagentOS owner control test message입니다. 이 채팅에서 케이스와 승인 작업을 제어할 수 있습니다.")
  return {
    sent: true,
    chatId: chat.chatId,
    username: chat.username ?? null,
  }
}

export async function handleTelegramOwnerControlUpdate(
  db: Db,
  organization: typeof schema.organizations.$inferSelect,
  rawUpdate: Record<string, unknown>,
) {
  const update = normalizeTelegramOwnerControlUpdate(rawUpdate)
  if (!update) return { handled: false as const }

  const binding = getTelegramBinding(organization)
  const config = getOwnerControlConfig(organization)
  if (!config.enabled) return { handled: false as const }

  if (update.kind === "callback") {
    if (!update.data.startsWith(CALLBACK_PREFIX)) return { handled: false as const }
    await handleCallback(db, organization, binding, update, `telegram:${update.chatId}`)
    return { handled: true as const }
  }

  const activeChat = cleanupExpiredChats(config.authorizedChats ?? []).find((item) => item.chatId === update.chatId)
  if (!activeChat && !looksLikeOwnerControlTrigger(update.text)) {
    return { handled: false as const }
  }

  const intent = parseIntent(update.text)
  if (!intent) {
    await sendOwnerMessage(binding, update.chatId, activeChat ? "지원하지 않는 요청입니다.\n\n도움말을 보려면 `도움말` 또는 `/help`를 보내세요." : "먼저 /login <password> 로 인증하거나, 도움말을 요청해 주세요.")
    return { handled: true as const }
  }

  await handleIntent(db, organization, binding, update, config, `telegram:${update.chatId}`, intent)
  return { handled: true as const }
}
