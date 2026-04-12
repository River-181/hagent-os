import { Router } from "express"
import { eq, desc, inArray } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { createCaseWithRetry } from "../lib/case-create.js"
import { executeAgentRun } from "../services/execution.js"
import { buildRunUsageSummary } from "../services/costs.js"
import { enrichDocuments } from "../services/document-links.js"
import { buildAgentSkillRuntimeContext } from "../services/skill-runtime.js"

function getCaseMetadata(caseRecord: typeof schema.cases.$inferSelect) {
  return caseRecord.metadata && typeof caseRecord.metadata === "object" && !Array.isArray(caseRecord.metadata)
    ? (caseRecord.metadata as Record<string, unknown>)
    : {}
}

function getCaseKind(caseRecord: typeof schema.cases.$inferSelect) {
  return String(getCaseMetadata(caseRecord).caseKind ?? caseRecord.type)
}

function summarizeCaseDraft(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  if (!text) return null
  return text.length > 120 ? `${text.slice(0, 117)}...` : text
}

function getApprovalPayloadSummary(approval: typeof schema.approvals.$inferSelect | undefined) {
  if (!approval || !approval.payload || typeof approval.payload !== "object" || Array.isArray(approval.payload)) {
    return null
  }
  const payload = approval.payload as Record<string, unknown>
  return (
    summarizeCaseDraft(payload.summary)
    ?? summarizeCaseDraft(payload.suggestedReply)
    ?? summarizeCaseDraft(payload.draft)
  )
}

function getApprovalOutboundStatus(approval: typeof schema.approvals.$inferSelect | undefined) {
  if (!approval || !approval.decision || typeof approval.decision !== "object" || Array.isArray(approval.decision)) {
    return null
  }
  const decision = approval.decision as Record<string, any>
  return (
    decision.sideEffects?.kakaoMessage?.status
    ?? decision.sideEffects?.telegramMessage?.status
    ?? null
  )
}

function getReviewReason(caseRecord: typeof schema.cases.$inferSelect, approval: typeof schema.approvals.$inferSelect | undefined) {
  if (caseRecord.status !== "in_review") return null
  if (approval?.status === "revision_requested") return "수정 요청 반영 필요"
  if (approval?.status === "pending") {
    if (caseRecord.type === "schedule" || caseRecord.type === "makeup") return "일정 제안 검토 필요"
    if (caseRecord.type === "inquiry") return "운영 답변 검토 필요"
    return "원장 승인 필요"
  }
  if (caseRecord.type === "schedule" || caseRecord.type === "makeup") return "일정 제안 검토 중"
  if (caseRecord.type === "inquiry") return "질문 답변 검토 중"
  return "민원 초안 검토 중"
}

function looksLikeScheduleQuestion(question: string) {
  return /일정|보강|결석|상담 예약|시간표|캘린더/.test(question)
}

function looksLikeRetentionQuestion(question: string) {
  return /이탈|재등록|출결|결석률|지각/.test(question)
}

function looksLikeLegalQuestion(question: string) {
  return /법|법정|학원법|환불|교습비|등록|운영 정책|정책/.test(question)
}

async function pickQuickAskAgent(db: Db, organizationId: string, question: string) {
  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))

  if (looksLikeScheduleQuestion(question)) {
    return (
      agents.find((agent) => agent.agentType === "scheduler")
      ?? agents.find((agent) => agent.agentType === "complaint")
      ?? agents.find((agent) => agent.agentType === "orchestrator")
      ?? agents[0]
      ?? null
    )
  }

  if (looksLikeRetentionQuestion(question)) {
    return (
      agents.find((agent) => agent.agentType === "retention")
      ?? agents.find((agent) => agent.agentType === "complaint")
      ?? agents.find((agent) => agent.agentType === "orchestrator")
      ?? agents[0]
      ?? null
    )
  }

  if (looksLikeLegalQuestion(question)) {
    return (
      agents.find((agent) => agent.agentType === "complaint")
      ?? agents.find((agent) => agent.agentType === "orchestrator")
      ?? agents[0]
      ?? null
    )
  }

  return (
    agents.find((agent) => agent.agentType === "complaint")
    ?? agents.find((agent) => agent.agentType === "orchestrator")
    ?? agents[0]
    ?? null
  )
}

export function caseRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/cases", async (req, res) => {
    try {
      const cases = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, req.params.orgId))
        .orderBy(desc(schema.cases.createdAt))

      if (cases.length === 0) {
        res.json([])
        return
      }

      const caseIds = cases.map((item) => item.id)
      const [agents, projects, comments, approvals] = await Promise.all([
        db.select().from(schema.agents).where(eq(schema.agents.organizationId, req.params.orgId)),
        db.select().from(schema.opsGroups).where(eq(schema.opsGroups.organizationId, req.params.orgId)),
        db.select().from(schema.caseComments).where(inArray(schema.caseComments.caseId, caseIds)),
        db.select().from(schema.approvals).where(eq(schema.approvals.organizationId, req.params.orgId)).orderBy(desc(schema.approvals.createdAt)),
      ])

      const agentMap = new Map(agents.map((item) => [item.id, item]))
      const projectMap = new Map(projects.map((item) => [item.id, item]))
      const commentCountMap = new Map<string, number>()
      for (const comment of comments) {
        commentCountMap.set(comment.caseId, (commentCountMap.get(comment.caseId) ?? 0) + 1)
      }

      const latestApprovalMap = new Map<string, typeof schema.approvals.$inferSelect>()
      for (const approval of approvals) {
        if (!approval.caseId || latestApprovalMap.has(approval.caseId)) continue
        latestApprovalMap.set(approval.caseId, approval)
      }

      const enriched = cases.map((caseRecord) => {
        const latestApproval = latestApprovalMap.get(caseRecord.id)
        const project = caseRecord.opsGroupId ? projectMap.get(caseRecord.opsGroupId) ?? null : null
        const assignee = caseRecord.assigneeAgentId ? agentMap.get(caseRecord.assigneeAgentId) ?? null : null

        return {
          ...caseRecord,
          caseKind: getCaseKind(caseRecord),
          assignee,
          agent: assignee,
          project,
          projectId: project?.id ?? caseRecord.opsGroupId ?? null,
          projectName: project?.name ?? null,
          commentCount: commentCountMap.get(caseRecord.id) ?? 0,
          latestApprovalStatus: latestApproval?.status ?? null,
          outboundStatus: getApprovalOutboundStatus(latestApproval),
          reviewReason: getReviewReason(caseRecord, latestApproval),
          latestDraftSummary: summarizeCaseDraft(caseRecord.agentDraft) ?? getApprovalPayloadSummary(latestApproval),
        }
      })

      res.json(enriched)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch cases" })
    }
  })

  router.post("/organizations/:orgId/cases", async (req, res) => {
    try {
      const { title, description, type, severity, reporterId, studentId, metadata, opsGroupId, assigneeAgentId, priority, source } = req.body as {
        title: string
        description?: string
        type: "complaint" | "refund" | "makeup" | "inquiry" | "churn" | "schedule"
        severity?: "immediate" | "same_day" | "normal" | "low"
        reporterId?: string
        studentId?: string
        metadata?: Record<string, unknown>
        opsGroupId?: string
        assigneeAgentId?: string
        priority?: number
        source?: string
      }

      if (!title || !type) {
        res.status(400).json({ error: "title and type are required" })
        return
      }

      const created = await createCaseWithRetry(db, {
          organizationId: req.params.orgId,
          opsGroupId,
          title,
          description,
          type,
          severity: severity ?? "normal",
          reporterId,
          studentId,
          assigneeAgentId,
          priority: priority ?? 2,
          source: source ?? "manual",
          metadata: metadata ?? {},
        })

      await db.insert(schema.activityEvents).values({
        organizationId: req.params.orgId,
        actorType: "user",
        actorId: "cases",
        action: "case.created",
        entityType: "case",
        entityId: created.id,
        entityTitle: created.title,
        metadata: (metadata ?? {}) as Record<string, unknown>,
      })

      res.status(201).json(created)
    } catch (err) {
      res.status(500).json({ error: "Failed to create case" })
    }
  })

  router.post("/organizations/:orgId/quick-ask", async (req, res) => {
    try {
      const {
        question,
        title,
        origin,
        scenarioKey,
        threadId,
        assistantSessionId,
        linkedCaseIds,
      } = req.body as {
        question?: string
        title?: string
        origin?: string
        scenarioKey?: string
        threadId?: string
        assistantSessionId?: string
        linkedCaseIds?: string[]
      }

      const normalizedQuestion = String(question ?? "").trim()
      if (!normalizedQuestion) {
        res.status(400).json({ error: "question is required" })
        return
      }

      const agent = await pickQuickAskAgent(db, req.params.orgId, normalizedQuestion)
      if (!agent) {
        res.status(400).json({ error: "No available agent for quick ask" })
        return
      }

      const caseKind = looksLikeLegalQuestion(normalizedQuestion) ? "legal-inquiry" : "quick-ask"
      const normalizedThreadId = String(threadId ?? "").trim() || crypto.randomUUID()
      const normalizedAssistantSessionId = String(assistantSessionId ?? "").trim() || crypto.randomUUID()

      const orgCases = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, req.params.orgId))
        .orderBy(desc(schema.cases.updatedAt))

      const existingInquiryCase = orgCases.find((item) => {
        if (item.type !== "inquiry") return false
        const metadata = getCaseMetadata(item)
        if (metadata.generatedBy !== "quick-ask") return false
        const sameThread =
          normalizedThreadId && String(metadata.threadId ?? "") === normalizedThreadId
        const sameSession =
          normalizedAssistantSessionId &&
          String(metadata.assistantSessionId ?? "") === normalizedAssistantSessionId
        return sameThread || sameSession
      })

      const targetCase = existingInquiryCase
        ? (
            await db
              .update(schema.cases)
              .set({
                updatedAt: new Date(),
                assigneeAgentId: agent.id,
                metadata: {
                  ...getCaseMetadata(existingInquiryCase),
                  caseKind,
                  generatedBy: "quick-ask",
                  routingReason: agent.agentType,
                  origin: origin ?? "quick_ask",
                  scenarioKey: scenarioKey ?? null,
                  threadId: normalizedThreadId,
                  assistantSessionId: normalizedAssistantSessionId,
                  linkedCaseIds: Array.isArray(linkedCaseIds) ? linkedCaseIds : getCaseMetadata(existingInquiryCase).linkedCaseIds ?? [],
                },
              } as any)
              .where(eq(schema.cases.id, existingInquiryCase.id))
              .returning()
          )[0]
        : await createCaseWithRetry(db, {
            organizationId: req.params.orgId,
            title: title?.trim() || `질문 · ${normalizedQuestion.slice(0, 42)}`,
            description: normalizedQuestion,
            type: "inquiry",
            severity: "normal",
            assigneeAgentId: agent.id,
            priority: 3,
            source: "quick_ask",
            metadata: {
              caseKind,
              generatedBy: "quick-ask",
              routingReason: agent.agentType,
              origin: origin ?? "quick_ask",
              scenarioKey: scenarioKey ?? null,
              threadId: normalizedThreadId,
              assistantSessionId: normalizedAssistantSessionId,
              linkedCaseIds: Array.isArray(linkedCaseIds) ? linkedCaseIds : [],
            } as Record<string, unknown>,
          })

      await db.insert(schema.caseComments).values({
        caseId: targetCase.id,
        content: looksLikeLegalQuestion(normalizedQuestion)
          ? `${existingInquiryCase ? "[법률 질문 후속]" : "[법률 질문 접수]"}\n${normalizedQuestion}`
          : `${existingInquiryCase ? "[운영 질문 후속]" : "[운영 질문 접수]"}\n${normalizedQuestion}`,
        authorType: "user",
        authorId: "원장",
      })

      await db.insert(schema.activityEvents).values({
        organizationId: req.params.orgId,
        actorType: "user",
        actorId: "quick-ask",
        action: existingInquiryCase ? "case.appended_from_assistant" : "case.created",
        entityType: "case",
        entityId: targetCase.id,
        entityTitle: targetCase.title,
        metadata: {
          caseType: targetCase.type,
          caseKind,
          generatedBy: "quick-ask",
          origin: origin ?? "quick_ask",
          scenarioKey: scenarioKey ?? null,
          agentId: agent.id,
          threadId: normalizedThreadId,
          assistantSessionId: normalizedAssistantSessionId,
        } as Record<string, unknown>,
      })

      const execution = await executeAgentRun(db, {
        organizationId: req.params.orgId,
        agentId: agent.id,
        caseId: targetCase.id,
        agentType: agent.agentType,
        approvalLevel: 0,
      })

      res.status(201).json({
        caseId: targetCase.id,
        identifier: targetCase.identifier,
        runId: execution.runId,
        agentId: agent.id,
        threadId: normalizedThreadId,
        assistantSessionId: normalizedAssistantSessionId,
        appended: Boolean(existingInquiryCase),
      })
    } catch {
      res.status(500).json({ error: "Failed to create quick ask case" })
    }
  })

  router.patch("/cases/:id", async (req, res) => {
    try {
      const [existing] = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.id, req.params.id))

      if (!existing) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const allowedFields = [
        "title",
        "description",
        "type",
        "severity",
        "status",
        "priority",
        "reporterId",
        "studentId",
        "assigneeAgentId",
        "agentDraft",
        "metadata",
      ] as const
      type AllowedField = (typeof allowedFields)[number]

      const updates: Partial<Record<AllowedField, unknown>> = {}
      for (const field of allowedFields) {
        if (field in req.body) {
          updates[field] = req.body[field]
        }
      }

      const [updated] = await db
        .update(schema.cases)
        .set({ ...(updates as any), updatedAt: new Date() })
        .where(eq(schema.cases.id, req.params.id))
        .returning()

      if (updates.status && updates.status !== existing.status) {
        await db.insert(schema.activityEvents).values({
          organizationId: existing.organizationId,
          actorType: "system",
          actorId: "system",
          action: "case.status_changed",
          entityType: "case",
          entityId: existing.id,
          entityTitle: existing.title,
          metadata: { from: existing.status, to: updates.status },
        })
      }

      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to update case" })
    }
  })

  router.delete("/cases/:id", async (req, res) => {
    try {
      const [caseRecord] = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.id, req.params.id))

      if (!caseRecord) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const childCases = (await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, caseRecord.organizationId)))
        .filter((item: typeof schema.cases.$inferSelect) => String(getCaseMetadata(item).parentCaseId ?? "") === caseRecord.id)

      if (childCases.length > 0) {
        res.status(409).json({ error: "Delete child cases first", childCaseCount: childCases.length })
        return
      }

      const relatedRuns = await db
        .select()
        .from(schema.agentRuns)
        .where(eq(schema.agentRuns.caseId, caseRecord.id))

      const runIds = relatedRuns.map((item) => item.id)

      if (runIds.length > 0) {
        await db.delete(schema.tokenUsageEvents).where(inArray(schema.tokenUsageEvents.agentRunId, runIds))
      }

      await db.delete(schema.caseComments).where(eq(schema.caseComments.caseId, caseRecord.id))
      await db.delete(schema.approvals).where(eq(schema.approvals.caseId, caseRecord.id))
      await db.delete(schema.wakeupRequests).where(eq(schema.wakeupRequests.caseId, caseRecord.id))
      await db.delete(schema.notifications).where(eq(schema.notifications.entityId, caseRecord.id))
      await db.delete(schema.activityEvents).where(eq(schema.activityEvents.entityId, caseRecord.id))

      const documents = (await db
        .select()
        .from(schema.documents)
        .where(eq(schema.documents.organizationId, caseRecord.organizationId)))
        .filter((item: typeof schema.documents.$inferSelect) => Array.isArray(item.tags) && item.tags.includes(`case:${caseRecord.id}`))

      if (documents.length > 0) {
        await db.delete(schema.documents).where(inArray(schema.documents.id, documents.map((item) => item.id)))
      }

      if (runIds.length > 0) {
        await db.delete(schema.agentRuns).where(inArray(schema.agentRuns.id, runIds))
      }

      await db.delete(schema.cases).where(eq(schema.cases.id, caseRecord.id))

      await db.insert(schema.activityEvents).values({
        organizationId: caseRecord.organizationId,
        actorType: "user",
        actorId: "cases",
        action: "case.deleted",
        entityType: "case",
        entityId: caseRecord.id,
        entityTitle: caseRecord.title,
        metadata: {
          identifier: caseRecord.identifier,
          type: caseRecord.type,
          deletedRunCount: runIds.length,
          deletedDocumentCount: documents.length,
        } as Record<string, unknown>,
      })

      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: "Failed to delete case" })
    }
  })

  router.get("/cases/:id", async (req, res) => {
    try {
      const [caseRecord] = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.id, req.params.id))

      if (!caseRecord) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const runs = await db
        .select()
        .from(schema.agentRuns)
        .where(eq(schema.agentRuns.caseId, req.params.id))
        .orderBy(desc(schema.agentRuns.createdAt))

      const approvals = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.caseId, req.params.id))
        .orderBy(desc(schema.approvals.createdAt))

      const assignee = caseRecord.assigneeAgentId
        ? (await db
            .select()
            .from(schema.agents)
            .where(eq(schema.agents.id, caseRecord.assigneeAgentId)))[0] ?? null
        : null
      const project = caseRecord.opsGroupId
        ? (await db
            .select()
            .from(schema.opsGroups)
            .where(eq(schema.opsGroups.id, caseRecord.opsGroupId)))[0] ?? null
        : null

      const runAgentMap = new Map<string, typeof schema.agents.$inferSelect>()
      for (const run of runs) {
        if (!runAgentMap.has(run.agentId)) {
          const [agent] = await db
            .select()
            .from(schema.agents)
            .where(eq(schema.agents.id, run.agentId))
          if (agent) runAgentMap.set(run.agentId, agent)
        }
      }

      const comments = await db
        .select()
        .from(schema.caseComments)
        .where(eq(schema.caseComments.caseId, req.params.id))
        .orderBy(desc(schema.caseComments.createdAt))

      const childCases = (await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, caseRecord.organizationId))
        .orderBy(desc(schema.cases.createdAt)))
        .filter((item: typeof schema.cases.$inferSelect) => String(getCaseMetadata(item).parentCaseId ?? "") === caseRecord.id)

      const documents = (await db
        .select()
        .from(schema.documents)
        .where(eq(schema.documents.organizationId, caseRecord.organizationId))
        .orderBy(desc(schema.documents.updatedAt)))
        .filter((item: typeof schema.documents.$inferSelect) => Array.isArray(item.tags) && item.tags.includes(`case:${caseRecord.id}`))
      const enrichedDocuments = enrichDocuments(documents, {
        cases: [caseRecord],
        projects: project ? [project] : [],
      })

      const assigneeSkillRuntime = assignee ? await buildAgentSkillRuntimeContext(db, assignee.id) : { bundles: [], text: "" }
      const runsWithContext = await Promise.all(
        runs.map(async (run: typeof schema.agentRuns.$inferSelect) => {
          const runAgent = runAgentMap.get(run.agentId) ?? null
          const runtimeSkills = runAgent ? await buildAgentSkillRuntimeContext(db, runAgent.id) : { bundles: [], text: "" }
          const usage = await buildRunUsageSummary(db, {
            organizationId: caseRecord.organizationId,
            runId: run.id,
            inputTokens: run.inputTokens ?? 0,
            outputTokens: run.outputTokens ?? 0,
            totalTokens: run.tokensUsed ?? 0,
            model:
              (runAgent?.adapterConfig &&
              typeof runAgent.adapterConfig === "object" &&
              !Array.isArray(runAgent.adapterConfig)
                ? (runAgent.adapterConfig as Record<string, unknown>).model
                : null) as string | null,
          })
          return {
            ...run,
            agent: runAgent,
            usedSkills: runtimeSkills.bundles,
            skillContext: runtimeSkills.text,
            usage,
          }
        }),
      )

      const latestRun = runsWithContext[0] ?? null
      const latestApproval = approvals[0] ?? null
      const latestOutboundStatus =
        latestApproval &&
        typeof latestApproval.decision === "object" &&
        latestApproval.decision &&
        !Array.isArray(latestApproval.decision)
          ? (
              (
                (latestApproval.decision as Record<string, any>).sideEffects?.kakaoMessage
                ?? (latestApproval.decision as Record<string, any>).sideEffects?.telegramMessage
              )?.status ?? null
            )
          : null
      const legalBasis =
        latestRun &&
        typeof latestRun.output === "object" &&
        latestRun.output &&
        !Array.isArray(latestRun.output)
          ? (latestRun.output as Record<string, unknown>).legalBasis ?? null
          : null

      res.json({
        ...caseRecord,
        caseKind: getCaseKind(caseRecord),
        channelContext: {
          channelSource: getCaseMetadata(caseRecord).channelSource ?? caseRecord.source ?? null,
          threadId: getCaseMetadata(caseRecord).threadId ?? null,
          senderId: getCaseMetadata(caseRecord).senderId ?? null,
          senderName: getCaseMetadata(caseRecord).senderName ?? null,
          routingReason: getCaseMetadata(caseRecord).routingReason ?? null,
        },
        assignee,
        project,
        approvals,
        runs: runsWithContext,
        comments,
        childCases,
        documents: enrichedDocuments,
        usedSkills: assigneeSkillRuntime.bundles,
        skillContext: assigneeSkillRuntime.text,
        legalBasis,
        outboundStatus: latestOutboundStatus,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch case" })
    }
  })

  // POST comment on a case
  router.post("/cases/:id/comments", async (req, res) => {
    try {
      const [caseRecord] = await db.select().from(schema.cases).where(eq(schema.cases.id, req.params.id))
      if (!caseRecord) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const [comment] = await db.insert(schema.caseComments).values({
        caseId: req.params.id,
        content: req.body.body ?? req.body.content ?? "",
        authorType: req.body.authorType ?? "user",
        authorId: req.body.authorName ?? req.body.authorId ?? "원장",
      }).returning()

      let runId: string | null = null
      if (req.body.triggerRun === true) {
        let assigneeAgent = null
        if (caseRecord.assigneeAgentId) {
          const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, caseRecord.assigneeAgentId))
          assigneeAgent = agent ?? null
        }

        if (!assigneeAgent) {
          const agents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, caseRecord.organizationId))
          assigneeAgent =
            agents.find((item) => item.agentType === "orchestrator")
            ?? agents.find((item) => item.agentType === "complaint")
            ?? agents[0]
            ?? null
        }

        if (assigneeAgent) {
          const approvalLevel = assigneeAgent.agentType === "complaint" || assigneeAgent.agentType === "scheduler" ? 1 : 0
          const execution = await executeAgentRun(db, {
            organizationId: caseRecord.organizationId,
            agentId: assigneeAgent.id,
            caseId: caseRecord.id,
            agentType: assigneeAgent.agentType,
            approvalLevel,
          })
          runId = execution.runId

          await db.insert(schema.activityEvents).values({
            organizationId: caseRecord.organizationId,
            actorType: "user",
            actorId: req.body.authorName ?? req.body.authorId ?? "원장",
            action: "run.queued",
            entityType: "case",
            entityId: caseRecord.id,
            entityTitle: caseRecord.title,
            metadata: {
              trigger: "comment-follow-up",
              runId,
              commentId: comment.id,
              agentId: assigneeAgent.id,
            } as Record<string, unknown>,
          })
        }
      }

      res.status(201).json({
        ...comment,
        runId,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to create comment" })
    }
  })

  router.get("/cases/:id/child-cases", async (req, res) => {
    try {
      const [parentCase] = await db.select().from(schema.cases).where(eq(schema.cases.id, req.params.id))
      if (!parentCase) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const childCases = (await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, parentCase.organizationId))
        .orderBy(desc(schema.cases.createdAt)))
        .filter((item: typeof schema.cases.$inferSelect) => String(getCaseMetadata(item).parentCaseId ?? "") === parentCase.id)

      res.json(childCases)
    } catch {
      res.status(500).json({ error: "Failed to fetch child cases" })
    }
  })

  router.post("/cases/:id/child-cases", async (req, res) => {
    try {
      const [parentCase] = await db.select().from(schema.cases).where(eq(schema.cases.id, req.params.id))
      if (!parentCase) {
        res.status(404).json({ error: "Case not found" })
        return
      }

      const { title, description, type, severity, assigneeAgentId, metadata } = req.body as {
        title: string
        description?: string
        type?: (typeof schema.caseTypeEnum.enumValues)[number]
        severity?: (typeof schema.caseSeverityEnum.enumValues)[number]
        assigneeAgentId?: string
        metadata?: Record<string, unknown>
      }

      if (!title?.trim()) {
        res.status(400).json({ error: "title required" })
        return
      }

      const childCase = await createCaseWithRetry(db, {
          organizationId: parentCase.organizationId,
          opsGroupId: parentCase.opsGroupId,
          title: title.trim(),
          description: description ?? null,
          type: type ?? parentCase.type,
          severity: severity ?? "normal",
          status: "todo",
          priority: parentCase.priority,
          reporterId: parentCase.reporterId,
          studentId: parentCase.studentId,
          assigneeAgentId: assigneeAgentId ?? parentCase.assigneeAgentId,
          source: parentCase.source ?? "manual",
          metadata: {
            ...getCaseMetadata(parentCase),
            ...(metadata ?? {}),
            parentCaseId: parentCase.id,
            generatedBy: "child-case",
          } as Record<string, unknown>,
        })

      await db.insert(schema.activityEvents).values({
        organizationId: parentCase.organizationId,
        actorType: "user",
        actorId: "case-detail",
        action: "case.created",
        entityType: "case",
        entityId: childCase.id,
        entityTitle: childCase.title,
        metadata: {
          parentCaseId: parentCase.id,
          generatedBy: "child-case",
        } as Record<string, unknown>,
      })

      res.status(201).json(childCase)
    } catch {
      res.status(500).json({ error: "Failed to create child case" })
    }
  })

  return router
}
