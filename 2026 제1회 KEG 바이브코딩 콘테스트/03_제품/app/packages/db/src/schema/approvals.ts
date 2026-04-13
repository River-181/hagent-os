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
import { agentRuns } from "./agent-runs.js"
import { cases } from "./cases.js"

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
])

export const approvals = pgTable("approvals", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  agentRunId: uuid("agent_run_id")
    .notNull()
    .references(() => agentRuns.id),
  caseId: uuid("case_id").references(() => cases.id),
  level: integer().notNull().default(0),
  status: approvalStatusEnum().notNull().default("pending"),
  payload: jsonb().notNull(),
  decision: jsonb(),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
