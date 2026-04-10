// v0.3.0
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { MetricCard } from "@/components/MetricCard"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Coins, Bot, TrendingDown, PieChart } from "lucide-react"

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_TOKEN_DATA = [
  { name: "오케스트레이터", tokens: 142000 },
  { name: "민원 처리", tokens: 98500 },
  { name: "이탈방지", tokens: 76200 },
  { name: "신규 상담", tokens: 54300 },
]

// ─── HBar ────────────────────────────────────────────────────────────────────

function HBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        className="text-xs shrink-0 text-right"
        style={{ color: "var(--text-secondary)", width: 72 }}
      >
        {label}
      </span>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 8, backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: "var(--color-teal-500)" }}
        />
      </div>
      <span
        className="text-xs tabular-nums shrink-0"
        style={{ color: "var(--text-tertiary)", minWidth: 36, textAlign: "right" }}
      >
        {formatted}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CostsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()

  useEffect(() => {
    setBreadcrumbs([{ label: "비용 분석" }])
  }, [setBreadcrumbs])

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  // Build token data from real agents, fall back if no data
  const agentTokenData = (agents as any[]).length > 0
    ? (agents as any[]).map((a: any) => ({
        name: a.name,
        tokens: a.tokensThisMonth ?? a.tokens_used ?? a.tokensUsed ?? Math.floor(Math.random() * 100000 + 10000),
      })).sort((a, b) => b.tokens - a.tokens)
    : FALLBACK_TOKEN_DATA

  const totalTokens = agentTokenData.reduce((sum, a) => sum + a.tokens, 0)
  const avgTokens = Math.round(totalTokens / agentTokenData.length)
  const maxTokens = Math.max(...agentTokenData.map((a) => a.tokens))
  const budgetLimit = 500000
  const budgetUtilization = Math.round((totalTokens / budgetLimit) * 100)

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            비용 분석
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            2026년 4월 기준
          </p>
        </div>

        {/* Metric cards */}
        <div
          className="grid gap-4 mb-8"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          <MetricCard
            icon={<Coins size={18} />}
            value={`${(totalTokens / 1000).toFixed(0)}K`}
            label="이번 달 총 토큰"
            sub="모든 에이전트 합산"
            trend="up"
          />
          <MetricCard
            icon={<Bot size={18} />}
            value={`${(avgTokens / 1000).toFixed(1)}K`}
            label="에이전트별 평균"
            sub="에이전트당 토큰"
            trend="neutral"
          />
          <MetricCard
            icon={<TrendingDown size={18} />}
            value="₩0.8"
            label="케이스당 비용"
            sub="평균 처리 비용"
            trend="down"
          />
          <MetricCard
            icon={<PieChart size={18} />}
            value={`${budgetUtilization}%`}
            label="예산 이용률"
            sub={`${budgetUtilization}% 사용됨`}
            trend="neutral"
            urgent={budgetUtilization >= 80}
          />
        </div>

        {/* Agent token chart */}
        <Card className="mb-6" style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  에이전트별 토큰 사용량
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  이번 달 누적
                </p>
              </div>
            </div>
            {agentTokenData.map((agent) => (
              <HBar key={agent.name} label={agent.name} value={agent.tokens} max={maxTokens} />
            ))}
          </CardContent>
        </Card>

        {/* Budget progress bar */}
        <Card className="mb-6" style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                월간 예산
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: budgetUtilization >= 80 ? "var(--color-danger)" : "var(--text-primary)" }}>
                {budgetUtilization}%
              </p>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 10, backgroundColor: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${budgetUtilization}%`,
                  backgroundColor: budgetUtilization >= 80 ? "var(--color-danger)" : budgetUtilization >= 60 ? "#f59e0b" : "var(--color-teal-500)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                ₩{(totalTokens * 0.002).toFixed(0)} 사용
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                총 예산 ₩1,000
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
          상세 비용 분석은 준비 중입니다.
        </p>
      </div>
    </ScrollArea>
  )
}
