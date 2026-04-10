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
import { cases } from "./cases.js"

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "completed",
  "pending_approval",
  "failed",
])

export const agentRuns = pgTable("agent_runs", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  caseId: uuid("case_id").references(() => cases.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  status: runStatusEnum().notNull().default("queued"),
  approvalLevel: integer("approval_level").notNull().default(0),
  input: jsonb(),
  output: jsonb(),
  reasoning: text(),
  tokensUsed: integer("tokens_used").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
