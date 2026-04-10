import fs from "fs"
import path from "path"
import { createDb } from "@hagent/db"
import EmbeddedPostgres from "embedded-postgres"
import detectPort from "detect-port"
import pino from "pino"
import { loadConfig } from "./config.js"
import { createApp } from "./app.js"

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

  // Push schema to DB (create tables if they don't exist)
  try {
    const { default: postgres } = await import("postgres")
    const sql = postgres(connectionString)
    // Use raw SQL to create tables via drizzle-kit push would be ideal,
    // but for dev we'll create tables on first run via seed script.
    // Just verify connection works.
    await sql`SELECT 1`
    await sql.end()
    logger.info("Database connection verified")
  } catch (e) {
    logger.error(e, "Database connection verification failed")
  }

  const app = createApp(db, config)

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, deploymentMode: config.deploymentMode },
      "HagentOS server listening",
    )
  })

  const shutdown = () => {
    logger.info("Shutting down server...")
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
