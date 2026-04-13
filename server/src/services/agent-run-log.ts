import { desc, eq, inArray } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

const STEP_LABELS: Record<string, string> = {
  "run.queued": "대기열 등록",
  "run.started": "실행 시작",
  "approval.created": "승인 요청 생성",
  "run.completed": "실행 완료",
  "run.failed": "실행 실패",
  "run.cancelled": "실행 중지",
}

type AgentRunRecord = typeof schema.agentRuns.$inferSelect
type ActivityEventRecord = typeof schema.activityEvents.$inferSelect

function toIso(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toMs(value: Date | string | null | undefined) {
  if (!value) return null
  return new Date(value).getTime()
}

function getFinishedAt(run: AgentRunRecord) {
  if (run.completedAt) return run.completedAt
  if (run.status === "completed" || run.status === "pending_approval" || run.status === "failed") {
    return run.updatedAt
  }
  return null
}

function getDurationMs(run: AgentRunRecord) {
  const startedAt = toMs(run.startedAt ?? run.createdAt)
  if (!startedAt) return null
  const finishedAt = toMs(getFinishedAt(run))
  return (finishedAt ?? Date.now()) - startedAt
}

function summarizeRunOutput(run: AgentRunRecord) {
  if (typeof run.output === "string" && run.output.trim()) return run.output.slice(0, 280)
  if (run.output && typeof run.output === "object" && !Array.isArray(run.output)) {
    const output = run.output as Record<string, unknown>
    for (const key of ["draft", "summary", "reasoning", "message", "suggestedReply"]) {
      const value = output[key]
      if (typeof value === "string" && value.trim()) return value.slice(0, 280)
    }
  }
  if (typeof run.input === "string" && run.input.trim()) return run.input.slice(0, 280)
  if (run.error) return run.error
  return null
}

function buildBaseHistoryItem(
  run: AgentRunRecord,
  caseTitleById: Map<string, string>,
) {
  return {
    id: run.id,
    caseId: run.caseId,
    caseTitle: run.caseId ? caseTitleById.get(run.caseId) ?? "케이스 없음" : "케이스 없음",
    status: run.status,
    createdAt: toIso(run.createdAt),
    startedAt: toIso(run.startedAt),
    completedAt: toIso(run.completedAt),
    updatedAt: toIso(run.updatedAt),
    durationMs: getDurationMs(run),
    tokensUsed: run.tokensUsed,
    excerpt: summarizeRunOutput(run),
    error: run.error,
  }
}

function pushStep(
  steps: Array<{ action: string; label: string; timestamp: string; metadata?: Record<string, unknown> | null }>,
  action: string,
  timestamp: Date | string | null | undefined,
  metadata?: Record<string, unknown> | null,
) {
  const iso = toIso(timestamp)
  if (!iso) return
  const exists = steps.some((step) => step.action === action && step.timestamp === iso)
  if (exists) return
  steps.push({
    action,
    label: STEP_LABELS[action] ?? action,
    timestamp: iso,
    metadata: metadata ?? null,
  })
}

function buildRunSteps(run: AgentRunRecord, events: ActivityEventRecord[]) {
  const steps: Array<{ action: string; label: string; timestamp: string; metadata?: Record<string, unknown> | null }> = []
  pushStep(steps, "run.queued", run.createdAt, (run.input as Record<string, unknown> | null) ?? null)
  pushStep(steps, "run.started", run.startedAt)

  for (const event of events) {
    if (!STEP_LABELS[event.action]) continue
    pushStep(
      steps,
      event.action,
      event.createdAt,
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null,
    )
  }

  if (run.status === "pending_approval") {
    pushStep(steps, "approval.created", run.completedAt ?? run.updatedAt)
  } else if (run.status === "completed") {
    pushStep(steps, "run.completed", run.completedAt ?? run.updatedAt)
  } else if (run.status === "failed") {
    pushStep(steps, "run.failed", run.updatedAt, run.error ? { error: run.error } : null)
  }

  steps.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return steps.map((step, index) => {
    const nextTimestamp = steps[index + 1]?.timestamp ?? null
    const runEnded = run.status === "completed" || run.status === "pending_approval" || run.status === "failed"
    const stepEndMs = nextTimestamp
      ? new Date(nextTimestamp).getTime()
      : runEnded
        ? (toMs(getFinishedAt(run)) ?? Date.now())
        : Date.now()

    return {
      key: `${run.id}:${step.action}:${step.timestamp}`,
      action: step.action,
      label: step.label,
      timestamp: step.timestamp,
      status:
        index < steps.length - 1
          ? "completed"
          : run.status === "failed"
            ? "failed"
            : run.status === "running" || run.status === "queued"
              ? "in_progress"
              : "completed",
      durationMs: Math.max(0, stepEndMs - new Date(step.timestamp).getTime()),
      metadata: step.metadata ?? null,
    }
  })
}

export async function listAgentRunHistory(db: Db, agentId: string, limit = 20) {
  const runs = await db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.agentId, agentId))
    .orderBy(desc(schema.agentRuns.createdAt))
    .limit(limit)

  const caseIds = Array.from(new Set(runs.map((run) => run.caseId).filter((value): value is string => Boolean(value))))
  const cases = caseIds.length > 0
    ? await db.select({ id: schema.cases.id, title: schema.cases.title }).from(schema.cases).where(inArray(schema.cases.id, caseIds))
    : []
  const caseTitleById = new Map(cases.map((item) => [item.id, item.title]))

  return runs.map((run) => buildBaseHistoryItem(run, caseTitleById))
}

export async function getLatestAgentRunLog(db: Db, agentId: string) {
  const history = await listAgentRunHistory(db, agentId, 20)
  const latest = history[0] ?? null

  if (!latest) {
    return {
      run: null,
      steps: [],
      history,
    }
  }

  const [run] = await db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.id, latest.id))

  if (!run) {
    return {
      run: null,
      steps: [],
      history,
    }
  }

  const events = await db
    .select()
    .from(schema.activityEvents)
    .where(eq(schema.activityEvents.entityId, run.id))
    .orderBy(desc(schema.activityEvents.createdAt))

  return {
    run: latest,
    steps: buildRunSteps(run, [...events].reverse()),
    history,
  }
}
