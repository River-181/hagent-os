/**
 * 서버 기동 시 1회 실행되는 데이터 패치 마이그레이션.
 * - autoRun 미설정 에이전트에 autoRun: true 추가
 * 멱등 (이미 패치된 레코드는 재처리 없음).
 */
import { eq } from "drizzle-orm"
import pino from "pino"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

const logger = pino({ level: "info" })

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v)
}

export async function runStartupMigrations(db: Db): Promise<void> {
  try {
    const agents = await db.select().from(schema.agents)
    let patched = 0

    for (const agent of agents) {
      const cfg = isPlainObject(agent.adapterConfig) ? agent.adapterConfig : {}
      const hasAutoRun = "autoRun" in cfg
      const needsAutoRunPatch = !hasAutoRun

      if (!needsAutoRunPatch) continue

      const nextCfg: Record<string, unknown> = {
        ...cfg,
        autoRun: needsAutoRunPatch ? true : cfg.autoRun,
      }

      await db
        .update(schema.agents)
        .set({ adapterConfig: nextCfg, updatedAt: new Date() })
        .where(eq(schema.agents.id, agent.id))

      patched++
    }

    if (patched > 0) {
      logger.info({ patched }, "Startup migration: patched agent adapterConfig records")
    }
  } catch (err) {
    logger.warn({ err: String(err) }, "Startup migration failed (non-fatal)")
  }
}
