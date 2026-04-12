import fs from "fs"
import path from "path"
import { createDb } from "@hagent/db"
import detectPort from "detect-port"
import pino from "pino"
import { loadConfig } from "./config.js"
import { createApp } from "./app.js"
import { startTelegramInboundPolling } from "./services/telegram-inbound-sync.js"

const logger = pino({ level: "info" })

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
