import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"
import { agents } from "./agents.js"
import { agentRuns } from "./agent-runs.js"
import { cases } from "./cases.js"

export const tokenBudgets = pgTable("token_budgets", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  agentId: uuid("agent_id").references(() => agents.id),
  monthlyLimit: integer("monthly_limit").notNull(),
  monthlyUsed: integer("monthly_used").notNull().default(0),
  period: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const tokenUsageEvents = pgTable("token_usage_events", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  agentRunId: uuid("agent_run_id").references(() => agentRuns.id),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  model: text().notNull().default("claude-sonnet-4-6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const routines = pgTable("routines", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  agentId: uuid("agent_id").references(() => agents.id),
  name: text().notNull(),
  schedule: text().notNull(),
  enabled: boolean().notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const notifications = pgTable("notifications", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  // type: e.g. "case_update" | "agent_alert" | "compliance" | "reminder" — text for MVP flexibility
  type: text().notNull(),
  title: text().notNull(),
  body: text().notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  read: boolean().notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const wakeupRequests = pgTable("wakeup_requests", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  caseId: uuid("case_id").references(() => cases.id),
  agentId: uuid("agent_id").references(() => agents.id),
  status: text().notNull().default("pending"),
  dedupKey: text("dedup_key").notNull().unique(),
  // status: "pending" | "sent" | "cancelled" — text for MVP flexibility
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
