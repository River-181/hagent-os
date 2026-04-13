import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

function replaceTag(tags: string[], prefix: string, next?: string | null) {
  const kept = tags.filter((tag) => !tag.startsWith(prefix))
  return next ? [...kept, next] : kept
}

function renderComplaintBody(output: Record<string, unknown>, mode: "complaint" | "inquiry" = "complaint") {
  const actions = Array.isArray(output.suggestedActions)
    ? output.suggestedActions.map((item) => `- ${String(item)}`).join("\n")
    : ""
  const legalBasis =
    output.legalBasis && typeof output.legalBasis === "object"
      ? output.legalBasis as Record<string, unknown>
      : null
  const legalText = legalBasis
    ? String(legalBasis.detail ?? legalBasis.summary ?? "관련 규정 없음")
    : null

  return [
    output.summary ? `## 요약\n${String(output.summary)}` : null,
    output.suggestedReply
      ? `${mode === "inquiry" ? "## 운영자 답변" : "## 응답 초안"}\n${String(output.suggestedReply)}`
      : null,
    legalText ? `## 법령 근거\n${legalText}` : null,
    actions ? `## 후속 조치\n${actions}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}

function isInquiryCaseKind(caseKind?: string) {
  return caseKind === "legal-inquiry" || caseKind === "quick-ask" || caseKind === "inquiry"
}

function isEventPlanOutput(output: Record<string, unknown>) {
  const recommendedFormat = typeof output.recommendedFormat === "string" ? output.recommendedFormat : ""
  const schedule = output.suggestedSchedule as Record<string, unknown> | undefined
  const scheduleType = typeof schedule?.type === "string" ? schedule.type : ""
  return recommendedFormat === "event-plan" || scheduleType === "special"
}

function renderSchedulerBody(output: Record<string, unknown>) {
  const schedule = output.suggestedSchedule as Record<string, unknown> | undefined
  const calendarAction = output.calendarAction as Record<string, unknown> | undefined
  const eventPlan = isEventPlanOutput(output)
  const planOutline = Array.isArray(output.planOutline)
    ? output.planOutline.map((item) => `- ${String(item)}`).join("\n")
    : ""
  const checklist = Array.isArray(output.checklist)
    ? output.checklist.map((item) => `- ${String(item)}`).join("\n")
    : ""
  const communicationPlan = Array.isArray(output.communicationPlan)
    ? output.communicationPlan.map((item) => `- ${String(item)}`).join("\n")
    : ""
  const riskNotes = Array.isArray(output.riskNotes)
    ? output.riskNotes.map((item) => `- ${String(item)}`).join("\n")
    : ""
  const actions = Array.isArray(output.suggestedActions)
    ? output.suggestedActions.map((item) => `- ${String(item)}`).join("\n")
    : ""

  return [
    output.summary ? `## ${eventPlan ? "운영 계획 요약" : "일정 제안 요약"}\n${String(output.summary)}` : null,
    output.objective ? `## 목표\n${String(output.objective)}` : null,
    planOutline ? `## 실행 계획\n${planOutline}` : null,
    schedule
      ? `## 제안 일정\n- 제목: ${String(schedule.title ?? "일정")}\n- 유형: ${String(schedule.type ?? "-")}\n- 시간: ${String(schedule.dayOfWeek ?? "-")} / ${String(schedule.startTime ?? "-")} - ${String(schedule.endTime ?? "-")}\n- 장소: ${String(schedule.room ?? "미정")}`
      : null,
    checklist ? `## 준비 체크리스트\n${checklist}` : null,
    communicationPlan ? `## 안내 및 커뮤니케이션\n${communicationPlan}` : null,
    calendarAction
      ? `## 캘린더 상태\n- provider: ${String(calendarAction.provider ?? "google-calendar")}\n- status: ${String(calendarAction.status ?? "pending_sync")}`
      : null,
    riskNotes ? `## 리스크 및 유의사항\n${riskNotes}` : null,
    actions ? `## 후속 조치\n${actions}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}

function renderRetentionBody(output: Record<string, unknown>) {
  const reasons = Array.isArray(output.reasons)
    ? output.reasons.map((item) => `- ${String(item)}`).join("\n")
    : Array.isArray(output.signals)
      ? output.signals.map((item) => `- ${String(item)}`).join("\n")
      : ""
  const actions = Array.isArray(output.recommendedActions)
    ? output.recommendedActions.map((item) => `- ${String(item)}`).join("\n")
    : ""

  return [
    output.riskLevel ? `## 위험도\n${String(output.riskLevel)} (${Math.round(Number(output.riskScore ?? 0) * 100)}%)` : null,
    reasons ? `## 감지 신호\n${reasons}` : null,
    actions ? `## 권장 조치\n${actions}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}

function renderOrchestratorBody(output: Record<string, unknown>) {
  const assignments = Array.isArray(output.assignments)
    ? output.assignments
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const row = item as Record<string, unknown>
          return `- ${String(row.agentId ?? "unknown")}: ${String(row.reason ?? "")}`
        })
        .filter(Boolean)
        .join("\n")
    : ""

  return [
    output.plan ? `## 실행 계획\n${String(output.plan)}` : null,
    assignments ? `## 배정\n${assignments}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")
}

function buildArtifact(
  agentType: string,
  caseIdentifier: string,
  output: Record<string, unknown>,
  options: {
    caseType?: string
    caseKind?: string
  } = {},
) {
  const inquiryMode = options.caseType === "inquiry" || isInquiryCaseKind(options.caseKind)
  const legalInquiryMode = options.caseKind === "legal-inquiry" || String(output.category ?? "") === "법률질문"

  if (agentType === "complaint") {
    return {
      title: inquiryMode
        ? `${caseIdentifier} ${legalInquiryMode ? "법률 질문 브리프" : "운영 질문 브리프"}`
        : `${caseIdentifier} 민원 응답 초안`,
      body: renderComplaintBody(output, inquiryMode ? "inquiry" : "complaint"),
      documentType: inquiryMode
        ? legalInquiryMode
          ? "legal-question-brief"
          : "inquiry-brief"
        : "complaint-reply",
    }
  }
  if (agentType === "scheduler") {
    const eventPlan = isEventPlanOutput(output)
    return {
      title: `${caseIdentifier} ${eventPlan ? "운영 계획서" : "일정 제안서"}`,
      body: renderSchedulerBody(output),
      documentType: "schedule-proposal",
    }
  }
  if (agentType === "retention") {
    return {
      title: `${caseIdentifier} 이탈 방지 메모`,
      body: renderRetentionBody(output),
      documentType: "retention-note",
    }
  }
  if (agentType === "orchestrator") {
    return {
      title: `${caseIdentifier} 작업 계획`,
      body: renderOrchestratorBody(output),
      documentType: "execution-plan",
    }
  }
  return null
}

export async function createCaseDocumentArtifact(
  db: Db,
  input: {
    organizationId: string
    caseId: string
    caseIdentifier: string
    opsGroupId?: string | null
    runId: string
    agentType: string
    caseType?: string
    caseKind?: string
    output: Record<string, unknown>
    status: "draft" | "approved" | "sent" | "failed"
  },
) {
  const artifact = buildArtifact(input.agentType, input.caseIdentifier, input.output, {
    caseType: input.caseType,
    caseKind: input.caseKind,
  })
  if (!artifact || !artifact.body.trim()) return null

  const allDocumentsInOrg = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.organizationId, input.organizationId))

  const matching = allDocumentsInOrg.filter((document) => {
    const tags = Array.isArray(document.tags) ? document.tags : []
    return tags.includes(`case:${input.caseId}`) && tags.includes(`artifact:${artifact.documentType}`)
  })

  const [existing, ...duplicates] = matching.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )

  for (const duplicate of duplicates) {
    await db.delete(schema.documents).where(eq(schema.documents.id, duplicate.id))
  }

  const nextTags = [
    `case:${input.caseId}`,
    ...(input.opsGroupId ? [`project:${input.opsGroupId}`] : []),
    `run:${input.runId}`,
    `artifact:${artifact.documentType}`,
    `status:${input.status}`,
  ]

  if (existing) {
    const currentTags = Array.isArray(existing.tags) ? existing.tags : []
    const updatedTags = replaceTag(
      replaceTag(
        replaceTag(currentTags, "project:", input.opsGroupId ? `project:${input.opsGroupId}` : null),
        "run:",
        `run:${input.runId}`,
      ),
      "status:",
      `status:${input.status}`,
    )
    const [updated] = await db
      .update(schema.documents)
      .set({
        title: artifact.title,
        body: artifact.body,
        tags: Array.from(new Set([...updatedTags, `case:${input.caseId}`, `artifact:${artifact.documentType}`])),
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, existing.id))
      .returning()

    await db.insert(schema.activityEvents).values({
      organizationId: input.organizationId,
      actorType: "agent",
      actorId: input.agentType,
      action: "document.updated",
      entityType: "document",
      entityId: updated.id,
      entityTitle: updated.title,
      metadata: {
        caseId: input.caseId,
        runId: input.runId,
        documentType: artifact.documentType,
        status: input.status,
      } as Record<string, unknown>,
    })

    return updated
  }

  const [document] = await db
    .insert(schema.documents)
    .values({
      organizationId: input.organizationId,
      title: artifact.title,
      body: artifact.body,
      category: "artifact",
      tags: nextTags,
    })
    .returning()

  await db.insert(schema.activityEvents).values({
    organizationId: input.organizationId,
    actorType: "agent",
    actorId: input.agentType,
    action: "document.created",
    entityType: "document",
    entityId: document.id,
    entityTitle: document.title,
    metadata: {
      caseId: input.caseId,
      runId: input.runId,
      documentType: artifact.documentType,
      status: input.status,
    } as Record<string, unknown>,
  })

  return document
}
