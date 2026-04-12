import { Router } from "express"
import { eq, desc } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { createCaseWithRetry } from "../lib/case-create.js"
import { executeAgentRun } from "../services/execution.js"

function getCaseMetadata(caseRecord: typeof schema.cases.$inferSelect) {
  return caseRecord.metadata && typeof caseRecord.metadata === "object" && !Array.isArray(caseRecord.metadata)
    ? (caseRecord.metadata as Record<string, unknown>)
    : {}
}

function getCaseKind(caseRecord: typeof schema.cases.$inferSelect) {
  return String(getCaseMetadata(caseRecord).caseKind ?? caseRecord.type)
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

      res.json(cases)
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

      res.status(201).json(created)
    } catch (err) {
      res.status(500).json({ error: "Failed to create case" })
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
        approvals,
        runs: runs.map((run: typeof schema.agentRuns.$inferSelect) => ({
          ...run,
          agent: runAgentMap.get(run.agentId) ?? null,
        })),
        comments,
        childCases,
        documents,
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
