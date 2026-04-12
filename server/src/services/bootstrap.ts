import { eq } from "drizzle-orm"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { z } from "zod"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { dispatchInstruction } from "./orchestration.js"
import { installSkillForOrganization, updateAgentSkillMounts } from "./skills.js"
import { createCaseWithRetry } from "../lib/case-create.js"
import { TANZANIA_PRESET } from "../data/tanzania-preset.js"

const AGENT_DATA_DIR = path.join(import.meta.dirname, "../../data/agents")

const channelBindingSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().optional(),
  botId: z.string().optional(),
  searchId: z.string().optional(),
  displayName: z.string().optional(),
  channelUrl: z.string().optional(),
  chatUrl: z.string().optional(),
  inboundPurpose: z.string().optional(),
  routingPriority: z.number().int().min(1).max(5).default(3),
  webhookSecret: z.string().optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
  phoneNumber: z.string().optional(),
})

const selectedAgentSchema = z.object({
  role: z.string().min(2),
  name: z.string().min(1),
  adapterType: z.enum(["codex_local", "claude_local", "mock_local"]).optional(),
  model: z.string().optional(),
  persona: z.string().optional(),
  mountedSkills: z.array(z.string()).optional(),
  allowedChannels: z.array(z.string()).optional(),
  autoRun: z.boolean().optional(),
})

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
  mode: z.enum(["scratch", "demo"]).default("scratch"),
  setupProjectName: z.string().min(2).default("Academy Setup"),
  channels: z
    .object({
      kakao: channelBindingSchema.optional(),
      telegram: channelBindingSchema.optional(),
      sms: channelBindingSchema.optional(),
      naver: channelBindingSchema.optional(),
    })
    .default({}),
  dataImports: z
    .object({
      students: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
      parents: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
      instructors: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
      schedules: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
  policyInputs: z
    .object({
      counselingPolicy: z.string().optional(),
      refundPolicy: z.string().optional(),
      attendancePolicy: z.string().optional(),
      faqNotes: z.string().optional(),
    })
    .default({}),
  selectedAgents: z.array(selectedAgentSchema).default([]),
})

const STARTER_SKILLS: Record<string, string[]> = {
  orchestrator: ["complaint-classifier", "schedule-manager", "student-data-import"],
  complaint: ["complaint-classifier", "korean-tone-guide", "message-template-pack"],
  retention: ["churn-risk-calculator", "student-360-view", "korean-tone-guide"],
  scheduler: ["google-calendar-mcp", "schedule-manager", "schedule-optimizer"],
}

const ROLE_PRESETS: Record<
  string,
  {
    slug: string
    agentType: "orchestrator" | "complaint" | "retention" | "scheduler" | "intake" | "staff" | "compliance" | "notification"
    icon: string
    defaultName: string
    systemPrompt: (orgName: string, topGoal: string) => string
    skillSlugs: string[]
  }
> = {
  orchestrator: {
    slug: "orchestrator",
    agentType: "orchestrator",
    icon: "brain",
    defaultName: "원장 오케스트레이터",
    systemPrompt: (orgName, topGoal) => `${orgName}의 운영 전반을 조율하고 ${topGoal}를 우선순위로 실행합니다.`,
    skillSlugs: ["complaint-classifier", "schedule-manager", "student-data-import"],
  },
  complaint: {
    slug: "complaint",
    agentType: "complaint",
    icon: "shield",
    defaultName: "민원 담당",
    systemPrompt: (orgName) => `${orgName}의 민원, 환불, 민감한 학부모 응대를 담당합니다.`,
    skillSlugs: ["complaint-classifier", "korean-tone-guide", "message-template-pack"],
  },
  counseling: {
    slug: "counseling",
    agentType: "complaint",
    icon: "message-square",
    defaultName: "상담 코디네이터",
    systemPrompt: (orgName) => `${orgName}의 상담 문의를 분류하고 답변/상담 예약까지 이어갑니다.`,
    skillSlugs: ["korean-tone-guide", "message-template-pack", "student-360-view"],
  },
  retention: {
    slug: "retention",
    agentType: "retention",
    icon: "heart",
    defaultName: "재등록 분석가",
    systemPrompt: (orgName) => `${orgName}의 이탈 위험 학생을 탐지하고 재등록 개입안을 제안합니다.`,
    skillSlugs: ["churn-risk-calculator", "student-360-view", "korean-tone-guide"],
  },
  operations: {
    slug: "operations",
    agentType: "notification",
    icon: "bell",
    defaultName: "출결·결제 운영자",
    systemPrompt: (orgName) => `${orgName}의 출결, 결제, 공지 후속 작업을 관리합니다.`,
    skillSlugs: ["message-template-pack", "student-data-import"],
  },
  scheduler: {
    slug: "scheduler",
    agentType: "scheduler",
    icon: "calendar",
    defaultName: "스케줄러",
    systemPrompt: (orgName) => `${orgName}의 보강, 상담, 대체수업, 캘린더 동기화를 담당합니다.`,
    skillSlugs: ["google-calendar-mcp", "schedule-manager", "schedule-optimizer"],
  },
  marketing: {
    slug: "marketing",
    agentType: "staff",
    icon: "megaphone",
    defaultName: "프로모션 담당",
    systemPrompt: (orgName) => `${orgName}의 프로모션, 안내문, 메시지 초안을 제작합니다.`,
    skillSlugs: ["message-template-pack", "korean-tone-guide"],
  },
}

function resolveChannelConfig(input: z.infer<typeof bootstrapSchema>) {
  const integrations = {
    channels: {
      kakao: {
        key: "kakao",
        connected: Boolean(input.channels.kakao?.enabled && (input.channels.kakao?.channelId || input.channels.kakao?.botId)),
        readiness:
          input.channels.kakao?.enabled
            ? (input.channels.kakao?.channelId || input.channels.kakao?.botId)
              ? "connected"
              : "missing_credentials"
            : "inactive",
        ...input.channels.kakao,
      },
      telegram: {
        key: "telegram",
        connected: Boolean(input.channels.telegram?.enabled && input.channels.telegram?.botToken),
        readiness:
          input.channels.telegram?.enabled
            ? input.channels.telegram?.botToken
              ? "connected"
              : "missing_credentials"
            : "inactive",
        ...input.channels.telegram,
      },
      sms: {
        key: "sms",
        connected: false,
        readiness: input.channels.sms?.enabled ? "missing_credentials" : "inactive",
        ...input.channels.sms,
      },
      naver: {
        key: "naver",
        connected: false,
        readiness: input.channels.naver?.enabled ? "missing_credentials" : "inactive",
        ...input.channels.naver,
      },
    },
  }

  return integrations
}

function buildSelectedAgentDefinitions(input: z.infer<typeof bootstrapSchema>, organizationName: string) {
  const selected = input.selectedAgents.length > 0
    ? input.selectedAgents
    : [
        { role: "orchestrator", name: input.principalName, mountedSkills: ROLE_PRESETS.orchestrator.skillSlugs },
        { role: "complaint", name: "민원담당", mountedSkills: ROLE_PRESETS.complaint.skillSlugs },
        { role: "retention", name: "이탈방어", mountedSkills: ROLE_PRESETS.retention.skillSlugs },
        { role: "scheduler", name: "스케줄러", mountedSkills: ROLE_PRESETS.scheduler.skillSlugs },
      ]

  return selected.map((agent) => {
    const preset = ROLE_PRESETS[agent.role] ?? ROLE_PRESETS.complaint
    return {
      name: agent.name || preset.defaultName,
      slug: preset.slug,
      agentType: preset.agentType,
      icon: preset.icon,
      systemPrompt: agent.persona || preset.systemPrompt(organizationName, input.topGoal),
      adapterType: agent.adapterType ?? input.selectedAdapterType,
      adapterModel: agent.model ?? input.selectedModel,
      mountedSkills: agent.mountedSkills?.length ? agent.mountedSkills : preset.skillSlugs,
      allowedChannels: agent.allowedChannels ?? [],
      autoRun: agent.autoRun ?? true,
      role: agent.role,
    }
  })
}

function buildSetupCases(input: z.infer<typeof bootstrapSchema>, projectId: string, studentId: string, parentId: string, agents: Array<{ id: string; slug: string }>) {
  const complaintAgentId = agents.find((agent) => agent.slug === "complaint" || agent.slug === "counseling")?.id ?? null
  const retentionAgentId = agents.find((agent) => agent.slug === "retention")?.id ?? null
  const schedulerAgentId = agents.find((agent) => agent.slug === "scheduler")?.id ?? null
  const orchestratorAgentId = agents.find((agent) => agent.slug === "orchestrator")?.id ?? null

  return [
    {
      title: "채널 연결 점검",
      description: "Kakao/Telegram 인바운드 설정과 라우팅 우선순위를 검증합니다.",
      type: "inquiry" as const,
      assigneeAgentId: orchestratorAgentId,
      reporterId: "system:bootstrap",
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "channels",
      } as Record<string, unknown>,
    },
    {
      title: "학생 데이터 검증",
      description: `${input.institutionName}의 학생/학부모 데이터 연결 상태를 확인하고 누락 필드를 정리합니다.`,
      type: "inquiry" as const,
      assigneeAgentId: complaintAgentId,
      reporterId: "system:bootstrap",
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "students",
      } as Record<string, unknown>,
    },
    {
      title: "강사 데이터 및 스케줄 검증",
      description: "강사 역할, 수업 시간표, 보강 가능 슬롯을 점검합니다.",
      type: "schedule" as const,
      assigneeAgentId: schedulerAgentId,
      reporterId: "system:bootstrap",
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "schedule",
      } as Record<string, unknown>,
    },
    {
      title: "운영 정책 문서화",
      description: "상담/환불/출결 정책을 문서와 답변 톤 가이드로 정리합니다.",
      type: "complaint" as const,
      assigneeAgentId: complaintAgentId,
      reporterId: `parent:${parentId}`,
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "policy",
      } as Record<string, unknown>,
    },
    {
      title: "에이전트 역할 검수",
      description: "초기 고용한 에이전트들의 역할, 채널 접근권한, mounted skills를 검수합니다.",
      type: "churn" as const,
      assigneeAgentId: retentionAgentId,
      reporterId: "system:bootstrap",
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "team",
      } as Record<string, unknown>,
    },
    {
      title: "학부모 민원 초안 검토",
      description: `${input.institutionName}의 학부모 민원 응답 흐름을 데모용으로 준비합니다.`,
      type: "complaint" as const,
      assigneeAgentId: complaintAgentId,
      reporterId: `parent:${parentId}`,
      studentId,
      source: input.channels.kakao?.enabled ? "kakao" : "manual",
      metadata: {
        caseKind: "complaint",
        bootstrap: true,
        setupTask: "demo-complaint",
      } as Record<string, unknown>,
    },
  ].map((item) => ({
    ...item,
    opsGroupId: projectId,
  }))
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
            status: "pending",
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            starterTeamPreset: input.starterTeamPreset,
            selectedAdapterType: input.selectedAdapterType,
            selectedModel: input.selectedModel,
            setupProjectName: input.setupProjectName,
          },
          general: {
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            principalName: input.principalName,
            description: input.description ?? null,
          },
          aiPolicy: {
            primaryAdapterType: input.selectedAdapterType,
            primaryModel: input.selectedModel,
            fallbackAdapterType: "claude_local",
            autoRun: true,
            allowDegradedMode: true,
          },
          integrations: resolveChannelConfig(input),
          instance: {
            mode: "local_trusted",
          },
          dataImports: input.dataImports,
          hiringPlan: {
            selectedAgents: input.selectedAgents,
          },
          presetMode: input.mode,
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

    const [setupProject] = await db
      .insert(schema.opsGroups)
      .values({
        organizationId: organization.id,
        name: input.setupProjectName,
        description: `${input.institutionName}의 채널, 데이터, 정책, 에이전트 구성 세팅 프로젝트`,
        color: "#0f766e",
      })
      .returning()

    await db.insert(schema.opsGoals).values({
      organizationId: organization.id,
      opsGroupId: starterProject.id,
      title: input.topGoal,
      description: `${input.institutionType} 기관의 핵심 목표`,
      status: "active",
    })

    const instructorSeeds = input.mode === "demo"
      ? TANZANIA_PRESET.instructors
      : [{ name: "기본 강사", subject: `${input.institutionType} 운영`, phone: "010-1234-1000" }]

    const createdInstructors = []
    for (const item of instructorSeeds) {
      const [createdInstructor] = await db
        .insert(schema.instructors)
        .values({
          organizationId: organization.id,
          name: item.name,
          subject: item.subject,
          status: "active",
          phone: item.phone,
        })
        .returning()
      createdInstructors.push(createdInstructor)
    }
    const instructor = createdInstructors[0]

    const studentSeeds = input.mode === "demo"
      ? TANZANIA_PRESET.students
      : [
          {
            name: "김하늘",
            grade: "중2",
            classGroup: "기본반",
            riskScore: 0.68,
            parent: {
              name: "김하늘 보호자",
              relation: "모",
              phone: "010-1234-5678",
              email: "guardian@example.com",
            },
          },
        ]

    const createdStudents = []
    const createdParents = []
    for (const item of studentSeeds) {
      const [createdStudent] = await db
        .insert(schema.students)
        .values({
          organizationId: organization.id,
          name: item.name,
          grade: item.grade,
          classGroup: item.classGroup,
          enrolledAt: new Date().toISOString().split("T")[0],
          riskScore: item.riskScore,
          status: "active",
        })
        .returning()
      createdStudents.push(createdStudent)

      const [createdParent] = await db
        .insert(schema.parents)
        .values({
          organizationId: organization.id,
          studentId: createdStudent.id,
          name: item.parent.name,
          relation: item.parent.relation,
          phone: item.parent.phone,
          email: item.parent.email,
        })
        .returning()
      createdParents.push(createdParent)
    }
    const student = createdStudents[0]
    const parent = createdParents[0]

    const scheduleSeeds = input.mode === "demo"
      ? TANZANIA_PRESET.schedules
      : [{ title: "기본 수업 시간표", type: "regular", dayOfWeek: 2, startTime: "18:00", endTime: "19:30", room: "A101" }]

    const createdSchedules = []
    for (const [index, item] of scheduleSeeds.entries()) {
      const [createdSchedule] = await db
        .insert(schema.schedules)
        .values({
          organizationId: organization.id,
          instructorId: createdInstructors[index % createdInstructors.length]?.id ?? instructor.id,
          title: item.title,
          type: item.type,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          room: item.room,
        })
        .returning()
      createdSchedules.push(createdSchedule)
    }
    const schedule = createdSchedules[0]

    const scheduleByTitle = new Map(createdSchedules.map((item) => [item.title, item]))
    const studentByName = new Map(createdStudents.map((item) => [item.name, item]))

    for (const createdStudent of createdStudents) {
      const presetStudent = input.mode === "demo"
        ? TANZANIA_PRESET.students.find((item) => item.name === createdStudent.name)
        : null
      const linkedSchedules = presetStudent?.scheduleTitles?.length
        ? presetStudent.scheduleTitles
            .map((title) => scheduleByTitle.get(title))
            .filter(Boolean)
        : [createdSchedules[Math.floor(Math.random() * createdSchedules.length)] ?? schedule]

      for (const linkedSchedule of linkedSchedules) {
        await db.insert(schema.studentSchedules).values({
          organizationId: organization.id,
          studentId: createdStudent.id,
          scheduleId: linkedSchedule!.id,
        })
      }
    }

    if (input.mode === "demo") {
      await db.insert(schema.attendance).values(
        TANZANIA_PRESET.attendanceRecords.flatMap((record) => {
          const targetStudent = studentByName.get(record.studentName)
          const targetSchedule = scheduleByTitle.get(record.scheduleTitle)
          if (!targetStudent || !targetSchedule) return []

          return [{
            organizationId: organization.id,
            studentId: targetStudent.id,
            scheduleId: targetSchedule.id,
            date: new Date(Date.now() - record.daysAgo * 86400000).toISOString().split("T")[0],
            status: record.status,
            note: record.note ?? null,
          }]
        }),
      )
    } else {
      await db.insert(schema.attendance).values(
        createdStudents.slice(0, 3).flatMap((createdStudent, index) => [
          {
            organizationId: organization.id,
            studentId: createdStudent.id,
            scheduleId: createdSchedules[index % createdSchedules.length]?.id ?? schedule.id,
            date: new Date(Date.now() - (7 + index) * 86400000).toISOString().split("T")[0],
            status: "absent",
            note: "상담 필요",
          },
          {
            organizationId: organization.id,
            studentId: createdStudent.id,
            scheduleId: createdSchedules[index % createdSchedules.length]?.id ?? schedule.id,
            date: new Date(Date.now() - (14 + index) * 86400000).toISOString().split("T")[0],
            status: "late",
            note: "10분 지각",
          },
        ]),
      )
    }

    const starterAgents = buildSelectedAgentDefinitions(input, organization.name)

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
          adapterType: definition.adapterType,
          adapterConfig: {
            model: definition.adapterModel,
            autoRun: definition.autoRun,
            allowedChannels: definition.allowedChannels,
            role: definition.role,
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
          role: definition.role,
        } as Record<string, unknown>,
      })
    }

    const createdCases = []
    const starterCases = buildSetupCases(
      input,
      setupProject.id,
      student.id,
      parent.id,
      createdAgents.map((agent) => ({ id: agent.id, slug: agent.slug })),
    )

    for (const [index, definition] of starterCases.entries()) {
      const caseRecord = await createCaseWithRetry(db, {
        organizationId: organization.id,
        opsGroupId: definition.opsGroupId,
        title: definition.title,
        description: definition.description,
        type: definition.type,
        severity: index === 5 ? "same_day" : "normal",
        status: "todo",
        priority: index === 5 ? 1 : 2,
        reporterId: definition.reporterId,
        studentId: definition.studentId,
        assigneeAgentId: definition.assigneeAgentId,
        source: definition.source,
        metadata: definition.metadata,
      })
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
    for (const slug of Array.from(new Set(createdAgents.flatMap((agent) => {
      const definition = starterAgents.find((item) => item.slug === agent.slug)
      return definition?.mountedSkills ?? STARTER_SKILLS[agent.slug] ?? []
    })))) {
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
      const skillSlugs = starterAgents.find((item) => item.slug === agent.slug)?.mountedSkills ?? STARTER_SKILLS[agent.slug] ?? []
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

    const [updatedOrganization] = await db
      .update(schema.organizations)
      .set({
        agentTeamConfig: {
          ...(organization.agentTeamConfig as Record<string, unknown>),
          bootstrap: {
            status: "completed",
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            starterTeamPreset: input.starterTeamPreset,
            selectedAdapterType: input.selectedAdapterType,
            selectedModel: input.selectedModel,
            setupProjectName: input.setupProjectName,
          },
          setupProject: {
            id: setupProject.id,
            name: setupProject.name,
          },
        } as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, organization.id))
      .returning()

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
        presetMode: input.mode,
      } as Record<string, unknown>,
    })

    const setupDocuments = []
    const documentSeeds = [
      {
        title: "상담 정책",
        body: `# 상담 정책\n\n${input.policyInputs.counselingPolicy ?? "상담 예약은 최소 하루 전 확인합니다."}`,
        category: "policy",
      },
      {
        title: "환불 정책",
        body: `# 환불 정책\n\n${input.policyInputs.refundPolicy ?? "수강 시작 후 환불은 등록 약관에 따라 처리합니다."}`,
        category: "policy",
      },
      {
        title: "출결 정책",
        body: `# 출결 정책\n\n${input.policyInputs.attendancePolicy ?? "결석·지각은 주간 리포트와 상담 후속조치로 연결합니다."}`,
        category: "policy",
      },
    ]
    for (const documentSeed of documentSeeds) {
      const [document] = await db
        .insert(schema.documents)
        .values({
          organizationId: organization.id,
          title: documentSeed.title,
          body: documentSeed.body,
          category: documentSeed.category,
          tags: [`project:${setupProject.id}`, "artifact:setup-policy"],
        })
        .returning()
      setupDocuments.push(document)
    }

    return {
      organization: updatedOrganization,
      agents: createdAgents,
      project: starterProject,
      setupProject,
      setupCases: createdCases.filter((item) => (item.metadata as Record<string, unknown> | null)?.caseKind === "setup-task"),
      cases: createdCases,
      installedSkills,
      mountedSkills,
      launch,
      connectedChannels: resolveChannelConfig(input).channels,
      preview: {
        student,
        parent,
        instructor,
        schedule,
        students: createdStudents,
        parents: createdParents,
        instructors: createdInstructors,
        schedules: createdSchedules,
        sampleInboundMessages: input.mode === "demo" ? TANZANIA_PRESET.sampleInboundMessages : null,
        sampleProjectInstruction: input.mode === "demo" ? TANZANIA_PRESET.sampleProjectInstruction : null,
      },
      documents: setupDocuments,
    }
  } catch (error) {
    if (organizationId) {
      await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: {
            bootstrap: {
              status: "failed",
            },
          } as Record<string, unknown>,
        })
        .where(eq(schema.organizations.id, organizationId))
        .catch(() => undefined)
      await deleteOrganizationCascade(db, organizationId).catch(() => undefined)
    }
    throw error
  }
}
