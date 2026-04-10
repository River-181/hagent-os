CREATE TABLE IF NOT EXISTS "skill_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"version" text NOT NULL,
	"summary" text NOT NULL,
	"package_type" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_repo" text,
	"source_url" text,
	"source_commit" text,
	"manifest_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skill_packages_namespace_slug_idx" ON "skill_packages" USING btree ("namespace","slug");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"skill_package_id" uuid NOT NULL,
	"status" text DEFAULT 'installed' NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_skills_org_skill_idx" ON "organization_skills" USING btree ("organization_id","skill_package_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"skill_package_id" uuid NOT NULL,
	"mount_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"override_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_skills_agent_skill_idx" ON "agent_skills" USING btree ("agent_id","skill_package_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_package_id" uuid,
	"organization_id" uuid,
	"job_type" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_locator" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"result_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_skills" ADD CONSTRAINT "organization_skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_skills" ADD CONSTRAINT "organization_skills_skill_package_id_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."skill_packages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_skill_package_id_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."skill_packages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "skill_sync_jobs" ADD CONSTRAINT "skill_sync_jobs_skill_package_id_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."skill_packages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "skill_sync_jobs" ADD CONSTRAINT "skill_sync_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
