import {
  type AnyPgColumn,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"

export const opsGroups = pgTable("ops_groups", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text().notNull(),
  description: text(),
  color: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const opsGoals = pgTable("ops_goals", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  opsGroupId: uuid("ops_group_id").references(() => opsGroups.id),
  // Self-referencing FK: child goal → parent goal (nullable)
  parentGoalId: uuid("parent_goal_id").references((): AnyPgColumn => opsGoals.id),
  title: text().notNull(),
  description: text(),
  status: text().notNull().default("active"),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
