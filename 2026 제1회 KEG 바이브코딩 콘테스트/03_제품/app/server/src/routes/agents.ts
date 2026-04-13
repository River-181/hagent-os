// v0.3.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import { mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { executeAgentRun } from "../services/execution.js"
import { publishEvent } from "../services/live-events.js"
import { getAgentMountedSkills, updateAgentSkillMounts } from "../services/skills.js"

const AGENT_DATA_DIR = join(import.meta.dirname, "../../data/agents")

function buildSoulMd(name: string, agentType: string): string {
  const roleDescriptions: Record<string, string> = {
    orchestrator: "전체 운영을 조율하고 다른 에이전트에게 작업을 위임하는 오케스트레이터 역할",
    complaint: "학생 및 학부모의 불만 사항을 접수하고 처리하는 고충 처리 역할",
    retention: "학생 이탈 방지와 재등록 유도를 위한 리텐션 관리 역할",
    scheduler: "수업 일정과 강사 스케줄을 효율적으로 관리하는 스케줄러 역할",
    intake: "신규 학생 등록 및 초기 상담을 담당하는 인테이크 역할",
    staff: "학원 직원으로서 일반 행정 및 운영 업무를 지원하는 역할",
    compliance: "규정 준수 및 내부 정책 이행을 감독하는 컴플라이언스 역할",
    notification: "학생, 학부모, 직원에게 중요한 알림을 전달하는 알림 담당 역할",
  }

  const role = roleDescriptions[agentType] ?? `${agentType}에 해당하는 역할`

  return `# ${name}

## 역할
${role}

## 원칙
- 학원 운영의 효율성을 최우선으로 합니다
- 모든 판단은 학생과 학부모의 이익을 고려합니다
- 불확실한 사안은 반드시 원장에게 보고합니다
`
}

export function agentRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/agents", async (req, res) => {
    try {
      const agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.organizationId, req.params.orgId))

      res.json(agents)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch agents" })
    }
  })

  router.post("/organizations/:orgId/agents", async (req, res) => {
    try {
      const { name, agentType, title, reportsTo, model, slug, adapterType, adapterConfig, icon, systemPrompt } = req.body as {
        name: string
        agentType: string
        title?: string
        reportsTo?: string
        model?: string
        slug?: string
        adapterType?: string
        adapterConfig?: Record<string, unknown>
        icon?: string
        systemPrompt?: string
      }

      if (!name || !agentType) {
        res.status(400).json({ error: "name and agentType are required" })
        return
      }

      const generatedSlug = slug ?? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

      const [agent] = await db
        .insert(schema.agents)
        .values({
          organizationId: req.params.orgId,
          name,
          slug: generatedSlug,
          agentType: agentType as (typeof schema.agentTypeEnum.enumValues)[number],
          ...(reportsTo ? { reportsTo } : {}),
          ...(systemPrompt ? { systemPrompt } : {}),
          ...(icon ? { icon } : {}),
          ...(adapterType ? { adapterType } : {}),
          ...(adapterConfig ? { adapterConfig } : {}),
        })
        .returning()

      const agentDir = join(AGENT_DATA_DIR, agent.id)
      mkdirSync(agentDir, { recursive: true })
      writeFileSync(join(agentDir, "SOUL.md"), buildSoulMd(name, agentType), "utf-8")

      res.status(201).json(agent)
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create agent", detail: err?.message ?? String(err) })
    }
  })

  router.get("/agents/:id", async (req, res) => {
    try {
      const [agent] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, req.params.id))

      if (!agent) {
        res.status(404).json({ error: "Agent not found" })
        return
      }

      res.json(agent)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch agent" })
    }
  })

  router.patch("/agents/:id", async (req, res) => {
    try {
      const [existing] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, req.params.id))

      if (!existing) {
        res.status(404).json({ error: "Agent not found" })
        return
      }

      const allowedFields = ["status", "systemPrompt", "skills"] as const
      type AllowedField = (typeof allowedFields)[number]

      const updates: Partial<Record<AllowedField, unknown>> = {}
      for (const field of allowedFields) {
        if (field in req.body) {
          updates[field] = req.body[field]
        }
      }

      const [updated] = await db
        .update(schema.agents)
        .set({ ...(updates as any), updatedAt: new Date() })
        .where(eq(schema.agents.id, req.params.id))
        .returning()

      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to update agent" })
    }
  })

  // GET /agents/:id/memory
  router.get("/agents/:id/memory", async (req, res) => {
    try {
      const [agent] = await db.select().from(schema.agents)
        .where(eq(schema.agents.id, req.params.id))
      if (!agent) { res.status(404).json({ error: "Not found" }); return }
      res.json(agent.memory ?? {})
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch memory" })
    }
  })

  // PATCH /agents/:id/memory
  router.patch("/agents/:id/memory", async (req, res) => {
    try {
      const [agent] = await db.select().from(schema.agents)
        .where(eq(schema.agents.id, req.params.id))
      if (!agent) { res.status(404).json({ error: "Not found" }); return }

      const currentMemory = (agent.memory as Record<string, any>) ?? {}
      const merged = { ...currentMemory, ...req.body }

      const [updated] = await db.update(schema.agents)
        .set({ memory: merged as any, updatedAt: new Date() })
        .where(eq(schema.agents.id, req.params.id))
        .returning()
      res.json(updated.memory)
    } catch (err) {
      res.status(500).json({ error: "Failed to update memory" })
    }
  })

  // POST /agents/:id/wakeup — trigger agent execution
  router.get("/agents/:id/skills", async (req, res) => {
    try {
      res.json(await getAgentMountedSkills(db, req.params.id))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fetch agent skills" })
    }
  })

  router.put("/agents/:id/skills", async (req, res) => {
    try {
      const items = Array.isArray(req.body?.skills) ? req.body.skills : []
      const updated = await updateAgentSkillMounts(db, req.params.id, items)
      res.json(updated)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update agent skills" })
    }
  })

  router.post("/:id/wakeup", async (req, res) => {
    try {
      const { reason: _reason, caseId: requestedCaseId } = req.body as {
        reason?: string
        caseId?: string
      }

      const [agent] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, req.params.id))

      if (!agent) {
        res.status(404).json({ error: "Agent not found" })
        return
      }

      let caseId = requestedCaseId

      if (!caseId) {
        // Find a pending / open case for this agent's org
        const pendingCases = await db
          .select()
          .from(schema.cases)
          .where(eq(schema.cases.organizationId, agent.organizationId))

        const openCase = pendingCases.find(
          (c) =>
            c.status !== "done" &&
            c.status !== "in_review" &&
            c.assigneeAgentId === null,
        )

        if (!openCase) {
          res.status(422).json({ error: "No pending cases available for this agent" })
          return
        }

        caseId = openCase.id
      }

      const { runId } = await executeAgentRun(db, {
        organizationId: agent.organizationId,
        agentId: agent.id,
        caseId,
        agentType: agent.agentType,
        approvalLevel: agent.agentType === "complaint" ? 1 : 0,
      })

      res.status(202).json({ runId })
    } catch (err) {
      res.status(500).json({ error: "Failed to wake up agent" })
    }
  })

  // POST /agents/:id/stop — stop a running agent
  router.post("/:id/stop", async (req, res) => {
    try {
      const [agent] = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, req.params.id))

      if (!agent) {
        res.status(404).json({ error: "Agent not found" })
        return
      }

      // Find active run for this agent
      const allRuns = await db
        .select()
        .from(schema.agentRuns)
        .where(eq(schema.agentRuns.agentId, req.params.id))

      const activeRun = allRuns.find((r) => r.status === "running" || r.status === "queued")

      if (!activeRun) {
        res.status(404).json({ error: "No active run found for this agent" })
        return
      }

      await db
        .update(schema.agentRuns)
        .set({
          status: "failed",
          error: "Cancelled by user",
          updatedAt: new Date(),
        })
        .where(eq(schema.agentRuns.id, activeRun.id))

      publishEvent(agent.organizationId, "agent.run.cancelled", {
        runId: activeRun.id,
        agentId: agent.id,
        caseId: activeRun.caseId,
      })

      res.json({ runId: activeRun.id, status: "cancelled" })
    } catch (err) {
      res.status(500).json({ error: "Failed to stop agent" })
    }
  })

  return router
}
