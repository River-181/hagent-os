-- v0.4.0 Education schema additions
-- 1. students: classGroup, shuttle columns
-- 2. instructors: email column
-- 3. student_schedules: enrollment join table

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "class_group" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "shuttle" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "student_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_schedules" ADD CONSTRAINT "student_schedules_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_schedules" ADD CONSTRAINT "student_schedules_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_schedules" ADD CONSTRAINT "student_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
