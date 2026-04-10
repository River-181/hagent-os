ALTER TABLE "agents" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "memory" jsonb DEFAULT '{}'::jsonb;