import { Card, CardContent } from "@/components/ui/card"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardChartsProps {
  cases: any[]
  agents: any[]
  activity: any[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function HBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="text-xs shrink-0"
        style={{ color: "var(--text-secondary)", width: 52, textAlign: "right" }}
      >
        {label}
      </span>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 6, backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)", minWidth: 20, textAlign: "right" }}>
        {value}
      </span>
    </div>
  )
}

// ─── Run Activity Chart ───────────────────────────────────────────────────────

export function RunActivityChart({ activity }: { activity: any[] }) {
  // Build last 7 days buckets
  const now = new Date()
  const days: { label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const count = activity.filter((ev: any) => {
      const ts = ev.createdAt ?? ev.created_at ?? ev.timestamp ?? ""
      return ts.startsWith(key)
    }).length
    days.push({ label, count })
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1)

  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>
          실행 활동
        </div>
        <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
          Last 7 days
        </div>
        <div className="flex items-end gap-1" style={{ height: 56 }}>
          {days.map((d, i) => {
            const heightPct = Math.max((d.count / maxCount) * 100, 4)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: "var(--color-teal-500)",
                    minHeight: 3,
                    maxHeight: 48,
                    opacity: d.count === 0 ? 0.25 : 1,
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1 mt-1">
          {days.map((d, i) => (
            <div key={i} className="flex-1 text-center" style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
              {d.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Priority Chart ───────────────────────────────────────────────────────────

export function PriorityChart({ cases }: { cases: any[] }) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const c of cases) {
    const p = c.priority
    if (p === 1) counts.critical++
    else if (p === 2) counts.high++
    else if (p === 3) counts.medium++
    else counts.low++
  }
  const max = Math.max(...Object.values(counts), 1)

  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>
          우선순위별 케이스
        </div>
        <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
          Priority breakdown
        </div>
        <HBar label="긴급" value={counts.critical} max={max} color="#ef4444" />
        <HBar label="높음" value={counts.high} max={max} color="#f97316" />
        <HBar label="보통" value={counts.medium} max={max} color="#eab308" />
        <HBar label="낮음" value={counts.low} max={max} color="#3b82f6" />
      </CardContent>
    </Card>
  )
}

// ─── Status Chart ─────────────────────────────────────────────────────────────

export function StatusChart({ cases }: { cases: any[] }) {
  const counts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    blocked: 0,
    done: 0,
  }
  for (const c of cases) {
    const s = c.status ?? "backlog"
    if (s in counts) counts[s]++
  }
  const max = Math.max(...Object.values(counts), 1)

  const rows: { label: string; key: string; color: string }[] = [
    { label: "백로그", key: "backlog", color: "var(--text-tertiary)" },
    { label: "할 일", key: "todo", color: "#3b82f6" },
    { label: "진행 중", key: "in_progress", color: "var(--color-teal-500)" },
    { label: "검토 중", key: "in_review", color: "#a855f7" },
    { label: "차단됨", key: "blocked", color: "var(--color-danger)" },
    { label: "완료", key: "done", color: "var(--color-success)" },
  ]

  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>
          상태별 케이스
        </div>
        <div className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
          Status breakdown
        </div>
        {rows.map((r) => (
          <HBar key={r.key} label={r.label} value={counts[r.key]} max={max} color={r.color} />
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Success Rate Chart ───────────────────────────────────────────────────────

export function SuccessRateChart({ agents }: { agents: any[] }) {
  let total = 0
  let completed = 0
  for (const a of agents) {
    const runs: any[] = a.runs ?? []
    total += runs.length
    completed += runs.filter((r: any) => r.status === "completed").length
  }
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  // Build a mini vertical bar chart for each agent
  const agentBars = agents.slice(0, 7).map((a: any) => {
    const runs: any[] = a.runs ?? []
    const c = runs.filter((r: any) => r.status === "completed").length
    const t = runs.length
    return { name: a.name?.slice(0, 4) ?? "?", rate: t > 0 ? (c / t) * 100 : 0 }
  })

  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>
          성공률
        </div>
        <div className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>
          에이전트 완료율
        </div>
        <div
          className="text-2xl font-bold mb-3 tabular-nums"
          style={{ color: rate >= 80 ? "var(--color-success)" : rate >= 50 ? "#f97316" : "var(--color-danger)" }}
        >
          {rate}%
        </div>
        {agentBars.length > 0 ? (
          <div className="flex items-end gap-1" style={{ height: 40 }}>
            {agentBars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max(b.rate, 4)}%`,
                    backgroundColor: b.rate >= 80 ? "var(--color-success)" : b.rate >= 50 ? "#f97316" : "var(--color-danger)",
                    minHeight: 3,
                    maxHeight: 36,
                    opacity: b.rate === 0 ? 0.25 : 1,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: 6, backgroundColor: "var(--bg-tertiary)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${rate}%`,
                backgroundColor: rate >= 80 ? "var(--color-success)" : rate >= 50 ? "#f97316" : "var(--color-danger)",
              }}
            />
          </div>
        )}
        <div className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
          {completed} / {total} 완료
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Default export (all 4 together) ─────────────────────────────────────────

export function DashboardCharts({ cases, agents, activity }: DashboardChartsProps) {
  return (
    <>
      <RunActivityChart activity={activity} />
      <PriorityChart cases={cases} />
      <StatusChart cases={cases} />
      <SuccessRateChart agents={agents} />
    </>
  )
}
