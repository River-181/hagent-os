// v0.2.0
import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"

export const documents = pgTable("documents", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text().notNull(),
  body: text().notNull().default(""),
  category: text().notNull().default("general"), // policy, faq, manual, script, general
  tags: jsonb().$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
