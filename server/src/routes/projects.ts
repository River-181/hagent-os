// v0.3.0
import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { createCaseWithRetry } from "../lib/case-create.js"

function createProjectBreakdown(instruction: string) {
  const normalized = instruction.toLowerCase()

  if (
    normalized.includes("정책") ||
    normalized.includes("환불") ||
    normalized.includes("상담 정책") ||
    normalized.includes("보강 정책") ||
    normalized.includes("운영 규정")
  ) {
    return {
      projectName: "학원 운영 정책 정비",
      description: "환불, 상담, 보강, 출결 운영 정책을 정리해 직원용 플레이북과 학부모 안내문으로 만드는 작업",
      cases: [
        { title: "환불 정책 정리", description: "학원 환불 기준과 예외 처리 원칙을 정리합니다.", type: "complaint" as const, caseKind: "policy-request" },
        { title: "상담 응대 원칙", description: "학부모 상담 응대 톤과 단계별 대응 원칙을 정리합니다.", type: "complaint" as const, caseKind: "policy-request" },
        { title: "보강/결석 운영 규정", description: "보강, 결석, 일정 변경 처리 원칙을 문서화합니다.", type: "schedule" as const, caseKind: "policy-request" },
        { title: "직원용 운영 플레이북", description: "직원/강사 공통 운영 체크리스트와 의사결정 기준을 정리합니다.", type: "inquiry" as const, caseKind: "policy-request" },
        { title: "학부모 안내 FAQ", description: "학부모에게 바로 전달할 수 있는 운영 정책 FAQ를 작성합니다.", type: "complaint" as const, caseKind: "policy-request" },
      ],
      recommendedRoles: ["complaint", "scheduler", "compliance", "operations"],
    }
  }

  if (normalized.includes("프로모션") || normalized.includes("promotion") || normalized.includes("캠페인")) {
    return {
      projectName: "상반기 프로모션 준비",
      description: "프로모션 기획, 메시지, 일정, 학부모 안내문까지 한 번에 준비하는 작업",
      cases: [
        { title: "프로모션 컨셉안", description: "상반기 프로모션의 핵심 컨셉과 제안 구조를 정리합니다.", type: "inquiry" as const, caseKind: "campaign-request" },
        { title: "프로모션 일정표", description: "홍보와 상담, 등록 유도 일정표를 제안합니다.", type: "schedule" as const, caseKind: "campaign-request" },
        { title: "학부모 안내문", description: "학부모 대상 프로모션 안내문 초안을 작성합니다.", type: "complaint" as const, caseKind: "campaign-request" },
        { title: "메시지 초안", description: "카카오/문자/텔레그램용 아웃바운드 메시지를 작성합니다.", type: "complaint" as const, caseKind: "campaign-request" },
        { title: "랜딩/홍보 텍스트", description: "홍보 문구와 랜딩용 카피를 작성합니다.", type: "inquiry" as const, caseKind: "campaign-request" },
      ],
      recommendedRoles: ["marketing", "complaint", "scheduler"],
    }
  }

  return {
    projectName: instruction.slice(0, 40),
    description: instruction,
    cases: [
      { title: "작업 브리프 작성", description: `${instruction}에 대한 브리프와 목표를 정리합니다.`, type: "inquiry" as const, caseKind: "project-task" },
      { title: "실행 계획 수립", description: "필요한 일정, 역할, 승인 포인트를 계획합니다.", type: "schedule" as const, caseKind: "project-task" },
      { title: "초안 결과물 작성", description: "사용 가능한 첫 결과물 초안을 작성합니다.", type: "complaint" as const, caseKind: "project-task" },
    ],
    recommendedRoles: ["orchestrator", "complaint", "scheduler"],
  }
}

export function projectRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/projects", async (req, res) => {
    try {
      const projects = await db.select().from(schema.opsGroups)
        .where(eq(schema.opsGroups.organizationId, req.params.orgId))
      // Get case counts per project
      const cases = await db.select().from(schema.cases)
        .where(eq(schema.cases.organizationId, req.params.orgId))

      const enriched = projects.map((p: typeof schema.opsGroups.$inferSelect) => ({
        ...p,
        caseCount: cases.filter((c: typeof schema.cases.$inferSelect) => c.opsGroupId === p.id).length,
        activeCases: cases.filter((c: typeof schema.cases.$inferSelect) => c.opsGroupId === p.id && c.status !== "done").length,
      }))
      res.json(enriched)
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch projects" })
    }
  })

  router.get("/projects/:id", async (req, res) => {
    try {
      const [project] = await db.select().from(schema.opsGroups)
        .where(eq(schema.opsGroups.id, req.params.id))
      if (!project) { res.status(404).json({ error: "Not found" }); return }

      const cases = await db.select().from(schema.cases)
        .where(eq(schema.cases.opsGroupId, req.params.id))

      const documents = (await db.select().from(schema.documents)
        .where(eq(schema.documents.organizationId, project.organizationId)))
        .filter((document: typeof schema.documents.$inferSelect) => Array.isArray(document.tags) && document.tags.includes(`project:${project.id}`))

      const projectActivity = (await db.select().from(schema.activityEvents)
        .where(eq(schema.activityEvents.organizationId, project.organizationId)))
        .filter((event: typeof schema.activityEvents.$inferSelect) => event.entityType === "project" && event.entityId === project.id)
        .sort((a: typeof schema.activityEvents.$inferSelect, b: typeof schema.activityEvents.$inferSelect) =>
          String(b.createdAt).localeCompare(String(a.createdAt)),
        )

      const creationEvent = projectActivity.find((event: typeof schema.activityEvents.$inferSelect) => event.action === "project.created_from_instruction") ?? null
      const creationMetadata = creationEvent?.metadata && typeof creationEvent.metadata === "object" && !Array.isArray(creationEvent.metadata)
        ? (creationEvent.metadata as Record<string, unknown>)
        : {}
      const recommendedRoles = Array.isArray(creationMetadata.recommendedRoles)
        ? creationMetadata.recommendedRoles.filter((item: unknown): item is string => typeof item === "string")
        : []

      const goals = await db.select().from(schema.opsGoals)
        .where(eq(schema.opsGoals.opsGroupId, req.params.id))

      res.json({
        ...project,
        cases,
        documents,
        goals,
        recommendedRoles,
        sourceInstruction: typeof creationMetadata.instruction === "string" ? creationMetadata.instruction : null,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project" })
    }
  })

  router.post("/organizations/:orgId/projects", async (req, res) => {
    try {
      const [project] = await db.insert(schema.opsGroups).values({
        organizationId: req.params.orgId,
        name: req.body.name,
        description: req.body.description ?? null,
        color: req.body.color ?? null,
      }).returning()
      res.status(201).json(project)
    } catch (err) {
      res.status(500).json({ error: "Failed to create project" })
    }
  })

  router.post("/projects/from-instruction", async (req, res) => {
    try {
      const { organizationId, instruction, name, color } = req.body as {
        organizationId?: string
        instruction?: string
        name?: string
        color?: string
        origin?: string
        scenarioKey?: string
      }

      if (!organizationId || !instruction?.trim()) {
        res.status(400).json({ error: "organizationId and instruction are required" })
        return
      }

      const breakdown = createProjectBreakdown(instruction.trim())
      const [project] = await db.insert(schema.opsGroups).values({
        organizationId,
        name: name?.trim() || breakdown.projectName,
        description: breakdown.description,
        color: color ?? "#8b5cf6",
      }).returning()

      const createdCases = []
      for (const item of breakdown.cases) {
        const createdCase = await createCaseWithRetry(db, {
          organizationId,
          opsGroupId: project.id,
          title: item.title,
          description: item.description,
          type: item.type,
          severity: "normal",
          status: "todo",
          priority: 2,
          source: "manual",
          metadata: {
            caseKind: item.caseKind,
            generatedBy: "project-from-instruction",
            projectInstruction: instruction.trim(),
            origin: req.body.origin ?? null,
            scenarioKey: req.body.scenarioKey ?? null,
          } as Record<string, unknown>,
        })
        createdCases.push(createdCase)
      }

      const [brief] = await db.insert(schema.documents).values({
        organizationId,
        title: `${project.name} 브리프`,
        body: `# ${project.name}\n\n${instruction.trim()}\n\n## Suggested Roles\n- ${breakdown.recommendedRoles.join("\n- ")}`,
        category: "artifact",
        tags: [`project:${project.id}`, "artifact:project-brief"],
      }).returning()

      await db.insert(schema.activityEvents).values({
        organizationId,
        actorType: "user",
        actorId: "projects",
        action: "project.created_from_instruction",
        entityType: "project",
        entityId: project.id,
        entityTitle: project.name,
        metadata: {
          origin: req.body.origin ?? null,
          scenarioKey: req.body.scenarioKey ?? null,
          instruction: instruction.trim(),
          caseCount: createdCases.length,
          recommendedRoles: breakdown.recommendedRoles,
        } as Record<string, unknown>,
      })

      res.status(201).json({
        ...project,
        cases: createdCases,
        documents: [brief],
        recommendedRoles: breakdown.recommendedRoles,
      })
    } catch {
      res.status(500).json({ error: "Failed to create project from instruction" })
    }
  })

  return router
}
