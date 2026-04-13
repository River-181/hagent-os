// v0.3.0
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"

export const agentStatusEnum = pgEnum("agent_status", [
  "idle",
  "running",
  "paused",
  "error",
  "terminated",
])

export const agentTypeEnum = pgEnum("agent_type", [
  "orchestrator",
  "complaint",
  "retention",
  "scheduler",
  "intake",
  "staff",
  "compliance",
  "notification",
])

export const agents = pgTable(
  "agents",
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text().notNull(),
    slug: text().notNull(),
    agentType: agentTypeEnum("agent_type").notNull(),
    status: agentStatusEnum().notNull().default("idle"),
    systemPrompt: text("system_prompt"),
    skills: jsonb().default([]),
    adapterType: text("adapter_type").notNull().default("claude_local"),
    adapterConfig: jsonb("adapter_config"),
    icon: text(),
    memory: jsonb().$type<Record<string, any>>().default({}),
    budgetLimit: integer("budget_limit"),
    budgetUsed: integer("budget_used").notNull().default(0),
    reportsTo: uuid("reports_to").references((): any => agents.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.organizationId, t.slug)],
)

export const agentKeys = pgTable("agent_keys", {
  id: uuid().defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  keyHash: text("key_hash").notNull().unique(),
  label: text(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
