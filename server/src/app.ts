import express, { type Express } from "express"
import cors from "cors"
import pinoHttp from "pino-http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { existsSync } from "node:fs"
import type { Db } from "@hagent/db"
import type { Config } from "./config.js"
import { getHealthPayload, healthRoutes } from "./routes/health.js"
import { organizationRoutes } from "./routes/organizations.js"
import { caseRoutes } from "./routes/cases.js"
import { agentRoutes } from "./routes/agents.js"
import { approvalRoutes } from "./routes/approvals.js"
import { activityRoutes } from "./routes/activity.js"
import { skillRoutes } from "./routes/skills.js"
import { capabilityRoutes } from "./routes/capabilities.js"
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
import { costRoutes } from "./routes/costs.js"
import { webhookRoutes } from "./routes/webhook.js"
import { agentInstructionsRoutes } from "./routes/agent-instructions.js"
import { agentHireRoutes } from "./routes/agent-hires.js"
import { pluginRoutes } from "./routes/plugins.js"
import { adapterRoutes } from "./routes/adapters.js"
import { messageRoutes } from "./routes/messages.js"
import { telegramRoutes } from "./routes/telegram.js"

export function createApp(db: Db, config: Config): Express {
  const app = express()
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
  ]

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  )
  app.use(pinoHttp())
  app.use(express.json({ limit: "10mb" }))

  app.get("/", (_req, res) => {
    res.json(getHealthPayload())
  })
  app.use("/api/health", healthRoutes(db))
  app.use("/api/organizations", organizationRoutes(db))
  app.use("/api", caseRoutes(db))
  app.use("/api/agents", agentInstructionsRoutes(db))
  app.use("/api", agentRoutes(db))
  app.use("/api", approvalRoutes(db))
  app.use("/api", activityRoutes(db))
  app.use("/api/skills", skillRoutes(db))
  app.use("/api/capabilities", capabilityRoutes(db))
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
  app.use("/api", costRoutes(db))
  app.use("/api/plugins", pluginRoutes())
  app.use("/api/adapters", adapterRoutes(db))
  app.use("/api", messageRoutes(db))
  app.use("/api", telegramRoutes(db))
  app.use("/api/webhook", webhookRoutes(db))
  app.use("/api/channels", webhookRoutes(db))
  app.use("/api", agentHireRoutes(db))

  // UI static 서빙 (프로덕션 배포 시 ui/dist 마운트)
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const uiDistCandidates = [
    path.resolve(__dirname, "../../ui/dist"),
    path.resolve(__dirname, "../../../ui/dist"),
    path.resolve(process.cwd(), "ui/dist"),
  ]
  const uiDist = uiDistCandidates.find((p) => existsSync(p))
  if (uiDist) {
    app.use(express.static(uiDist))
    // SPA catch-all: API 아닌 모든 경로 → index.html
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(uiDist, "index.html"))
    })
  }

  return app
}
