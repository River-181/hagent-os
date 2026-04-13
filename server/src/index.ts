import fs from "fs"
import path from "path"
import { spawn } from "node:child_process"
import { createDb } from "@hagent/db"
import detectPort from "detect-port"
import pino from "pino"
import { loadConfig } from "./config.js"
import { createApp } from "./app.js"
import { startTelegramInboundPolling } from "./services/telegram-inbound-sync.js"
import { autoSeedDemoOrganization } from "./services/auto-seed-demo.js"
import { runStartupMigrations } from "./services/startup-migrations.js"

const logger = pino({ level: "info" })

/**
 * 외부 DATABASE_URL(Neon 등) 사용 시, 서버 부팅 직전에 drizzle-kit push --force 를 실행해
 * 스키마 drift 를 자동 보정한다.
 * - 실패해도 서버는 계속 기동 (non-fatal)
 * - 로컬 embedded-postgres 모드에서는 스킵
 * - SKIP_SCHEMA_SYNC=true 면 스킵
 */
async function syncSchemaIfNeeded(databaseUrl: string | null | undefined): Promise<void> {
  if (!databaseUrl) return
  if (process.env.SKIP_SCHEMA_SYNC === "true") {
    logger.info("Schema sync skipped (SKIP_SCHEMA_SYNC=true)")
    return
  }

  // 컨테이너/모노레포 두 경로 모두 시도
  const candidates = [
    path.resolve(process.cwd(), "packages/db"),
    path.resolve(process.cwd(), "../packages/db"),
  ]
  const dbPkgDir = candidates.find((p) => fs.existsSync(path.join(p, "drizzle.config.ts")))
  if (!dbPkgDir) {
    logger.warn({ cwd: process.cwd() }, "Schema sync skipped: packages/db not found")
    return
  }

  const bin = path.join(dbPkgDir, "node_modules", ".bin", "drizzle-kit")
  if (!fs.existsSync(bin)) {
    logger.warn({ bin }, "Schema sync skipped: drizzle-kit binary not found")
    return
  }

  logger.info({ dbPkgDir }, "Running drizzle-kit push --force")
  await new Promise<void>((resolve) => {
    const child = spawn(bin, ["push", "--force"], {
      cwd: dbPkgDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout?.on("data", (chunk) => logger.info({ phase: "schema-sync" }, chunk.toString().trim()))
    child.stderr?.on("data", (chunk) => logger.warn({ phase: "schema-sync" }, chunk.toString().trim()))
    child.on("close", (code) => {
      if (code === 0) logger.info("Schema sync complete")
      else logger.warn({ code }, "Schema sync exited non-zero (continuing)")
      resolve()
    })
    child.on("error", (err) => {
      logger.warn(err, "Schema sync spawn failed (continuing)")
      resolve()
    })
  })
}

async function main() {
  const config = loadConfig()

  let connectionString: string

  if (config.databaseUrl) {
    connectionString = config.databaseUrl
    logger.info("Using external DATABASE_URL")
  } else {
    logger.info("No DATABASE_URL found — starting embedded PostgreSQL")
    const pgPort = await detectPort(5432)

    const dataDir = path.resolve(config.embeddedPostgresDataDir)
    const alreadyInitialised = fs.existsSync(path.join(dataDir, "data", "PG_VERSION"))

    // 동적 import — DATABASE_URL 있을 때는 로드하지 않음 (바이너리 없어도 안전)
    const { default: EmbeddedPostgres } = await import("embedded-postgres")

    const pg = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "hagent",
      password: "hagent",
      port: pgPort,
      persistent: true,
    })

    if (!alreadyInitialised) {
      logger.info({ dataDir }, "Initialising embedded PostgreSQL for the first time")
      await pg.initialise()
    }

    await pg.start()

    connectionString = `postgres://hagent:hagent@localhost:${pgPort}/hagent`
    logger.info({ pgPort }, "Embedded PostgreSQL started")

    // Create database if it doesn't exist
    try {
      const { default: postgres } = await import("postgres")
      const adminSql = postgres(`postgres://hagent:hagent@localhost:${pgPort}/postgres`)
      const existing = await adminSql`SELECT 1 FROM pg_database WHERE datname = 'hagent'`
      if (existing.length === 0) {
        await adminSql.unsafe("CREATE DATABASE hagent")
        logger.info("Created 'hagent' database")
      }
      await adminSql.end()
    } catch (e) {
      logger.warn(e, "Database creation check failed (may already exist)")
    }
  }

  // 스키마 drift 자동 보정 (외부 DATABASE_URL 한정)
  await syncSchemaIfNeeded(config.databaseUrl)

  const db = createDb(connectionString)
  logger.info("Database connection established")

  const app = createApp(db, config)

  // 서버 먼저 시작 (헬스체크 통과) → DB 연결 백그라운드 검증
  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, deploymentMode: config.deploymentMode },
      "HagentOS server listening",
    )
  })

  // DB 연결 비동기 검증 (서버 시작 블로킹 안 함)
  void (async () => {
    try {
      const { default: postgres } = await import("postgres")
      const sql = postgres(connectionString, { connect_timeout: 15 })
      await sql`SELECT 1`
      await sql.end()
      logger.info("Database connection verified")
    } catch (e) {
      logger.warn(e, "Database connection verification failed (non-fatal)")
    }
  })()

  // 기동 시 데이터 패치 마이그레이션 (gpt-5-codex → gpt-4o-mini 등)
  void runStartupMigrations(db).catch((err) => logger.warn(err, "Startup migrations crashed"))
  // 심사위원용 "완성된 학원 OS" 자동 시드 (AUTO_SEED_DEMO=true 일 때만 동작, 멱등)
  void autoSeedDemoOrganization(db).catch((err) => logger.warn(err, "Auto-seed crashed"))

  const stopTelegramPolling = startTelegramInboundPolling(db)

  const shutdown = () => {
    logger.info("Shutting down server...")
    stopTelegramPolling()
    server.close(() => {
      process.exit(0)
    })
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  pino().error(err, "Fatal startup error")
  process.exit(1)
})
