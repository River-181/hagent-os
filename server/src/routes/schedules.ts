// v0.4.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { normalizeInstructorRole } from "../lib/instructor-roles.js"

export function scheduleRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/schedules", async (req, res) => {
    try {
      const schedules = await db.select().from(schema.schedules)
        .where(eq(schema.schedules.organizationId, req.params.orgId))
      const instructors = await db.select().from(schema.instructors)
        .where(eq(schema.instructors.organizationId, req.params.orgId))
      const studentSchedules = await db.select().from(schema.studentSchedules)
        .where(eq(schema.studentSchedules.organizationId, req.params.orgId))
      const requestedStudentId = typeof req.query.studentId === "string" ? req.query.studentId : null

      const instructorMap = new Map<string, (typeof schema.instructors.$inferSelect & { role: string })>(
        instructors.map((instructor: typeof schema.instructors.$inferSelect) => [
          instructor.id,
          {
            ...instructor,
            role: normalizeInstructorRole(instructor.role, instructor.subject),
          },
        ]),
      )

      const studentIdsByScheduleId = new Map<string, string[]>()
      for (const row of studentSchedules) {
        if (!studentIdsByScheduleId.has(row.scheduleId)) {
          studentIdsByScheduleId.set(row.scheduleId, [])
        }
        studentIdsByScheduleId.get(row.scheduleId)?.push(row.studentId)
      }

      const enriched = schedules.map((s: typeof schema.schedules.$inferSelect) => {
        const instructor = s.instructorId ? instructorMap.get(s.instructorId) ?? null : null
        const studentIds = studentIdsByScheduleId.get(s.id) ?? []
        return {
          ...s,
          instructor,
          instructorName: instructor?.name ?? null,
          instructorStatus: instructor?.status ?? null,
          instructorSubject: instructor?.subject ?? null,
          instructorRole: instructor?.role ?? null,
          studentIds,
          studentCount: studentIds.length,
        }
      })
      res.json(requestedStudentId ? enriched.filter((item) => item.studentIds.includes(requestedStudentId)) : enriched)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch schedules" })
    }
  })

  // POST /organizations/:orgId/schedules
  router.post("/organizations/:orgId/schedules", async (req, res) => {
    try {
      const { orgId } = req.params
      const { title, type, dayOfWeek, startTime, endTime, room, instructorId } = req.body

      if (!title || dayOfWeek === undefined) {
        res.status(400).json({ error: "title and dayOfWeek required" })
        return
      }

      const [schedule] = await db
        .insert(schema.schedules)
        .values({
          organizationId: orgId,
          title,
          type: type ?? "regular",
          dayOfWeek: Number(dayOfWeek),
          startTime: startTime ?? "09:00",
          endTime: endTime ?? "10:00",
          room: room ?? null,
          instructorId: instructorId ?? null,
        })
        .returning()

      res.status(201).json(schedule)
    } catch (err) {
      res.status(500).json({ error: "Failed to create schedule" })
    }
  })

  // PATCH /organizations/:orgId/schedules/:id
  router.patch("/organizations/:orgId/schedules/:id", async (req, res) => {
    try {
      const { id } = req.params
      const { title, type, dayOfWeek, startTime, endTime, room, instructorId } = req.body

      const updates: Record<string, unknown> = {}
      if (title !== undefined) updates.title = title
      if (type !== undefined) updates.type = type
      if (dayOfWeek !== undefined) updates.dayOfWeek = Number(dayOfWeek)
      if (startTime !== undefined) updates.startTime = startTime
      if (endTime !== undefined) updates.endTime = endTime
      if (room !== undefined) updates.room = room ?? null
      if (instructorId !== undefined) updates.instructorId = instructorId ?? null

      const [updated] = await db
        .update(schema.schedules)
        .set(updates)
        .where(eq(schema.schedules.id, id))
        .returning()

      if (!updated) {
        res.status(404).json({ error: "Schedule not found" })
        return
      }
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to update schedule" })
    }
  })

  // DELETE /organizations/:orgId/schedules/:id
  router.delete("/organizations/:orgId/schedules/:id", async (req, res) => {
    try {
      const { id, orgId } = req.params

      await db.delete(schema.studentSchedules).where(eq(schema.studentSchedules.scheduleId, id))
      await db.delete(schema.attendance).where(eq(schema.attendance.scheduleId, id))

      const [deleted] = await db
        .delete(schema.schedules)
        .where(eq(schema.schedules.id, id))
        .returning()

      if (!deleted || deleted.organizationId !== orgId) {
        res.status(404).json({ error: "Schedule not found" })
        return
      }

      res.status(204).send()
    } catch (err) {
      res.status(500).json({ error: "Failed to delete schedule" })
    }
  })

  return router
}
