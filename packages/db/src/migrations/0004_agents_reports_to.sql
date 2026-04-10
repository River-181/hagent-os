ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "reports_to" uuid REFERENCES "agents"("id");
