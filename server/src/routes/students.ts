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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function maskAccountNumber(value: string | null | undefined): string {
  if (!value) return ""
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 3)}-${"*".repeat(Math.max(2, digits.length - 7))}-${digits.slice(-4)}`
}

function readStudentMetadata(student: typeof schema.students.$inferSelect) {
  return isPlainObject(student.metadata) ? student.metadata : {}
}

function buildBillingSummary(student: typeof schema.students.$inferSelect) {
  const metadata = readStudentMetadata(student)
  const billing = isPlainObject(metadata.billing) ? metadata.billing : {}
  return {
    payerName: typeof billing.payerName === "string" ? billing.payerName : null,
    paymentMethod: typeof billing.paymentMethod === "string" ? billing.paymentMethod : null,
    bankName: typeof billing.bankName === "string" ? billing.bankName : null,
    accountHolder: typeof billing.accountHolder === "string" ? billing.accountHolder : null,
    accountNumberMasked: maskAccountNumber(typeof billing.accountNumber === "string" ? billing.accountNumber : null),
    cardLabel: typeof billing.cardLabel === "string" ? billing.cardLabel : null,
    cardLast4: typeof billing.cardLast4 === "string" ? billing.cardLast4 : null,
    billingMemo: typeof billing.memo === "string" ? billing.memo : null,
  }
}

function buildStudentPayload(student: typeof schema.students.$inferSelect, parents: typeof schema.parents.$inferSelect[]) {
  return {
    ...student,
    phone: maskPhone((student as any).phone),
    email: maskEmail((student as any).email),
    parent: parents[0]
      ? {
          id: parents[0].id,
          name: parents[0].name,
          relation: parents[0].relation,
          phone: maskPhone(parents[0].phone),
          email: maskEmail(parents[0].email),
        }
      : null,
    parents: parents.map((parent) => ({
      ...parent,
      phone: maskPhone(parent.phone),
      email: maskEmail(parent.email),
    })),
    billing: buildBillingSummary(student),
  }
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

      const enriched = students.map((student) =>
        buildStudentPayload(
          student,
          parents.filter((parent) => parent.studentId === student.id),
        ),
      )
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
        ...buildStudentPayload(student, parents),
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
      const {
        name,
        grade,
        classGroup,
        parentName,
        parentPhone,
        parentEmail,
        parentRelation,
        shuttle,
        billing,
      } = req.body

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
          metadata: isPlainObject(billing) ? { billing } : {},
        })
        .returning()

      if (parentName) {
        await db.insert(schema.parents).values({
          organizationId: orgId,
          studentId: student.id,
          name: parentName,
          relation: parentRelation ?? "부모",
          phone: parentPhone ?? "",
          email: parentEmail ?? "",
        })
      }

      const studentParents = await db.select().from(schema.parents).where(eq(schema.parents.studentId, student.id))
      res.status(201).json(buildStudentPayload(student, studentParents))
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
      const {
        classGroup,
        shuttle,
        grade,
        status,
        name,
        parentName,
        parentPhone,
        parentEmail,
        parentRelation,
        billing,
      } = req.body
      const [existing] = await db.select().from(schema.students).where(eq(schema.students.id, req.params.id))
      if (!existing) {
        res.status(404).json({ error: "Student not found" })
        return
      }
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (grade !== undefined) updateData.grade = grade
      if (status !== undefined) updateData.status = status
      if (classGroup !== undefined) updateData.classGroup = classGroup
      if (shuttle !== undefined) updateData.shuttle = shuttle === true || shuttle === "true"
      if (billing !== undefined) {
        const metadata = readStudentMetadata(existing)
        updateData.metadata = {
          ...metadata,
          billing: isPlainObject(billing) ? billing : {},
        }
      }

      const [student] = await db
        .update(schema.students)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.students.id, req.params.id))
        .returning()

      const [existingParent] = await db
        .select()
        .from(schema.parents)
        .where(eq(schema.parents.studentId, req.params.id))

      if (parentName || parentPhone || parentEmail || parentRelation) {
        if (existingParent) {
          await db
            .update(schema.parents)
            .set({
              name: parentName ?? existingParent.name,
              relation: parentRelation ?? existingParent.relation,
              phone: parentPhone ?? existingParent.phone,
              email: parentEmail ?? existingParent.email,
              updatedAt: new Date(),
            })
            .where(eq(schema.parents.id, existingParent.id))
        } else if (parentName) {
          await db.insert(schema.parents).values({
            organizationId: student.organizationId,
            studentId: student.id,
            name: parentName,
            relation: parentRelation ?? "부모",
            phone: parentPhone ?? "",
            email: parentEmail ?? "",
          })
        }
      }

      const studentParents = await db.select().from(schema.parents).where(eq(schema.parents.studentId, student.id))
      res.json(buildStudentPayload(student, studentParents))
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
