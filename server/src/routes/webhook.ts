import { Router } from "express"
import { desc, eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "../services/live-events.js"
import { executeAgentRun } from "../services/execution.js"
import { createCaseWithRetry } from "../lib/case-create.js"
import {
  buildChannelCaseTitle,
  classifyInboundMessage,
  shouldRefreshCaseHeadline,
  summarizeInboundMessage,
} from "../lib/channel-message-heuristics.js"

type ChannelKey = "kakao" | "telegram" | "sms" | "naver"
type IntentFamily = "refund" | "complaint" | "schedule_ops" | "payment" | "counseling" | "campaign" | "general"
type InboundCaseAction = "append" | "reopen" | "child_case" | "new_case"
type ChannelCaseMetadata = {
  caseKind?: string
  channelSource?: string
  senderId?: string | null
  senderName?: string | null
  threadId?: string | null
  linkedEntityIds?: {
    studentId?: string | null
    parentId?: string | null
  }
  routingReason?: string
  generatedBy?: string
  origin?: string | null
  scenarioKey?: string | null
  contextKey?: string
  conversationGroupId?: string
  rootCaseId?: string
  intentFamily?: IntentFamily
  inboundCount?: number
  lastInboundAt?: string
  openedAt?: string
  lastMessagePreview?: string
  parentCaseId?: string
  previousChannelCaseId?: string
  caseKindHistory?: string[]
  groupingVersion?: string
  reopenedFromStatus?: string
}

const GROUPING_VERSION = "v2"

const INTENT_POLICY: Record<IntentFamily, { appendWindowMs: number; reopenWindowMs: number; strict: boolean }> = {
  refund: { appendWindowMs: 14 * 24 * 60 * 60 * 1000, reopenWindowMs: 24 * 60 * 60 * 1000, strict: true },
  complaint: { appendWindowMs: 14 * 24 * 60 * 60 * 1000, reopenWindowMs: 24 * 60 * 60 * 1000, strict: true },
  schedule_ops: { appendWindowMs: 72 * 60 * 60 * 1000, reopenWindowMs: 24 * 60 * 60 * 1000, strict: false },
  payment: { appendWindowMs: 7 * 24 * 60 * 60 * 1000, reopenWindowMs: 24 * 60 * 60 * 1000, strict: true },
  counseling: { appendWindowMs: 7 * 24 * 60 * 60 * 1000, reopenWindowMs: 24 * 60 * 60 * 1000, strict: false },
  campaign: { appendWindowMs: 7 * 24 * 60 * 60 * 1000, reopenWindowMs: 24 * 60 * 60 * 1000, strict: true },
  general: { appendWindowMs: 12 * 60 * 60 * 1000, reopenWindowMs: 12 * 60 * 60 * 1000, strict: false },
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getCaseMetadata(caseRecord: typeof schema.cases.$inferSelect): ChannelCaseMetadata {
  return isPlainObject(caseRecord.metadata) ? (caseRecord.metadata as ChannelCaseMetadata) : {}
}

function getOrganizationConfig(organization: typeof schema.organizations.$inferSelect) {
  return organization.agentTeamConfig && typeof organization.agentTeamConfig === "object" && !Array.isArray(organization.agentTeamConfig)
    ? (organization.agentTeamConfig as Record<string, unknown>)
    : {}
}

function getChannelBinding(organization: typeof schema.organizations.$inferSelect, channelKey: ChannelKey) {
  const config = getOrganizationConfig(organization)
  const integrations = config.integrations && typeof config.integrations === "object" && !Array.isArray(config.integrations)
    ? (config.integrations as Record<string, unknown>)
    : {}
  const channels = integrations.channels && typeof integrations.channels === "object" && !Array.isArray(integrations.channels)
    ? (integrations.channels as Record<string, unknown>)
    : {}
  const legacyChannels = config.channels && typeof config.channels === "object" && !Array.isArray(config.channels)
    ? (config.channels as Record<string, unknown>)
    : {}
  const binding = channels[channelKey] ?? legacyChannels[channelKey]
  if (channelKey === "telegram" && binding && typeof binding === "object" && !Array.isArray(binding)) {
    const telegram = binding as Record<string, unknown>
    const customer = telegram.customer
    if (customer && typeof customer === "object" && !Array.isArray(customer)) {
      return customer as Record<string, unknown>
    }
  }
  return binding && typeof binding === "object" && !Array.isArray(binding) ? (binding as Record<string, unknown>) : null
}

function normalizeCaseKind(message: string) {
  const inboundClass = classifyInboundMessage(message)
  if (inboundClass.kind === "guarded") {
    return { caseKind: "quick-ask", type: "inquiry" as const, severity: "normal" as const }
  }
  const lower = message.toLowerCase()
  if (lower.includes("환불") || lower.includes("취소")) return { caseKind: "refund", type: "refund" as const, severity: "high" as const }
  if (lower.includes("불만") || lower.includes("항의") || lower.includes("민원") || lower.includes("화가")) return { caseKind: "complaint", type: "complaint" as const, severity: "high" as const }
  if (
    lower.includes("상담")
    || lower.includes("면담")
    || lower.includes("수강")
    || lower.includes("등록")
    || lower.includes("입학")
    || lower.includes("체험수업")
    || lower.includes("레벨테스트")
  ) return { caseKind: "counseling", type: "inquiry" as const, severity: "normal" as const }
  if (lower.includes("출석") || lower.includes("결석") || lower.includes("지각")) return { caseKind: "attendance", type: "schedule" as const, severity: "same_day" as const }
  if (lower.includes("결제") || lower.includes("납부") || lower.includes("수강료")) return { caseKind: "payment", type: "inquiry" as const, severity: "same_day" as const }
  if (lower.includes("보강") || lower.includes("수업") || lower.includes("시간표") || lower.includes("일정")) return { caseKind: "schedule", type: "schedule" as const, severity: "normal" as const }
  if (lower.includes("프로모션") || lower.includes("캠페인") || lower.includes("홍보")) return { caseKind: "campaign-request", type: "inquiry" as const, severity: "normal" as const }
  return { caseKind: "inquiry", type: "inquiry" as const, severity: "normal" as const }
}

function getClassificationFromCaseKind(caseKind: string, severity: "high" | "same_day" | "normal") {
  if (caseKind === "refund") return { caseKind, type: "refund" as const, severity: severity === "high" ? "same_day" as const : severity }
  if (caseKind === "complaint") return { caseKind, type: "complaint" as const, severity: severity === "high" ? "same_day" as const : severity }
  if (caseKind === "attendance" || caseKind === "schedule") return { caseKind, type: "schedule" as const, severity }
  return { caseKind, type: "inquiry" as const, severity }
}

function inferAgentType(caseKind: string) {
  if (caseKind === "complaint" || caseKind === "refund" || caseKind === "counseling" || caseKind === "quick-ask") return "complaint"
  if (caseKind === "attendance" || caseKind === "schedule") return "scheduler"
  if (caseKind === "campaign-request") return "orchestrator"
  if (caseKind === "payment") return "notification"
  return "orchestrator"
}

function inferIntentFamily(caseKind: string): IntentFamily {
  if (caseKind === "refund") return "refund"
  if (caseKind === "complaint") return "complaint"
  if (caseKind === "attendance" || caseKind === "schedule") return "schedule_ops"
  if (caseKind === "payment") return "payment"
  if (caseKind === "counseling") return "counseling"
  if (caseKind === "campaign-request") return "campaign"
  return "general"
}

function buildContextKey(channelKey: ChannelKey, senderId?: string, threadId?: string) {
  return `${channelKey}:${threadId || senderId || "anonymous"}`
}

function getLastInboundTimestamp(caseRecord: typeof schema.cases.$inferSelect) {
  const metadata = getCaseMetadata(caseRecord)
  const raw = metadata.lastInboundAt ?? caseRecord.updatedAt
  return new Date(raw).getTime()
}

function getPolicyForIntentFamily(intentFamily: IntentFamily) {
  return INTENT_POLICY[intentFamily]
}

function getMaxRelevantWindowMs(intentFamily: IntentFamily) {
  const policy = getPolicyForIntentFamily(intentFamily)
  return Math.max(policy.appendWindowMs, policy.reopenWindowMs)
}

function areIntentFamiliesCompatible(currentIntentFamily: IntentFamily, nextIntentFamily: IntentFamily) {
  if (currentIntentFamily === nextIntentFamily) return true
  return (
    (currentIntentFamily === "general" && nextIntentFamily === "counseling")
    || (currentIntentFamily === "counseling" && nextIntentFamily === "general")
    || (currentIntentFamily === "general" && nextIntentFamily === "schedule_ops")
    || (currentIntentFamily === "schedule_ops" && nextIntentFamily === "general")
  )
}

function hasStrongIntentShift(currentIntentFamily: IntentFamily, nextIntentFamily: IntentFamily) {
  if (currentIntentFamily === nextIntentFamily) return false
  if (!areIntentFamiliesCompatible(currentIntentFamily, nextIntentFamily)) return true
  return getPolicyForIntentFamily(currentIntentFamily).strict || getPolicyForIntentFamily(nextIntentFamily).strict
}

function resolveContextualCaseKind(
  candidate: typeof schema.cases.$inferSelect | null,
  nextCaseKind: string,
  nextIntentFamily: IntentFamily,
) {
  if (!candidate || nextIntentFamily !== "general") return nextCaseKind
  const metadata = getCaseMetadata(candidate)
  const currentCaseKind = String(metadata.caseKind ?? candidate.type)
  const currentIntentFamily = metadata.intentFamily ?? inferIntentFamily(currentCaseKind)
  if (currentIntentFamily === "schedule_ops" || currentIntentFamily === "counseling") {
    return currentCaseKind
  }
  return nextCaseKind
}

function decideInboundCaseAction(
  candidate: typeof schema.cases.$inferSelect | null,
  nextIntentFamily: IntentFamily,
  now: number,
): InboundCaseAction {
  if (!candidate) return "new_case"

  const metadata = getCaseMetadata(candidate)
  const currentIntentFamily = metadata.intentFamily ?? inferIntentFamily(String(metadata.caseKind ?? candidate.type))
  const lastInboundAt = getLastInboundTimestamp(candidate)
  const currentPolicy = getPolicyForIntentFamily(currentIntentFamily)
  const nextPolicy = getPolicyForIntentFamily(nextIntentFamily)
  const appendWindowMs = Math.min(currentPolicy.appendWindowMs, nextPolicy.appendWindowMs)
  const reopenWindowMs = Math.min(currentPolicy.reopenWindowMs, nextPolicy.reopenWindowMs)
  const shifted = hasStrongIntentShift(currentIntentFamily, nextIntentFamily)

  if (candidate.status === "done") {
    if (!shifted && now - lastInboundAt <= reopenWindowMs) return "reopen"
    if (now - lastInboundAt <= Math.max(currentPolicy.appendWindowMs, nextPolicy.appendWindowMs)) return "child_case"
    return "new_case"
  }

  if (shifted) return "child_case"
  if (now - lastInboundAt <= appendWindowMs) return "append"
  return "new_case"
}

function buildUpdatedChannelMetadata(
  base: ChannelCaseMetadata,
  input: {
    contextKey: string
    conversationGroupId: string
    caseKind: string
    intentFamily: IntentFamily
    senderId?: string
    senderName?: string
    threadId?: string
    origin?: string
    scenarioKey?: string
    studentId?: string | null
    parentId?: string | null
    message: string
    nowIso: string
    parentCaseId?: string
    previousChannelCaseId?: string
    rootCaseId?: string
    reopenedFromStatus?: string
  },
): ChannelCaseMetadata {
  const history = Array.isArray(base.caseKindHistory) ? base.caseKindHistory.filter((item): item is string => typeof item === "string") : []
  const nextHistory = history.includes(input.caseKind) ? history : [...history, input.caseKind]

  return {
    ...base,
    caseKind: input.caseKind,
    channelSource: base.channelSource,
    senderId: input.senderId ?? base.senderId ?? null,
    senderName: input.senderName ?? base.senderName ?? null,
    threadId: input.threadId ?? base.threadId ?? input.senderId ?? null,
    linkedEntityIds: {
      studentId: input.studentId ?? base.linkedEntityIds?.studentId ?? null,
      parentId: input.parentId ?? base.linkedEntityIds?.parentId ?? null,
    },
    routingReason: input.caseKind,
    generatedBy: "channel-inbound",
    origin: input.origin ?? base.origin ?? null,
    scenarioKey: input.scenarioKey ?? base.scenarioKey ?? null,
    contextKey: input.contextKey,
    conversationGroupId: input.conversationGroupId,
    intentFamily: input.intentFamily,
    inboundCount: Math.max(1, Number(base.inboundCount ?? 0) + 1),
    openedAt: typeof base.openedAt === "string" ? base.openedAt : input.nowIso,
    lastInboundAt: input.nowIso,
    lastMessagePreview: summarizeInboundMessage(input.message),
    caseKindHistory: nextHistory,
    rootCaseId: input.rootCaseId ?? base.rootCaseId,
    parentCaseId: input.parentCaseId ?? base.parentCaseId,
    previousChannelCaseId: input.previousChannelCaseId ?? base.previousChannelCaseId,
    groupingVersion: GROUPING_VERSION,
    reopenedFromStatus: input.reopenedFromStatus ?? base.reopenedFromStatus,
  }
}

async function resolveOrganizationFromChannel(db: Db, channelKey: ChannelKey, identifiers: Record<string, string | undefined>) {
  const organizations = await db.select().from(schema.organizations)

  const hasExactMatch = (bindingValue: unknown, identifierValue: string | undefined) => {
    if (!identifierValue) return false
    if (bindingValue == null) return false
    return String(bindingValue) === String(identifierValue)
  }

  return organizations.find((organization: typeof schema.organizations.$inferSelect) => {
    const binding = getChannelBinding(organization, channelKey)
    if (!binding) return false
    if (binding.enabled !== true) return false

    if (channelKey === "kakao") {
      return (
        hasExactMatch(binding.channelId, identifiers.channelId) ||
        hasExactMatch(binding.webhookSecret, identifiers.webhookSecret) ||
        hasExactMatch(binding.botId, identifiers.botId) ||
        hasExactMatch(binding.searchId, identifiers.searchId)
      )
    }
    if (channelKey === "telegram") {
      return (
        hasExactMatch(binding.botToken, identifiers.botToken) ||
        hasExactMatch(binding.botUsername, identifiers.botUsername)
      )
    }
    if (channelKey === "sms") {
      return hasExactMatch(binding.phoneNumber, identifiers.phoneNumber)
    }
    if (channelKey === "naver") {
      return hasExactMatch(binding.channelId, identifiers.channelId)
    }
    return false
  }) ?? null
}

async function findLinkedStudentAndParent(
  db: Db,
  organizationId: string,
  senderId?: string,
  senderName?: string,
) {
  const students = await db.select().from(schema.students).where(eq(schema.students.organizationId, organizationId))
  const parents = await db.select().from(schema.parents).where(eq(schema.parents.organizationId, organizationId))

  const parent = parents.find((item: typeof schema.parents.$inferSelect) => {
    return (
      (senderId && item.phone && item.phone.includes(senderId.slice(-8))) ||
      (senderName && item.name.includes(senderName))
    )
  }) ?? null

  const student = parent
    ? students.find((item: typeof schema.students.$inferSelect) => item.id === parent.studentId) ?? null
    : students.find((item: typeof schema.students.$inferSelect) => senderName && item.name.includes(senderName.replace(/보호자/g, "").trim())) ?? null

  return { student, parent }
}

async function upsertInboundCase(
  db: Db,
  input: {
    organization: typeof schema.organizations.$inferSelect
    channelKey: ChannelKey
    message: string
    senderId?: string
    senderName?: string
    threadId?: string
    origin?: string
    scenarioKey?: string
  },
) {
  const { organization, channelKey, message, senderId, senderName, threadId, origin, scenarioKey } = input
  const classification = normalizeCaseKind(message)
  const intentFamily = inferIntentFamily(classification.caseKind)
  const { student, parent } = await findLinkedStudentAndParent(db, organization.id, senderId, senderName)
  const contextKey = buildContextKey(channelKey, senderId, threadId)
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const allCases = await db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.organizationId, organization.id))
    .orderBy(desc(schema.cases.updatedAt))

  const contextCandidates = allCases.filter((item: typeof schema.cases.$inferSelect) => {
    if (item.archivedAt) return false
    const metadata = getCaseMetadata(item)
    const candidateIntentFamily = metadata.intentFamily ?? inferIntentFamily(String(metadata.caseKind ?? item.type))
    const candidateWindowMs = Math.max(getMaxRelevantWindowMs(intentFamily), getMaxRelevantWindowMs(candidateIntentFamily))
    const matchesConversationOwner = threadId
      ? (
          String(metadata.contextKey ?? "") === contextKey ||
          String(metadata.threadId ?? "") === threadId
        )
      : (
          String(metadata.contextKey ?? "") === contextKey ||
          (senderId && String(metadata.senderId ?? "") === senderId)
        )
    return (
      String(metadata.channelSource ?? item.source ?? "") === channelKey &&
      now - getLastInboundTimestamp(item) <= candidateWindowMs &&
      matchesConversationOwner
    )
  })

  const latestContextCase = contextCandidates[0] ?? null
  const matchingCase = contextCandidates[0] ?? null
  const action = decideInboundCaseAction(matchingCase, intentFamily, now)
  const resolvedCaseKind = resolveContextualCaseKind(matchingCase, classification.caseKind, intentFamily)
  const resolvedClassification = action === "append" || action === "reopen"
    ? getClassificationFromCaseKind(resolvedCaseKind, classification.severity)
    : classification
  const resolvedIntentFamily = inferIntentFamily(resolvedClassification.caseKind)

  if (matchingCase && (action === "append" || action === "reopen")) {
    const previousStatus = matchingCase.status
    const [comment] = await db.insert(schema.caseComments).values({
      caseId: matchingCase.id,
      authorType: "external",
      authorId: senderName ?? senderId ?? channelKey,
      content: message,
    }).returning()

    const existingMetadata = getCaseMetadata(matchingCase)
    const nextMetadata = buildUpdatedChannelMetadata(existingMetadata, {
      contextKey,
      conversationGroupId: String(existingMetadata.conversationGroupId ?? matchingCase.id),
      caseKind: resolvedClassification.caseKind,
      intentFamily: resolvedIntentFamily,
      senderId,
      senderName,
      threadId,
      origin,
      scenarioKey,
      studentId: student?.id ?? null,
      parentId: parent?.id ?? null,
      message,
      nowIso,
      rootCaseId: existingMetadata.rootCaseId ?? matchingCase.id,
      reopenedFromStatus: action === "reopen" ? previousStatus : undefined,
    })

    const shouldRefreshHeadline = shouldRefreshCaseHeadline({
      title: matchingCase.title,
      description: matchingCase.description,
      lastMessagePreview: existingMetadata.lastMessagePreview,
      nextMessage: message,
    })

    await db.update(schema.cases)
      .set({
        title: shouldRefreshHeadline ? buildChannelCaseTitle(channelKey, senderName, senderId, message) : matchingCase.title,
        description: shouldRefreshHeadline ? message : matchingCase.description,
        status: action === "reopen" ? "todo" : matchingCase.status,
        metadata: nextMetadata as Record<string, unknown>,
        updatedAt: new Date(now),
      })
      .where(eq(schema.cases.id, matchingCase.id))

    await db.insert(schema.activityEvents).values({
      organizationId: organization.id,
      actorType: "system",
      actorId: `channel:${channelKey}`,
      action: action === "reopen" ? "case.reopened_from_channel" : "case.appended_from_channel",
      entityType: "case",
      entityId: matchingCase.id,
      entityTitle: matchingCase.title,
      metadata: {
        channelKey,
        senderId: senderId ?? null,
        senderName: senderName ?? null,
        threadId: threadId ?? null,
        commentId: comment.id,
        intentFamily: resolvedIntentFamily,
        groupedBy: action === "reopen" ? "context-reopen" : "context-reuse",
        previousStatus,
      } as Record<string, unknown>,
    })

    const [activeRun, pendingApproval] = await Promise.all([
      db.select().from(schema.agentRuns).where(eq(schema.agentRuns.caseId, matchingCase.id)),
      db.select().from(schema.approvals).where(eq(schema.approvals.caseId, matchingCase.id)),
    ])
    const hasActiveRun = activeRun.some((item) =>
      item.status === "queued" || item.status === "running" || item.status === "pending_approval"
    )
    const hasPendingApproval = pendingApproval.some((item) => item.status === "pending")
    const [updatedCase] = await db.select().from(schema.cases).where(eq(schema.cases.id, matchingCase.id))
    return {
      caseRecord: updatedCase ?? matchingCase,
      created: false,
      classification: resolvedClassification,
      student,
      parent,
      matchMode: action,
      shouldRoute: (action === "reopen" || previousStatus !== "in_review") && !hasActiveRun && !hasPendingApproval,
    }
  }

  const latestContextMetadata = latestContextCase ? getCaseMetadata(latestContextCase) : {}
  const conversationGroupId = String(latestContextMetadata.conversationGroupId ?? latestContextCase?.id ?? crypto.randomUUID())
  const rootCaseId = String(latestContextMetadata.rootCaseId ?? latestContextCase?.id ?? conversationGroupId)
  const parentCaseId = action === "child_case" && latestContextCase ? latestContextCase.id : undefined
  const createdCase = await createCaseWithRetry(db, {
    organizationId: organization.id,
    title: buildChannelCaseTitle(channelKey, senderName, senderId, message),
    description: message,
    type: classification.type,
    severity: classification.severity === "high" ? "same_day" : classification.severity,
    status: "todo",
    priority: resolvedClassification.caseKind === "refund" || resolvedClassification.caseKind === "complaint" ? 1 : 2,
    reporterId: parent ? `parent:${parent.id}` : senderId ? `${channelKey}:${senderId}` : `${channelKey}:anonymous`,
    studentId: student?.id ?? null,
    source: channelKey,
    metadata: {
      caseKind: resolvedClassification.caseKind,
      channelSource: channelKey,
      senderId: senderId ?? null,
      senderName: senderName ?? null,
      threadId: threadId ?? senderId ?? null,
      contextKey,
      conversationGroupId,
      rootCaseId,
      intentFamily: resolvedIntentFamily,
      inboundCount: 1,
      openedAt: nowIso,
      lastInboundAt: nowIso,
      lastMessagePreview: summarizeInboundMessage(message),
      caseKindHistory: [classification.caseKind],
      linkedEntityIds: {
        studentId: student?.id ?? null,
        parentId: parent?.id ?? null,
      },
      routingReason: resolvedClassification.caseKind,
      generatedBy: "channel-inbound",
      origin: origin ?? null,
      scenarioKey: scenarioKey ?? null,
      groupingVersion: GROUPING_VERSION,
      ...(parentCaseId
        ? {
            parentCaseId,
            previousChannelCaseId: latestContextCase.id,
          }
        : {}),
    } as Record<string, unknown>,
  })

  await db.insert(schema.caseComments).values({
    caseId: createdCase.id,
    authorType: "external",
    authorId: senderName ?? senderId ?? channelKey,
    content: message,
  })

  await db.insert(schema.notifications).values({
    organizationId: organization.id,
    type: "case_created",
    title: `${channelKey === "kakao" ? "카카오톡" : channelKey === "telegram" ? "텔레그램" : channelKey.toUpperCase()} 문의 접수`,
    body: `${senderName ?? "외부 발신자"}님의 메시지가 케이스로 접수되었습니다.`,
    entityType: "case",
    entityId: createdCase.id,
  })

  await db.insert(schema.activityEvents).values({
    organizationId: organization.id,
    actorType: "system",
    actorId: `channel:${channelKey}`,
    action: "case.created_from_channel",
    entityType: "case",
    entityId: createdCase.id,
    entityTitle: createdCase.title,
    metadata: {
      channelKey,
      senderId: senderId ?? null,
      senderName: senderName ?? null,
      threadId: threadId ?? null,
      caseKind: resolvedClassification.caseKind,
      intentFamily: resolvedIntentFamily,
      origin: origin ?? null,
      scenarioKey: scenarioKey ?? null,
      conversationGroupId,
      groupedBy: action === "child_case" ? "context-fork" : "new-thread",
      previousChannelCaseId: latestContextCase?.id ?? null,
      rootCaseId,
    } as Record<string, unknown>,
  })

  publishEvent(organization.id, "case.created", {
    caseId: createdCase.id,
    identifier: createdCase.identifier,
    source: channelKey,
    type: resolvedClassification.caseKind,
  })

  return {
    caseRecord: createdCase,
    created: true,
    classification: resolvedClassification,
    student,
    parent,
    matchMode: action,
    shouldRoute: true,
  }
}

async function autoRouteCase(db: Db, organizationId: string, caseRecord: typeof schema.cases.$inferSelect, caseKind: string) {
  const agents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, organizationId))
  const preferredAgentType = inferAgentType(caseKind)
  const assignedAgent = agents.find((item: typeof schema.agents.$inferSelect) => item.agentType === preferredAgentType)
    ?? agents.find((item: typeof schema.agents.$inferSelect) => item.agentType === "orchestrator")
    ?? null

  if (!assignedAgent) return { runId: null, assigneeAgentId: null }

  await db.update(schema.cases)
    .set({
      assigneeAgentId: assignedAgent.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.cases.id, caseRecord.id))

  const approvalLevel = assignedAgent.agentType === "complaint" || assignedAgent.agentType === "scheduler" ? 1 : 0
  const { runId } = await executeAgentRun(db, {
    organizationId,
    agentId: assignedAgent.id,
    caseId: caseRecord.id,
    agentType: assignedAgent.agentType,
    approvalLevel,
  }).catch(() => ({ runId: null }))

  return { runId, assigneeAgentId: assignedAgent.id }
}

function normalizeKakaoPayload(payload: Record<string, unknown>) {
  if (!isPlainObject(payload.userRequest)) {
    return {
      message: typeof payload.message === "string" ? payload.message : "",
      senderId: typeof payload.senderId === "string" ? payload.senderId : undefined,
      senderName: typeof payload.senderName === "string" ? payload.senderName : undefined,
      channelId: typeof payload.channelId === "string" ? payload.channelId : undefined,
      webhookSecret: typeof payload.webhookSecret === "string" ? payload.webhookSecret : undefined,
      threadId: typeof payload.threadId === "string" ? payload.threadId : undefined,
      origin: typeof payload.origin === "string" ? payload.origin : undefined,
      scenarioKey: typeof payload.scenarioKey === "string" ? payload.scenarioKey : undefined,
      botId: typeof payload.botId === "string" ? payload.botId : undefined,
      searchId: typeof payload.searchId === "string" ? payload.searchId : undefined,
      openBuilder: false,
    }
  }

  const userRequest = payload.userRequest as Record<string, unknown>
  const user = isPlainObject(userRequest.user) ? (userRequest.user as Record<string, unknown>) : {}
  const userProperties = isPlainObject(user.properties) ? (user.properties as Record<string, unknown>) : {}
  const bot = isPlainObject(payload.bot) ? (payload.bot as Record<string, unknown>) : {}
  const action = isPlainObject(payload.action) ? (payload.action as Record<string, unknown>) : {}
  const clientExtra = isPlainObject(action.clientExtra) ? (action.clientExtra as Record<string, unknown>) : {}

  const senderId =
    (typeof user.id === "string" && user.id) ||
    (typeof userProperties.plusfriendUserKey === "string" && userProperties.plusfriendUserKey) ||
    (typeof userProperties.appUserId === "string" && userProperties.appUserId) ||
    undefined

  const senderName =
    (typeof userProperties.nickname === "string" && userProperties.nickname) ||
    (typeof userProperties.name === "string" && userProperties.name) ||
    (typeof payload.senderName === "string" && payload.senderName) ||
    undefined

  const threadId =
    (typeof clientExtra.threadId === "string" && clientExtra.threadId) ||
    senderId ||
    undefined

  return {
    message: typeof userRequest.utterance === "string" ? userRequest.utterance : "",
    senderId,
    senderName,
    channelId:
      (typeof payload.channelId === "string" && payload.channelId) ||
      (typeof clientExtra.channelId === "string" && clientExtra.channelId) ||
      undefined,
    webhookSecret: typeof payload.webhookSecret === "string" ? payload.webhookSecret : undefined,
    threadId,
    origin: "kakao-openbuilder",
    scenarioKey:
      (typeof clientExtra.scenarioKey === "string" && clientExtra.scenarioKey) ||
      "openbuilder-live",
    botId:
      (typeof bot.id === "string" && bot.id) ||
      (typeof payload.botId === "string" && payload.botId) ||
      undefined,
    searchId:
      (typeof clientExtra.searchId === "string" && clientExtra.searchId) ||
      (typeof payload.searchId === "string" && payload.searchId) ||
      undefined,
    openBuilder: true,
  }
}

function buildKakaoOpenBuilderAck(result: {
  identifier: string
  created: boolean
}) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: result.created
              ? `문의가 ${result.identifier} 케이스로 접수되었습니다. 운영팀이 확인 후 안내드릴게요.`
              : `기존 ${result.identifier} 케이스에 내용이 추가되었습니다. 운영팀이 이어서 확인할게요.`,
          },
        },
      ],
    },
  }
}

export type ChannelInboundPayload = {
  message?: string
  senderId?: string
  senderName?: string
  channelId?: string
  webhookSecret?: string
  botId?: string
  searchId?: string
  botToken?: string
  botUsername?: string
  threadId?: string
  phoneNumber?: string
  origin?: string
  scenarioKey?: string
}

export type ChannelInboundResult = {
  organizationId: string
  caseId: string
  identifier: string
  type: string
  created: boolean
  matchMode: InboundCaseAction
  assigneeAgentId: string | null
  runId: string | null
  linkedEntities: {
    studentId: string | null
    parentId: string | null
  }
}

export async function processChannelInbound(
  db: Db,
  channelKey: ChannelKey,
  payload: ChannelInboundPayload,
  options?: {
    awaitRouting?: boolean
    organization?: typeof schema.organizations.$inferSelect | null
  },
): Promise<ChannelInboundResult> {
  const message = payload.message?.trim()
  if (!message) {
    throw new Error("message is required")
  }

  const organization = options?.organization ?? await resolveOrganizationFromChannel(db, channelKey, {
    channelId: payload.channelId,
    webhookSecret: payload.webhookSecret,
    botId: payload.botId,
    searchId: payload.searchId,
    botToken: payload.botToken,
    botUsername: payload.botUsername,
    phoneNumber: payload.phoneNumber,
  })

  if (!organization) {
    throw new Error("No organization bound to this channel")
  }

  const inbound = await upsertInboundCase(db, {
    organization,
    channelKey,
    message,
    senderId: payload.senderId,
    senderName: payload.senderName,
    threadId: payload.threadId,
    origin: payload.origin,
    scenarioKey: payload.scenarioKey,
  })
  const routeInBackground = options?.awaitRouting === false
  const routingPromise = inbound.shouldRoute
    ? autoRouteCase(db, organization.id, inbound.caseRecord, inbound.classification.caseKind)
    : Promise.resolve({ runId: null, assigneeAgentId: null })
  const routing = routeInBackground
    ? { runId: null, assigneeAgentId: null }
    : await routingPromise

  if (routeInBackground) {
    void routingPromise.catch(() => null)
  }

  return {
    organizationId: organization.id,
    caseId: inbound.caseRecord.id,
    identifier: inbound.caseRecord.identifier,
    type: inbound.classification.caseKind,
    created: inbound.created,
    matchMode: inbound.matchMode,
    assigneeAgentId: routing.assigneeAgentId,
    runId: routing.runId,
    linkedEntities: {
      studentId: inbound.student?.id ?? null,
      parentId: inbound.parent?.id ?? null,
    },
  }
}

export function webhookRoutes(db: Db): Router {
  const router = Router()

  router.post("/kakao", async (req, res) => {
    try {
      const normalized = normalizeKakaoPayload(isPlainObject(req.body) ? req.body : {})
      const result = await processChannelInbound(db, "kakao", normalized, {
        awaitRouting: !normalized.openBuilder,
      })

      if (normalized.openBuilder) {
        res.json(buildKakaoOpenBuilderAck(result))
        return
      }

      res.status(result.created ? 201 : 200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kakao webhook processing failed"
      res.status(message === "No organization bound to this channel" ? 404 : 500).json({ error: message })
    }
  })

  router.post("/kakao/inbound", async (req, res) => {
    try {
      const result = await processChannelInbound(db, "kakao", req.body ?? {}, {
        awaitRouting: true,
      })
      res.status(result.created ? 201 : 200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kakao inbound processing failed"
      res.status(message === "No organization bound to this channel" ? 404 : 500).json({ error: message })
    }
  })

  router.post("/telegram/inbound", async (req, res) => {
    try {
      const result = await processChannelInbound(db, "telegram", req.body ?? {}, {
        awaitRouting: true,
      })
      res.status(result.created ? 201 : 200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Telegram inbound processing failed"
      res.status(message === "No organization bound to this channel" ? 404 : 500).json({ error: message })
    }
  })

  router.post("/sms", async (req, res) => {
    try {
      const result = await processChannelInbound(db, "sms", {
        message: req.body?.message,
        senderId: req.body?.from,
        senderName: req.body?.from,
        phoneNumber: req.body?.to,
        threadId: req.body?.from,
      }, {
        awaitRouting: true,
      })
      res.status(result.created ? 201 : 200).json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMS webhook processing failed"
      res.status(message === "No organization bound to this channel" ? 404 : 500).json({ error: message })
    }
  })

  return router
}
