import { useContext, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useActiveOrgId } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { agentsApi } from "@/api/agents"
import { approvalsApi } from "@/api/approvals"
import { schedulesApi } from "@/api/schedules"
import { activityApi } from "@/api/activity"
import { documentsApi } from "@/api/documents"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/MetricCard"
import { ActiveAgentsPanel } from "@/components/ActiveAgentsPanel"
import { ActivityRow } from "@/components/ActivityRow"
import { InstructionBar } from "@/components/InstructionBar"
import { ToastContext } from "@/components/ToastContext"
import { orchestratorApi } from "@/api/orchestrator"
import { StatusIcon } from "@/components/StatusIcon"
import { PriorityIcon } from "@/components/PriorityIcon"
import { DashboardCharts } from "@/components/DashboardCharts"
import { WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"
import {
  Bot,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
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

function isDoneCaseApproval(approval: any) {
  const caseStatus = approval?.case?.status ?? approval?.caseStatus ?? null
  return caseStatus === "done" || caseStatus === "closed" || caseStatus === "resolved"
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
        backgroundColor: "var(--status-danger-soft)",
        border: "1px solid var(--color-danger)",
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
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
      style={{ backgroundColor: "transparent" }}
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
          backgroundColor: "var(--bg-muted)",
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
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const activeOrgId = useActiveOrgId(orgPrefix)
  const navigate = useNavigate()
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
      orchestratorApi.dispatch({ instruction, organizationId: activeOrgId! }),
    onSuccess: (data) => {
      setInstruction("")
      setLastDispatchResult(data)
      toast?.success(`오케스트레이터 실행 완료 — ${data.runs.length}개 에이전트 배정`)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
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
    queryKey: queryKeys.cases.list(activeOrgId ?? ""),
    queryFn: () => casesApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: queryKeys.agents.list(activeOrgId ?? ""),
    queryFn: () => agentsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: queryKeys.approvals.list(activeOrgId ?? ""),
    queryFn: () => approvalsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: queryKeys.schedules.list(activeOrgId ?? ""),
    queryFn: () => schedulesApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.activity.list(activeOrgId ?? ""),
    queryFn: () => activityApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: queryKeys.documents.list(activeOrgId ?? ""),
    queryFn: () => documentsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  // ── derived ────────────────────────────────────────────────────────────────
  const activeCases = (cases as any[]).filter(
    (c: any) => c.status === "open" || c.status === "in_progress"
  )
  const pendingApprovals = (approvals as any[]).filter(
    (a: any) => a.status === "pending" && !isDoneCaseApproval(a)
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
  const recentInbound = (() => {
    const seen = new Set<string>()
    return (activity as any[])
      .filter((event: any) => event.action === "case.created_from_channel" || event.action === "case.appended_from_channel")
      .filter((event: any) => {
        const key = String(event.entityId ?? event.metadata?.caseId ?? event.id ?? "")
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  })()
  const recentDocuments = (() => {
    const seen = new Set<string>()
    return (documents as any[])
      .slice()
      .sort((a: any, b: any) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
      .filter((document: any) => {
        const linkedCaseId = String(document.linkedCase?.id ?? "")
        const key = linkedCaseId
          ? `case:${linkedCaseId}:${document.documentRole ?? ""}`
          : `doc:${String(document.title ?? "").trim().toLowerCase()}:${document.documentRole ?? ""}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  })()

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
    <div className="flex h-full min-h-0 flex-col gap-6 p-6 md:p-8">
      <WorkspaceHeader
        title="대시보드"
        description="오케스트레이터 상태와 최근 흐름을 한 화면에서 확인합니다."
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/${orgPrefix}/assistant`)}
          >
            <Sparkles size={13} />
            Assistant 열기
          </Button>
        }
      />

      <WorkspacePanel className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              운영 지시
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              한 줄 지시를 넣고, 실행 결과와 후속 상태를 바로 확인합니다.
            </p>
          </div>
        </div>
        <InstructionBar
          agents={agentMentions}
          value={instruction}
          onChange={setInstruction}
          onSubmit={() => dispatchMutation.mutate()}
          loading={dispatchMutation.isPending}
          disabled={!activeOrgId}
          placeholder="오케스트레이터에게 지시하기..."
        />
      </WorkspacePanel>

      {lastDispatchResult && (
        <WorkspacePanel className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                오케스트레이터 실행 완료
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                {lastDispatchResult.plan}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {lastDispatchResult.runs.length}개 에이전트 실행 시작됨
                </p>
                {lastDispatchResult.caseId && (
                  <Link
                    to={`/${orgPrefix}/cases/${lastDispatchResult.caseId}`}
                    className="text-xs font-medium"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    케이스 보기
                  </Link>
                )}
              </div>
            </div>
            <button
              onClick={() => setLastDispatchResult(null)}
              className="rounded px-2 py-1 text-xs transition-colors"
              style={{ color: "var(--text-tertiary)", backgroundColor: "transparent" }}
            >
              닫기
            </button>
          </div>
        </WorkspacePanel>
      )}

      {(allRuns.length > 0 || runningAgents.length > 0) && (
        <ActiveAgentsPanel agents={agents as any[]} runs={allRuns} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={<Bot size={18} />}
          value={runningAgents.length}
          label="실행 중 에이전트"
          href={`/${orgPrefix}/agents`}
          loading={agentsLoading}
        />
        <MetricCard
          icon={<FileText size={18} />}
          value={activeCases.length}
          label="진행 중 케이스"
          href={`/${orgPrefix}/cases`}
          loading={casesLoading}
        />
        <MetricCard
          icon={<Clock size={18} />}
          value={todaySchedules.length}
          label="오늘 일정"
          href={`/${orgPrefix}/schedule`}
          loading={schedulesLoading}
        />
        <MetricCard
          icon={<CheckCircle size={18} />}
          value={pendingApprovals.length}
          label="승인 대기"
          href={`/${orgPrefix}/approvals`}
          trend={pendingApprovals.length > 0 ? "up" : "neutral"}
          loading={approvalsLoading}
        />
      </div>

      <WorkspacePanel className="p-4">
        <DashboardCharts cases={cases as any[]} agents={agents as any[]} activity={activity as any[]} />
      </WorkspacePanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {churnCases.length > 0 && (
            <WorkspacePanel className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: "var(--color-danger)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  이탈 위험 학생
                </h2>
              </div>
              <div className="space-y-2">
                {churnCases.map((c: any) => (
                  <ChurnWarningCard key={c.id} c={c} orgPrefix={orgPrefix ?? ""} />
                ))}
              </div>
            </WorkspacePanel>
          )}

          <WorkspacePanel className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                최근 케이스
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => window.location.assign(`/${orgPrefix}/cases`)}
              >
                전체 보기
              </Button>
            </div>
            <div className="px-2">
              {casesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
                </div>
              ) : recentCases.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <FileText size={28} style={{ color: "var(--text-tertiary)" }} />
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                    케이스가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                  {recentCases.map((c: any) => (
                    <RecentCaseRow key={c.id} c={c} orgPrefix={orgPrefix ?? ""} />
                  ))}
                </div>
              )}
            </div>
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <WorkspacePanel className="overflow-hidden">
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                최근 인바운드
              </h2>
            </div>
            {recentInbound.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Clock size={24} style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  최근 인바운드가 없습니다.
                </p>
              </div>
            ) : (
              <div className="px-3">
                {recentInbound.map((item: any, i: number) => (
                  <ActivityRow key={item.id ?? i} event={item} orgPrefix={orgPrefix} />
                ))}
              </div>
            )}
          </WorkspacePanel>

          <WorkspacePanel className="overflow-hidden">
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                최근 문서
              </h2>
            </div>
            {documentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <FileText size={24} style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  최근 문서가 없습니다.
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                {recentDocuments.map((document: any) => (
                  <Link
                    key={document.id}
                    to={`/${orgPrefix}/documents`}
                    className="block px-4 py-3 transition-colors"
                  >
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {document.title}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {document.category} · {new Date(document.updatedAt).toLocaleDateString("ko-KR")}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </WorkspacePanel>

          <WorkspacePanel className="overflow-hidden">
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                최근 활동
              </h2>
            </div>
            {activityLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Clock size={28} style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  활동 내역이 없습니다.
                </p>
              </div>
            ) : (
              <div className="px-3">
                {recentActivity.map((item: any, i: number) => (
                  <ActivityRow key={item.id ?? i} event={item} orgPrefix={orgPrefix} />
                ))}
              </div>
            )}
          </WorkspacePanel>
        </div>
      </div>
    </div>
  )
}
