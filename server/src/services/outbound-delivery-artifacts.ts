import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

function replaceStatusTag(tags: string[], nextStatus: string) {
  return [...tags.filter((tag) => !tag.startsWith("status:")), `status:${nextStatus}`]
}

export async function upsertOutboundDeliveryDocument(
  db: Db,
  input: {
    organizationId: string
    approvalId: string
    caseId: string
    opsGroupId?: string | null
    title: string
    body: string
    artifactTag: string
    status: string
  },
) {
  const organizationDocs = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.organizationId, input.organizationId))

  const matching = organizationDocs.filter((document) => {
    const tags = Array.isArray(document.tags) ? document.tags : []
    return tags.includes(`approval:${input.approvalId}`) && tags.includes(input.artifactTag)
  })

  const [existing, ...duplicates] = matching.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )

  for (const duplicate of duplicates) {
    await db.delete(schema.documents).where(eq(schema.documents.id, duplicate.id))
  }

  if (existing) {
    const currentTags = Array.isArray(existing.tags) ? existing.tags : []
    const nextTags = replaceStatusTag(currentTags, input.status)
    const [updated] = await db
      .update(schema.documents)
      .set({
        title: input.title,
        body: input.body,
        tags: nextTags,
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(schema.documents)
    .values({
      organizationId: input.organizationId,
      title: input.title,
      body: input.body,
      category: "artifact",
      tags: [
        `case:${input.caseId}`,
        ...(input.opsGroupId ? [`project:${input.opsGroupId}`] : []),
        `approval:${input.approvalId}`,
        input.artifactTag,
        `status:${input.status}`,
      ],
    })
    .returning()

  return created
}
