// v0.3.0
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { projectsApi } from "@/api/projects"
import { agentsApi } from "@/api/agents"
import { ToastContext } from "@/components/ToastContext"
import { queryKeys } from "@/lib/queryKeys"
import { CaseTypeBadge } from "@/components/CaseTypeBadge"
import { CaseSeverityBadge } from "@/components/CaseSeverityBadge"
import { StatusIcon, type CaseStatus } from "@/components/StatusIcon"
import { FolderKanban, CalendarDays, Layers, FileText, UserPlus, Sparkles, Target } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "overview" | "cases" | "outputs"

export function ProjectDetailPage() {
  const { id, orgPrefix } = useParams<{ id: string; orgPrefix: string }>()
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId, organizations } = useOrganization()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const { setPanelContent } = usePanel()
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const activeOrgId = useMemo(() => {
    if (!orgPrefix) return selectedOrgId
    const matchedOrganization = organizations.find(
      (organization) => organization.prefix === orgPrefix || organization.slug === orgPrefix,
    )
    return matchedOrganization?.id ?? selectedOrgId
  }, [orgPrefix, organizations, selectedOrgId])

  const { data: project, isLoading } = useQuery<any>({
    queryKey: queryKeys.projects.detail(id ?? ""),
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: queryKeys.agents.list(activeOrgId ?? ""),
    queryFn: () => agentsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const recommendedRoles: string[] = project?.recommendedRoles ?? []

  const existingRoles = useMemo(
    () => new Set((agents ?? []).map((agent: any) => agent.agentType ?? agent.slug ?? agent.name)),
    [agents],
  )

  const missingRecommendedRoles = recommendedRoles.filter((role) => !existingRoles.has(role))

  const hireMutation = useMutation({
    mutationFn: (role: string) =>
      agentsApi.createHireRequest(activeOrgId!, {
        name:
          role === "marketing"
            ? "프로모션 담당"
            : role === "complaint"
            ? "민원담당"
            : role === "scheduler"
            ? "스케줄러"
            : role === "orchestrator"
            ? "원장 오케스트레이터"
            : role,
        agentType:
          role === "marketing"
            ? "staff"
            : role === "complaint"
            ? "complaint"
            : role === "scheduler"
            ? "scheduler"
            : role === "orchestrator"
            ? "orchestrator"
            : "staff",
        title: role,
        model: "gpt-5-codex",
      }),
    onSuccess: () => {
      toast?.success("추천 에이전트 고용 승인 요청을 만들었습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
    },
    onError: () => toast?.error("고용 승인 요청 생성에 실패했습니다."),
  })

  useEffect(() => {
    if (project) {
      setBreadcrumbs([
        { label: "프로젝트", href: `/${orgPrefix}/projects` },
        { label: project.name },
      ])
    }
  }, [project, setBreadcrumbs, orgPrefix])

  const cases: any[] = project?.cases ?? []
  const documents: any[] = project?.documents ?? []
  const goals: any[] = project?.goals ?? []
  const activeCases = cases.filter((c) => c.status !== "done")
  const doneCases = cases.filter((c) => c.status === "done")
  const panelContent = useMemo(() => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">프로젝트 운영 요약</p>
        <p className="mt-1 text-sm text-slate-500">
          연결 케이스, 산출물, 추천 역할 기준으로 프로젝트 진행 상태를 확인합니다.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">진행 중 케이스</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{activeCases.length}건</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">연결 산출물</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{documents.length}건</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-600">AI 팀 준비도</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span>추천 역할</span>
            <span className="font-medium text-slate-900">{recommendedRoles.length}개</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>추가 고용 필요</span>
            <span className="font-medium text-slate-900">{missingRecommendedRoles.length}개</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>완료 케이스</span>
            <span className="font-medium text-slate-900">{doneCases.length}건</span>
          </div>
        </div>
      </div>
    </div>
  ), [activeCases.length, documents.length, doneCases.length, missingRecommendedRoles.length, recommendedRoles.length])

  useEffect(() => {
    setPanelContent(panelContent)
    return () => setPanelContent(null)
  }, [panelContent, setPanelContent])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 rounded animate-pulse mb-4" style={{ background: "var(--bg-tertiary)" }} />
        <div className="h-4 w-48 rounded animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--text-secondary)" }}>프로젝트를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: project.color ? `${project.color}20` : "var(--bg-tertiary)" }}
        >
          <FolderKanban size={20} style={{ color: project.color ?? "var(--color-teal-500)" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {project.name}
            </h1>
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.color ?? "var(--color-teal-500)" }}
            />
          </div>
          {project.description && (
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mb-6"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        {(["overview", "cases", "outputs"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors -mb-px",
              activeTab === tab
                ? "border-b-2"
                : "hover:bg-[var(--bg-secondary)]"
            )}
            style={{
              color: activeTab === tab ? "var(--color-teal-500)" : "var(--text-secondary)",
              borderColor: activeTab === tab ? "var(--color-teal-500)" : "transparent",
            }}
          >
            {tab === "overview" ? "개요" : tab === "cases" ? `케이스 (${cases.length})` : `산출물 (${documents.length})`}
          </button>
        ))}
      </div>

      {/* Tab: 개요 */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <StatCard label="전체 케이스" value={cases.length} icon={<Layers size={16} />} />
            <StatCard label="진행 중" value={activeCases.length} color="#f59e0b" icon={<Layers size={16} />} />
            <StatCard label="완료" value={doneCases.length} color="var(--color-success)" icon={<Layers size={16} />} />
            <StatCard
              label="생성일"
              value={new Date(project.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
              icon={<CalendarDays size={16} />}
            />
          </div>

          {project.description && (
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                설명
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {project.description}
              </p>
            </div>
          )}

          {project.sourceInstruction && (
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                원본 지시
              </h3>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {project.sourceInstruction}
              </p>
            </div>
          )}

          {/* 목표 섹션 */}
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Target size={15} style={{ color: "var(--color-teal-500)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                연결된 목표 ({goals.length})
              </h3>
            </div>
            {goals.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                연결된 목표가 없습니다. 목표 페이지에서 이 프로젝트를 연결할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal: any) => {
                  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                    active:      { bg: "var(--color-primary-bg)", color: "var(--color-teal-500)", label: "진행중" },
                    achieved:    { bg: "rgba(16,185,129,0.12)",   color: "var(--color-success)",  label: "달성" },
                    completed:   { bg: "rgba(16,185,129,0.12)",   color: "var(--color-success)",  label: "달성" },
                    delayed:     { bg: "rgba(239,68,68,0.12)",    color: "#ef4444",               label: "지연" },
                    paused:      { bg: "rgba(245,158,11,0.12)",   color: "#f59e0b",               label: "중단" },
                  }
                  const sc = statusColors[goal.status ?? "active"] ?? statusColors.active
                  return (
                    <Link
                      key={goal.id}
                      to={`/${orgPrefix}/goals/${goal.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                      style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-teal-500)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                    >
                      <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {goal.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {recommendedRoles.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: "var(--color-teal-500)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  추천 역할
                </h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recommendedRoles.map((role) => {
                  const missing = missingRecommendedRoles.includes(role)
                  return (
                    <span
                      key={role}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                      style={{
                        backgroundColor: missing ? "var(--color-primary-bg)" : "var(--bg-secondary)",
                        color: missing ? "var(--color-teal-500)" : "var(--text-secondary)",
                      }}
                    >
                      {role}
                      {missing ? "추천 고용 필요" : "배치됨"}
                    </span>
                  )
                })}
              </div>

              {missingRecommendedRoles.length > 0 && activeOrgId && (
                <div className="mt-4 space-y-2">
                  {missingRecommendedRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => hireMutation.mutate(role)}
                      className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left"
                      style={{
                        borderColor: "var(--border-default)",
                        backgroundColor: "var(--bg-secondary)",
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {role}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          이 프로젝트에 필요한 역할입니다.
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-teal-500)" }}>
                        <UserPlus size={14} />
                        고용 요청
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: 케이스 */}
      {activeTab === "cases" && (
        <div>
          {cases.length === 0 ? (
            <div
              className="rounded-xl p-10 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Layers size={36} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                이 프로젝트에 연결된 케이스가 없습니다.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {cases.map((c, idx) => (
                <Link
                  key={c.id}
                  to={`/${orgPrefix}/cases/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors",
                    idx !== 0 && "border-t"
                  )}
                  style={{
                    textDecoration: "none",
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <StatusIcon status={(c.status as CaseStatus) ?? "backlog"} size={15} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {c.identifier && (
                        <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          {c.identifier}
                        </span>
                      )}
                      <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {c.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.type && <CaseTypeBadge type={c.type} />}
                    {c.severity && <CaseSeverityBadge severity={c.severity} />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "outputs" && (
        <div>
          {documents.length === 0 ? (
            <div
              className="rounded-xl p-10 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <FileText size={36} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                아직 연결된 산출물 문서가 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "var(--border-default)",
                    backgroundColor: "var(--bg-elevated)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>{document.title}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {document.category} · {new Date(document.updatedAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <FileText size={16} style={{ color: "var(--color-teal-500)" }} />
                  </div>
                  <p className="mt-3 text-sm line-clamp-4 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                    {document.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string | number
  color?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span
        className="text-lg font-bold"
        style={{ color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  )
}
