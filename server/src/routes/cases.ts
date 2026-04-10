import { Router } from "express"
import { eq, desc, count } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

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
      const { title, description, type, severity, reporterId, studentId } = req.body as {
        title: string
        description?: string
        type: "complaint" | "refund" | "makeup" | "inquiry" | "churn" | "schedule"
        severity?: "immediate" | "same_day" | "normal" | "low"
        reporterId?: string
        studentId?: string
      }

      if (!title || !type) {
        res.status(400).json({ error: "title and type are required" })
        return
      }

      const [{ total }] = await db
        .select({ total: count() })
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, req.params.orgId))

      const identifier = `C-${String(total + 1).padStart(3, "0")}`

      const [created] = await db
        .insert(schema.cases)
        .values({
          organizationId: req.params.orgId,
          identifier,
          title,
          description,
          type,
          severity: severity ?? "normal",
          reporterId,
          studentId,
        })
        .returning()

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

      const comments = await db
        .select()
        .from(schema.caseComments)
        .where(eq(schema.caseComments.caseId, req.params.id))
        .orderBy(desc(schema.caseComments.createdAt))

      res.json({ ...caseRecord, runs, comments })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch case" })
    }
  })

  // POST comment on a case
  router.post("/cases/:id/comments", async (req, res) => {
    try {
      const [comment] = await db.insert(schema.caseComments).values({
        caseId: req.params.id,
        content: req.body.body ?? req.body.content ?? "",
        authorType: req.body.authorType ?? "user",
        authorId: req.body.authorName ?? req.body.authorId ?? "원장",
      }).returning()
      res.status(201).json(comment)
    } catch (err) {
      res.status(500).json({ error: "Failed to create comment" })
    }
  })

  return router
}
