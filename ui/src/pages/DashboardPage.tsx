import { useContext, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { agentsApi } from "@/api/agents"
import { approvalsApi } from "@/api/approvals"
import { schedulesApi } from "@/api/schedules"
import { activityApi } from "@/api/activity"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MetricCard } from "@/components/MetricCard"
import { ActiveAgentsPanel } from "@/components/ActiveAgentsPanel"
import { ActivityRow } from "@/components/ActivityRow"
import { InstructionBar } from "@/components/InstructionBar"
import { ToastContext } from "@/components/ToastContext"
import { orchestratorApi } from "@/api/orchestrator"
import { StatusIcon } from "@/components/StatusIcon"
import { PriorityIcon } from "@/components/PriorityIcon"
import { DashboardCharts } from "@/components/DashboardCharts"
import {
  Bot,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"

// ─── case type labels ─────────────────────────────────────────────────────────

const caseTypeLabel: Record<string, string> = {
  complaint: "민원",
  refund: "환불",
  makeup: "보강",
  inquiry: "문의",
  churn: "이탈",
  schedule: "일정",
}

function formatDateKey(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function matchesToday(schedule: Record<string, unknown>, today: Date, todayKey: string) {
  const candidates = [
    schedule.date,
    schedule.scheduleDate,
    schedule.scheduledDate,
    schedule.startsAt,
    schedule.startAt,
  ]

  if (candidates.some((value) => formatDateKey(value) === todayKey)) {
    return true
  }

  const normalizedDay = today.getDay() === 0 ? 0 : today.getDay()
  return Number(schedule.dayOfWeek ?? -1) === normalizedDay
}

// ─── Churn warning card ───────────────────────────────────────────────────────

function ChurnWarningCard({ c, orgPrefix }: { c: any; orgPrefix: string }) {
  const navigate = useNavigate()
  const score = c.riskScore ?? c.risk_score ?? null
  const studentName = c.studentName ?? c.student?.name ?? "학생"
  const grade = c.studentGrade ?? c.student?.grade ?? ""

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.2)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle
          size={16}
          style={{ color: "var(--color-danger)", flexShrink: 0 }}
        />
        <div className="min-w-0">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {studentName}
          </span>
          {grade && (
            <span
              className="ml-1.5 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              {grade}
            </span>
          )}
          {score != null && (
            <span
              className="ml-2 text-xs font-semibold"
              style={{ color: "var(--color-danger)" }}
            >
              위험도 {Math.round(score * 100)}%
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="text-xs shrink-0"
        onClick={() => navigate(`/${orgPrefix}/cases/${c.id}`)}
      >
        상담 일정 생성
      </Button>
    </div>
  )
}

// ─── Recent case row ──────────────────────────────────────────────────────────

function RecentCaseRow({ c, orgPrefix }: { c: any; orgPrefix: string }) {
  const navigate = useNavigate()
  const status = c.status ?? "backlog"
  const priority = c.priority ?? 4
  const typeLabel = caseTypeLabel[c.type ?? ""] ?? c.type ?? "문의"

  return (
    <button
      onClick={() => navigate(`/${orgPrefix}/cases/${c.id}`)}
      className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      <StatusIcon status={status} size={15} />
      <span
        className="flex-1 text-sm truncate"
        style={{ color: "var(--text-primary)" }}
      >
        {c.title ?? "제목 없음"}
      </span>
      <Badge
        className="text-xs border-0 shrink-0"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
        }}
      >
        {typeLabel}
      </Badge>
      <PriorityIcon priority={priority} size={14} />
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const [instruction, setInstruction] = useState("")

  const [lastDispatchResult, setLastDispatchResult] = useState<{
    plan: string
    runs: string[]
    caseId?: string
  } | null>(null)

  const dispatchMutation = useMutation({
    mutationFn: () =>
      orchestratorApi.dispatch({ instruction, organizationId: selectedOrgId! }),
    onSuccess: (data) => {
      setInstruction("")
      setLastDispatchResult(data)
      toast?.success(`오케스트레이터 실행 완료 — ${data.runs.length}개 에이전트 배정`)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(selectedOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(selectedOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedOrgId ?? "") })
      // Auto-dismiss after 8 seconds
      setTimeout(() => setLastDispatchResult(null), 8000)
    },
    onError: () => toast?.error("디스패치에 실패했습니다."),
  })

  useEffect(() => {
    setBreadcrumbs([{ label: "대시보드" }])
  }, [setBreadcrumbs])

  // ── queries ────────────────────────────────────────────────────────────────
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    queryFn: () => casesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: queryKeys.approvals.list(selectedOrgId ?? ""),
    queryFn: () => approvalsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: queryKeys.schedules.list(selectedOrgId ?? ""),
    queryFn: () => schedulesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.activity.list(selectedOrgId ?? ""),
    queryFn: () => activityApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  // ── derived ────────────────────────────────────────────────────────────────
  const activeCases = (cases as any[]).filter(
    (c: any) => c.status === "open" || c.status === "in_progress"
  )
  const pendingApprovals = (approvals as any[]).filter(
    (a: any) => a.status === "pending"
  )
  const runningAgents = (agents as any[]).filter(
    (a: any) => a.status === "running"
  )
  const todaySchedules = useMemo(() => {
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    return (schedules as any[]).filter((schedule) =>
      matchesToday(schedule as Record<string, unknown>, today, todayKey)
    )
  }, [schedules])
  const churnCases = (cases as any[]).filter((c: any) => c.type === "churn")

  const thisMonthTokens = (agents as any[]).reduce(
    (sum: number, a: any) => sum + (a.tokensThisMonth ?? a.tokens_used ?? 0),
    0
  )

  const recentCases = (cases as any[])
    .slice()
    .sort((a: any, b: any) => {
      const da = a.updatedAt ?? a.updated_at ?? ""
      const db = b.updatedAt ?? b.updated_at ?? ""
      return db.localeCompare(da)
    })
    .slice(0, 5)

  const recentActivity = (activity as any[]).slice(0, 10)

  // Collect all runs from agents for ActiveAgentsPanel
  const allRuns = (agents as any[]).flatMap(
    (a: any) =>
      (a.runs ?? []).map((r: any) => ({ ...r, agentId: a.id }))
  )

  // Agent mentions for InstructionBar
  const agentMentions = (agents as any[]).map((a: any) => ({
    id: a.id,
    name: a.name,
  }))

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Instruction bar */}
      <div
        className="px-6 py-3 min-h-0"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <InstructionBar
          agents={agentMentions}
          value={instruction}
          onChange={setInstruction}
          onSubmit={() => dispatchMutation.mutate()}
          loading={dispatchMutation.isPending}
          disabled={!selectedOrgId}
        />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 max-w-6xl mx-auto space-y-6 min-h-0">
          {/* Dispatch result banner */}
          {lastDispatchResult && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
              style={{
                backgroundColor: "rgba(20,184,166,0.06)",
                border: "1px solid rgba(20,184,166,0.2)",
              }}
            >
              <CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--color-teal-500)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--color-teal-500)" }}>
                  오케스트레이터 실행 완료
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {lastDispatchResult.plan}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {lastDispatchResult.runs.length}개 에이전트 실행 시작됨
                  </p>
                  {lastDispatchResult.caseId && (
                    <Link
                      to={`/${orgPrefix}/cases/${lastDispatchResult.caseId}`}
                      className="text-xs font-medium underline"
                      style={{ color: "var(--color-teal-500)" }}
                    >
                      케이스 보기
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={() => setLastDispatchResult(null)}
                className="text-xs shrink-0 px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                닫기
              </button>
            </div>
          )}

          {/* Active agents panel */}
          {(allRuns.length > 0 || runningAgents.length > 0) && (
            <ActiveAgentsPanel agents={agents as any[]} runs={allRuns} />
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              icon={<Bot size={18} />}
              value={runningAgents.length}
              label="실행 중 에이전트"
              description={`전체 ${agents.length}개`}
              href={`/${orgPrefix}/agents`}
              loading={agentsLoading}
            />
            <MetricCard
              icon={<FileText size={18} />}
              value={activeCases.length}
              label="진행 중 케이스"
              description={`전체 ${cases.length}건`}
              href={`/${orgPrefix}/cases`}
              loading={casesLoading}
            />
            <MetricCard
              icon={<Clock size={18} />}
              value={todaySchedules.length}
              label="오늘 일정"
              description="오늘 기준"
              href={`/${orgPrefix}/schedule`}
              loading={schedulesLoading}
            />
            <MetricCard
              icon={<CheckCircle size={18} />}
              value={pendingApprovals.length}
              label="승인 대기"
              description="처리 필요"
              href={`/${orgPrefix}/approvals`}
              trend={pendingApprovals.length > 0 ? "up" : "neutral"}
              loading={approvalsLoading}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DashboardCharts cases={cases as any[]} agents={agents as any[]} activity={activity as any[]} />
          </div>

          {/* Body: two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: churn warnings + recent cases */}
            <div className="lg:col-span-2 space-y-5">
              {/* Churn warnings */}
              {churnCases.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle
                      size={14}
                      style={{ color: "var(--color-danger)" }}
                    />
                    <h2
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      이탈 위험 학생
                    </h2>
                    <Badge
                      className="text-xs border-0"
                      style={{
                        backgroundColor: "rgba(239,68,68,0.1)",
                        color: "var(--color-danger)",
                      }}
                    >
                      {churnCases.length}명
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {churnCases.map((c: any) => (
                      <ChurnWarningCard
                        key={c.id}
                        c={c}
                        orgPrefix={orgPrefix ?? ""}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Recent cases */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    최근 케이스
                  </h2>
                  <button
                    onClick={() => window.location.assign(`/${orgPrefix}/cases`)}
                    className="text-xs"
                    style={{ color: "var(--color-teal-500)" }}
                  >
                    전체 보기
                  </button>
                </div>

                <div
                  className="rounded-xl px-2"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {casesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2
                        size={20}
                        className="animate-spin"
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    </div>
                  ) : recentCases.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <FileText
                        size={28}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        케이스가 없습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)]">
                      {recentCases.map((c: any) => (
                        <RecentCaseRow
                          key={c.id}
                          c={c}
                          orgPrefix={orgPrefix ?? ""}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right: recent activity */}
            <section className="space-y-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                최근 활동
              </h2>

              <div
                className="rounded-xl"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {activityLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2
                      size={20}
                      className="animate-spin"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <Clock
                      size={28}
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      활동 내역이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="px-3">
                    {recentActivity.map((item: any, i: number) => (
                      <ActivityRow
                        key={item.id ?? i}
                        event={item}
                        orgPrefix={orgPrefix}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
