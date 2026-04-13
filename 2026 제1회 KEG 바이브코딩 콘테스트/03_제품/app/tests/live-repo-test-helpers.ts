import assert from "node:assert/strict"
import { once } from "node:events"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import type { AddressInfo } from "node:net"

import { createApp } from "/Users/river/workspace/active/hagent-os/server/src/app.ts"
import { createDb } from "/Users/river/workspace/active/hagent-os/packages/db/src/index.ts"
import * as schema from "/Users/river/workspace/active/hagent-os/packages/db/src/index.ts"
import { autoSeedDemoOrganization } from "/Users/river/workspace/active/hagent-os/server/src/services/auto-seed-demo.ts"

export const LIVE_REPO_ROOT = "/Users/river/workspace/active/hagent-os"

const liveRequire = createRequire(path.join(LIVE_REPO_ROOT, "server/package.json"))
const EmbeddedPostgres = liveRequire("embedded-postgres").default as new (options: Record<string, unknown>) => {
  initialise: () => Promise<void>
  start: () => Promise<void>
  stop?: () => Promise<void>
}
const detectPort = liveRequire("detect-port").default as (port?: number) => Promise<number>
const postgres = liveRequire("postgres") as (connectionString: string, options?: Record<string, unknown>) => {
  unsafe: (sql: string) => Promise<unknown>
  end: () => Promise<void>
  <T = unknown>(template: TemplateStringsArray, ...args: unknown[]): Promise<T[]>
}
const drizzleOrm = liveRequire("drizzle-orm") as {
  eq: typeof import("drizzle-orm").eq
  count: typeof import("drizzle-orm").count
  and: typeof import("drizzle-orm").and
}

export const { eq, count, and } = drizzleOrm
export { autoSeedDemoOrganization, createApp, createDb, schema }

async function runLiveRepoMigration(connectionString: string) {
  const previous = process.env.DATABASE_URL
  process.env.DATABASE_URL = connectionString

  try {
    const migrationUrl = `${pathToFileURL(path.join(LIVE_REPO_ROOT, "packages/db/src/migrate.ts")).href}?run=${Date.now()}-${Math.random()}`
    await import(migrationUrl)
  } finally {
    if (previous === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = previous
    }
  }
}

export async function createIsolatedDatabase() {
  const databaseDir = mkdtempSync(path.join(tmpdir(), "hagent-live-test-"))
  const port = await detectPort(15432)
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "hagent",
    password: "hagent",
    port,
    persistent: false,
  })

  await pg.initialise()
  await pg.start()

  const adminSql = postgres(`postgres://hagent:hagent@127.0.0.1:${port}/postgres`, { max: 1 })
  const existing = await adminSql`SELECT 1 FROM pg_database WHERE datname = 'hagent'`
  if (existing.length === 0) {
    await adminSql.unsafe("CREATE DATABASE hagent")
  }
  await adminSql.end()

  const connectionString = `postgres://hagent:hagent@127.0.0.1:${port}/hagent`
  await runLiveRepoMigration(connectionString)

  const db = createDb(connectionString)

  return {
    db,
    connectionString,
    async close() {
      const client = (db as { $client?: { end?: (options?: Record<string, unknown>) => Promise<void> } }).$client
      if (client?.end) {
        await client.end({ timeout: 1 }).catch(() => undefined)
      }
      if (typeof pg.stop === "function") {
        await pg.stop().catch(() => undefined)
      }
      rmSync(databaseDir, { recursive: true, force: true })
    },
  }
}

export async function createAppHarness() {
  const database = await createIsolatedDatabase()
  const app = createApp(database.db, {
    port: 0,
    databaseUrl: database.connectionString,
    anthropicApiKey: null,
    deploymentMode: "local_trusted",
    embeddedPostgresDataDir: path.join(tmpdir(), "unused-hagent-data"),
    demoMode: true,
    lawGoKrOc: null,
  })

  const server = app.listen(0)
  await once(server, "listening")
  const address = server.address()
  assert(address && typeof address === "object", "Test server failed to bind to a local port")
  const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`

  return {
    ...database,
    baseUrl,
    async json<T>(pathname: string, init?: RequestInit) {
      const response = await fetch(`${baseUrl}${pathname}`, init)
      const text = await response.text()
      const body = text ? (JSON.parse(text) as T) : null
      return { response, body }
    },
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      })
      await database.close()
    },
  }
}

export async function insertOrganization(
  db: ReturnType<typeof createDb>,
  overrides: Partial<typeof schema.organizations.$inferInsert> = {},
) {
  const [organization] = await db
    .insert(schema.organizations)
    .values({
      name: "Flow Test Academy",
      prefix: `flow-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      description: "Integration test organization",
      agentTeamConfig: {
        integrations: {
          channels: {
            kakao: {
              enabled: true,
              channelId: "flow-test-channel",
              channelUrl: "https://pf.kakao.com/_flow-test",
              chatUrl: "https://pf.kakao.com/_flow-test/chat",
              displayName: "Flow Test Kakao",
            },
          },
        },
      },
      ...overrides,
    })
    .returning()

  return organization
}

export async function insertAgent(
  db: ReturnType<typeof createDb>,
  organizationId: string,
  overrides: Partial<typeof schema.agents.$inferInsert> = {},
) {
  const [agent] = await db
    .insert(schema.agents)
    .values({
      organizationId,
      name: "Complaint Agent",
      slug: `complaint-${Math.random().toString(36).slice(2, 8)}`,
      agentType: "complaint",
      adapterType: "mock_local",
      adapterConfig: {
        model: "gpt-4o-mini",
        autoRun: true,
        allowedChannels: ["kakao"],
      },
      ...overrides,
    })
    .returning()

  return agent
}

export async function insertProject(
  db: ReturnType<typeof createDb>,
  organizationId: string,
  name: string,
) {
  const [project] = await db
    .insert(schema.opsGroups)
    .values({
      organizationId,
      name,
      description: `${name} project`,
      color: "#14b8a6",
    })
    .returning()

  return project
}
