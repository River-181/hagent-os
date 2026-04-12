// v0.3.0
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { projectsApi } from "@/api/projects"
import { agentsApi } from "@/api/agents"
import { ToastContext } from "@/components/ToastContext"
import { WorkspacePanel, WorkspaceSubtle } from "@/components/ui/workspace-surface"
import { queryKeys } from "@/lib/queryKeys"
import { CaseTypeBadge } from "@/components/CaseTypeBadge"
import { CaseSeverityBadge } from "@/components/CaseSeverityBadge"
import { StatusIcon, type CaseStatus } from "@/components/StatusIcon"
import { FolderKanban, CalendarDays, Layers, FileText, UserPlus, Sparkles, Target, Archive } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "cases" | "overview" | "configuration" | "budget"

function recommendProjectCapabilities(projectTrackKey: string) {
  if (projectTrackKey === "policy") {
    return ["compliance-refund-pack", "hwpx-document-pack"]
  }
  if (projectTrackKey === "complaint-ops") {
    return ["kakao-complaint-pack", "compliance-refund-pack"]
  }
  if (projectTrackKey === "general") {
    return ["schedule-operations-pack", "hwpx-document-pack"]
  }
  return ["kakao-complaint-pack"]
}

const panelStyle = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border-default)",
  boxShadow: "var(--shadow-sm)",
}

export function ProjectDetailPage() {
  const { id, orgPrefix } = useParams<{ id: string; orgPrefix: string }>()
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId, organizations } = useOrganization()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const { setPanelContent, openPanel } = usePanel()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>("cases")

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
  const projectTrack = project?.projectTrack ?? {
    key: "general",
    label: "일반 운영 프로젝트",
    summary: "기관 운영 과제를 케이스와 산출물로 묶어 실행하는 기본 프로젝트",
  }

  const existingRoles = useMemo(
    () => new Set((agents ?? []).map((agent: any) => agent.agentType ?? agent.slug ?? agent.name)),
    [agents],
  )

  const missingRecommendedRoles = recommendedRoles.filter((role) => !existingRoles.has(role))
  const capabilityProfile = useMemo(
    () => recommendProjectCapabilities(projectTrack.key),
    [projectTrack.key],
  )

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

  const archiveMutation = useMutation({
    mutationFn: () => projectsApi.archive(id!),
    onSuccess: () => {
      toast?.success("프로젝트를 숨겼습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id ?? "") })
      navigate(`/${orgPrefix}/projects`)
    },
    onError: () => {
      toast?.error("프로젝트 숨기기에 실패했습니다.")
    },
  })

  useEffect(() => {
    if (project) {
      setBreadcrumbs([
        { label: "프로젝트", href: `/${orgPrefix}/projects` },
        { label: project.name },
      ])
    }
  }, [project, setBreadcrumbs, orgPrefix])

  useEffect(() => {
    openPanel()
  }, [openPanel])

  const cases: any[] = project?.cases ?? []
  const documents: any[] = project?.documents ?? []
  const goals: any[] = project?.goals ?? []
  const activeCases = cases.filter((c) => c.status !== "done")
  const doneCases = cases.filter((c) => c.status === "done")
  useEffect(() => {
    setPanelContent(
      <WorkspacePanel className="space-y-4 p-5">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            핵심 연결
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            연결 케이스, 산출물, 추천 역할과 진행 상태를 이 패널에서 빠르게 확인합니다.
          </p>
        </div>

        <div className="grid gap-3">
          <WorkspaceSubtle className="p-4">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              진행 중 케이스
            </p>
            <p className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {activeCases.length}건
            </p>
          </WorkspaceSubtle>
          <WorkspaceSubtle className="p-4">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              연결 산출물
            </p>
            <p className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {documents.length}건
            </p>
          </WorkspaceSubtle>
        </div>

        <WorkspaceSubtle className="p-4">
          <p className="text-xs font-semibold" style={{ color: "var(--color-teal-500)" }}>
            프로젝트 기본 스킬
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {projectTrack.label}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {projectTrack.summary}
          </p>
        </WorkspaceSubtle>

        <WorkspaceSubtle className="p-4">
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            추천 스킬
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {capabilityProfile.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full px-3 py-1.5 text-xs"
                style={{ backgroundColor: "var(--bg-base)", color: "var(--text-secondary)" }}
                onClick={() => navigate(`/${orgPrefix}/skills/${item}`)}
              >
                {item}
              </button>
            ))}
          </div>
        </WorkspaceSubtle>

        <WorkspaceSubtle className="p-4">
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            AI 팀 준비도
          </p>
          <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <div className="flex items-center justify-between gap-3">
              <span>추천 역할</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {recommendedRoles.length}개
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>추가 고용 필요</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {missingRecommendedRoles.length}개
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>완료 케이스</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {doneCases.length}건
              </span>
            </div>
          </div>
        </WorkspaceSubtle>

        <WorkspaceSubtle className="p-4">
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            다음 액션
          </p>
          <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <div className="flex items-center justify-between gap-3">
              <span>산출물 검토</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {documents.length > 0 ? "가능" : "대기"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>고용 요청</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {missingRecommendedRoles.length > 0 ? `${missingRecommendedRoles.length}개 필요` : "준비됨"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>케이스 정리</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {activeCases.length > 0 ? "진행 중" : "정리됨"}
              </span>
            </div>
          </div>
        </WorkspaceSubtle>
      </WorkspacePanel>,
    )
    return () => setPanelContent(null)
  }, [activeCases.length, capabilityProfile, documents.length, doneCases.length, missingRecommendedRoles.length, navigate, orgPrefix, projectTrack.label, projectTrack.summary, recommendedRoles.length, setPanelContent])

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
    <div className="p-6 space-y-5">
      <WorkspacePanel className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]"
                style={{ backgroundColor: project.color ? `${project.color}20` : "var(--bg-tertiary)" }}
              >
                <FolderKanban size={20} style={{ color: project.color ?? "var(--color-teal-500)" }} />
              </div>
              <div className="space-y-2">
                <h1 className="text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                  {project.name}
                </h1>
                <p className="max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  {project.description ?? "프로젝트 케이스, 산출물, 추천 역할을 한 화면에서 관리합니다."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: "rgba(20,184,166,0.08)", color: "var(--color-teal-500)" }}
              >
                {projectTrack.label}
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                케이스 {cases.length}건 · 산출물 {documents.length}건 · 목표 {goals.length}개
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("cases")}
              className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", activeTab === "cases" ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}
            >
              케이스
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", activeTab === "overview" ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}
            >
              개요
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("configuration")}
              className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", activeTab === "configuration" ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}
            >
              설정
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("budget")}
              className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors", activeTab === "budget" ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}
            >
              예산
            </button>
          </div>
        </div>
      </WorkspacePanel>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <WorkspacePanel className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="전체 케이스" value={cases.length} icon={<Layers size={16} />} />
              <StatCard label="진행 중" value={activeCases.length} color="#f59e0b" icon={<Layers size={16} />} />
              <StatCard label="완료" value={doneCases.length} color="var(--color-success)" icon={<Layers size={16} />} />
              <StatCard
                label="생성일"
                value={new Date(project.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                icon={<CalendarDays size={16} />}
              />
            </div>
          </WorkspacePanel>

          {project.description && (
            <WorkspacePanel className="p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                설명
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {project.description}
              </p>
            </WorkspacePanel>
          )}

          {project.sourceInstruction && (
            <WorkspacePanel className="p-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                원본 지시
              </h3>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {project.sourceInstruction}
              </p>
            </WorkspacePanel>
          )}

          <WorkspacePanel className="p-5" style={{ backgroundColor: "rgba(20,184,166,0.06)", borderColor: "rgba(20,184,166,0.16)" }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              프로젝트 기본 스킬
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {projectTrack.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {capabilityProfile.map((item) => (
                <Link
                  key={item}
                  to={`/${orgPrefix}/skills/${item}`}
                  className="rounded-full px-3 py-1.5 text-xs"
                  style={{ backgroundColor: "var(--bg-base)", color: "var(--text-secondary)" }}
                >
                  {item}
                </Link>
              ))}
            </div>
          </WorkspacePanel>

          {/* 목표 섹션 */}
          <WorkspacePanel className="p-5">
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
          </WorkspacePanel>

          {recommendedRoles.length > 0 && (
            <WorkspacePanel className="p-5">
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
            </WorkspacePanel>
          )}
        </div>
      )}

      {/* Tab: Cases */}
      {activeTab === "cases" && (
        <div>
          {cases.length === 0 ? (
            <WorkspacePanel className="flex flex-col items-center justify-center gap-3 p-10">
              <Layers size={36} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                이 프로젝트에 연결된 케이스가 없습니다.
              </p>
            </WorkspacePanel>
          ) : (
            <WorkspacePanel className="overflow-hidden">
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
            </WorkspacePanel>
          )}
        </div>
      )}

      {/* Tab: Configuration */}
      {activeTab === "configuration" && (
        <div className="space-y-4">
          <WorkspacePanel className="p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              프로젝트 설정
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-[140px,1fr] gap-y-3 text-sm">
              <dt style={{ color: "var(--text-tertiary)" }}>Name</dt>
              <dd style={{ color: "var(--text-primary)" }}>{project.name}</dd>
              <dt style={{ color: "var(--text-tertiary)" }}>Description</dt>
              <dd style={{ color: "var(--text-secondary)" }}>{project.description || "-"}</dd>
              <dt style={{ color: "var(--text-tertiary)" }}>Status</dt>
              <dd>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                >
                  planned
                </span>
              </dd>
              <dt style={{ color: "var(--text-tertiary)" }}>Goals</dt>
              <dd style={{ color: "var(--text-primary)" }}>{goals.length}개 연결됨</dd>
              <dt style={{ color: "var(--text-tertiary)" }}>Created</dt>
              <dd style={{ color: "var(--text-primary)" }}>
                {new Date(project.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
              </dd>
              <dt style={{ color: "var(--text-tertiary)" }}>Updated</dt>
              <dd style={{ color: "var(--text-primary)" }}>
                {new Date(project.updatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
              </dd>
            </dl>
          </WorkspacePanel>

          <WorkspacePanel className="p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              연결 정보
            </h3>
            <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <p>케이스: {cases.length}건</p>
              <p>산출물: {documents.length}건</p>
              <p>추천 역할: {recommendedRoles.length}개</p>
            </div>
          </WorkspacePanel>

          <WorkspacePanel className="p-5" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.24)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#dc2626" }}>
              Danger Zone
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              프로젝트를 숨기면 사이드바와 프로젝트 목록에서 제외됩니다.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("프로젝트를 숨기시겠습니까? 복구는 DB에서만 가능합니다.")) return
                archiveMutation.mutate()
              }}
              disabled={archiveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#dc2626", color: "white" }}
            >
              <Archive size={14} />
              {archiveMutation.isPending ? "숨기는 중..." : "Archive project"}
            </button>
          </WorkspacePanel>
        </div>
      )}

      {activeTab === "budget" && (
        <div>
          {documents.length === 0 ? (
            <WorkspacePanel className="flex flex-col items-center justify-center gap-3 p-10">
              <FileText size={36} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                아직 연결된 산출물 문서가 없습니다.
              </p>
            </WorkspacePanel>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-[20px] border p-4"
                  style={panelStyle}
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
