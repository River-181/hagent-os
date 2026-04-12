import type { ReactNode } from "react"

interface DashboardChartsProps {
  cases: any[]
  agents: any[]
  activity: any[]
}

type ChartMeta = {
  value: string
  label: string
}

function ChartTile({
  title,
  description,
  meta,
  children,
}: {
  title: string
  description: string
  meta?: ChartMeta
  children: ReactNode
}) {
  return (
    <section
      className="rounded-lg border px-4 py-4"
      style={{
        backgroundColor: "var(--bg-subtle)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
            {description}
          </p>
        </div>
        {meta ? (
          <div className="shrink-0 text-right">
            <div
              className="text-base font-semibold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {meta.value}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {meta.label}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function compactAgentLabel(value: unknown) {
  const label = String(value ?? "?").trim()
  if (!label) return "?"
  const firstToken = label.split(/\s+/)[0] ?? label
  return firstToken.length > 8 ? firstToken.slice(0, 8) : firstToken
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
    <div className="grid grid-cols-[60px_minmax(0,1fr)_28px] items-center gap-2">
      <span
        className="shrink-0 text-xs"
        style={{
          color: "var(--text-secondary)",
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div
        className="overflow-hidden rounded-full"
        style={{ height: 8, backgroundColor: "var(--bg-muted)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-right text-xs tabular-nums"
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
      return typeof ts === "string" && ts.startsWith(key)
    }).length
    days.push({ label, count })
  }

  const total = days.reduce((sum, day) => sum + day.count, 0)
  const peak = days.reduce((best, day) => (day.count > best.count ? day : best), days[0] ?? { label: "-", count: 0 })
  const maxCount = Math.max(...days.map((day) => day.count), 1)

  return (
    <ChartTile
      title="실행 활동 밀도"
      description="최근 7일 실행량."
      meta={{ value: `${total}`, label: peak.count > 0 ? `피크 ${peak.label}` : "합계" }}
    >
      <div className="flex items-end gap-1.5" style={{ height: 84 }}>
        {days.map((day) => {
          const heightPct = Math.max((day.count / maxCount) * 100, day.count === 0 ? 10 : 18)
          return (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-[4px]"
                style={{
                  height: `${heightPct}%`,
                  minHeight: 6,
                  maxHeight: 72,
                  backgroundColor: day.count === peak.count && day.count > 0 ? "var(--accent-primary)" : "var(--accent-primary-soft)",
                  border: day.count === peak.count && day.count > 0 ? "1px solid var(--accent-primary)" : "1px solid transparent",
                  opacity: day.count === 0 ? 0.5 : 1,
                }}
              />
              <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {day.label}
              </div>
            </div>
          )
        })}
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

  const dominantEntry = Object.entries(counts).sort((left, right) => right[1] - left[1])[0] ?? ["low", 0]
  const dominantLabelMap: Record<string, string> = {
    critical: "긴급",
    high: "높음",
    medium: "보통",
    low: "낮음",
  }
  const max = Math.max(...Object.values(counts), 1)

  return (
    <ChartTile
      title="긴급도 분포"
      description="우선순위 쏠림."
      meta={{ value: dominantLabelMap[dominantEntry[0]] ?? "없음", label: "최다 구간" }}
    >
      <div className="space-y-2.5">
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

  const active = counts.todo + counts.in_progress + counts.in_review
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
    <ChartTile
      title="처리 흐름 상태"
      description="현재 병목 구간."
      meta={{ value: `${active}`, label: "활성" }}
    >
      <div className="space-y-2.5">
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
    const runs: any[] = Array.isArray(agent.runs) ? agent.runs : []
    total += runs.length
    completed += runs.filter((run: any) => run.status === "completed").length
  }

  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  const agentBars = agents
    .map((agent: any) => {
      const runs: any[] = Array.isArray(agent.runs) ? agent.runs : []
      const done = runs.filter((run: any) => run.status === "completed").length
      const count = runs.length
      return {
        label: compactAgentLabel(agent.name ?? agent.slug ?? "?"),
        rate: count > 0 ? Math.round((done / count) * 100) : 0,
      }
    })
    .slice(0, 5)

  const rateColor =
    rate >= 80
      ? "var(--color-success)"
      : rate >= 50
        ? "var(--color-warning)"
        : "var(--color-danger)"

  return (
    <ChartTile
      title="완료 안정성"
      description="최근 완료율."
      meta={{ value: `${completed}/${total}`, label: "완료 / 전체" }}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[32px] font-bold leading-none tabular-nums" style={{ color: rateColor }}>
            {rate}%
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-end gap-1.5" style={{ height: 64 }}>
          {agentBars.length > 0 ? (
            agentBars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-[4px]"
                  style={{
                    height: `${Math.max(bar.rate, 8)}%`,
                    minHeight: 8,
                    maxHeight: 54,
                    backgroundColor:
                      bar.rate >= 80
                        ? "var(--color-success)"
                        : bar.rate >= 50
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                    opacity: bar.rate === 0 ? 0.35 : 1,
                  }}
                />
                <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {bar.label || "?"}
                </div>
              </div>
            ))
          ) : (
            <div className="w-full overflow-hidden rounded-full" style={{ height: 8, backgroundColor: "var(--bg-muted)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${rate}%`, backgroundColor: rateColor }}
              />
            </div>
          )}
        </div>
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
