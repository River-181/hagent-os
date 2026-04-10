import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"
import { agents } from "./agents.js"
import { opsGroups } from "./ops-groups.js"
import { students } from "./education.js"

export const caseTypeEnum = pgEnum("case_type", [
  "complaint",
  "refund",
  "makeup",
  "inquiry",
  "churn",
  "schedule",
])

export const caseSeverityEnum = pgEnum("case_severity", [
  "immediate",
  "same_day",
  "normal",
  "low",
])

export const caseStatusEnum = pgEnum("case_status", [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
])

export const cases = pgTable("cases", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  opsGroupId: uuid("ops_group_id").references(() => opsGroups.id),
  identifier: text().notNull(),
  title: text().notNull(),
  description: text(),
  type: caseTypeEnum().notNull(),
  severity: caseSeverityEnum().notNull().default("normal"),
  status: caseStatusEnum().notNull().default("backlog"),
  priority: integer().notNull().default(2),
  reporterId: text("reporter_id"),
  studentId: uuid("student_id").references(() => students.id),
  assigneeAgentId: uuid("assignee_agent_id").references(() => agents.id),
  checkoutRunId: uuid("checkout_run_id"),
  agentDraft: text("agent_draft"),
  source: text(), // "manual" | "kakao" | "sms" | "web" | null
  metadata: jsonb(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const caseComments = pgTable("case_comments", {
  id: uuid().defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id),
  authorType: text("author_type").notNull(),
  authorId: text("author_id").notNull(),
  content: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
