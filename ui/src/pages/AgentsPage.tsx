import { useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import {
  Activity,
  ArrowUpRight,
  Bot,
  Brain,
  Calendar,
  Clock3,
  Cog,
  Cpu,
  FileText,
  Heart,
  Lightbulb,
  Loader2,
  Radio,
  Shield,
  Sparkles,
} from "lucide-react"

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: "대기중", color: "var(--text-tertiary)", bg: "var(--bg-tertiary)" },
  running: { label: "실행중", color: "var(--color-success)", bg: "rgba(3,178,108,0.1)" },
  error: { label: "오류", color: "var(--color-danger)", bg: "rgba(240,68,82,0.1)" },
  paused: { label: "일시정지", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
}

const agentIconMap: Record<string, React.FC<{ size: number; style?: React.CSSProperties }>> = {
  brain: Brain,
  shield: Shield,
  heart: Heart,
  calendar: Calendar,
  sparkles: Sparkles,
  cpu: Cpu,
  cog: Cog,
  lightbulb: Lightbulb,
}

const agentIconColor: Record<string, string> = {
  brain: "var(--color-teal-500)",
  shield: "var(--color-teal-500)",
  heart: "#ef4444",
  calendar: "#8b5cf6",
  sparkles: "#f59e0b",
  cpu: "#3b82f6",
  cog: "#6b7280",
  lightbulb: "#10b981",
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "기록 없음"
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export function AgentsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const { selectedOrgId } = useOrganization()

  useEffect(() => {
    setBreadcrumbs([{ label: "에이전트 팀" }])
  }, [setBreadcrumbs])

  const { data: agents = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const runningCount = useMemo(
    () => agents.filter((agent: any) => agent.status === "running").length,
    [agents],
  )

  const recentRunCount = useMemo(
    () => agents.reduce((sum: number, agent: any) => sum + (Array.isArray(agent.recentRuns) ? agent.recentRuns.length : 0), 0),
    [agents],
  )

  return (
    <div className="mx-auto max-w-[1500px] p-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-tertiary)" }}>
            Agent activity
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            에이전트 팀
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            에이전트별 최근 실행, 마지막 초안, 처리 중인 케이스를 한 화면에서 확인합니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>전체 에이전트</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{agents.length}명</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "rgba(3,178,108,0.18)" }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>실행 중</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: "var(--color-success)" }}>{runningCount}명</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>최근 run</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{recentRunCount}건</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          로딩 중...
        </p>
      ) : isError ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          에이전트를 불러오는 데 실패했습니다.
        </p>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Bot size={40} style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            등록된 에이전트가 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {agents.map((agent: any) => {
            const s = statusLabel[agent.status] ?? statusLabel.idle
            const isRunning = agent.status === "running"
            const tokensUsed = agent.tokensThisMonth ?? agent.tokens_used ?? agent.tokensUsed ?? 0
            const IconComponent = agent.icon ? agentIconMap[agent.icon] : null
            const iconColor = agent.icon ? agentIconColor[agent.icon] : "var(--color-teal-500)"
            const agentType = agent.agentType ?? agent.type ?? ""
            const recentRuns = Array.isArray(agent.recentRuns) ? agent.recentRuns : []
            const recentSummary = typeof agent.recentActivitySummary === "string" ? agent.recentActivitySummary : null
            const lastRunAt = timeAgo(agent.lastRunAt)

            return (
              <Link
                key={agent.id}
                to={`/${orgPrefix}/agents/${agent.id}`}
                className="flex flex-col gap-4 rounded-[24px] p-5 transition-colors"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: `1px solid ${isRunning ? "rgba(20,184,166,0.3)" : "var(--border-default)"}`,
                  boxShadow: "var(--shadow-sm)",
                  textDecoration: "none",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className="flex items-center justify-center rounded-xl"
                        style={{
                          width: 42,
                          height: 42,
                          background: "var(--color-primary-bg)",
                        }}
                      >
                        {IconComponent
                          ? <IconComponent size={20} style={{ color: iconColor }} />
                          : <Bot size={20} style={{ color: "var(--color-teal-500)" }} />
                        }
                      </div>
                      {isRunning ? (
                        <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[var(--bg-elevated)] animate-pulse" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {agent.name}
                        </p>
                        {agentType ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px]"
                            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                          >
                            {agentType}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {recentRuns[0]?.status === "running" ? "실행 중인 run이 있습니다" : `마지막 활동 ${lastRunAt}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs"
                      style={{ backgroundColor: s.bg, color: s.color }}
                    >
                      {isRunning ? <Loader2 size={10} className="animate-spin" /> : null}
                      {s.label}
                    </span>
                    <ArrowUpRight size={14} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </div>

                <div
                  className="rounded-2xl border px-4 py-3"
                  style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    <Activity size={12} />
                    마지막 응답
                  </div>
                  {recentSummary ? (
                    <p
                      className="text-sm leading-6"
                      style={{
                        color: "var(--text-primary)",
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {recentSummary}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                      최근 transcript가 아직 없습니다.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  {recentRuns.length > 0 ? recentRuns.map((run: any) => (
                    <div
                      key={run.id}
                      className="rounded-2xl border px-4 py-3"
                      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-primary)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {run.caseTitle}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {timeAgo(run.completedAt ?? run.startedAt ?? run.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px]"
                            style={{
                              backgroundColor:
                                run.status === "completed" || run.status === "pending_approval"
                                  ? "rgba(3,178,108,0.1)"
                                  : run.status === "failed"
                                  ? "rgba(240,68,82,0.1)"
                                  : "var(--bg-tertiary)",
                              color:
                                run.status === "completed" || run.status === "pending_approval"
                                  ? "var(--color-success)"
                                  : run.status === "failed"
                                  ? "var(--color-danger)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {run.status}
                          </span>
                          {typeof run.tokensUsed === "number" && run.tokensUsed > 0 ? (
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              {run.tokensUsed.toLocaleString()} tok
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {run.excerpt ? (
                        <p
                          className="mt-2 text-xs leading-5"
                          style={{
                            color: "var(--text-secondary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {run.excerpt}
                        </p>
                      ) : null}
                    </div>
                  )) : (
                    <div
                      className="rounded-2xl border px-4 py-5 text-sm"
                      style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
                    >
                      최근 실행 기록이 없습니다.
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    {lastRunAt}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Radio size={12} />
                    {recentRuns.length}개 run
                  </span>
                  {tokensUsed > 0 ? (
                    <span className="ml-auto inline-flex items-center gap-1">
                      <FileText size={12} />
                      {tokensUsed >= 1000 ? `${(tokensUsed / 1000).toFixed(1)}k` : tokensUsed} 토큰
                    </span>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
