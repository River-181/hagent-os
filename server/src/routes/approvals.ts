import { Router } from "express"
import { eq, and, desc, inArray } from "drizzle-orm"
import { mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "../services/live-events.js"
import { syncGoogleCalendarEvent } from "../services/integrations/google-calendar.js"
import { processKakaoApprovalDelivery } from "../services/kakao-approval-delivery.js"
import { processTelegramApprovalDelivery } from "../services/telegram-approval-delivery.js"

const AGENT_DATA_DIR = join(import.meta.dirname, "../../data/agents")

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

function buildSoulMd(name: string, agentType: string): string {
  const roleDescriptions: Record<string, string> = {
    orchestrator: "전체 운영을 조율하고 다른 에이전트에게 작업을 위임하는 오케스트레이터 역할",
    complaint: "학생 및 학부모의 불만 사항을 접수하고 처리하는 고충 처리 역할",
    retention: "학생 이탈 방지와 재등록 유도를 위한 리텐션 관리 역할",
    scheduler: "수업 일정과 강사 스케줄을 효율적으로 관리하는 스케줄러 역할",
    intake: "신규 학생 등록 및 초기 상담을 담당하는 인테이크 역할",
    staff: "학원 직원으로서 일반 행정 및 운영 업무를 지원하는 역할",
    compliance: "규정 준수 및 내부 정책 이행을 감독하는 컴플라이언스 역할",
    notification: "학생, 학부모, 직원에게 중요한 알림을 전달하는 알림 담당 역할",
  }

  const role = roleDescriptions[agentType] ?? `${agentType}에 해당하는 역할`

  return `# ${name}

## 역할
${role}

## 원칙
- 학원 운영의 효율성을 최우선으로 합니다
- 모든 판단은 학생과 학부모의 이익을 고려합니다
- 불확실한 사안은 반드시 원장에게 보고합니다
`
}

export function approvalRoutes(db: Db): Router {
  const router = Router()

  async function processDecision(
    approvalId: string,
    decision: "approved" | "rejected" | "revision_requested",
    comment?: string,
  ) {
    const [existing] = await db
      .select()
      .from(schema.approvals)
      .where(eq(schema.approvals.id, approvalId))

    if (!existing) {
      throw new Error("Approval not found")
    }

    let decisionPayload: Record<string, unknown> = comment ? { comment } : {}

    await db
      .update(schema.approvals)
      .set({
        status: decision,
        decidedBy: "board",
        decidedAt: new Date(),
        decision: decisionPayload,
        updatedAt: new Date(),
      })
      .where(eq(schema.approvals.id, approvalId))
      .returning()

    let caseIdentifier: string | null = null
    let caseRecord: typeof schema.cases.$inferSelect | null = null
    if (existing.caseId) {
      const [foundCase] = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.id, existing.caseId))
      caseRecord = foundCase ?? null
      caseIdentifier = foundCase?.identifier ?? null
    }

      const payload = isPlainObject(existing.payload) ? existing.payload : null
    if (decision === "approved" && payload?.type === "agent_hire") {
      const hireName = payload.name as string
      const hireAgentType = payload.agentType as string
      const hireReportsTo = payload.reportsTo as string | undefined
      const hireSlug = hireName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

      const [newAgent] = await db
        .insert(schema.agents)
        .values({
          organizationId: existing.organizationId,
          name: hireName,
          slug: hireSlug,
          agentType: hireAgentType as (typeof schema.agentTypeEnum.enumValues)[number],
          ...(hireReportsTo ? { reportsTo: hireReportsTo } : {}),
        })
        .returning()

      const agentDir = join(AGENT_DATA_DIR, newAgent.id)
      mkdirSync(agentDir, { recursive: true })
      writeFileSync(join(agentDir, "SOUL.md"), buildSoulMd(hireName, hireAgentType), "utf-8")

      publishEvent(existing.organizationId, "agent.hired", {
        agentId: newAgent.id,
        name: hireName,
        agentType: hireAgentType,
        approvalId: existing.id,
      })

      decisionPayload = {
        ...decisionPayload,
        sideEffects: {
          ...(decisionPayload.sideEffects as Record<string, unknown> | undefined),
          agentHire: {
            status: "created",
            agentId: newAgent.id,
          },
        },
      }
    }

    let requiresOutboundDelivery = false
    if (decision === "approved" && existing.caseId) {
      if (caseRecord?.source === "kakao" || caseRecord?.source === "telegram") {
        requiresOutboundDelivery = true
      }

      if (caseRecord?.type === "schedule") {
        const schedulePayload = payload?.suggestedSchedule as Record<string, unknown> | undefined
        if (schedulePayload) {
          const [createdSchedule] = await db
            .insert(schema.schedules)
            .values({
              organizationId: existing.organizationId,
              title: String(schedulePayload.title ?? caseRecord?.title ?? "상담 일정"),
              type: String(schedulePayload.type ?? "special"),
              dayOfWeek: Number(schedulePayload.dayOfWeek ?? 2),
              startTime: String(schedulePayload.startTime ?? "18:30"),
              endTime: String(schedulePayload.endTime ?? "19:00"),
              room: schedulePayload.room ? String(schedulePayload.room) : "상담실",
            })
            .returning()

          if (caseRecord?.studentId) {
            await db.insert(schema.studentSchedules).values({
              organizationId: existing.organizationId,
              studentId: caseRecord.studentId,
              scheduleId: createdSchedule.id,
            })
          }

          const calendarSync = await syncGoogleCalendarEvent({
            title: createdSchedule.title,
            description: caseRecord?.description ?? null,
            location: createdSchedule.room ?? null,
            dayOfWeek: createdSchedule.dayOfWeek,
            startTime: createdSchedule.startTime,
            endTime: createdSchedule.endTime,
          })

          decisionPayload = {
            ...decisionPayload,
            sideEffects: {
              ...(decisionPayload.sideEffects as Record<string, unknown> | undefined),
              googleCalendar: {
                ...calendarSync,
                scheduleId: createdSchedule.id,
                schedule: {
                  id: createdSchedule.id,
                  title: createdSchedule.title,
                  type: createdSchedule.type,
                  dayOfWeek: createdSchedule.dayOfWeek,
                  startTime: createdSchedule.startTime,
                  endTime: createdSchedule.endTime,
                  room: createdSchedule.room,
                },
              },
            },
          }

          await db.insert(schema.activityEvents).values({
            organizationId: existing.organizationId,
            actorType: "system",
            actorId: "google-calendar",
            action: `integration.calendar_${calendarSync.status}`,
            entityType: "schedule",
            entityId: createdSchedule.id,
            entityTitle: createdSchedule.title,
            metadata: {
              approvalId: existing.id,
              caseId: existing.caseId,
              ...calendarSync,
            },
          })
        }
      }

      if (!requiresOutboundDelivery) {
        await db
          .update(schema.cases)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(schema.cases.id, existing.caseId))

        // 오케스트레이터 메모리 실시간 갱신 (best-effort)
        const { updateOrchestratorMemoryOnCaseDone } = await import("../services/agent-memory-update.js")
        void updateOrchestratorMemoryOnCaseDone(db, existing.caseId)
      }
    }

    if (decision === "rejected" && existing.caseId) {
      await db
        .update(schema.cases)
        .set({ status: "todo", updatedAt: new Date() })
        .where(eq(schema.cases.id, existing.caseId))
    }

    const entityTitle = caseIdentifier
      ? `approval ${decision} on case ${caseIdentifier}`
      : `approval ${decision}`

    if (Object.keys(decisionPayload).length > 0) {
      await db
        .update(schema.approvals)
        .set({
          decision: decisionPayload,
          updatedAt: new Date(),
        })
        .where(eq(schema.approvals.id, approvalId))
    }

    await db.insert(schema.activityEvents).values({
      organizationId: existing.organizationId,
      actorType: "board",
      actorId: "board",
      action: `approval.${decision}`,
      entityType: "approval",
      entityId: existing.id,
      entityTitle,
      metadata: comment ? { comment } : {},
    })

    publishEvent(existing.organizationId, "approval.decided", {
      approvalId: existing.id,
      caseId: existing.caseId ?? null,
      decision,
      comment: comment ?? null,
    })

    let [latest] = await db
      .select()
      .from(schema.approvals)
      .where(eq(schema.approvals.id, approvalId))

    if (decision === "approved" && caseRecord?.source === "kakao") {
      latest = await processKakaoApprovalDelivery(db, approvalId, {
        mode: "auto",
        actor: "system",
      })
    } else if (decision === "approved" && caseRecord?.source === "telegram") {
      latest = await processTelegramApprovalDelivery(db, approvalId, {
        mode: "auto",
        actor: "system",
      })
    }

    return latest
  }

  router.get("/organizations/:orgId/approvals", async (req, res) => {
    try {
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

      res.json(await processDecision(req.params.id, decision, comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to process decision" })
    }
  })

  router.post("/approvals/:id/approve", async (req, res) => {
    try {
      res.json(await processDecision(req.params.id, "approved", req.body?.comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to approve" })
    }
  })

  router.post("/approvals/:id/reject", async (req, res) => {
    try {
      res.json(await processDecision(req.params.id, "rejected", req.body?.comment))
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to reject" })
    }
  })

  router.post("/approvals/:id/request-revision", async (req, res) => {
    try {
      res.json(await processDecision(req.params.id, "revision_requested", req.body?.comment))
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
