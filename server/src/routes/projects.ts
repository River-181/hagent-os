// v0.3.0
import { Router } from "express"
import { and, eq, isNull } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { createCaseWithRetry } from "../lib/case-create.js"
import { enrichDocuments } from "../services/document-links.js"

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

function deriveProjectTrack(input: {
  name?: string | null
  description?: string | null
  sourceInstruction?: string | null
  scenarioKey?: string | null
}) {
  const name = String(input.name ?? "")
  const description = String(input.description ?? "")
  const sourceInstruction = String(input.sourceInstruction ?? "")
  const scenarioKey = String(input.scenarioKey ?? "")
  const normalized = `${name} ${description} ${sourceInstruction} ${scenarioKey}`.toLowerCase()

  if (normalized.includes("policy") || normalized.includes("정책") || normalized.includes("환불")) {
    return {
      key: "policy",
      label: "운영 정책 정비",
      summary: "환불·상담·보강 기준을 직원용 플레이북과 안내문으로 정리하는 운영 묶음",
    }
  }

  if (normalized.includes("promotion") || normalized.includes("프로모션") || normalized.includes("캠페인")) {
    return {
      key: "promotion",
      label: "프로모션 실행",
      summary: "학부모 안내, 메시지, 일정, 랜딩 카피를 묶어서 준비하는 마케팅 프로젝트",
    }
  }

  if (normalized.includes("민원") || normalized.includes("complaint")) {
    return {
      key: "complaint-ops",
      label: "민원 운영",
      summary: "민원 응답, 승인, 후속 조치를 한 흐름으로 관리하는 운영 묶음",
    }
  }

  return {
    key: "general",
    label: "일반 운영 프로젝트",
    summary: "기관 운영 과제를 케이스와 산출물로 묶어 실행하는 기본 프로젝트",
  }
}

export function projectRoutes(db: Db): Router {
  const router = Router()

  router.get("/organizations/:orgId/projects", async (req, res) => {
    try {
      const projects = await db.select().from(schema.opsGroups)
        .where(and(
          eq(schema.opsGroups.organizationId, req.params.orgId),
          isNull(schema.opsGroups.archivedAt),
        ))
      // Get case counts per project
      const cases = await db.select().from(schema.cases)
        .where(and(
          eq(schema.cases.organizationId, req.params.orgId),
          isNull(schema.cases.archivedAt),
        ))

      const enriched = projects.map((p: typeof schema.opsGroups.$inferSelect) => ({
        ...p,
        caseCount: cases.filter((c: typeof schema.cases.$inferSelect) => c.opsGroupId === p.id).length,
        activeCases: cases.filter((c: typeof schema.cases.$inferSelect) => c.opsGroupId === p.id && c.status !== "done").length,
        projectTrack: deriveProjectTrack({
          name: p.name,
          description: p.description,
        }),
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
      if (!project || project.archivedAt) { res.status(404).json({ error: "Not found" }); return }

      const cases = await db.select().from(schema.cases)
        .where(and(
          eq(schema.cases.opsGroupId, req.params.id),
          isNull(schema.cases.archivedAt),
        ))

      const documents = (await db.select().from(schema.documents)
        .where(eq(schema.documents.organizationId, project.organizationId)))
        .filter((document: typeof schema.documents.$inferSelect) => Array.isArray(document.tags) && document.tags.includes(`project:${project.id}`))
      const enrichedDocuments = enrichDocuments(documents, { cases, projects: [project] })

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
      const scenarioKey = typeof creationMetadata.scenarioKey === "string" ? creationMetadata.scenarioKey : null
      const sourceInstruction = typeof creationMetadata.instruction === "string" ? creationMetadata.instruction : null
      const projectTrack = deriveProjectTrack({
        name: project.name,
        description: project.description,
        sourceInstruction,
        scenarioKey,
      })

      const goals = await db.select().from(schema.opsGoals)
        .where(eq(schema.opsGoals.opsGroupId, req.params.id))

      res.json({
        ...project,
        cases,
        documents: enrichedDocuments,
        goals,
        recommendedRoles,
        sourceInstruction,
        scenarioKey,
        projectTrack,
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
        documents: enrichDocuments([brief], { cases: createdCases, projects: [project] }),
        recommendedRoles: breakdown.recommendedRoles,
      })
    } catch {
      res.status(500).json({ error: "Failed to create project from instruction" })
    }
  })

  router.post("/projects/:id/archive", async (req, res) => {
    try {
      const [project] = await db
        .select()
        .from(schema.opsGroups)
        .where(eq(schema.opsGroups.id, req.params.id))

      if (!project) {
        res.status(404).json({ error: "Project not found" })
        return
      }

      if (project.archivedAt) {
        res.status(204).end()
        return
      }

      const archivedAt = new Date()
      await db
        .update(schema.opsGroups)
        .set({
          archivedAt,
          updatedAt: archivedAt,
        })
        .where(eq(schema.opsGroups.id, project.id))

      await db.insert(schema.activityEvents).values({
        organizationId: project.organizationId,
        actorType: "user",
        actorId: "projects",
        action: "project.archived",
        entityType: "project",
        entityId: project.id,
        entityTitle: project.name,
        metadata: {
          archivedAt: archivedAt.toISOString(),
        } as Record<string, unknown>,
      })

      res.status(204).end()
    } catch {
      res.status(500).json({ error: "Failed to archive project" })
    }
  })

  router.delete("/projects/:id", async (req, res) => {
    try {
      const [project] = await db
        .select()
        .from(schema.opsGroups)
        .where(eq(schema.opsGroups.id, req.params.id))

      if (!project) {
        res.status(404).json({ error: "Project not found" })
        return
      }

      const cases = await db
        .select({ id: schema.cases.id })
        .from(schema.cases)
        .where(and(
          eq(schema.cases.opsGroupId, project.id),
          isNull(schema.cases.archivedAt),
        ))

      const goals = await db
        .select({ id: schema.opsGoals.id })
        .from(schema.opsGoals)
        .where(eq(schema.opsGoals.opsGroupId, project.id))

      const taggedDocuments = (await db
        .select({ id: schema.documents.id, tags: schema.documents.tags })
        .from(schema.documents)
        .where(eq(schema.documents.organizationId, project.organizationId)))
        .filter((document) => Array.isArray(document.tags) && document.tags.includes(`project:${project.id}`))

      if (cases.length > 0 || goals.length > 0 || taggedDocuments.length > 0) {
        res.status(409).json({
          error: "프로젝트에 연결된 케이스, 목표, 문서가 있어 삭제할 수 없습니다. 먼저 숨기거나 연결을 정리하세요.",
          linked: {
            cases: cases.length,
            goals: goals.length,
            documents: taggedDocuments.length,
          },
        })
        return
      }

      await db.insert(schema.activityEvents).values({
        organizationId: project.organizationId,
        actorType: "user",
        actorId: "projects",
        action: "project.deleted",
        entityType: "project",
        entityId: project.id,
        entityTitle: project.name,
        metadata: {} as Record<string, unknown>,
      })

      await db
        .delete(schema.opsGroups)
        .where(eq(schema.opsGroups.id, project.id))

      res.status(204).end()
    } catch {
      res.status(500).json({ error: "Failed to delete project" })
    }
  })

  return router
}
