import { Router } from "express"
import { eq, and } from "drizzle-orm"
import { mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "../services/live-events.js"

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

export function approvalRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/approvals", async (req, res) => {
    try {
      const { status } = req.query

      const conditions = [
        eq(schema.approvals.organizationId, req.params.orgId),
      ]

      if (status && typeof status === "string") {
        const validStatuses = [
          "pending",
          "approved",
          "rejected",
          "revision_requested",
        ] as const
        type ApprovalStatus = (typeof validStatuses)[number]
        if (validStatuses.includes(status as ApprovalStatus)) {
          conditions.push(
            eq(schema.approvals.status, status as ApprovalStatus),
          )
        }
      }

      const approvals = await db
        .select()
        .from(schema.approvals)
        .where(and(...conditions))

      res.json(approvals)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch approvals" })
    }
  })

  router.get("/approvals/:id", async (req, res) => {
    try {
      const [approval] = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.id, req.params.id))

      if (!approval) {
        res.status(404).json({ error: "Approval not found" })
        return
      }

      res.json(approval)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch approval" })
    }
  })

  router.post("/approvals/:id/decide", async (req, res) => {
    try {
      const { decision, comment } = req.body as {
        decision: "approved" | "rejected" | "revision_requested"
        comment?: string
      }

      const validDecisions = ["approved", "rejected", "revision_requested"] as const
      if (!validDecisions.includes(decision)) {
        res.status(400).json({ error: "Invalid decision value" })
        return
      }

      const [existing] = await db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.id, req.params.id))

      if (!existing) {
        res.status(404).json({ error: "Approval not found" })
        return
      }

      const [updated] = await db
        .update(schema.approvals)
        .set({
          status: decision,
          decidedBy: "board",
          decidedAt: new Date(),
          decision: comment ? { comment } : {},
          updatedAt: new Date(),
        })
        .where(eq(schema.approvals.id, req.params.id))
        .returning()

      // Fetch case identifier for activity log title
      let caseIdentifier: string | null = null
      if (existing.caseId) {
        const [caseRecord] = await db
          .select({ identifier: schema.cases.identifier })
          .from(schema.cases)
          .where(eq(schema.cases.id, existing.caseId))
        caseIdentifier = caseRecord?.identifier ?? null
      }

      // Handle agent_hire approval
      const payload = existing.payload as Record<string, unknown> | null
      if (decision === "approved" && payload?.type === "agent_hire") {
        const hireName = payload.name as string
        const hireAgentType = payload.agentType as string
        const hireReportsTo = payload.reportsTo as string | undefined
        const hireSlug = hireName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

        const [newAgent] = await db
          .insert(schema.agents)
          .values({
            organizationId: existing.organizationId,
            name: hireName,
            slug: hireSlug,
            agentType: hireAgentType as (typeof schema.agentTypeEnum.enumValues)[number],
            ...(hireReportsTo ? { reportsTo: hireReportsTo } : {}),
          })
          .returning()

        const agentDir = join(AGENT_DATA_DIR, newAgent.id)
        mkdirSync(agentDir, { recursive: true })
        writeFileSync(join(agentDir, "SOUL.md"), buildSoulMd(hireName, hireAgentType), "utf-8")

        publishEvent(existing.organizationId, "agent.hired", {
          agentId: newAgent.id,
          name: hireName,
          agentType: hireAgentType,
          approvalId: existing.id,
        })
      }

      if (decision === "approved" && existing.caseId) {
        await db
          .update(schema.cases)
          .set({ status: "done", updatedAt: new Date() })
          .where(eq(schema.cases.id, existing.caseId))
      }

      if (decision === "rejected" && existing.caseId) {
        await db
          .update(schema.cases)
          .set({ status: "todo", updatedAt: new Date() })
          .where(eq(schema.cases.id, existing.caseId))
      }

      const entityTitle = caseIdentifier
        ? `approval ${decision} on case ${caseIdentifier}`
        : `approval ${decision}`

      await db.insert(schema.activityEvents).values({
        organizationId: existing.organizationId,
        actorType: "board",
        actorId: "board",
        action: `approval.${decision}`,
        entityType: "approval",
        entityId: existing.id,
        entityTitle,
        metadata: comment ? { comment } : {},
      })

      publishEvent(existing.organizationId, "approval.decided", {
        approvalId: existing.id,
        caseId: existing.caseId ?? null,
        decision,
        comment: comment ?? null,
      })

      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: "Failed to process decision" })
    }
  })

  return router
}
