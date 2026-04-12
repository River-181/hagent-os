ALTER TYPE "public"."agent_type" ADD VALUE 'finance' BEFORE 'compliance';--> statement-breakpoint
ALTER TYPE "public"."agent_type" ADD VALUE 'analytics';--> statement-breakpoint
ALTER TYPE "public"."agent_type" ADD VALUE 'operations';--> statement-breakpoint
ALTER TYPE "public"."agent_type" ADD VALUE 'counseling';--> statement-breakpoint
ALTER TYPE "public"."agent_type" ADD VALUE 'marketing';--> statement-breakpoint
CREATE TABLE "student_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"skill_package_id" uuid NOT NULL,
	"mount_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"override_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_skills_agent_id_skill_package_id_unique" UNIQUE("agent_id","skill_package_id")
);
--> statement-breakpoint
CREATE TABLE "organization_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"skill_package_id" uuid NOT NULL,
	"status" text DEFAULT 'installed' NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_skills_organization_id_skill_package_id_unique" UNIQUE("organization_id","skill_package_id")
);
--> statement-breakpoint
CREATE TABLE "skill_packages" (
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_packages_namespace_slug_unique" UNIQUE("namespace","slug")
);
--> statement-breakpoint
CREATE TABLE "skill_sync_jobs" (
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
ALTER TABLE "agents" ADD COLUMN "reports_to" uuid;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "ops_groups" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "role" text DEFAULT 'teacher' NOT NULL;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "class_group" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "shuttle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_schedules" ADD CONSTRAINT "student_schedules_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_schedules" ADD CONSTRAINT "student_schedules_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_schedules" ADD CONSTRAINT "student_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_skill_package_id_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."skill_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_skills" ADD CONSTRAINT "organization_skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_skills" ADD CONSTRAINT "organization_skills_skill_package_id_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."skill_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_sync_jobs" ADD CONSTRAINT "skill_sync_jobs_skill_package_id_skill_packages_id_fk" FOREIGN KEY ("skill_package_id") REFERENCES "public"."skill_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_sync_jobs" ADD CONSTRAINT "skill_sync_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_reports_to_agents_id_fk" FOREIGN KEY ("reports_to") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;