import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import pino from "pino"
import { bootstrapOrganization } from "./bootstrap.js"
import { installSkillForOrganization, updateAgentSkillMounts } from "./skills.js"

const logger = pino({ level: "info" })

// 심사위원이 "자동화"·"스킬" 탭에서 바로 볼 수 있는 기본 루틴
const DEMO_ROUTINES: Array<{ agentRole: string | null; name: string; schedule: string }> = [
  { agentRole: "orchestrator", name: "매일 오전 9시 브리핑", schedule: "0 9 * * *" },
  { agentRole: "complaint", name: "민원 답변 초안 자동 생성", schedule: "*/15 * * * *" },
  { agentRole: "retention", name: "주 1회 이탈 위험 학생 리포트", schedule: "0 10 * * MON" },
  { agentRole: "scheduler", name: "내일 수업 리마인더 발송", schedule: "0 20 * * *" },
  { agentRole: null, name: "월 1회 수강료 미납 알림", schedule: "0 9 1 * *" },
]

// 시드 후 설치할 k-skill 팩 (파일시스템의 skills/hagent/... 을 DB 레지스트리로)
const DEMO_SKILL_SLUGS_BY_ROLE: Record<string, string[]> = {
  orchestrator: ["complaint-classifier", "schedule-manager", "student-data-import", "academy-bootstrap-pack"],
  complaint: ["complaint-classifier", "korean-tone-guide", "message-template-pack", "compliance-refund-pack"],
  retention: ["churn-risk-calculator", "student-360-view", "re-enrollment-playbook"],
  scheduler: ["schedule-manager", "schedule-optimizer", "substitute-matcher"],
}

/**
 * 심사위원/첫 방문자용 "완성된 학원 OS" 자동 시드.
 *
 * 서버 기동 시 해당 prefix 의 조직이 없으면 탄자니아 영어학원 데모를 풀 bootstrap.
 * 이미 있으면 아무 것도 하지 않는다 (멱등).
 *
 * 환경 변수:
 *   AUTO_SEED_DEMO=true  → 활성화 (default: false)
 *   SKIP_AUTO_SEED=true  → 강제 비활성화
 */
const DEMO_PREFIX = "tanzania-english-academy"
const DEMO_INSTITUTION_NAME = "Tanzania English Academy"

const DEMO_PAYLOAD = {
  institutionName: DEMO_INSTITUTION_NAME,
  institutionType: "영어학원",
  institutionSize: "중형",
  topGoal: "민원 대응 속도와 재원 유지율을 동시에 높이기",
  description: "탄자니아 영어학원 데모 — 심사위원용 완성된 학원 OS",
  principalName: "원장",
  starterProjectName: "운영 시작",
  starterTeamPreset: "academy-core",
  setupProjectName: "Academy Setup",
  initialInstruction: "오늘 들어온 민원과 상담 요청, 이번 주 일정 이슈를 우선순위대로 정리해줘.",
  selectedAdapterType: "codex_local" as const,
  selectedModel: "gpt-4o-mini",
  mode: "demo" as const,
  channels: {
    kakao: { enabled: true, channelId: "tanzania-channel", readiness: "inactive" as const },
    telegram: { enabled: false, readiness: "inactive" as const },
    sms: { enabled: false, readiness: "inactive" as const },
    naver: { enabled: false, readiness: "inactive" as const },
  },
  dataImports: {
    students: { mode: "preset" as const, countHint: 48 },
    instructors: { mode: "preset" as const, countHint: 6 },
    parents: { mode: "preset" as const },
    schedules: { mode: "preset" as const },
  },
  selectedAgents: [
    { role: "orchestrator", name: "원장", mountedSkills: ["complaint-classifier", "schedule-manager"], allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
    { role: "complaint", name: "민원담당", mountedSkills: ["complaint-classifier", "korean-tone-guide"], allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
    { role: "retention", name: "이탈방어", mountedSkills: ["churn-risk-calculator", "student-360-view"], allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
    { role: "scheduler", name: "스케줄러", mountedSkills: ["schedule-manager", "schedule-optimizer"], allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
  ],
}

export async function autoSeedDemoOrganization(db: Db): Promise<void> {
  if (process.env.SKIP_AUTO_SEED === "true") {
    logger.info("Auto-seed skipped (SKIP_AUTO_SEED=true)")
    return
  }
  if (process.env.AUTO_SEED_DEMO !== "true") {
    return
  }

  try {
    const [existing] = await db
      .select({ id: schema.organizations.id, name: schema.organizations.name })
      .from(schema.organizations)
      .where(eq(schema.organizations.prefix, DEMO_PREFIX))

    if (existing) {
      // 이전 배포에서 skills/routines 없이 시드된 경우 보충
      const [skillCount] = await db
        .select({ n: schema.organizationSkills.organizationId })
        .from(schema.organizationSkills)
        .where(eq(schema.organizationSkills.organizationId, existing.id))
        .limit(1)
      if (skillCount) {
        logger.info({ orgId: existing.id }, "Demo organization fully seeded — skipping")
        return
      }

      logger.info({ orgId: existing.id }, "Existing demo org missing skills — backfilling skills + routines")
      const agents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, existing.id))
      const allSlugs = Array.from(new Set(Object.values(DEMO_SKILL_SLUGS_BY_ROLE).flat()))
      for (const slug of allSlugs) {
        await installSkillForOrganization(db, existing.id, slug).catch(() => null)
      }
      for (const agent of agents) {
        const slugs = DEMO_SKILL_SLUGS_BY_ROLE[agent.agentType] ?? []
        if (slugs.length > 0) {
          await updateAgentSkillMounts(
            db,
            agent.id,
            slugs.map((slug, i) => ({ slug, enabled: true, mountOrder: i })),
          ).catch(() => null)
        }
      }
      // 루틴은 중복 방지 — 없을 때만 삽입
      const existingRoutines = await db
        .select({ n: schema.routines.organizationId })
        .from(schema.routines)
        .where(eq(schema.routines.organizationId, existing.id))
        .limit(1)
      if (existingRoutines.length === 0) {
        for (const routine of DEMO_ROUTINES) {
          const agent = routine.agentRole ? agents.find((a) => a.agentType === routine.agentRole) : null
          await db.insert(schema.routines).values({
            organizationId: existing.id,
            agentId: agent?.id ?? null,
            name: routine.name,
            schedule: routine.schedule,
            enabled: true,
          }).catch(() => null)
        }
      }
      logger.info({ orgId: existing.id }, "Backfill complete")
      return
    }

    logger.info("Auto-seeding demo organization (탄자니아 영어학원)")
    const result = await bootstrapOrganization(db, DEMO_PAYLOAD)
    const orgId = result.organization.id
    logger.info({ orgId }, "Demo organization seeded — now seeding skills + routines")

    // 1) k-skill 팩 설치 + 에이전트 마운트
    const agents = await db.select().from(schema.agents).where(eq(schema.agents.organizationId, orgId))
    const allSlugs = Array.from(new Set(Object.values(DEMO_SKILL_SLUGS_BY_ROLE).flat()))
    for (const slug of allSlugs) {
      await installSkillForOrganization(db, orgId, slug).catch(() => null)
    }
    for (const agent of agents) {
      const slugs = DEMO_SKILL_SLUGS_BY_ROLE[agent.agentType] ?? []
      if (slugs.length > 0) {
        await updateAgentSkillMounts(
          db,
          agent.id,
          slugs.map((slug, i) => ({ slug, enabled: true, mountOrder: i })),
        ).catch(() => null)
      }
    }

    // 2) 자동화(루틴) 시드
    for (const routine of DEMO_ROUTINES) {
      const agent = routine.agentRole ? agents.find((a) => a.agentType === routine.agentRole) : null
      await db.insert(schema.routines).values({
        organizationId: orgId,
        agentId: agent?.id ?? null,
        name: routine.name,
        schedule: routine.schedule,
        enabled: true,
      }).catch((err) => logger.warn({ err: String(err), name: routine.name }, "routine insert failed"))
    }

    logger.info({ orgId, skills: allSlugs.length, routines: DEMO_ROUTINES.length }, "Demo skills + routines seeded")
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? { message: error.message, stack: error.stack?.split("\n").slice(0, 3).join(" | ") } : String(error) },
      "Auto-seed demo failed (non-fatal) — onboarding still works",
    )
  }
}
