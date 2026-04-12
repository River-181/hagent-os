import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { generateCaseIdentifier } from "./case-identifiers.js"

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false
  const candidate = error as { code?: string; constraint_name?: string; constraint?: string }
  return candidate.code === "23505"
}

export async function createCaseWithRetry(
  db: Db,
  values: Omit<typeof schema.cases.$inferInsert, "identifier">,
  maxAttempts = 5,
) {
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const identifier = await generateCaseIdentifier(db, values.organizationId)
      const [created] = await db
        .insert(schema.cases)
        .values({
          ...values,
          identifier,
        })
        .returning()
      return created
    } catch (error) {
      lastError = error
      if (!isUniqueViolation(error)) throw error
    }
  }

  throw lastError ?? new Error("Failed to create case")
}
