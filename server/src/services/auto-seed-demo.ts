import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import pino from "pino"
import { bootstrapOrganization } from "./bootstrap.js"
import { ensureAcademySeedBaseline, CORE_AGENT_SEEDS } from "./seed-academy.js"

const logger = pino({ level: "info" })

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
    { role: "orchestrator", name: "원장", mountedSkills: CORE_AGENT_SEEDS.orchestrator.skillSlugs, allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
    { role: "complaint", name: "민원담당", mountedSkills: CORE_AGENT_SEEDS.complaint.skillSlugs, allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
    { role: "retention", name: "이탈방어", mountedSkills: CORE_AGENT_SEEDS.retention.skillSlugs, allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
    { role: "scheduler", name: "스케줄러", mountedSkills: CORE_AGENT_SEEDS.scheduler.skillSlugs, allowedChannels: ["kakao"], adapterType: "codex_local", model: "gpt-4o-mini", autoRun: true },
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
      const baseline = await ensureAcademySeedBaseline(db, existing.id)
      logger.info({ orgId: existing.id, baseline }, "Demo organization backfill check complete")
      return
    }

    logger.info("Auto-seeding demo organization (탄자니아 영어학원)")
    const result = await bootstrapOrganization(db, DEMO_PAYLOAD)
    const orgId = result.organization.id
    const baseline = await ensureAcademySeedBaseline(db, orgId)
    logger.info({ orgId, baseline }, "Demo baseline seed completed")
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? { message: error.message, stack: error.stack?.split("\n").slice(0, 3).join(" | ") } : String(error) },
      "Auto-seed demo failed (non-fatal) — onboarding still works",
    )
  }
}
