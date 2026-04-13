import { History } from "lucide-react"
import { StatusBadge, type RunStatus } from "@/components/StatusBadge"
import { WorkspaceEmptyState, WorkspaceSubtle } from "@/components/ui/workspace-surface"

type RunLogItem = {
  id: string
  caseTitle: string
  status: RunStatus
  startedAt?: string | null
  createdAt?: string | null
  completedAt?: string | null
  durationMs?: number | null
  excerpt?: string | null
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(durationMs: number | null | undefined) {
  if (durationMs == null) return "-"
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function RunLog({ runs }: { runs: RunLogItem[] }) {
  if (!runs.length) {
    return (
      <WorkspaceEmptyState
        title="실행 이력이 없습니다."
        description="에이전트가 작업을 시작하면 최근 run 기록이 여기에 쌓입니다."
      />
    )
  }

  return (
    <WorkspaceSubtle className="overflow-hidden p-0">
      <div className="divide-y divide-[var(--border-default)]">
        {runs.map((run) => (
          <div key={run.id} className="space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {run.caseTitle}
                  </p>
                  <StatusBadge status={run.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span className="inline-flex items-center gap-1">
                    <History size={12} />
                    {formatTimestamp(run.startedAt ?? run.createdAt ?? null)}
                  </span>
                  <span>소요 {formatDuration(run.durationMs)}</span>
                </div>
              </div>
              {run.completedAt ? (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  종료 {formatTimestamp(run.completedAt)}
                </p>
              ) : null}
            </div>
            {run.excerpt ? (
              <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                {run.excerpt}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </WorkspaceSubtle>
  )
}
