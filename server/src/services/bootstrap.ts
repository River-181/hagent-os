import { eq } from "drizzle-orm"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { z } from "zod"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { dispatchInstruction } from "./orchestration.js"
import { installSkillForOrganization, updateAgentSkillMounts } from "./skills.js"

const AGENT_DATA_DIR = path.join(import.meta.dirname, "../../data/agents")

const bootstrapSchema = z.object({
  institutionName: z.string().min(2),
  institutionType: z.string().min(2),
  institutionSize: z.string().min(1),
  topGoal: z.string().min(2),
  description: z.string().optional(),
  principalName: z.string().min(1).default("원장"),
  starterProjectName: z.string().min(2).default("운영 시작"),
  starterTeamPreset: z.string().min(2).default("academy-core"),
  initialInstruction: z.string().min(2).default("오늘 민원 처리하고 이번 주 이탈 위험 학생 알려줘"),
  selectedAdapterType: z.enum(["codex_local", "claude_local", "mock_local"]).default("codex_local"),
  selectedModel: z.string().min(2).default("gpt-5-codex"),
})

const STARTER_SKILLS: Record<string, string[]> = {
  orchestrator: ["complaint-classifier", "schedule-manager", "student-data-import"],
  complaint: ["complaint-classifier", "korean-tone-guide", "message-template-pack"],
  retention: ["churn-risk-calculator", "student-360-view", "korean-tone-guide"],
  scheduler: ["google-calendar-mcp", "schedule-manager", "schedule-optimizer"],
}

function slugify(input: string) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || `org-${Date.now()}`
  )
}

function buildInstructionFile(name: string, agentType: string, topGoal: string) {
  return {
    soul: `# ${name}\n\n${topGoal}를 중심으로 학원 운영을 조율하는 ${agentType} 에이전트입니다.\n`,
    agents: `# AGENTS\n\n- 역할: ${agentType}\n- 최우선 목표: ${topGoal}\n- 학생/학부모/강사 맥락을 함께 본다.\n`,
    heartbeat: `# HEARTBEAT\n\n- 매일 오전 07:00 기본 브리핑\n- 대기 케이스와 승인 요청을 먼저 확인\n`,
    tools: `# TOOLS\n\n- mounted skills\n- organization data\n- case/activity/approval context\n`,
  }
}

function writeAgentInstructionFiles(agentId: string, name: string, agentType: string, topGoal: string) {
  const dir = path.join(AGENT_DATA_DIR, agentId, "instructions")
  mkdirSync(dir, { recursive: true })
  const files = buildInstructionFile(name, agentType, topGoal)
  writeFileSync(path.join(dir, "SOUL.md"), files.soul, "utf8")
  writeFileSync(path.join(dir, "AGENTS.md"), files.agents, "utf8")
  writeFileSync(path.join(dir, "HEARTBEAT.md"), files.heartbeat, "utf8")
  writeFileSync(path.join(dir, "TOOLS.md"), files.tools, "utf8")
}

async function deleteOrganizationCascade(db: Db, organizationId: string) {
  const orgAgents = await db
    .select({ id: schema.agents.id })
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))
  await db.delete(schema.activityEvents).where(eq(schema.activityEvents.organizationId, organizationId))
  await db.delete(schema.notifications).where(eq(schema.notifications.organizationId, organizationId))
  await db.delete(schema.approvals).where(eq(schema.approvals.organizationId, organizationId))
  await db.delete(schema.wakeupRequests).where(eq(schema.wakeupRequests.organizationId, organizationId))
  await db.delete(schema.agentRuns).where(eq(schema.agentRuns.organizationId, organizationId))
  const orgCases = await db.select({ id: schema.cases.id }).from(schema.cases).where(eq(schema.cases.organizationId, organizationId))
  for (const item of orgCases) {
    await db.delete(schema.caseComments).where(eq(schema.caseComments.caseId, item.id))
  }
  await db.delete(schema.cases).where(eq(schema.cases.organizationId, organizationId))
  await db.delete(schema.attendance).where(eq(schema.attendance.organizationId, organizationId))
  await db.delete(schema.studentSchedules).where(eq(schema.studentSchedules.organizationId, organizationId))
  await db.delete(schema.schedules).where(eq(schema.schedules.organizationId, organizationId))
  await db.delete(schema.parents).where(eq(schema.parents.organizationId, organizationId))
  await db.delete(schema.students).where(eq(schema.students.organizationId, organizationId))
  await db.delete(schema.instructors).where(eq(schema.instructors.organizationId, organizationId))
  await db.delete(schema.opsGoals).where(eq(schema.opsGoals.organizationId, organizationId))
  await db.delete(schema.opsGroups).where(eq(schema.opsGroups.organizationId, organizationId))
  await db.delete(schema.routines).where(eq(schema.routines.organizationId, organizationId))
  await db.delete(schema.documents).where(eq(schema.documents.organizationId, organizationId))
  for (const agent of orgAgents) {
    await db.delete(schema.agentSkills).where(eq(schema.agentSkills.agentId, agent.id))
  }
  await db.delete(schema.agents).where(eq(schema.agents.organizationId, organizationId))
  await db.delete(schema.organizationSkills).where(eq(schema.organizationSkills.organizationId, organizationId))
  await db.delete(schema.organizations).where(eq(schema.organizations.id, organizationId))
}

export async function bootstrapOrganization(db: Db, payload: unknown) {
  const input = bootstrapSchema.parse(payload)
  const prefix = slugify(input.institutionName)

  const [existing] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.prefix, prefix))

  if (existing) {
    throw new Error("같은 prefix를 가진 기관이 이미 존재합니다.")
  }

  let organizationId: string | null = null

  try {
    const [organization] = await db
      .insert(schema.organizations)
      .values({
        name: input.institutionName,
        prefix,
        description: input.description ?? `${input.institutionType} · ${input.institutionSize} · ${input.topGoal}`,
        agentTeamConfig: {
          bootstrap: {
            status: "completed",
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            starterTeamPreset: input.starterTeamPreset,
            selectedAdapterType: input.selectedAdapterType,
            selectedModel: input.selectedModel,
          },
        } as Record<string, unknown>,
      })
      .returning()

    organizationId = organization.id

    const [starterProject] = await db
      .insert(schema.opsGroups)
      .values({
        organizationId: organization.id,
        name: input.starterProjectName,
        description: `${input.topGoal}를 중심으로 starter workflow를 묶는 기본 프로젝트`,
        color: "#14b8a6",
      })
      .returning()

    await db.insert(schema.opsGoals).values({
      organizationId: organization.id,
      opsGroupId: starterProject.id,
      title: input.topGoal,
      description: `${input.institutionType} 기관의 핵심 목표`,
      status: "active",
    })

    const [instructor] = await db
      .insert(schema.instructors)
      .values({
        organizationId: organization.id,
        name: "기본 강사",
        subject: `${input.institutionType} 운영`,
        status: "active",
      })
      .returning()

    const [student] = await db
      .insert(schema.students)
      .values({
        organizationId: organization.id,
        name: "김하늘",
        grade: "중2",
        classGroup: "기본반",
        enrolledAt: new Date().toISOString().split("T")[0],
        riskScore: 0.68,
        status: "active",
      })
      .returning()

    const [parent] = await db
      .insert(schema.parents)
      .values({
        organizationId: organization.id,
        studentId: student.id,
        name: "김하늘 보호자",
        relation: "모",
        phone: "010-1234-5678",
        email: "guardian@example.com",
      })
      .returning()

    const [schedule] = await db
      .insert(schema.schedules)
      .values({
        organizationId: organization.id,
        instructorId: instructor.id,
        title: "기본 수업 시간표",
        type: "regular",
        dayOfWeek: 2,
        startTime: "18:00",
        endTime: "19:30",
        room: "A101",
      })
      .returning()

    await db.insert(schema.studentSchedules).values({
      organizationId: organization.id,
      studentId: student.id,
      scheduleId: schedule.id,
    })

    await db.insert(schema.attendance).values([
      {
        organizationId: organization.id,
        studentId: student.id,
        scheduleId: schedule.id,
        date: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        status: "absent",
        note: "상담 필요",
      },
      {
        organizationId: organization.id,
        studentId: student.id,
        scheduleId: schedule.id,
        date: new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0],
        status: "late",
        note: "10분 지각",
      },
    ])

    const starterAgents = [
      {
        name: input.principalName,
        slug: "orchestrator",
        agentType: "orchestrator" as const,
        icon: "brain",
        systemPrompt: `${organization.name}의 원장으로서 학원 운영 전반을 조율합니다.`,
      },
      {
        name: "민원담당",
        slug: "complaint",
        agentType: "complaint" as const,
        icon: "shield",
        systemPrompt: `${organization.name}의 민원과 학부모 응대를 담당합니다.`,
      },
      {
        name: "이탈방어",
        slug: "retention",
        agentType: "retention" as const,
        icon: "heart",
        systemPrompt: `${organization.name}의 재원 유지와 이탈 감지를 담당합니다.`,
      },
      {
        name: "스케줄러",
        slug: "scheduler",
        agentType: "scheduler" as const,
        icon: "calendar",
        systemPrompt: `${organization.name}의 보강, 상담, 대체수업 일정을 담당합니다.`,
      },
    ]

    const createdAgents = []
    let reportsTo: string | null = null

    for (const definition of starterAgents) {
      const [agent]: Array<typeof schema.agents.$inferSelect> = await db
        .insert(schema.agents)
        .values({
          organizationId: organization.id,
          name: definition.name,
          slug: definition.slug,
          agentType: definition.agentType,
          status: "idle",
          systemPrompt: definition.systemPrompt,
          icon: definition.icon,
          adapterType: input.selectedAdapterType,
          adapterConfig: {
            model: input.selectedModel,
            autoRun: true,
          } as Record<string, unknown>,
          reportsTo,
        })
        .returning()

      if (!reportsTo) reportsTo = agent.id
      createdAgents.push(agent)
      writeAgentInstructionFiles(agent.id, agent.name, agent.agentType, input.topGoal)

      await db.insert(schema.activityEvents).values({
        organizationId: organization.id,
        actorType: "system",
        actorId: "bootstrap",
        action: "agent.created",
        entityType: "agent",
        entityId: agent.id,
        entityTitle: agent.name,
        metadata: {
          agentType: agent.agentType,
          adapterType: agent.adapterType,
        } as Record<string, unknown>,
      })
    }

    const starterCases = [
      {
        title: "학부모 민원 초안 검토",
        description: `${parent.name}가 수업 만족도와 보강 가능 여부를 문의했습니다.`,
        type: "complaint" as const,
        studentId: student.id,
        reporterId: `parent:${parent.id}`,
        assigneeAgentId: createdAgents.find((agent) => agent.agentType === "complaint")?.id ?? null,
      },
      {
        title: "재원 유지 위험 학생 점검",
        description: `${student.name} 학생의 최근 결석/지각 패턴을 점검하고 개입 방안을 제안하세요.`,
        type: "churn" as const,
        studentId: student.id,
        reporterId: "system:bootstrap",
        assigneeAgentId: createdAgents.find((agent) => agent.agentType === "retention")?.id ?? null,
      },
      {
        title: "상담 일정 생성",
        description: `${student.name} 보호자 상담 일정을 다음 주로 제안하고 캘린더 반영 준비를 하세요.`,
        type: "schedule" as const,
        studentId: student.id,
        reporterId: `parent:${parent.id}`,
        assigneeAgentId: createdAgents.find((agent) => agent.agentType === "scheduler")?.id ?? null,
      },
    ]

    const createdCases = []
    for (const [index, definition] of starterCases.entries()) {
      const [caseRecord] = await db
        .insert(schema.cases)
        .values({
          organizationId: organization.id,
          opsGroupId: starterProject.id,
          identifier: `C-${String(index + 1).padStart(3, "0")}`,
          title: definition.title,
          description: definition.description,
          type: definition.type,
          severity: index === 0 ? "same_day" : "normal",
          status: "todo",
          priority: index === 0 ? 1 : 2,
          reporterId: definition.reporterId,
          studentId: definition.studentId,
          assigneeAgentId: definition.assigneeAgentId,
          source: index === 0 ? "kakao" : "manual",
          metadata: {
            bootstrap: true,
          } as Record<string, unknown>,
        })
        .returning()
      createdCases.push(caseRecord)
      await db.insert(schema.activityEvents).values({
        organizationId: organization.id,
        actorType: "system",
        actorId: "bootstrap",
        action: "case.created",
        entityType: "case",
        entityId: caseRecord.id,
        entityTitle: caseRecord.title,
        metadata: {
          caseType: caseRecord.type,
        } as Record<string, unknown>,
      })
    }

    const installedSkills = []
    for (const slug of Array.from(new Set(Object.values(STARTER_SKILLS).flat()))) {
      const result = await installSkillForOrganization(db, organization.id, slug).catch(() => null)
      if (result) {
        installedSkills.push({ slug, ...result })
        await db.insert(schema.activityEvents).values({
          organizationId: organization.id,
          actorType: "system",
          actorId: "bootstrap",
          action: "skill.installed",
          entityType: "organization",
          entityId: organization.id,
          entityTitle: organization.name,
          metadata: { slug } as Record<string, unknown>,
        })
      }
    }

    const mountedSkills = []
    for (const agent of createdAgents) {
      const skillSlugs = STARTER_SKILLS[agent.slug] ?? []
      const updated = await updateAgentSkillMounts(
        db,
        agent.id,
        skillSlugs.map((slug, index) => ({
          slug,
          enabled: true,
          mountOrder: index,
        })),
      ).catch(() => null)

      if (updated) {
        mountedSkills.push({
          agentId: agent.id,
          agentName: agent.name,
          slugs: skillSlugs,
        })
      }
    }

    const launch = await dispatchInstruction(db, {
      organizationId: organization.id,
      instruction: input.initialInstruction,
      preferredProjectId: starterProject.id,
    })

    await db.insert(schema.activityEvents).values({
      organizationId: organization.id,
      actorType: "system",
      actorId: "bootstrap",
      action: "organization.bootstrapped",
      entityType: "organization",
      entityId: organization.id,
      entityTitle: organization.name,
      metadata: {
        selectedAdapterType: input.selectedAdapterType,
        selectedModel: input.selectedModel,
      } as Record<string, unknown>,
    })

    return {
      organization,
      agents: createdAgents,
      project: starterProject,
      cases: createdCases,
      installedSkills,
      mountedSkills,
      launch,
      preview: {
        student,
        parent,
        instructor,
        schedule,
      },
    }
  } catch (error) {
    if (organizationId) {
      await deleteOrganizationCascade(db, organizationId).catch(() => undefined)
    }
    throw error
  }
}
