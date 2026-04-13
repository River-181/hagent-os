import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"

export const activityEvents = pgTable("activity_events", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  action: text().notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  entityTitle: text("entity_title"),
  metadata: jsonb(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
