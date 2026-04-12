import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Coins, Bot, PieChart, TriangleAlert } from "lucide-react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { costsApi } from "@/api/costs"
import { queryKeys } from "@/lib/queryKeys"
import { MetricCard } from "@/components/MetricCard"
import { EmptyState } from "@/components/EmptyState"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

function HBar({ label, value, max, cost }: { label: string; value: number; max: number; cost: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <div className="text-right">
          <div className="text-xs tabular-nums" style={{ color: "var(--text-primary)" }}>{formatted} tokens</div>
          <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>₩{cost.toLocaleString("ko-KR")}</div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-tertiary)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "var(--color-teal-500)" }} />
      </div>
    </div>
  )
}

export function CostsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()

  useEffect(() => {
    setBreadcrumbs([{ label: "비용 분석" }])
  }, [setBreadcrumbs])

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.organizations.detail(selectedOrgId ?? ""), "costs", "summary"],
    queryFn: () => costsApi.summary(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const agentData = data?.agents ?? []
  const modelData = data?.models ?? []
  const maxTokens = agentData.length > 0 ? Math.max(...agentData.map((item) => item.totalTokens)) : 0

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>비용 분석</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
            토큰 사용량과 원화 추정 비용을 함께 봅니다.
          </p>
        </div>

        <div className="mb-8 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          <MetricCard icon={<Coins size={18} />} value={`${((data?.totalTokens ?? 0) / 1000).toFixed(1)}K`} label="이번 달 총 토큰" sub="모든 실행 합산" trend="up" />
          <MetricCard icon={<Bot size={18} />} value={`₩${(data?.totalEstimatedCostKrw ?? 0).toLocaleString("ko-KR")}`} label="추정 총 비용" sub="모델 단가 기준" trend="neutral" />
          <MetricCard icon={<PieChart size={18} />} value={`${data?.budgetUtilizationPct ?? 0}%`} label="월 예산 이용률" sub={data?.monthlyBudgetKrw ? `₩${data.monthlyBudgetKrw.toLocaleString("ko-KR")} 기준` : "월 예산 미설정"} trend="neutral" urgent={(data?.budgetUtilizationPct ?? 0) >= 80} />
          <MetricCard icon={<TriangleAlert size={18} />} value={String(data?.incidents.length ?? 0)} label="예산 인시던트" sub="한도 초과 또는 경고" trend={(data?.incidents.length ?? 0) > 0 ? "up" : "neutral"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
            <CardContent className="p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>에이전트별 사용량</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>실행 이벤트 기준</p>
              </div>
              {isLoading ? (
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
              ) : agentData.length === 0 ? (
                <EmptyState icon={<Bot size={20} />} title="사용량 데이터가 없습니다" description="에이전트 실행이 발생하면 여기에 누적됩니다." />
              ) : (
                agentData.map((agent) => (
                  <HBar key={agent.agentId} label={agent.name} value={agent.totalTokens} max={maxTokens} cost={agent.estimatedCostKrw} />
                ))
              )}
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-default)" }}>
            <CardContent className="p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>모델별 비용</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>입력/출력 토큰 단가 반영</p>
              </div>
              {modelData.length === 0 ? (
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>모델별 데이터가 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {modelData.map((item) => (
                    <div key={item.model} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.model}</div>
                          <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                            입력 {item.inputTokens.toLocaleString()} / 출력 {item.outputTokens.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            ₩{item.estimatedCostKrw.toLocaleString("ko-KR")}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {item.totalTokens.toLocaleString()} tokens
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
