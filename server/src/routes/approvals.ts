import { Router } from "express"
import { eq, and, desc, inArray } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "../services/live-events.js"
import { processApprovalDecision } from "../services/approval-decisions.js"
import { processKakaoApprovalDelivery } from "../services/kakao-approval-delivery.js"
import { processTelegramApprovalDelivery } from "../services/telegram-approval-delivery.js"
import { dedupePendingApprovals } from "../services/approval-dedupe.js"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

type ApprovalRecord = typeof schema.approvals.$inferSelect

async function hydrateApprovals(db: Db, approvals: ApprovalRecord[]) {
  const caseIds = approvals
    .map((item) => item.caseId)
    .filter((value): value is string => typeof value === "string")
  const runIds = approvals
    .map((item) => item.agentRunId)
    .filter((value): value is string => typeof value === "string")

  const [cases, runs] = await Promise.all([
    caseIds.length
      ? db.select().from(schema.cases).where(inArray(schema.cases.id, caseIds))
      : Promise.resolve([] as typeof schema.cases.$inferSelect[]),
    runIds.length
      ? db.select().from(schema.agentRuns).where(inArray(schema.agentRuns.id, runIds))
      : Promise.resolve([] as typeof schema.agentRuns.$inferSelect[]),
  ])

  const agentIds = runs
    .map((item) => item.agentId)
    .filter((value): value is string => typeof value === "string")
  const scheduleIds = approvals
    .map((approval) => {
      const decision = isPlainObject(approval.decision) ? approval.decision : {}
      const sideEffects = isPlainObject(decision.sideEffects) ? decision.sideEffects : {}
      const googleCalendar = isPlainObject(sideEffects.googleCalendar) ? sideEffects.googleCalendar : {}
      return typeof googleCalendar.scheduleId === "string" ? googleCalendar.scheduleId : null
    })
    .filter((value): value is string => typeof value === "string")

  const [agents, schedules] = await Promise.all([
    agentIds.length
      ? db.select().from(schema.agents).where(inArray(schema.agents.id, agentIds))
      : Promise.resolve([] as typeof schema.agents.$inferSelect[]),
    scheduleIds.length
      ? db.select().from(schema.schedules).where(inArray(schema.schedules.id, scheduleIds))
      : Promise.resolve([] as typeof schema.schedules.$inferSelect[]),
  ])

  const caseMap = new Map(cases.map((item) => [item.id, item]))
  const runMap = new Map(runs.map((item) => [item.id, item]))
  const agentMap = new Map(agents.map((item) => [item.id, item]))
  const scheduleMap = new Map(schedules.map((item) => [item.id, item]))

  return approvals.map((approval) => {
    const run = runMap.get(approval.agentRunId) ?? null
    const caseRecord = approval.caseId ? caseMap.get(approval.caseId) ?? null : null
    const agent = run?.agentId ? agentMap.get(run.agentId) ?? null : null
    const decision = isPlainObject(approval.decision) ? { ...approval.decision } : {}
    const sideEffects = isPlainObject(decision.sideEffects) ? { ...decision.sideEffects } : {}
    const googleCalendar = isPlainObject(sideEffects.googleCalendar) ? { ...sideEffects.googleCalendar } : null
    const scheduleId = googleCalendar && typeof googleCalendar.scheduleId === "string" ? googleCalendar.scheduleId : null
    const createdSchedule = scheduleId ? scheduleMap.get(scheduleId) ?? null : null

    if (googleCalendar && createdSchedule) {
      googleCalendar.schedule = {
        id: createdSchedule.id,
        title: createdSchedule.title,
        type: createdSchedule.type,
        dayOfWeek: createdSchedule.dayOfWeek,
        startTime: createdSchedule.startTime,
        endTime: createdSchedule.endTime,
        room: createdSchedule.room,
      }
      sideEffects.googleCalendar = googleCalendar
      decision.sideEffects = sideEffects
    }

    return {
      ...approval,
      decision,
      case: caseRecord
        ? {
            id: caseRecord.id,
            title: caseRecord.title,
            source: caseRecord.source,
            status: caseRecord.status,
            assigneeAgentId: caseRecord.assigneeAgentId,
          }
        : null,
      caseTitle: caseRecord?.title ?? null,
      agent: agent
        ? {
            id: agent.id,
            name: agent.name,
            agentType: agent.agentType,
            avatarUrl: undefined,
          }
        : null,
      agentId: agent?.id ?? run?.agentId ?? null,
      agentName: agent?.name ?? null,
      agentType: agent?.agentType ?? null,
    }
  })
}

export function approvalRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/approvals", async (req, res) => {
    try {
      await dedupePendingApprovals(db, { organizationId: req.params.orgId })
      const { status } = req.query

      const conditions = [
        eq(schema.approvals.organizationId, req.params.orgId),
      ]

      if (status && typeof status === "string") {
        const validStatuses = [
          "pending",
          "approved",
          "rejected",
          "revision_requested",
        ] as const
        type ApprovalStatus = (typeof validStatuses)[number]
        if (validStatuses.includes(status as ApprovalStatus)) {
          conditions.push(
            eq(schema.approvals.status, status as ApprovalStatus),
          )
        }
      }

      const approvals = await db
        .select()
        .from(schema.approvals)
        .where(and(...conditions))

      res.json(await hydrateApprovals(db, approvals))
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch approvals" })
    }
  })

  router.get("/approvals/:id", async (req, res) => {
    try {
      const [approval] = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.id, req.params.id))

      if (!approval) {
        res.status(404).json({ error: "Approval not found" })
        return
      }

      const [hydrated] = await hydrateApprovals(db, [approval])
      res.json(hydrated)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch approval" })
    }
  })

  router.post("/approvals/:id/decide", async (req, res) => {
    try {
      const { decision, comment } = req.body as {
        decision: "approved" | "rejected" | "revision_requested"
        comment?: string
      }

      const validDecisions = ["approved", "rejected", "revision_requested"] as const
      if (!validDecisions.includes(decision)) {
        res.status(400).json({ error: "Invalid decision value" })
        return
      }

      res.json(await processApprovalDecision(db, req.params.id, decision, comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to process decision" })
    }
  })

  router.post("/approvals/:id/approve", async (req, res) => {
    try {
      res.json(await processApprovalDecision(db, req.params.id, "approved", req.body?.comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to approve" })
    }
  })

  router.post("/approvals/:id/reject", async (req, res) => {
    try {
      res.json(await processApprovalDecision(db, req.params.id, "rejected", req.body?.comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to reject" })
    }
  })

  router.post("/approvals/:id/request-revision", async (req, res) => {
    try {
      res.json(await processApprovalDecision(db, req.params.id, "revision_requested", req.body?.comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to request revision" })
    }
  })

  router.post("/approvals/:id/send", async (req, res) => {
    try {
      const mode = req.body?.mode
      const normalizedMode =
        mode === "bridge" || mode === "confirm_bridge" || mode === "auto" ? mode : "auto"

      const [approvalRecord] = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.id, req.params.id))

      if (!approvalRecord?.caseId) {
        throw new Error("Approval is not linked to a case")
      }

      const [caseRecord] = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.id, approvalRecord.caseId))

      if (!caseRecord) {
        throw new Error("Case not found")
      }

      const relatedApprovals = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.caseId, approvalRecord.caseId))
        .orderBy(desc(schema.approvals.createdAt))

      const hasNewerActionableApproval = relatedApprovals.some((item) => {
        if (item.id === approvalRecord.id) return false
        if (new Date(item.createdAt).getTime() <= new Date(approvalRecord.createdAt).getTime()) return false
        return item.status === "pending" || item.status === "approved"
      })

      if (hasNewerActionableApproval) {
        throw new Error("A newer approval exists for this case. Send the latest approval instead.")
      }

      const actor = normalizedMode === "confirm_bridge" ? "user" : "system"
      const approval =
        caseRecord.source === "telegram"
          ? await processTelegramApprovalDelivery(db, req.params.id, {
              mode: normalizedMode,
              actor,
            })
          : await processKakaoApprovalDelivery(db, req.params.id, {
              mode: normalizedMode,
              actor,
            })
      const decision = approval?.decision as Record<string, any> | undefined
      const sideEffects =
        decision && typeof decision.sideEffects === "object" && decision.sideEffects
          ? (decision.sideEffects as Record<string, any>)
          : {}
      const delivery =
        caseRecord.source === "telegram"
          ? sideEffects.telegramMessage
          : sideEffects.kakaoMessage

      res.json({
        approval,
        deliveryStatus: typeof delivery?.status === "string" ? delivery.status : null,
        provider: typeof delivery?.provider === "string" ? delivery.provider : null,
        nextAction:
          delivery?.status === "ready_to_send"
            ? "confirm_bridge"
            : delivery?.status === "failed"
              ? "retry_send"
              : null,
      })
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Failed to send approval message",
      })
    }
  })

  return router
}
