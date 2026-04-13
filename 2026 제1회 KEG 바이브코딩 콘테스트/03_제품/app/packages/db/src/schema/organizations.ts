import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const organizations = pgTable("organizations", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  prefix: text().notNull().unique(),
  description: text(),
  agentTeamConfig: jsonb("agent_team_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
