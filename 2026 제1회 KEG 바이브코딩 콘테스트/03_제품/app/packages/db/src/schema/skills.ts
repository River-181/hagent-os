import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.js"
import { agents } from "./agents.js"

export const skillPackages = pgTable(
  "skill_packages",
  {
    id: uuid().defaultRandom().primaryKey(),
    namespace: text().notNull(),
    slug: text().notNull(),
    displayName: text("display_name").notNull(),
    version: text().notNull(),
    summary: text().notNull(),
    packageType: text("package_type").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceRepo: text("source_repo"),
    sourceUrl: text("source_url"),
    sourceCommit: text("source_commit"),
    manifestJson: jsonb("manifest_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.namespace, t.slug)],
)

export const organizationSkills = pgTable(
  "organization_skills",
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    skillPackageId: uuid("skill_package_id")
      .notNull()
      .references(() => skillPackages.id),
    status: text().notNull().default("installed"),
    configJson: jsonb("config_json").default({}),
    installedAt: timestamp("installed_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.organizationId, t.skillPackageId)],
)

export const agentSkills = pgTable(
  "agent_skills",
  {
    id: uuid().defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    skillPackageId: uuid("skill_package_id")
      .notNull()
      .references(() => skillPackages.id),
    mountOrder: integer("mount_order").notNull().default(0),
    enabled: boolean().notNull().default(true),
    overrideJson: jsonb("override_json").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.agentId, t.skillPackageId)],
)

export const skillSyncJobs = pgTable("skill_sync_jobs", {
  id: uuid().defaultRandom().primaryKey(),
  skillPackageId: uuid("skill_package_id").references(() => skillPackages.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  jobType: text("job_type").notNull(),
  sourceKind: text("source_kind").notNull(),
  sourceLocator: text("source_locator"),
  status: text().notNull().default("queued"),
  resultJson: jsonb("result_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
