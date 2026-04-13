import { Router } from "express"
import { eq, desc, count } from "drizzle-orm"
import pino from "pino"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { runOrchestrator } from "../lib/agents/orchestrator.js"
import { executeAgentRun } from "../services/execution.js"

const logger = pino({ level: "info" })

export function orchestratorRoutes(db: Db): Router {
  const router = Router()

  // POST /api/orchestrator/dispatch
  router.post("/dispatch", async (req, res) => {
    try {
      const { instruction, organizationId } = req.body as {
        instruction: string
        organizationId: string
      }

      if (!instruction || !organizationId) {
        res.status(400).json({ error: "instruction and organizationId are required" })
        return
      }

      // 1. Load org + agents from DB
      const [org] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, organizationId))

      if (!org) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, organizationId))

      // Load pending cases for context
      const pendingCases = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, organizationId))
        .orderBy(desc(schema.cases.createdAt))

      // 2. Call Orchestrator to parse instruction → plan
      const orchestratorResult = await runOrchestrator({
        organizationId,
        agents: agents.map((a) => ({
          id: a.id,
          agentType: a.agentType,
          name: a.name,
        })),
        context: JSON.stringify({
          instruction,
          orgName: org.name,
          pendingCases: pendingCases.slice(0, 10).map((c) => ({
            id: c.id,
            identifier: c.identifier,
            title: c.title,
            type: c.type,
            status: c.status,
            severity: c.severity,
          })),
        }),
      })

      // 3. For each assignment: find or create Case, then executeAgentRun
      const runIds: string[] = []

      for (const assignment of orchestratorResult.assignments) {
        const agent = agents.find((a) => a.id === assignment.agentId)
        if (!agent) {
          logger.warn({ agentId: assignment.agentId }, "Agent not found, skipping assignment")
          continue
        }

        // Find an existing open case or create a new one
        let caseId: string

        const existingCases = pendingCases.filter(
          (c) =>
            c.status !== "done" &&
            c.status !== "in_review" &&
            c.assigneeAgentId === null,
        )

        if (existingCases.length > 0 && agent.agentType !== "retention") {
          // Reuse first open unassigned case for complaint-like agents
          caseId = existingCases[0].id
        } else {
          // Create a new case for this assignment
          const [{ total }] = await db
            .select({ total: count() })
            .from(schema.cases)
            .where(eq(schema.cases.organizationId, organizationId))

          const identifier = `C-${String(total + 1).padStart(3, "0")}`

          const caseType = agent.agentType === "retention" ? "churn" : "inquiry"

          const [newCase] = await db
            .insert(schema.cases)
            .values({
              organizationId,
              identifier,
              title: `[자동생성] ${assignment.reason}`,
              description: instruction,
              type: caseType,
              severity: "normal",
            })
            .returning()

          caseId = newCase.id
        }

        try {
          const { runId } = await executeAgentRun(db, {
            organizationId,
            agentId: agent.id,
            caseId,
            agentType: agent.agentType,
            approvalLevel: agent.agentType === "complaint" ? 1 : 0,
          })
          runIds.push(runId)
        } catch (err) {
          logger.error({ err, agentType: agent.agentType, caseId }, "Agent run failed during dispatch")
        }
      }

      logger.info(
        { organizationId, instruction: instruction.slice(0, 80), runCount: runIds.length },
        "Orchestrator dispatch completed",
      )

      res.json({
        plan: orchestratorResult.plan,
        runs: runIds,
      })
    } catch (err) {
      logger.error({ err }, "Orchestrator dispatch error")
      res.status(500).json({ error: "Dispatch failed" })
    }
  })

  return router
}
