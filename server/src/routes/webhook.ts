import { Router } from "express"
import { desc, eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "../services/live-events.js"
import { executeAgentRun } from "../services/execution.js"
import { createCaseWithRetry } from "../lib/case-create.js"

type ChannelKey = "kakao" | "telegram" | "sms" | "naver"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
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
  return binding && typeof binding === "object" && !Array.isArray(binding) ? (binding as Record<string, unknown>) : null
}

function normalizeCaseKind(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("환불") || lower.includes("취소")) return { caseKind: "refund", type: "refund" as const, severity: "high" as const }
  if (lower.includes("불만") || lower.includes("항의") || lower.includes("민원") || lower.includes("화가")) return { caseKind: "complaint", type: "complaint" as const, severity: "high" as const }
  if (lower.includes("상담") || lower.includes("면담")) return { caseKind: "counseling", type: "inquiry" as const, severity: "normal" as const }
  if (lower.includes("출석") || lower.includes("결석") || lower.includes("지각")) return { caseKind: "attendance", type: "schedule" as const, severity: "same_day" as const }
  if (lower.includes("결제") || lower.includes("납부") || lower.includes("수강료")) return { caseKind: "payment", type: "inquiry" as const, severity: "same_day" as const }
  if (lower.includes("보강") || lower.includes("수업") || lower.includes("시간표") || lower.includes("일정")) return { caseKind: "schedule", type: "schedule" as const, severity: "normal" as const }
  if (lower.includes("프로모션") || lower.includes("캠페인") || lower.includes("홍보")) return { caseKind: "campaign-request", type: "inquiry" as const, severity: "normal" as const }
  return { caseKind: "inquiry", type: "inquiry" as const, severity: "normal" as const }
}

function inferAgentType(caseKind: string) {
  if (caseKind === "complaint" || caseKind === "refund" || caseKind === "counseling") return "complaint"
  if (caseKind === "attendance" || caseKind === "schedule") return "scheduler"
  if (caseKind === "campaign-request") return "orchestrator"
  if (caseKind === "payment") return "notification"
  return "orchestrator"
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
  const { student, parent } = await findLinkedStudentAndParent(db, organization.id, senderId, senderName)
  const allCases = await db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.organizationId, organization.id))
    .orderBy(desc(schema.cases.updatedAt))

  const existing = allCases.find((item: typeof schema.cases.$inferSelect) => {
    const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : {}
    return (
      item.status !== "done" &&
      String(metadata.channelSource ?? item.source ?? "") === channelKey &&
      (
        (threadId && String(metadata.threadId ?? "") === threadId) ||
        (senderId && String(metadata.senderId ?? "") === senderId)
      )
    )
  })

  if (existing) {
    const [comment] = await db.insert(schema.caseComments).values({
      caseId: existing.id,
      authorType: "external",
      authorId: senderName ?? senderId ?? channelKey,
      content: message,
    }).returning()

    await db.insert(schema.activityEvents).values({
      organizationId: organization.id,
      actorType: "system",
      actorId: `channel:${channelKey}`,
      action: "case.appended_from_channel",
      entityType: "case",
      entityId: existing.id,
      entityTitle: existing.title,
      metadata: {
        channelKey,
        senderId: senderId ?? null,
        senderName: senderName ?? null,
        threadId: threadId ?? null,
        commentId: comment.id,
      } as Record<string, unknown>,
    })

    return { caseRecord: existing, created: false, classification, student, parent }
  }

  const createdCase = await createCaseWithRetry(db, {
    organizationId: organization.id,
    title: `[${channelKey.toUpperCase()}] ${senderName ?? senderId ?? "익명"} · ${message.slice(0, 40)}`,
    description: message,
    type: classification.type,
    severity: classification.severity === "high" ? "same_day" : classification.severity,
    status: "todo",
    priority: classification.caseKind === "refund" || classification.caseKind === "complaint" ? 1 : 2,
    reporterId: parent ? `parent:${parent.id}` : senderId ? `${channelKey}:${senderId}` : `${channelKey}:anonymous`,
    studentId: student?.id ?? null,
    source: channelKey,
    metadata: {
      caseKind: classification.caseKind,
      channelSource: channelKey,
      senderId: senderId ?? null,
      senderName: senderName ?? null,
      threadId: threadId ?? senderId ?? null,
      linkedEntityIds: {
        studentId: student?.id ?? null,
        parentId: parent?.id ?? null,
      },
      routingReason: classification.caseKind,
      generatedBy: "channel-inbound",
      origin: origin ?? null,
      scenarioKey: scenarioKey ?? null,
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
      caseKind: classification.caseKind,
      origin: origin ?? null,
      scenarioKey: scenarioKey ?? null,
    } as Record<string, unknown>,
  })

  publishEvent(organization.id, "case.created", {
    caseId: createdCase.id,
    identifier: createdCase.identifier,
    source: channelKey,
    type: classification.caseKind,
  })

  return { caseRecord: createdCase, created: true, classification, student, parent }
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

export function webhookRoutes(db: Db): Router {
  const router = Router()

  type InboundResult = {
    organizationId: string
    caseId: string
    identifier: string
    type: string
    created: boolean
    assigneeAgentId: string | null
    runId: string | null
    linkedEntities: {
      studentId: string | null
      parentId: string | null
    }
  }

  const handleInbound = async (
    channelKey: ChannelKey,
    payload: {
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
    },
    options?: {
      awaitRouting?: boolean
    },
  ): Promise<InboundResult> => {
    const message = payload.message?.trim()
    if (!message) {
      throw new Error("message is required")
    }

    const organization = await resolveOrganizationFromChannel(db, channelKey, {
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
    const routingPromise = autoRouteCase(db, organization.id, inbound.caseRecord, inbound.classification.caseKind)
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
      assigneeAgentId: routing.assigneeAgentId,
      runId: routing.runId,
      linkedEntities: {
        studentId: inbound.student?.id ?? null,
        parentId: inbound.parent?.id ?? null,
      },
    }
  }

  router.post("/kakao", async (req, res) => {
    try {
      const normalized = normalizeKakaoPayload(isPlainObject(req.body) ? req.body : {})
      const result = await handleInbound("kakao", normalized, {
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
      const result = await handleInbound("kakao", req.body ?? {}, {
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
      const result = await handleInbound("telegram", req.body ?? {}, {
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
      const result = await handleInbound("sms", {
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
