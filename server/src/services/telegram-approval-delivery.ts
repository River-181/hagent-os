import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { sendTelegramMessage } from "./integrations/telegram-outbound.js"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function mergeJson(base: Record<string, unknown>, patch: Record<string, unknown>) {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeJson(next[key] as Record<string, unknown>, value)
      continue
    }
    next[key] = value
  }
  return next
}

function resolveReplyDraft(approval: typeof schema.approvals.$inferSelect) {
  const payload = isPlainObject(approval.payload) ? approval.payload : {}
  const decision = isPlainObject(approval.decision) ? approval.decision : {}
  const sideEffects = isPlainObject(decision.sideEffects) ? decision.sideEffects : {}
  const telegramMessage = isPlainObject(sideEffects.telegramMessage) ? sideEffects.telegramMessage : {}
  return (
    (typeof payload.suggestedReply === "string" && payload.suggestedReply) ||
    (typeof payload.draft === "string" && payload.draft) ||
    (typeof telegramMessage.draft === "string" && telegramMessage.draft) ||
    null
  )
}

async function recordDeliveryArtifacts(
  db: Db,
  input: {
    organizationId: string
    caseRecord: typeof schema.cases.$inferSelect
    approval: typeof schema.approvals.$inferSelect
    delivery: Awaited<ReturnType<typeof sendTelegramMessage>>
    actor: "system" | "user"
  },
) {
  const action =
    input.delivery.status === "sent"
      ? "message.outbound.sent"
      : input.delivery.status === "failed"
        ? "message.outbound.failed"
        : "message.outbound.ready"

  await db.insert(schema.activityEvents).values({
    organizationId: input.organizationId,
    actorType: input.actor,
    actorId: input.delivery.provider,
    action,
    entityType: "approval",
    entityId: input.approval.id,
    entityTitle: `${input.caseRecord.identifier} telegram reply ${input.delivery.status}`,
    metadata: {
      caseId: input.caseRecord.id,
      approvalId: input.approval.id,
      provider: input.delivery.provider,
      automated: input.delivery.automated,
      recipient: input.delivery.recipient,
      error: input.delivery.error ?? null,
    } as Record<string, unknown>,
  })

  await db.insert(schema.caseComments).values({
    caseId: input.caseRecord.id,
    authorType: input.actor === "system" ? "system" : "user",
    authorId: input.delivery.provider,
    content:
      input.delivery.status === "sent"
        ? `[텔레그램 회신] 실제 발송 완료\n\n${input.delivery.draft}`
        : input.delivery.status === "failed"
          ? `[텔레그램 회신] 자동 발송 실패\n${input.delivery.error ?? "원인 미상"}\n\n${input.delivery.draft}`
          : `[텔레그램 회신] 운영자 발송 대기\n\n${input.delivery.draft}`,
  })

  await db.insert(schema.documents).values({
    organizationId: input.organizationId,
    title: `${input.caseRecord.identifier} 텔레그램 회신`,
    body: [
      `# ${input.caseRecord.identifier} 텔레그램 회신`,
      "",
      `- status: ${input.delivery.status}`,
      `- provider: ${input.delivery.provider}`,
      `- automated: ${input.delivery.automated ? "yes" : "no"}`,
      input.delivery.error ? `- error: ${input.delivery.error}` : null,
      "",
      "## 발송 문안",
      input.delivery.draft,
    ]
      .filter(Boolean)
      .join("\n"),
    category: "artifact",
    tags: [
      `case:${input.caseRecord.id}`,
      ...(input.caseRecord.opsGroupId ? [`project:${input.caseRecord.opsGroupId}`] : []),
      `approval:${input.approval.id}`,
      "artifact:telegram-reply",
      `status:${input.delivery.status}`,
    ],
  })
}

export async function processTelegramApprovalDelivery(
  db: Db,
  approvalId: string,
  options?: {
    mode?: "auto" | "bridge" | "confirm_bridge"
    actor?: "system" | "user"
  },
) {
  const [approval] = await db.select().from(schema.approvals).where(eq(schema.approvals.id, approvalId))
  if (!approval) throw new Error("Approval not found")
  if (approval.status !== "approved") throw new Error("Approval must be approved before sending")
  if (!approval.caseId) throw new Error("Approval is not linked to a case")

  const [caseRecord] = await db.select().from(schema.cases).where(eq(schema.cases.id, approval.caseId))
  if (!caseRecord) throw new Error("Case not found")
  if (caseRecord.source !== "telegram") throw new Error("Only telegram cases are supported")

  const draft = resolveReplyDraft(approval)
  if (!draft) throw new Error("No Telegram reply draft available")

  const delivery = await sendTelegramMessage(db, {
    organizationId: approval.organizationId,
    caseRecord,
    approvalId,
    draft,
    mode: options?.mode ?? "auto",
  })

  const currentDecision = isPlainObject(approval.decision) ? approval.decision : {}
  const nextDecision = mergeJson(currentDecision, {
    sideEffects: {
      telegramMessage: delivery,
    },
  })

  await db
    .update(schema.approvals)
    .set({
      decision: nextDecision,
      updatedAt: new Date(),
    })
    .where(eq(schema.approvals.id, approval.id))

  await recordDeliveryArtifacts(db, {
    organizationId: approval.organizationId,
    caseRecord,
    approval,
    delivery,
    actor: options?.actor ?? "system",
  })

  if (delivery.status === "ready_to_send" || delivery.status === "failed") {
    await db.insert(schema.notifications).values({
      organizationId: approval.organizationId,
      type: delivery.status === "failed" ? "outbound_failed" : "outbound_ready",
      title:
        delivery.status === "failed"
          ? `${caseRecord.identifier} 텔레그램 발송 실패`
          : `${caseRecord.identifier} 텔레그램 발송 준비`,
      body:
        delivery.status === "failed"
          ? delivery.error ?? "자동 발송에 실패했습니다."
          : `${caseRecord.identifier} 회신이 승인되었습니다. 운영자 발송 확인이 필요합니다.`,
      entityType: "approval",
      entityId: approval.id,
    })
  }

  const nextCaseStatus =
    delivery.status === "sent"
      ? "done"
      : delivery.status === "failed"
        ? "blocked"
        : "in_review"

  await db
    .update(schema.cases)
    .set({
      status: nextCaseStatus,
      updatedAt: new Date(),
    })
    .where(eq(schema.cases.id, caseRecord.id))

  const [latest] = await db.select().from(schema.approvals).where(eq(schema.approvals.id, approval.id))
  return latest
}
