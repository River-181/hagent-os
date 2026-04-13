import express, { type Express } from "express"
import cors from "cors"
import pinoHttp from "pino-http"
import type { Db } from "@hagent/db"
import type { Config } from "./config.js"
import { healthRoutes } from "./routes/health.js"
import { organizationRoutes } from "./routes/organizations.js"
import { caseRoutes } from "./routes/cases.js"
import { agentRoutes } from "./routes/agents.js"
import { approvalRoutes } from "./routes/approvals.js"
import { activityRoutes } from "./routes/activity.js"
import { skillRoutes } from "./routes/skills.js"
import { runRoutes } from "./routes/runs.js"
import { orchestratorRoutes } from "./routes/orchestrator.js"
import { eventsRoutes } from "./routes/events.js"
import { heartbeatRoutes } from "./routes/heartbeat.js"
import { documentRoutes } from "./routes/documents.js"
import { routineRoutes } from "./routes/routines.js"
import { goalRoutes } from "./routes/goals.js"
import { dashboardRoutes } from "./routes/dashboard.js"
import { notificationRoutes } from "./routes/notifications.js"
import { projectRoutes } from "./routes/projects.js"
import { studentRoutes } from "./routes/students.js"
import { scheduleRoutes } from "./routes/schedules.js"
import { webhookRoutes } from "./routes/webhook.js"
import { agentInstructionsRoutes } from "./routes/agent-instructions.js"
import { agentHireRoutes } from "./routes/agent-hires.js"

export function createApp(db: Db, config: Config): Express {
  const app = express()

  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  )
  app.use(pinoHttp())
  app.use(express.json({ limit: "10mb" }))

  app.use("/api/health", healthRoutes(db))
  app.use("/api/organizations", organizationRoutes(db))
  app.use("/api", caseRoutes(db))
  app.use("/api/agents", agentInstructionsRoutes(db))
  app.use("/api", agentRoutes(db))
  app.use("/api", approvalRoutes(db))
  app.use("/api", activityRoutes(db))
  app.use("/api/skills", skillRoutes(db))
  app.use("/api/runs", runRoutes(db))
  app.use("/api/orchestrator", orchestratorRoutes(db))
  app.use("/api", eventsRoutes(db))
  app.use("/api/heartbeat", heartbeatRoutes(db))
  app.use("/api", documentRoutes(db))
  app.use("/api", routineRoutes(db))
  app.use("/api", goalRoutes(db))
  app.use("/api", dashboardRoutes(db))
  app.use("/api", notificationRoutes(db))
  app.use("/api", projectRoutes(db))
  app.use("/api", studentRoutes(db))
  app.use("/api", scheduleRoutes(db))
  app.use("/api/webhook", webhookRoutes(db))
  app.use("/api", agentHireRoutes(db))

  return app
}
