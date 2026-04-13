import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { Bot, Brain, Shield, Heart, Calendar, Sparkles, Cpu, Cog, Lightbulb, Loader2 } from "lucide-react"

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        에이전트 팀
      </h1>

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
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {agents.map((agent: any) => {
            const s = statusLabel[agent.status] ?? statusLabel.idle
            const isRunning = agent.status === "running"
            const tokensUsed = agent.tokensThisMonth ?? agent.tokens_used ?? agent.tokensUsed ?? 0
            const IconComponent = agent.icon ? agentIconMap[agent.icon] : null
            const iconColor = agent.icon ? agentIconColor[agent.icon] : "var(--color-teal-500)"
            const agentType = agent.agentType ?? agent.type ?? ""

            return (
              <Link
                key={agent.id}
                to={`/${orgPrefix}/agents/${agent.id}`}
                className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: `1px solid ${isRunning ? "rgba(20,184,166,0.3)" : "var(--border-default)"}`,
                  boxShadow: "var(--shadow-sm)",
                  textDecoration: "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="flex items-center justify-center rounded-xl"
                      style={{
                        width: 40,
                        height: 40,
                        background: "var(--color-primary-bg)",
                      }}
                    >
                      {IconComponent
                        ? <IconComponent size={20} style={{ color: iconColor }} />
                        : <Bot size={20} style={{ color: "var(--color-teal-500)" }} />
                      }
                    </div>
                    {isRunning && (
                      <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[var(--bg-elevated)] animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {agent.name}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 text-xs mt-0.5 px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: s.bg, color: s.color }}
                    >
                      {isRunning && <Loader2 size={10} className="animate-spin" />}
                      {s.label}
                    </span>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                    {agent.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  {agentType && (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                    >
                      {agentType}
                    </span>
                  )}
                  {tokensUsed > 0 && (
                    <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>
                      {tokensUsed >= 1000 ? `${(tokensUsed / 1000).toFixed(1)}k` : tokensUsed} 토큰
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
