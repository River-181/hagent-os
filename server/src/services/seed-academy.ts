import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { createCaseWithRetry } from "../lib/case-create.js"
import { installSkillForOrganization, updateAgentSkillMounts } from "./skills.js"

type CoreAgentRole = "orchestrator" | "complaint" | "retention" | "scheduler"

type CoreAgentSeed = {
  slug: string
  icon: string
  name: string
  systemPrompt: (organizationName: string, topGoal: string) => string
  skillSlugs: string[]
}

type RoutineSeed = {
  role: CoreAgentRole | null
  name: string
  schedule: string
}

type CaseSeed = {
  title: string
  description: string
  type: "complaint" | "churn" | "schedule"
  severity: "same_day" | "normal"
  status: "todo" | "in_progress"
  role: CoreAgentRole
}

type NotificationSeed = {
  type: string
  title: string
  body: string
}

export const CORE_AGENT_SEEDS: Record<CoreAgentRole, CoreAgentSeed> = {
  orchestrator: {
    slug: "orchestrator",
    icon: "brain",
    name: "원장 오케스트레이터",
    systemPrompt: (organizationName, topGoal) =>
      `${organizationName}의 운영 전반을 조율하고 "${topGoal}"를 우선순위로 실행합니다. 케이스를 분류하고 전문 에이전트에 위임한 뒤 승인과 후속 조치가 끊기지 않도록 관리합니다.`,
    skillSlugs: ["academy-bootstrap-pack", "complaint-classifier", "approval-flow-designer", "agent-runtime-checker"],
  },
  complaint: {
    slug: "complaint",
    icon: "shield",
    name: "민원담당",
    systemPrompt: (organizationName) =>
      `${organizationName}의 민원, 환불, 민감한 보호자 응대를 담당합니다. 공감 기반 초안 작성, 규정 안내, 승인 요청 생성까지 책임집니다.`,
    skillSlugs: ["complaint-classifier", "message-template-pack", "korean-tone-guide", "parent-sentiment-tracker"],
  },
  retention: {
    slug: "retention",
    icon: "heart",
    name: "이탈방어",
    systemPrompt: (organizationName) =>
      `${organizationName}의 이탈 위험 학생을 조기 탐지하고 재등록 개입안을 제안합니다. 출결, 상담, 결제 신호를 함께 보고 보호자 접촉 우선순위를 정합니다.`,
    skillSlugs: ["churn-risk-calculator", "student-360-view", "re-enrollment-playbook", "attendance-followup"],
  },
  scheduler: {
    slug: "scheduler",
    icon: "calendar",
    name: "스케줄러",
    systemPrompt: (organizationName) =>
      `${organizationName}의 보강, 상담, 대체수업, 캘린더 후속 작업을 담당합니다. 일정 충돌을 줄이고 실행 가능한 다음 액션을 제안합니다.`,
    skillSlugs: ["schedule-manager", "schedule-optimizer", "substitute-matcher", "google-calendar-mcp"],
  },
}

export const CORE_ROUTINE_SEEDS: RoutineSeed[] = [
  { role: "orchestrator", name: "매일 오전 9시 브리핑", schedule: "0 9 * * *" },
  { role: "complaint", name: "민원 답변 초안 자동 생성", schedule: "*/15 * * * *" },
  { role: "retention", name: "주 1회 이탈 위험 학생 리포트", schedule: "0 10 * * MON" },
  { role: "scheduler", name: "내일 수업 리마인더 발송", schedule: "0 20 * * *" },
]

const SAMPLE_CASE_SEEDS: CaseSeed[] = [
  {
    title: "학부모 환불 문의 초안 검토",
    description: "이번 주 접수된 환불 문의에 대해 규정 기반 답변 초안과 승인 포인트를 정리합니다.",
    type: "complaint",
    severity: "same_day",
    status: "todo",
    role: "complaint",
  },
  {
    title: "결석 누적 학생 재등록 위험 점검",
    description: "최근 2주 출결이 흔들린 학생을 골라 이탈 위험 신호와 보호자 팔로업 액션을 제안합니다.",
    type: "churn",
    severity: "normal",
    status: "in_progress",
    role: "retention",
  },
  {
    title: "보강 및 상담 일정 정리",
    description: "이번 주 보강 요청과 상담 일정을 묶어 시간표 충돌 없이 정리합니다.",
    type: "schedule",
    severity: "normal",
    status: "todo",
    role: "scheduler",
  },
]

const SAMPLE_NOTIFICATION_SEEDS: NotificationSeed[] = [
  {
    type: "approval_needed",
    title: "승인 대기: 환불 문의 초안",
    body: "민원담당이 환불 안내 초안을 작성했습니다. 원장 확인이 필요합니다.",
  },
  {
    type: "case_update",
    title: "케이스 업데이트: 이탈 위험 학생 점검",
    body: "이탈방어 에이전트가 최근 결석 누적 학생 1명을 고위험으로 분류했습니다.",
  },
  {
    type: "agent_completed",
    title: "에이전트 완료: 일정 정리",
    body: "스케줄러가 보강·상담 일정 초안을 정리했습니다.",
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function readBootstrapConfig(organization: typeof schema.organizations.$inferSelect) {
  const teamConfig = isRecord(organization.agentTeamConfig) ? organization.agentTeamConfig : {}
  const bootstrap = isRecord(teamConfig.bootstrap) ? teamConfig.bootstrap : {}
  const aiPolicy = isRecord(teamConfig.aiPolicy) ? teamConfig.aiPolicy : {}

  return {
    topGoal:
      typeof bootstrap.topGoal === "string" && bootstrap.topGoal.trim().length > 0
        ? bootstrap.topGoal
        : "민원 대응과 재등록 운영 안정화",
    adapterType:
      typeof aiPolicy.primaryAdapterType === "string" && aiPolicy.primaryAdapterType.trim().length > 0
        ? aiPolicy.primaryAdapterType
        : typeof bootstrap.selectedAdapterType === "string" && bootstrap.selectedAdapterType.trim().length > 0
          ? bootstrap.selectedAdapterType
          : "codex_local",
  }
}

function readSkillSlugs(agent: typeof schema.agents.$inferSelect) {
  const items = Array.isArray(agent.skills) ? agent.skills : []
  const slugs = items.flatMap((item) => {
    if (typeof item === "string") return [item]
    if (isRecord(item) && typeof item.slug === "string") return [item.slug]
    return []
  })
  return Array.from(new Set(slugs))
}

function mergeSeedSkills(current: string[], seeded: string[]) {
  return Array.from(new Set([...seeded, ...current])).slice(0, 5)
}

export async function ensureAcademySeedBaseline(db: Db, organizationId: string) {
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId))

  if (!organization) return null

  const bootstrapConfig = readBootstrapConfig(organization)
  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))

  let orchestratorId = agents.find((agent) => agent.agentType === "orchestrator")?.id ?? null
  const ensuredAgents = new Map<CoreAgentRole, typeof schema.agents.$inferSelect>()
  let createdAgents = 0
  let patchedAgents = 0

  for (const role of Object.keys(CORE_AGENT_SEEDS) as CoreAgentRole[]) {
    const preset = CORE_AGENT_SEEDS[role]
    const existing = agents.find((agent) => agent.agentType === role) ?? null

    if (!existing) {
      const [inserted] = await db
        .insert(schema.agents)
        .values({
          organizationId,
          name: preset.name,
          slug: preset.slug,
          agentType: role,
          status: "idle",
          systemPrompt: preset.systemPrompt(organization.name, bootstrapConfig.topGoal),
          icon: preset.icon,
          adapterType: bootstrapConfig.adapterType,
          adapterConfig: {
            model: "gpt-4o-mini",
            autoRun: true,
          } as Record<string, unknown>,
          reportsTo: role === "orchestrator" ? null : orchestratorId,
        })
        .returning()

      if (role === "orchestrator") orchestratorId = inserted.id
      ensuredAgents.set(role, inserted)
      createdAgents += 1
      continue
    }

    const currentConfig = isRecord(existing.adapterConfig) ? existing.adapterConfig : {}
    const nextConfig: Record<string, unknown> = {
      ...currentConfig,
      model: "gpt-4o-mini",
      autoRun: true,
    }
    const currentSkills = readSkillSlugs(existing)
    const nextSkills = mergeSeedSkills(currentSkills, preset.skillSlugs)
    const needsPatch =
      existing.systemPrompt !== preset.systemPrompt(organization.name, bootstrapConfig.topGoal)
      || !existing.adapterType
      || JSON.stringify(currentConfig) !== JSON.stringify(nextConfig)
      || JSON.stringify(currentSkills) !== JSON.stringify(nextSkills)

    const [updated] = await db
      .update(schema.agents)
      .set({
        systemPrompt: preset.systemPrompt(organization.name, bootstrapConfig.topGoal),
        adapterType: existing.adapterType || bootstrapConfig.adapterType,
        adapterConfig: nextConfig,
        icon: existing.icon ?? preset.icon,
        reportsTo: role === "orchestrator" ? null : existing.reportsTo ?? orchestratorId,
        updatedAt: new Date(),
      })
      .where(eq(schema.agents.id, existing.id))
      .returning()

    ensuredAgents.set(role, updated)
    if (role === "orchestrator" && !orchestratorId) orchestratorId = updated.id
    if (needsPatch) patchedAgents += 1
  }

  const agentsByRole = Object.fromEntries(
    Array.from(ensuredAgents.entries()).map(([role, agent]) => [role, agent]),
  ) as Record<CoreAgentRole, typeof schema.agents.$inferSelect>

  const seedSkillSlugs = Array.from(new Set(Object.values(CORE_AGENT_SEEDS).flatMap((preset) => preset.skillSlugs)))
  for (const slug of seedSkillSlugs) {
    await installSkillForOrganization(db, organizationId, slug).catch(() => null)
  }

  for (const role of Object.keys(CORE_AGENT_SEEDS) as CoreAgentRole[]) {
    const agent = agentsByRole[role]
    const nextSkills = mergeSeedSkills(readSkillSlugs(agent), CORE_AGENT_SEEDS[role].skillSlugs)
    await updateAgentSkillMounts(
      db,
      agent.id,
      nextSkills.map((slug, index) => ({ slug, enabled: true, mountOrder: index })),
    ).catch(() => null)
  }

  const routines = await db
    .select()
    .from(schema.routines)
    .where(eq(schema.routines.organizationId, organizationId))
  let createdRoutines = 0

  for (const routine of CORE_ROUTINE_SEEDS) {
    const exists = routines.some((item) => item.name === routine.name)
    if (exists) continue

    await db.insert(schema.routines).values({
      organizationId,
      agentId: routine.role ? agentsByRole[routine.role]?.id ?? null : null,
      name: routine.name,
      schedule: routine.schedule,
      enabled: true,
    })
    createdRoutines += 1
  }

  const students = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.organizationId, organizationId))
  const cases = await db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.organizationId, organizationId))
  let createdCases = 0

  if (cases.length < 3) {
    const primaryStudentId = students[0]?.id ?? null
    for (const seed of SAMPLE_CASE_SEEDS.slice(0, 3 - cases.length)) {
      const created = await createCaseWithRetry(db, {
        organizationId,
        title: seed.title,
        description: seed.description,
        type: seed.type,
        severity: seed.severity,
        status: seed.status,
        priority: seed.severity === "same_day" ? 1 : 2,
        reporterId: "system:academy-seed",
        studentId: primaryStudentId,
        assigneeAgentId: agentsByRole[seed.role]?.id ?? null,
        source: "manual",
        metadata: {
          caseKind: seed.type,
          seeded: true,
          seedOrigin: "academy-baseline",
        } as Record<string, unknown>,
      }).catch(() => null)

      if (created) createdCases += 1
    }
  }

  const refreshedCases = createdCases > 0
    ? await db.select().from(schema.cases).where(eq(schema.cases.organizationId, organizationId))
    : cases

  const notifications = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.organizationId, organizationId))
  let createdNotifications = 0

  if (notifications.length < 3) {
    const caseTargets = refreshedCases.slice(0, 3)
    for (const [index, seed] of SAMPLE_NOTIFICATION_SEEDS.slice(0, 3 - notifications.length).entries()) {
      await db.insert(schema.notifications).values({
        organizationId,
        type: seed.type,
        title: seed.title,
        body: seed.body,
        entityType: caseTargets[index]?.id ? "case" : null,
        entityId: caseTargets[index]?.id ?? null,
      })
      createdNotifications += 1
    }
  }

  return {
    organizationId,
    createdAgents,
    patchedAgents,
    createdRoutines,
    createdCases,
    createdNotifications,
  }
}
