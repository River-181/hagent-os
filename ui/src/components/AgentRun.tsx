import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock3, Loader2 } from "lucide-react"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { WorkspaceEmptyState, WorkspaceSubtle } from "@/components/ui/workspace-surface"
import { StatusBadge, type RunStatus } from "@/components/StatusBadge"

type RunStep = {
  key: string
  label: string
  action: string
  timestamp: string
  status: "completed" | "in_progress" | "failed"
  durationMs: number | null
}

type LatestRunResponse = {
  run: {
    id: string
    caseTitle: string
    status: RunStatus
    startedAt?: string | null
    createdAt?: string | null
    durationMs?: number | null
    tokensUsed?: number | null
    excerpt?: string | null
  } | null
  steps: RunStep[]
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDuration(durationMs: number | null | undefined) {
  if (durationMs == null) return "-"
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function useLiveDuration(startedAt: string | null | undefined, fallbackDurationMs: number | null | undefined) {
  const [durationMs, setDurationMs] = useState(fallbackDurationMs ?? 0)

  useEffect(() => {
    if (!startedAt) {
      setDurationMs(fallbackDurationMs ?? 0)
      return
    }

    const startMs = new Date(startedAt).getTime()
    const tick = () => setDurationMs(Date.now() - startMs)
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, fallbackDurationMs])

  return durationMs
}

function StepStatusBadge({ status }: { status: RunStep["status"] }) {
  const styles =
    status === "failed"
      ? { backgroundColor: "var(--status-danger-soft)", color: "var(--color-danger)", label: "실패" }
      : status === "in_progress"
        ? { backgroundColor: "var(--accent-primary-soft)", color: "var(--accent-primary)", label: "진행 중" }
        : { backgroundColor: "var(--status-success-soft)", color: "var(--color-success)", label: "완료" }

  return (
    <Badge className="border-0 text-[11px]" style={{ backgroundColor: styles.backgroundColor, color: styles.color }}>
      {styles.label}
    </Badge>
  )
}

export function AgentRun({ agentId }: { agentId: string }) {
  const { data, isLoading, isError } = useQuery<LatestRunResponse>({
    queryKey: queryKeys.agents.latestRun(agentId),
    queryFn: () => agentsApi.getLatestRun(agentId),
    enabled: Boolean(agentId),
    refetchInterval: (query) => {
      const status = (query.state.data as LatestRunResponse | undefined)?.run?.status
      return status === "running" || status === "queued" ? 1500 : false
    },
  })

  if (isLoading) {
    return (
      <WorkspaceSubtle className="flex items-center gap-2 p-4 text-sm" style={{ color: "var(--text-tertiary)" }}>
        <Loader2 size={14} className="animate-spin" />
        최신 run 로그를 불러오는 중입니다.
      </WorkspaceSubtle>
    )
  }

  if (isError) {
    return (
      <WorkspaceSubtle className="p-4 text-sm" style={{ color: "var(--color-danger)" }}>
        최신 run 로그를 불러오지 못했습니다.
      </WorkspaceSubtle>
    )
  }

  const run = data?.run ?? null
  if (!run) {
    return (
      <WorkspaceEmptyState
        title="현재 run이 없습니다."
        description="하트비트 실행이나 태스크 지시 후 최신 단계 로그가 여기에 표시됩니다."
      />
    )
  }

  const liveDurationMs = useLiveDuration(
    run.status === "running" || run.status === "queued" ? (run.startedAt ?? run.createdAt ?? null) : null,
    run.durationMs ?? null,
  )

  return (
    <WorkspaceSubtle className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {run.caseTitle}
            </p>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            시작 {formatTimestamp(run.startedAt ?? run.createdAt ?? null)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} />
            {formatDuration(liveDurationMs)}
          </span>
          {typeof run.tokensUsed === "number" ? <span>{run.tokensUsed.toLocaleString()} tokens</span> : null}
        </div>
      </div>

      {run.excerpt ? (
        <div className="rounded-xl px-3 py-2 text-sm leading-6" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
          {run.excerpt}
        </div>
      ) : null}

      <div className="space-y-2">
        {data?.steps?.length ? data.steps.map((step) => (
          <div
            key={step.key}
            className="flex flex-col gap-2 rounded-xl border px-3 py-3 md:flex-row md:items-center md:justify-between"
            style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)" }}
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {step.label}
                </p>
                <StepStatusBadge status={step.status} />
              </div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {formatTimestamp(step.timestamp)}
              </p>
            </div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              단계 소요 {formatDuration(step.durationMs)}
            </div>
          </div>
        )) : (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            단계 로그가 아직 없습니다.
          </p>
        )}
      </div>
    </WorkspaceSubtle>
  )
}
