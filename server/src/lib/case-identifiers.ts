import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

export async function generateCaseIdentifier(db: Db, organizationId: string) {
  const rows = await db
    .select({ identifier: schema.cases.identifier })
    .from(schema.cases)
    .where(eq(schema.cases.organizationId, organizationId))

  const existing = new Set(rows.map((row) => row.identifier))
  const maxSequence = rows.reduce((max, row) => {
    const match = /^C-(\d+)/.exec(row.identifier)
    if (!match) return max
    return Math.max(max, Number(match[1]))
  }, 0)

  const base = `C-${String(maxSequence + 1).padStart(3, "0")}`
  if (!existing.has(base)) return base

  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}
