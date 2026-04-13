// v0.3.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  // 010-1234-5678 → 010-****-5678
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3")
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return ""
  const [local, domain] = email.split("@")
  if (!domain) return email
  return local.slice(0, 3) + "***@" + domain
}

export function studentRoutes(db: Db): Router {
  const router = Router()

  // List students with parent info (masked)
  router.get("/organizations/:orgId/students", async (req, res) => {
    try {
      const students = await db.select().from(schema.students)
        .where(eq(schema.students.organizationId, req.params.orgId))
      const parents = await db.select().from(schema.parents)
        .where(eq(schema.parents.organizationId, req.params.orgId))

      const enriched = students.map(s => {
        const parent = parents.find(p => p.studentId === s.id)
        return {
          ...s,
          phone: maskPhone((s as any).phone),
          email: maskEmail((s as any).email),
          parent: parent ? {
            id: parent.id,
            name: parent.name,
            relation: parent.relation,
            phone: maskPhone(parent.phone),
            email: maskEmail(parent.email),
          } : null,
        }
      })
      res.json(enriched)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch students" })
    }
  })

  // Get single student detail (masked)
  router.get("/students/:id", async (req, res) => {
    try {
      const [student] = await db.select().from(schema.students)
        .where(eq(schema.students.id, req.params.id))
      if (!student) { res.status(404).json({ error: "Not found" }); return }

      const parents = await db.select().from(schema.parents)
        .where(eq(schema.parents.studentId, req.params.id))

      const attendanceRecords = await db.select().from(schema.attendance)
        .where(eq(schema.attendance.studentId, req.params.id))

      res.json({
        ...student,
        phone: maskPhone((student as any).phone),
        email: maskEmail((student as any).email),
        parents: parents.map(p => ({
          ...p,
          phone: maskPhone(p.phone),
          email: maskEmail(p.email),
        })),
        attendance: attendanceRecords,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch student" })
    }
  })

  // POST /organizations/:orgId/students
  router.post("/organizations/:orgId/students", async (req, res) => {
    try {
      const { orgId } = req.params
      const { name, grade, classGroup, parentName, parentPhone, parentEmail, shuttle } = req.body

      if (!name) {
        res.status(400).json({ error: "name required" })
        return
      }

      const [student] = await db
        .insert(schema.students)
        .values({
          organizationId: orgId,
          name,
          grade: grade ?? "",
          classGroup: classGroup ?? null,
          shuttle: shuttle === true || shuttle === "true",
          status: "active",
          enrolledAt: new Date().toISOString().split("T")[0],
        })
        .returning()

      if (parentName) {
        await db.insert(schema.parents).values({
          organizationId: orgId,
          studentId: student.id,
          name: parentName,
          relation: "부모",
          phone: parentPhone ?? "",
          email: parentEmail ?? "",
        })
      }

      res.status(201).json(student)
    } catch (err) {
      res.status(500).json({ error: "Failed to create student" })
    }
  })

  // Instructors list
  router.get("/organizations/:orgId/instructors", async (req, res) => {
    try {
      const instructors = await db.select().from(schema.instructors)
        .where(eq(schema.instructors.organizationId, req.params.orgId))
      res.json(instructors)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch instructors" })
    }
  })

  // PATCH /students/:id
  router.patch("/students/:id", async (req, res) => {
    try {
      const { classGroup, shuttle, grade, status, name } = req.body
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (grade !== undefined) updateData.grade = grade
      if (status !== undefined) updateData.status = status
      if (classGroup !== undefined) updateData.classGroup = classGroup
      if (shuttle !== undefined) updateData.shuttle = shuttle === true || shuttle === "true"

      const [student] = await db
        .update(schema.students)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.students.id, req.params.id))
        .returning()

      if (!student) {
        res.status(404).json({ error: "Student not found" })
        return
      }
      res.json(student)
    } catch (err) {
      res.status(500).json({ error: "Failed to update student" })
    }
  })

  // GET /organizations/:orgId/schedules?studentId= (enrolled schedules for student)
  router.get("/organizations/:orgId/student-schedules", async (req, res) => {
    try {
      const { orgId } = req.params
      const { studentId } = req.query as { studentId?: string }

      const rows = await db.select().from(schema.studentSchedules)
        .where(
          studentId
            ? eq(schema.studentSchedules.studentId, studentId)
            : eq(schema.studentSchedules.organizationId, orgId)
        )
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch student schedules" })
    }
  })

  // POST /organizations/:orgId/student-schedules (enroll student in schedule)
  router.post("/organizations/:orgId/student-schedules", async (req, res) => {
    try {
      const { orgId } = req.params
      const { studentId, scheduleId } = req.body
      if (!studentId || !scheduleId) {
        res.status(400).json({ error: "studentId and scheduleId required" })
        return
      }
      const [row] = await db.insert(schema.studentSchedules)
        .values({ organizationId: orgId, studentId, scheduleId })
        .returning()
      res.status(201).json(row)
    } catch (err) {
      res.status(500).json({ error: "Failed to enroll student" })
    }
  })

  // Create instructor
  router.post("/organizations/:orgId/instructors", async (req, res) => {
    try {
      const { orgId } = req.params
      const { name, subject, phone, email, status } = req.body

      if (!name) {
        res.status(400).json({ error: "name required" })
        return
      }
      if (!subject) {
        res.status(400).json({ error: "subject required" })
        return
      }

      const [instructor] = await db
        .insert(schema.instructors)
        .values({
          organizationId: orgId,
          name,
          subject,
          phone: phone ?? null,
          email: email ?? null,
          status: status ?? "active",
        })
        .returning()

      res.status(201).json(instructor)
    } catch (err) {
      res.status(500).json({ error: "Failed to create instructor" })
    }
  })

  // Update instructor
  router.patch("/instructors/:id", async (req, res) => {
    try {
      const { name, subject, phone, email, status } = req.body
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (subject !== undefined) updateData.subject = subject
      if (phone !== undefined) updateData.phone = phone
      if (email !== undefined) updateData.email = email
      if (status !== undefined) updateData.status = status

      const [instructor] = await db
        .update(schema.instructors)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.instructors.id, req.params.id))
        .returning()

      if (!instructor) {
        res.status(404).json({ error: "Instructor not found" })
        return
      }

      res.json(instructor)
    } catch (err) {
      res.status(500).json({ error: "Failed to update instructor" })
    }
  })

  // Delete instructor
  router.delete("/instructors/:id", async (req, res) => {
    try {
      await db
        .delete(schema.instructors)
        .where(eq(schema.instructors.id, req.params.id))

      res.status(204).send()
    } catch (err) {
      res.status(500).json({ error: "Failed to delete instructor" })
    }
  })

  return router
}
