interface DashboardChartsProps {
  cases: any[]
  agents: any[]
  activity: any[]
}

function ChartTile({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "var(--bg-subtle)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

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
    <div className="flex items-center gap-2">
      <span
        className="shrink-0 text-xs"
        style={{
          color: "var(--text-secondary)",
          width: 52,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{ height: 6, backgroundColor: "var(--bg-muted)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="min-w-[20px] text-right text-xs tabular-nums"
        style={{ color: "var(--text-tertiary)" }}
      >
        {value}
      </span>
    </div>
  )
}

function RunActivityChart({ activity }: { activity: any[] }) {
  const now = new Date()
  const days: { label: string; count: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    const key = day.toISOString().slice(0, 10)
    const label = `${day.getMonth() + 1}/${day.getDate()}`
    const count = activity.filter((ev: any) => {
      const ts = ev.createdAt ?? ev.created_at ?? ev.timestamp ?? ""
      return ts.startsWith(key)
    }).length
    days.push({ label, count })
  }

  const maxCount = Math.max(...days.map((day) => day.count), 1)

  return (
    <ChartTile title="실행 활동" description="최근 7일 실행량">
      <div className="flex items-end gap-1" style={{ height: 56 }}>
        {days.map((day) => {
          const heightPct = Math.max((day.count / maxCount) * 100, 4)
          return (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${heightPct}%`,
                  minHeight: 3,
                  maxHeight: 48,
                  backgroundColor: "var(--color-primary)",
                  opacity: day.count === 0 ? 0.25 : 1,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {days.map((day) => (
          <div
            key={day.label}
            className="flex-1 text-center text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {day.label}
          </div>
        ))}
      </div>
    </ChartTile>
  )
}

function PriorityChart({ cases }: { cases: any[] }) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }

  for (const item of cases) {
    const priority = item.priority
    if (priority === 1) counts.critical++
    else if (priority === 2) counts.high++
    else if (priority === 3) counts.medium++
    else counts.low++
  }

  const max = Math.max(...Object.values(counts), 1)

  return (
    <ChartTile title="우선순위별 케이스" description="Priority breakdown">
      <div className="space-y-2">
        <HBar label="긴급" value={counts.critical} max={max} color="var(--color-danger)" />
        <HBar label="높음" value={counts.high} max={max} color="var(--color-warning)" />
        <HBar label="보통" value={counts.medium} max={max} color="var(--color-info)" />
        <HBar label="낮음" value={counts.low} max={max} color="var(--color-primary)" />
      </div>
    </ChartTile>
  )
}

function StatusChart({ cases }: { cases: any[] }) {
  const counts: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    blocked: 0,
    done: 0,
  }

  for (const item of cases) {
    const status = item.status ?? "backlog"
    if (status in counts) counts[status]++
  }

  const max = Math.max(...Object.values(counts), 1)

  const rows: { label: string; key: string; color: string }[] = [
    { label: "백로그", key: "backlog", color: "var(--text-tertiary)" },
    { label: "할 일", key: "todo", color: "var(--color-info)" },
    { label: "진행 중", key: "in_progress", color: "var(--color-primary)" },
    { label: "검토 중", key: "in_review", color: "var(--color-warning)" },
    { label: "차단됨", key: "blocked", color: "var(--color-danger)" },
    { label: "완료", key: "done", color: "var(--color-success)" },
  ]

  return (
    <ChartTile title="상태별 케이스" description="Status breakdown">
      <div className="space-y-2">
        {rows.map((row) => (
          <HBar
            key={row.key}
            label={row.label}
            value={counts[row.key]}
            max={max}
            color={row.color}
          />
        ))}
      </div>
    </ChartTile>
  )
}

function SuccessRateChart({ agents }: { agents: any[] }) {
  let total = 0
  let completed = 0

  for (const agent of agents) {
    const runs: any[] = agent.runs ?? []
    total += runs.length
    completed += runs.filter((run: any) => run.status === "completed").length
  }

  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  const agentBars = agents.slice(0, 7).map((agent: any) => {
    const runs: any[] = agent.runs ?? []
    const done = runs.filter((run: any) => run.status === "completed").length
    const count = runs.length
    return { name: agent.name?.slice(0, 4) ?? "?", rate: count > 0 ? (done / count) * 100 : 0 }
  })

  const rateColor =
    rate >= 80
      ? "var(--color-success)"
      : rate >= 50
        ? "var(--color-warning)"
        : "var(--color-danger)"

  return (
    <ChartTile title="성공률" description="에이전트 완료율">
      <div className="text-2xl font-semibold tabular-nums" style={{ color: rateColor }}>
        {rate}%
      </div>
      <div className="mt-3">
        {agentBars.length > 0 ? (
          <div className="flex items-end gap-1" style={{ height: 40 }}>
            {agentBars.map((bar) => (
              <div key={bar.name} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max(bar.rate, 4)}%`,
                    minHeight: 3,
                    maxHeight: 36,
                    backgroundColor: bar.rate >= 80 ? "var(--color-success)" : bar.rate >= 50 ? "var(--color-warning)" : "var(--color-danger)",
                    opacity: bar.rate === 0 ? 0.25 : 1,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-full" style={{ height: 6, backgroundColor: "var(--bg-muted)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${rate}%`, backgroundColor: rateColor }}
            />
          </div>
        )}
      </div>
      <div className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
        {completed} / {total} 완료
      </div>
    </ChartTile>
  )
}

export function DashboardCharts({ cases, agents, activity }: DashboardChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <RunActivityChart activity={activity} />
      <PriorityChart cases={cases} />
      <StatusChart cases={cases} />
      <SuccessRateChart agents={agents} />
    </div>
  )
}
