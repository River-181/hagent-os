import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const connectionString = process.env.DATABASE_URL ?? "postgres://hagent@localhost:5432/hagent"
const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

await migrate(db, { migrationsFolder: "./src/migrations" })
await sql.end()
// biome-ignore lint/suspicious/noConsole: migration script output is intentional
console.log("Migration complete")
