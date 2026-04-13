import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"

export const students = pgTable("students", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text().notNull(),
  grade: text().notNull(),
  classGroup: text("class_group"),           // 반 (예: "초등 영어 A반")
  shuttle: boolean().notNull().default(false), // 등하원 차량 탑승 여부
  enrolledAt: date("enrolled_at").notNull(),
  riskScore: real("risk_score").notNull().default(0),
  // status: "active" | "inactive" | "withdrawn" — text for MVP flexibility
  status: text().notNull().default("active"),
  metadata: jsonb(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const parents = pgTable("parents", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text().notNull(),
  phone: text(),
  email: text(),
  relation: text().notNull(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const instructors = pgTable("instructors", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text().notNull(),
  subject: text().notNull(),
  // status: "active" | "inactive" | "on_leave" — text for MVP flexibility
  status: text().notNull().default("active"),
  phone: text(),
  email: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const schedules = pgTable("schedules", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  instructorId: uuid("instructor_id").references(() => instructors.id),
  title: text().notNull(),
  // type: "regular" | "makeup" | "special" — text for MVP flexibility
  type: text().notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  room: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Student ↔ Schedule enrollment (many-to-many)
export const studentSchedules = pgTable("student_schedules", {
  id: uuid().defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => schedules.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const attendance = pgTable("attendance", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  scheduleId: uuid("schedule_id").references(() => schedules.id),
  date: date().notNull(),
  // status: "present" | "absent" | "late" | "excused" — text for MVP flexibility
  status: text().notNull(),
  note: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
