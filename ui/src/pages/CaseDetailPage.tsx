import React, { useEffect, useState, useContext, useMemo, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useActiveOrgId } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { agentsApi } from "@/api/agents"
import { approvalsApi } from "@/api/approvals"
import { activityApi } from "@/api/activity"
import { documentsApi } from "@/api/documents"
import { projectsApi } from "@/api/projects"
import { queryKeys } from "@/lib/queryKeys"
import { ApiError, api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WorkspacePanel, WorkspaceSubtle } from "@/components/ui/workspace-surface"
import { StatusIcon, type CaseStatus } from "@/components/StatusIcon"
import { PriorityIcon } from "@/components/PriorityIcon"
import { Identity } from "@/components/Identity"
import { LiveRunWidget } from "@/components/LiveRunWidget"
import { CaseProperties } from "@/components/CaseProperties"
import { CapabilityWorkspacePanel } from "@/components/capabilities/CapabilityWorkspacePanel"
import { ApprovalCard } from "@/components/ApprovalCard"
import { ToastContext } from "@/components/ToastContext"
import { usePanel } from "@/context/PanelContext"
import {
  CheckCircle2,
  XCircle,
  Bot,
  Loader2,
  AlertCircle,
  Play,
  FileText,
  MessageSquare,
  GitBranchPlus,
  RefreshCcw,
  Trash2,
} from "lucide-react"

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "방금 전"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

const statusOptions: { value: CaseStatus; label: string }[] = [
  { value: "backlog", label: "백로그" },
  { value: "todo", label: "할 일" },
  { value: "in_progress", label: "진행 중" },
  { value: "in_review", label: "검토 중" },
  { value: "blocked", label: "차단됨" },
  { value: "done", label: "완료" },
]

const caseTypeLabel: Record<string, string> = {
  complaint: "민원",
  refund: "환불",
  makeup: "보강",
  inquiry: "문의",
  churn: "이탈",
  schedule: "일정",
}

function resolveChannelLabel(source?: string | null) {
  if (source === "telegram") return "텔레그램"
  if (source === "kakao") return "카카오톡"
  if (source === "sms") return "SMS"
  return "외부 채널"
}

function recommendCaseCapabilities(caseData: any) {
  const caseType = String(caseData?.type ?? "")
  const source = String(caseData?.source ?? "")
  const recommendations: Array<{ slug: string; label: string; reason: string }> = []

  if (source === "kakao" || source === "telegram" || caseType === "complaint" || caseType === "inquiry") {
    recommendations.push({
      slug: "kakao-complaint-pack",
      label: "카카오 민원 처리",
      reason: "채널 민원/상담 흐름과 답변 승인-발송을 함께 다룹니다.",
    })
  }
  if (caseType === "refund") {
    recommendations.push({
      slug: "compliance-refund-pack",
      label: "교육 법령/환불 검토",
      reason: "환불 계산과 법령 근거를 함께 검토합니다.",
    })
  }
  if (caseType === "schedule") {
    recommendations.push({
      slug: "schedule-operations-pack",
      label: "보강/일정 조정",
      reason: "보강, 상담 예약, 시간표 조정을 calendar readiness와 함께 다룹니다.",
    })
  }

  return recommendations
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

function ActivityTimeline({ caseData, orgPrefix }: { caseData: any; orgPrefix?: string }) {
  const navigate = useNavigate()
  const events: { time: string; type: string; label: string; detail?: string; icon: React.ReactNode; link?: string }[] = []

  // Case created
  const createdAt = caseData.createdAt ?? caseData.created_at
  if (createdAt) {
    events.push({
      time: createdAt,
      type: 'created',
      label: '케이스 생성',
      detail: caseData.source ? `출처: ${caseData.source}` : undefined,
      icon: <FileText size={14} style={{ color: "var(--text-tertiary)" }} />,
    })
  }

  // Runs
  for (const run of (caseData.runs ?? [])) {
    const startedAt = run.startedAt ?? run.started_at ?? run.createdAt
    const agentName = run.agentName ?? run.agent?.name ?? '에이전트'
    const agentId = run.agentId ?? run.agent_id ?? run.agent?.id
    if (startedAt) {
      events.push({
        time: startedAt,
        type: 'run_start',
        label: `${agentName} 실행 시작`,
        icon: <Play size={14} style={{ color: "var(--color-teal-500)" }} />,
        link: agentId && orgPrefix ? `/${orgPrefix}/agents/${agentId}` : undefined,
      })
    }
    const completedAt = run.completedAt ?? run.completed_at
    if (completedAt && run.status === 'completed') {
      events.push({
        time: completedAt,
        type: 'run_complete',
        label: `${agentName} 작업 완료`,
        detail: run.tokensUsed ? `${run.tokensUsed.toLocaleString()} 토큰 사용` : undefined,
        icon: <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />,
        link: agentId && orgPrefix ? `/${orgPrefix}/agents/${agentId}` : undefined,
      })
    }
    if (completedAt && run.status === 'failed') {
      events.push({
        time: completedAt,
        type: 'run_failed',
        label: `${agentName} 실행 실패`,
        icon: <XCircle size={14} style={{ color: "var(--color-danger)" }} />,
        link: agentId && orgPrefix ? `/${orgPrefix}/agents/${agentId}` : undefined,
      })
    }
  }

  // Approvals
  for (const approval of (caseData.approvals ?? [])) {
    const approvalId = approval.id
    if (approval.status === 'approved') {
      events.push({
        time: approval.updatedAt ?? approval.updated_at ?? '',
        type: 'approved',
        label: '초안 승인됨',
        icon: <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />,
        link: approvalId && orgPrefix ? `/${orgPrefix}/approvals/${approvalId}` : undefined,
      })
    }
    if (approval.status === 'rejected') {
      events.push({
        time: approval.updatedAt ?? approval.updated_at ?? '',
        type: 'rejected',
        label: '초안 반려됨',
        icon: <XCircle size={14} style={{ color: "var(--color-danger)" }} />,
        link: approvalId && orgPrefix ? `/${orgPrefix}/approvals/${approvalId}` : undefined,
      })
    }
  }

  // Sort by time descending
  events.sort((a, b) => b.time.localeCompare(a.time))

  if (events.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        활동 타임라인
      </h2>
      <div className="space-y-0">
        {events.map((ev, i) => (
          <div key={i} className="flex gap-3 pb-3">
            <div className="flex flex-col items-center">
              <div className="shrink-0 mt-0.5">{ev.icon}</div>
              {i < events.length - 1 && (
                <div className="w-px flex-1 mt-1" style={{ backgroundColor: "var(--border-default)" }} />
              )}
            </div>
            <div
              className={ev.link ? "pb-1 cursor-pointer group" : "pb-1"}
              onClick={() => ev.link && navigate(ev.link)}
            >
              <p
                className="text-sm"
                style={{ color: ev.link ? "var(--color-teal-500)" : "var(--text-primary)" }}
              >
                {ev.label}
                {ev.link && <span className="ml-1 opacity-0 group-hover:opacity-100 text-xs">→</span>}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{timeAgo(ev.time)}</span>
                {ev.detail && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>· {ev.detail}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function filterCaseActivity(activity: any[], caseId: string, runIds: string[], approvalIds: string[]) {
  const runIdSet = new Set(runIds)
  const approvalIdSet = new Set(approvalIds)
  return activity.filter((event) => {
    if (event.entityType === "case" && event.entityId === caseId) return true
    if (event.entityType === "agent_run" && runIdSet.has(event.entityId)) return true
    if (event.entityType === "approval" && approvalIdSet.has(event.entityId)) return true
    if (event.metadata?.caseId === caseId) return true
    return false
  })
}

function ActivityTab({
  events,
  orgPrefix,
}: {
  events: any[]
  orgPrefix?: string
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
        아직 연결된 activity가 없습니다.
      </div>
    )
  }

  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const metadata = event.metadata ?? {}
        const link =
          event.entityType === "approval" && orgPrefix
            ? `/${orgPrefix}/approvals/${event.entityId}`
            : event.entityType === "agent_run" && metadata.agentId && orgPrefix
            ? `/${orgPrefix}/agents/${metadata.agentId}`
            : undefined

        return (
          <div
            key={event.id}
            className={link ? "rounded-xl border p-4 cursor-pointer" : "rounded-xl border p-4"}
            style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
            onClick={() => link && navigate(link)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {event.entityTitle ?? event.action}
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {event.action} · {timeAgo(event.createdAt ?? event.created_at)}
                </div>
              </div>
              <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                {event.entityType}
              </Badge>
            </div>
            {metadata && Object.keys(metadata).length > 0 && (
              <pre
                className="mt-3 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap"
                style={{ backgroundColor: "var(--bg-base)", color: "var(--text-secondary)" }}
              >
                {JSON.stringify(metadata, null, 2)}
              </pre>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Agent draft section ──────────────────────────────────────────────────────

function AgentDraftSection({
  caseId,
  draft,
  approvalId,
  orgId,
}: {
  caseId: string
  draft: string
  approvalId?: string
  orgId?: string | null
}) {
  const toast = useContext(ToastContext)
  const queryClient = useQueryClient()

  const approve = useMutation({
    mutationFn: () => approvalsApi.approve(approvalId!),
    onSuccess: () => {
      toast?.success("초안이 승인되었습니다.")
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.list(orgId ?? ""),
      })
    },
    onError: () => toast?.error("승인 중 오류가 발생했습니다."),
  })

  const reject = useMutation({
    mutationFn: () => approvalsApi.reject(approvalId!),
    onSuccess: () => {
      toast?.info("초안이 반려되었습니다.")
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.list(orgId ?? ""),
      })
    },
    onError: () => toast?.error("반려 중 오류가 발생했습니다."),
  })

  const isBusy = approve.isPending || reject.isPending

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--border-default)",
        backgroundColor: "var(--bg-muted)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <Bot size={14} style={{ color: "var(--color-teal-500)" }} />
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--color-teal-500)" }}
        >
          에이전트 초안
        </span>
        {approvalId && (
          <Badge
            className="ml-auto text-xs border-0"
            style={{
              backgroundColor: "rgba(217,119,6,0.12)",
              color: "#d97706",
            }}
          >
            승인 대기
          </Badge>
        )}
      </div>

      <div className="p-4">
        <pre
          className="text-sm whitespace-pre-wrap leading-relaxed"
          style={{
            color: "var(--text-primary)",
            fontFamily: "inherit",
          }}
        >
          {draft}
        </pre>

        {approvalId && (
          <div
            className="flex items-center gap-2 mt-4 pt-3"
            style={{ borderTop: "1px solid var(--border-default)" }}
          >
            <Button
              size="sm"
              disabled={isBusy}
              onClick={() => approve.mutate()}
              className="gap-1.5"
              style={{ backgroundColor: "var(--color-success)", color: "#fff" }}
            >
              {approve.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => reject.mutate()}
              className="gap-1.5"
              style={{
                color: "var(--color-danger)",
                borderColor: "var(--border-default)",
              }}
            >
              {reject.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              반려
            </Button>
            <span
              className="ml-auto text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              승인 시 자동 발송됩니다.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chat thread ──────────────────────────────────────────────────────────────

function ChatThread({
  caseId,
  comments,
  orgPrefix,
}: {
  caseId: string
  comments: any[]
  orgPrefix?: string
}) {
  const [newComment, setNewComment] = useState("")
  const [followUpMode, setFollowUpMode] = useState<"comment" | "rerun" | "childCase">("comment")
  const toast = useContext(ToastContext)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const sendMutation = useMutation({
    mutationFn: async (mode: "comment" | "rerun" | "childCase") => {
      const body = newComment.trim()
      const comment = await api.post<any>(`/cases/${caseId}/comments`, {
        body,
        authorType: "user",
        authorName: "원장",
        triggerRun: mode === "rerun",
      })

      if (mode === "childCase") {
        const normalized = body.replace(/\s+/g, " ").trim()
        const shortTitle = normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized
        const childCase = await casesApi.createChildCase(caseId, {
          title: `후속 작업: ${shortTitle}`,
          description: body,
          metadata: {
            generatedBy: "comment-follow-up",
            sourceCommentId: comment.id,
          },
        })
        return { comment, mode, childCase }
      }

      return { comment, mode }
    },
    onSuccess: (result) => {
      setNewComment("")
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) })
      if (result.mode === "rerun") {
        toast?.success("댓글을 남기고 에이전트를 다시 실행했습니다.")
        return
      }
      if (result.mode === "childCase") {
        toast?.success("후속 서브 케이스를 만들었습니다.")
        if (result.childCase?.id && orgPrefix) {
          navigate(`/${orgPrefix}/cases/${result.childCase.id}`)
        }
        return
      }
      toast?.success("댓글을 등록했습니다.")
    },
    onError: () => toast?.error("댓글 등록에 실패했습니다."),
  })

  const followUpOptions: Array<{ value: "comment" | "rerun" | "childCase"; label: string }> = [
    { value: "comment", label: "기본 댓글" },
    { value: "rerun", label: "댓글 + 재실행" },
    { value: "childCase", label: "댓글 + 서브 케이스" },
  ]

  const primaryActionLabel =
    followUpMode === "rerun"
      ? "댓글 + 재실행"
      : followUpMode === "childCase"
      ? "댓글 + 서브 케이스"
      : "전송"

  return (
    <div className="space-y-1">
      {/* Messages */}
      <div className="space-y-3">
        {(comments ?? []).map((c: any, i: number) => {
          const isAgent = c.authorType === "agent" || c.author_type === "agent"
          const authorName = c.authorName ?? c.author_name ?? c.authorId ?? c.author_id ?? (isAgent ? "에이전트" : "원장")
          const createdAt = c.createdAt ?? c.created_at ?? ""
          return (
          <div
            key={c.id ?? i}
            className="rounded-xl border px-4 py-3"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-page)",
              borderLeft: isAgent ? "3px solid var(--color-teal-500)" : "3px solid transparent",
            }}
          >
              <div className="flex items-center gap-2 mb-1.5">
                <Identity
                  name={authorName}
                  type={isAgent ? "agent" : "user"}
                  size="xs"
                />
                {createdAt && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {timeAgo(createdAt)}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                {c.body ?? c.content ?? ""}
              </p>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="mt-4 flex flex-wrap gap-2">
        {followUpOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFollowUpMode(option.value)}
            className="rounded-full px-3 py-1.5 text-xs transition-colors"
            style={{
              backgroundColor:
                followUpMode === option.value ? "var(--color-primary-bg)" : "var(--bg-secondary)",
              color:
                followUpMode === option.value ? "var(--color-teal-500)" : "var(--text-secondary)",
              border: `1px solid ${followUpMode === option.value ? "rgba(20,184,166,0.25)" : "var(--border-default)"}`,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div
        className="mt-2 flex gap-2 rounded-xl p-3"
        style={{
          backgroundColor: "var(--bg-page)",
          border: "1px solid var(--border-default)",
        }}
      >
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요... (에이전트에게 지시하거나 메모를 남길 수 있습니다)"
          rows={2}
          className="flex-1 text-sm resize-none bg-transparent focus:outline-none border-0 shadow-none"
          style={{ color: "var(--text-primary)" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newComment.trim()) {
              sendMutation.mutate(followUpMode)
            }
          }}
        />
        <Button
          size="sm"
          className="self-end text-xs h-8 shrink-0"
          style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
          disabled={!newComment.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate(followUpMode)}
        >
          {sendMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : primaryActionLabel}
        </Button>
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--text-disabled)" }}>
        follow-up 모드에 따라 댓글만 저장하거나, 재실행 또는 서브 케이스 생성까지 이어집니다.
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CaseDetailPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { orgPrefix, id } = useParams<{ orgPrefix: string; id: string }>()
  const activeOrgId = useActiveOrgId(orgPrefix)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const { setPanelContent, openPanel } = usePanel()
  const [newDocumentTitle, setNewDocumentTitle] = useState("")
  const [newDocumentBody, setNewDocumentBody] = useState("")
  const [newChildCaseTitle, setNewChildCaseTitle] = useState("")
  const [newChildCaseDescription, setNewChildCaseDescription] = useState("")
  const [activeTab, setActiveTab] = useState("comments")
  const [documentsExpanded, setDocumentsExpanded] = useState(false)

  // ── fetch case ─────────────────────────────────────────────────────────────
  const {
    data: caseData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.cases.detail(id!),
    queryFn: () => casesApi.get(id!),
    enabled: !!id,
  })
  const { data: orgActivity = [] } = useQuery({
    queryKey: [...queryKeys.activity.list(activeOrgId ?? ""), "case-detail", id],
    queryFn: () => activityApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })
  const { data: organizationAgents = [] } = useQuery<any[]>({
    queryKey: queryKeys.agents.list(activeOrgId ?? ""),
    queryFn: () => agentsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })
  const { data: organizationProjects = [] } = useQuery<any[]>({
    queryKey: queryKeys.projects.list(activeOrgId ?? ""),
    queryFn: () => projectsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  // ── breadcrumbs ────────────────────────────────────────────────────────────
  useEffect(() => {
    setBreadcrumbs([
      { label: "케이스", href: `/${orgPrefix}/cases` },
      {
        label:
          caseData?.identifier ?? caseData?.title ?? `케이스 ${id}`,
      },
    ])
  }, [setBreadcrumbs, orgPrefix, id, caseData])

  // ── status/field update mutation ───────────────────────────────────────────
  const updateCase = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      casesApi.update(id!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.cases.list(activeOrgId ?? ""),
      })
    },
    onError: () => toast?.error("변경에 실패했습니다."),
  })

  const handlePanelUpdate = useCallback(
    (field: string, value: unknown) => updateCase.mutate({ [field]: value }),
    [updateCase.mutate],
  )

  // ── dispatch agent mutation ────────────────────────────────────────────────
  const dispatchForCase = useMutation({
    mutationFn: async () => {
      return casesApi.rerun(id!)
    },
    onSuccess: () => {
      toast?.success("AI 팀을 다시 실행했습니다.")
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
    },
    onError: () => toast?.error("AI 팀 재실행에 실패했습니다."),
  })

  const approvalDecision = useMutation({
    mutationFn: ({ approvalId, decision }: { approvalId: string; decision: "approve" | "reject" | "revision" }) =>
      decision === "approve"
        ? approvalsApi.approve(approvalId)
        : decision === "revision"
          ? approvalsApi.requestRevision(approvalId)
          : approvalsApi.reject(approvalId),
    onSuccess: () => {
      toast?.success("승인 상태를 갱신했습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
    },
    onError: () => toast?.error("승인 처리에 실패했습니다."),
  })

  const outboundMutation = useMutation({
    mutationFn: ({
      approvalId,
      mode,
    }: {
      approvalId: string
      mode: "auto" | "confirm_bridge"
    }) => approvalsApi.send(approvalId, { mode }),
    onSuccess: (result, variables) => {
      const channelLabel = resolveChannelLabel(caseData?.source)
      const deliveryStatus =
        result?.deliveryStatus
        ?? result?.approval?.decision?.sideEffects?.telegramMessage?.status
        ?? result?.approval?.decision?.sideEffects?.kakaoMessage?.status
      const provider = result?.provider
      toast?.success(
        variables.mode === "confirm_bridge"
          ? `${channelLabel} 회신을 운영자 발송 완료로 처리했습니다.`
          : deliveryStatus === "sent"
            ? provider?.includes("auto_send")
              ? `${channelLabel} 회신을 자동 발송했습니다.`
              : `${channelLabel} 회신을 운영자 발송 완료로 기록했습니다.`
            : deliveryStatus === "ready_to_send"
              ? `${channelLabel} 회신이 발송 준비 상태입니다.`
              : deliveryStatus === "failed"
                ? `${channelLabel} 자동 발송이 실패했습니다. 운영자 브리지를 사용하세요.`
                : `${channelLabel} 회신 상태를 갱신했습니다.`,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
    },
    onError: () => toast?.error(`${resolveChannelLabel(caseData?.source)} 회신 처리에 실패했습니다.`),
  })

  const createDocument = useMutation({
    mutationFn: () =>
      documentsApi.createForCase(id!, {
        title: newDocumentTitle.trim(),
        body: newDocumentBody.trim(),
        documentType: "case-output",
        status: "draft",
      }),
    onSuccess: () => {
      setNewDocumentTitle("")
      setNewDocumentBody("")
      toast?.success("문서를 추가했습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
    },
    onError: () => toast?.error("문서 추가에 실패했습니다."),
  })

  const createChildCase = useMutation({
    mutationFn: () =>
      casesApi.createChildCase(id!, {
        title: newChildCaseTitle.trim(),
        description: newChildCaseDescription.trim(),
      }),
    onSuccess: () => {
      setNewChildCaseTitle("")
      setNewChildCaseDescription("")
      toast?.success("서브 케이스를 생성했습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
    },
    onError: () => toast?.error("서브 케이스 생성에 실패했습니다."),
  })

  const deleteCase = useMutation({
    mutationFn: () => casesApi.delete(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") }),
      ])
      toast?.success("케이스를 삭제했습니다.")
      if (orgPrefix) navigate(`/${orgPrefix}/cases`)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const body = error.body as Record<string, unknown> | null
        const message = typeof body?.error === "string" ? body.error : "케이스 삭제에 실패했습니다."
        const childCaseCount = typeof body?.childCaseCount === "number" ? body.childCaseCount : null
        toast?.error(
          message === "Delete child cases first"
            ? `서브 케이스 ${childCaseCount ?? ""}건을 먼저 삭제해야 합니다.`.replace("  ", " ")
            : message,
        )
        return
      }
      toast?.error("케이스 삭제에 실패했습니다.")
    },
  })

  // ── derived data ───────────────────────────────────────────────────────────
  const runs = caseData?.runs ?? []
  const hasActiveRun = runs.some(
    (r: any) =>
      r.status === "running" || r.status === "pending_approval"
  )
  const status = (caseData?.status ?? "backlog") as CaseStatus
  const agentDraft =
    caseData?.agentDraft ?? caseData?.agent_draft ?? null
  const approvals = caseData?.approvals ?? []
  const approvalsVisible = status === "done" ? [] : approvals
  const pendingApproval = approvalsVisible.find(
    (a: any) => a.status === "pending"
  )
  const comments = caseData?.comments ?? []
  const documents = caseData?.documents ?? []
  const primaryDocument = documents[0] ?? null
  const primaryDocumentPreview =
    typeof primaryDocument?.body === "string"
      ? primaryDocument.body.replace(/\s+/g, " ").trim().slice(0, 140)
      : ""
  const childCases = caseData?.childCases ?? []
  const featuredApproval = pendingApproval ?? approvalsVisible[0] ?? null
  const runIds = runs.map((run: any) => run.id)
  const approvalIds = approvals.map((approval: any) => approval.id)
  const relatedActivity = caseData ? filterCaseActivity(orgActivity as any[], caseData.id, runIds, approvalIds) : []
  const identifier = caseData?.identifier ?? caseData?.id ?? id
  const typeLabel =
    caseTypeLabel[caseData?.type ?? ""] ?? caseData?.type ?? ""
  const channelContext = caseData?.channelContext ?? {}
  const channelLabel = resolveChannelLabel(caseData?.source)
  const latestOutboundStatus = approvals
    .map((approval: any) =>
      approval?.decision?.sideEffects?.telegramMessage?.status ??
      approval?.decision?.sideEffects?.kakaoMessage?.status,
    )
    .find((status: unknown) => typeof status === "string")
  const usedSkills = caseData?.usedSkills ?? []
  const skillContext = caseData?.skillContext ?? ""
  const legalBasis = caseData?.legalBasis ?? null
  const latestRun = runs[0] ?? null
  const latestUsage = latestRun?.usage ?? null
  const recommendedCapabilities = useMemo(() => recommendCaseCapabilities(caseData), [caseData?.type, caseData?.source])
  const reviewSummary =
    pendingApproval
      ? "AI 초안과 회신 상태를 검토한 뒤 승인, 반려, 수정 요청 또는 후속 케이스로 넘길 수 있습니다."
      : status === "in_review"
        ? "검토 상태로 이동한 케이스입니다. 다음 액션을 정하고 기록을 남기세요."
        : null

  useEffect(() => {
    openPanel()
  }, [openPanel])

  useEffect(() => {
    if (!caseData) {
      setPanelContent(null)
      return
    }

    const statusLabel = statusOptions.find((item) => item.value === status)?.label ?? status

    setPanelContent(
      <WorkspacePanel className="overflow-hidden shadow-none">
        <div className="border-b px-4 py-4" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                Properties
              </div>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                케이스 상태, 담당, 연결 정보를 조용한 표면으로 정리합니다.
              </p>
            </div>
            <Badge
              className="border-0 px-2 py-1 text-xs"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {channelLabel}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <WorkspaceSubtle className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                  상태
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {statusLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                  연결 문서
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {documents.length}건
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                  승인 요청
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {approvals.length}건
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                  서브 케이스
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {childCases.length}건
                </p>
              </div>
            </div>
          </WorkspaceSubtle>

          <CaseProperties
            case={{
              id: caseData.id,
              status: caseData.status ?? "backlog",
              priority: caseData.priority ?? 4,
              type: caseData.type,
              severity: caseData.severity,
              assigneeAgent: caseData.assignee ?? caseData.agent,
              assigneeAgentId:
                caseData.assigneeAgentId ??
                caseData.assignee_agent_id ??
                caseData.assignee?.id ??
                caseData.agent?.id ??
                null,
              opsGroupId: caseData.opsGroupId ?? caseData.ops_group_id ?? caseData.project?.id ?? null,
              project: caseData.project ?? null,
              reporter: caseData.reporter ?? caseData.reporterName ?? caseData.reporterId,
              studentName: caseData.studentName ?? caseData.student?.name,
              createdAt: caseData.createdAt ?? caseData.created_at,
              updatedAt: caseData.updatedAt ?? caseData.updated_at,
              dueAt: caseData.dueAt ?? caseData.due_at,
            }}
            agents={(organizationAgents ?? []).map((agent: any) => ({
              id: agent.id,
              name: agent.name,
              agentType: agent.agentType,
            }))}
            projects={(organizationProjects ?? []).map((project: any) => ({
              id: project.id,
              name: project.name,
            }))}
            onUpdate={handlePanelUpdate}
          />

          <WorkspaceSubtle className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                  핵심 연결
                </div>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                  채널, 승인, 서브 케이스, 최근 처리를 한 번에 확인합니다.
                </p>
              </div>
              <div className="grid min-w-[240px] flex-1 gap-2 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>채널</span>
                  <span style={{ color: "var(--text-primary)" }}>{channelLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>최근 처리</span>
                  <span style={{ color: "var(--text-primary)" }}>{relatedActivity.length}건</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>최근 런</span>
                  <span style={{ color: "var(--text-primary)" }}>{runs.length}건</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>스킬</span>
                  <span style={{ color: "var(--text-primary)" }}>{usedSkills.length}건</span>
                </div>
              </div>
            </div>
          </WorkspaceSubtle>

          {(recommendedCapabilities.length > 0 || usedSkills.length > 0) ? (
            <CapabilityWorkspacePanel
              title="스킬 관리"
              description="현재 케이스에 맞는 스킬 묶음과 최근 사용된 스킬을 같은 패널에서 설치, 장착, 제거까지 처리합니다."
              orgId={activeOrgId}
              orgPrefix={orgPrefix}
              availableAgents={organizationAgents}
              lockedAgentId={caseData?.assigneeAgentId ?? caseData?.assignee_agent_id ?? caseData?.assignee?.id ?? caseData?.agent?.id ?? null}
              suggestions={[
                ...recommendedCapabilities.map((item) => ({
                  slug: item.slug,
                  kind: "pack" as const,
                  label: item.label,
                  reason: item.reason,
                })),
                ...usedSkills.slice(0, 6).map((skill: any) => ({
                  slug: skill.slug ?? skill.name,
                  kind: "skill" as const,
                  label: skill.displayName ?? skill.name ?? skill.slug,
                  reason: "최근 실행에서 사용된 스킬 번들입니다.",
                })),
              ]}
            />
          ) : null}
        </div>
      </WorkspacePanel>,
    )

    return () => setPanelContent(null)
  }, [
    approvals.length,
    caseData?.assigneeAgentId,
    caseData?.assignee_agent_id,
    caseData?.opsGroupId,
    caseData?.ops_group_id,
    caseData?.project?.id,
    caseData?.project?.name,
    channelLabel,
    childCases.length,
    dispatchForCase.isPending,
    documents.length,
    hasActiveRun,
    navigate,
    orgPrefix,
    outboundMutation.isPending,
    pendingApproval?.id,
    relatedActivity.length,
    recommendedCapabilities,
    organizationAgents,
    organizationProjects,
    activeOrgId,
    setPanelContent,
    status,
    usedSkills,
    caseData?.status,
    caseData?.priority,
    handlePanelUpdate,
  ])

  // ── loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2
          size={24}
          className="animate-spin"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    )
  }

  if (isError || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle size={32} style={{ color: "var(--color-danger)" }} />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          케이스를 불러오는 데 실패했습니다.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          돌아가기
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="mx-auto max-w-5xl p-6">
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-page)" }}>
          <div className="space-y-6 p-6 sm:p-7">
        {/* Case header */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <StatusIcon status={status} size={18} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {identifier}
                </span>
                {typeLabel && (
                  <Badge
                    className="text-xs border-0"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {typeLabel}
                  </Badge>
                )}
                <PriorityIcon priority={caseData.priority ?? 4} size={14} />
                {caseData.source && caseData.source !== 'manual' && (
                  <Badge
                    className="text-xs border-0"
                    style={{
                      backgroundColor: caseData.source === 'kakao' ? '#FEE500' : 'rgba(59,130,246,0.1)',
                      color: caseData.source === 'kakao' ? '#3C1E1E' : '#3b82f6',
                    }}
                  >
                    {channelLabel}
                  </Badge>
                )}
                {channelContext.threadId ? (
                  <Badge
                    className="text-xs border-0"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    thread {String(channelContext.threadId)}
                  </Badge>
                ) : null}
                {channelContext.senderName ? (
                  <Badge
                    className="text-xs border-0"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    {String(channelContext.senderName)}
                  </Badge>
                ) : null}
                {typeof latestOutboundStatus === "string" ? (
                  <Badge
                    className="text-xs border-0"
                    style={{
                      backgroundColor:
                        latestOutboundStatus === "sent"
                          ? "rgba(34,197,94,0.12)"
                          : latestOutboundStatus === "failed"
                            ? "rgba(239,68,68,0.12)"
                            : "rgba(245,158,11,0.12)",
                      color:
                        latestOutboundStatus === "sent"
                          ? "var(--color-success)"
                          : latestOutboundStatus === "failed"
                            ? "var(--color-danger)"
                            : "#d97706",
                    }}
                  >
                    {latestOutboundStatus === "sent"
                      ? `${channelLabel} 회신 완료`
                      : latestOutboundStatus === "failed"
                        ? `${channelLabel} 회신 실패`
                        : `${channelLabel} 회신 준비`}
                  </Badge>
                ) : null}
                {caseData.project?.id && orgPrefix ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/${orgPrefix}/projects/${caseData.project.id}`)}
                    className="rounded-full"
                  >
                    <Badge
                      className="text-xs border-0"
                      style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#7c3aed" }}
                    >
                      프로젝트 · {caseData.project.name}
                    </Badge>
                  </button>
                ) : null}
              </div>
              <h1
                className="text-xl font-bold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {caseData.title ?? "제목 없음"}
              </h1>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2 pl-7">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                if (activeOrgId) {
                  dispatchForCase.mutate()
                }
              }}
              disabled={dispatchForCase.isPending || hasActiveRun}
            >
              {dispatchForCase.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Bot size={13} />
              )}
              AI 다시 실행
            </Button>
            {status !== "done" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => updateCase.mutate({ status: "done" })}
                disabled={updateCase.isPending}
              >
                {updateCase.isPending && updateCase.variables?.status === "done" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                완료로 이동
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              disabled={deleteCase.isPending}
              onClick={() => {
                if (!window.confirm("이 케이스를 삭제하시겠습니까? 관련 초안, 승인, 런 기록도 함께 제거됩니다.")) return
                deleteCase.mutate()
              }}
            >
              {deleteCase.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              케이스 삭제
            </Button>
          </div>
        </div>

        <Separator />

        {/* Description */}
        {caseData.description && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              설명
            </h2>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-secondary)" }}
            >
              {caseData.description}
            </p>
          </div>
        )}

        {/* Activity timeline */}
        <ActivityTimeline caseData={caseData} orgPrefix={orgPrefix} />

        {(recommendedCapabilities.length > 0 || usedSkills.length > 0) && (
          <WorkspaceSubtle className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  추천 스킬 및 최근 사용 스킬
                </div>
                <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  현재 케이스 유형과 채널을 기준으로 추천 스킬을 제안하고, 최근 실행에 사용된 스킬을 함께 보여줍니다.
                </div>
              </div>
              {recommendedCapabilities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recommendedCapabilities.map((item) => (
                    <Button
                      key={item.slug}
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => orgPrefix && navigate(`/${orgPrefix}/skills/${item.slug}`)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            {usedSkills.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {usedSkills.map((skill: any) => (
                  <Badge key={skill.slug ?? skill.name} className="border-0" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                    {skill.displayName ?? skill.name ?? skill.slug}
                  </Badge>
                ))}
              </div>
            ) : null}
            {skillContext ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border px-3 py-3 text-xs leading-relaxed" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", fontFamily: "inherit" }}>
                {String(skillContext).slice(0, 900)}
              </pre>
            ) : null}
          </WorkspaceSubtle>
        )}

        {/* Agent draft */}
        {agentDraft && (
          <AgentDraftSection
            caseId={caseData.id}
            draft={agentDraft}
            approvalId={pendingApproval?.id}
            orgId={activeOrgId}
          />
        )}

            <Separator />

            {reviewSummary ? (
              <WorkspaceSubtle
                className="p-4"
                style={{
                  borderColor: pendingApproval ? "rgba(245,158,11,0.28)" : "var(--border-default)",
                  backgroundColor: pendingApproval ? "rgba(245,158,11,0.08)" : "var(--bg-muted)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} style={{ color: pendingApproval ? "#d97706" : "var(--text-secondary)" }} />
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {pendingApproval ? "검토 대기 중" : "검토 단계"}
                      </div>
                      {latestOutboundStatus ? (
                        <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                          회신 상태: {latestOutboundStatus}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {reviewSummary}
                    </div>
                  </div>
                  {pendingApproval ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-1.5 border-0 text-white" style={{ backgroundColor: "var(--color-success)" }} onClick={() => approvalDecision.mutate({ approvalId: pendingApproval.id, decision: "approve" })}>
                        <CheckCircle2 size={13} />
                        승인
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => approvalDecision.mutate({ approvalId: pendingApproval.id, decision: "revision" })}>
                        <RefreshCcw size={13} />
                        수정 요청
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => approvalDecision.mutate({ approvalId: pendingApproval.id, decision: "reject" })}>
                        <XCircle size={13} />
                        반려
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setActiveTab("activity")
                          setNewChildCaseTitle((current) => current || `${caseData.title} 후속 작업`)
                          setNewChildCaseDescription((current) => current || "검토 결과를 반영한 후속 작업을 생성합니다.")
                        }}
                      >
                        <GitBranchPlus size={13} />
                        후속 케이스
                      </Button>
                    </div>
                  ) : null}
                </div>
              </WorkspaceSubtle>
            ) : null}

            {featuredApproval ? (
              <WorkspaceSubtle className="overflow-hidden p-0">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      현재 승인
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      승인, 반려, 발송을 이 자리에서 처리합니다.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setActiveTab("activity")}
                  >
                    전체 승인 보기
                  </Button>
                </div>
                <div className="p-4">
                  <ApprovalCard
                    approval={featuredApproval}
                    channelLabel={channelLabel}
                    caseHref={orgPrefix ? `/${orgPrefix}/cases/${caseData.id}` : undefined}
                    onApprove={(approvalId) => approvalDecision.mutate({ approvalId, decision: "approve" })}
                    onReject={(approvalId) => approvalDecision.mutate({ approvalId, decision: "reject" })}
                    onSend={(approvalId, mode) =>
                      outboundMutation.mutate({
                        approvalId,
                        mode: mode ?? "auto",
                      })
                    }
                    isPending={approvalDecision.isPending && approvalDecision.variables?.approvalId === featuredApproval.id}
                    pendingAction={approvalDecision.variables?.decision}
                    sending={outboundMutation.isPending && outboundMutation.variables?.approvalId === featuredApproval.id}
                    sendingMode={
                      outboundMutation.variables?.approvalId === featuredApproval.id
                        ? outboundMutation.variables?.mode
                        : null
                    }
                  />
                </div>
              </WorkspaceSubtle>
            ) : null}

            <WorkspaceSubtle className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Documents
                    </h2>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      결과 문서 {documents.length}건
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => setDocumentsExpanded((current) => !current)}
                    >
                      {documentsExpanded ? "접기" : "펼치기"}
                    </Button>
                  </div>
              </div>
              {primaryDocument ? (
                <div className="border-t px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                          {primaryDocument.category ?? "document"}
                        </Badge>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {primaryDocument.version ? `rev ${primaryDocument.version}` : "rev 1"}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          updated {timeAgo(primaryDocument.updatedAt ?? primaryDocument.updated_at ?? primaryDocument.createdAt ?? primaryDocument.created_at)}
                        </span>
                        {documents.length > 1 ? (
                          <Badge className="border-0" style={{ backgroundColor: "rgba(20,184,166,0.10)", color: "var(--color-teal-500)" }}>
                            +{documents.length - 1}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {primaryDocument.title}
                      </div>
                      {!documentsExpanded && primaryDocumentPreview ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {primaryDocumentPreview}
                          {typeof primaryDocument.body === "string" && primaryDocument.body.trim().length > primaryDocumentPreview.length ? "…" : ""}
                        </p>
                      ) : null}
                    </div>
                    <FileText size={16} style={{ color: "var(--color-teal-500)" }} />
                  </div>
                  {documentsExpanded ? (
                    <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                      {documents.map((document: any) => (
                        <div
                          key={document.id}
                          className="border-t px-4 py-4 first:border-t-0"
                          style={{
                            borderColor:
                              document.title?.includes("질문 브리프") ? "rgba(20,184,166,0.24)" : "var(--border-default)",
                            backgroundColor:
                              document.title?.includes("질문 브리프") ? "rgba(20,184,166,0.04)" : "transparent",
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium" style={{ color: "var(--text-primary)" }}>{document.title}</div>
                              <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>{document.category}</div>
                            </div>
                            <FileText size={16} style={{ color: "var(--color-teal-500)" }} />
                          </div>
                          <pre className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--text-secondary)", fontFamily: "inherit" }}>{document.body}</pre>
                        </div>
                      ))}
                      <div className="border-t px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>문서 추가</div>
                        <input value={newDocumentTitle} onChange={(e) => setNewDocumentTitle(e.target.value)} placeholder="예: 보호자 답변 초안" className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }} />
                        <Textarea value={newDocumentBody} onChange={(e) => setNewDocumentBody(e.target.value)} rows={8} className="mt-3 text-sm" placeholder="문서 초안을 입력하세요" />
                        <Button className="mt-3 w-full border-0 text-white" style={{ backgroundColor: "var(--color-teal-500)" }} disabled={!newDocumentTitle.trim() || createDocument.isPending} onClick={() => createDocument.mutate()}>
                          {createDocument.isPending ? <Loader2 size={14} className="animate-spin" /> : "문서 저장"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border-t px-4 py-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                  아직 연결된 문서 결과물이 없습니다.
                </div>
              )}
            </WorkspaceSubtle>

            <div className="flex flex-wrap gap-2">
              {[
                { value: "comments", label: `Comments${comments.length > 0 ? ` (${comments.length})` : ""}` },
                { value: "subissues", label: `Sub-issues${childCases.length > 0 ? ` (${childCases.length})` : ""}` },
                { value: "activity", label: `Activity${relatedActivity.length > 0 ? ` (${relatedActivity.length})` : ""}` },
              ].map((tab) => {
                const isActive = activeTab === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className="rounded-full px-3 py-1.5 text-sm transition-colors"
                    style={{
                      backgroundColor: isActive ? "var(--bg-tertiary)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      border: `1px solid ${isActive ? "var(--border-strong)" : "var(--border-default)"}`,
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {activeTab === "activity" ? (
              <div className="space-y-6">
                {hasActiveRun && activeOrgId ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Live runs
                    </h2>
                    <LiveRunWidget caseId={caseData.id} organizationId={activeOrgId} />
                  </div>
                ) : null}

                <div>
                  <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    활동
                  </h2>
                  <ActivityTab events={relatedActivity} orgPrefix={orgPrefix} />
                </div>
              </div>
            ) : null}

            {activeTab === "subissues" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    연결 작업
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-page)" }}>
                      {childCases.length === 0 ? (
                        <div className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                          아직 연결된 서브 케이스가 없습니다.
                        </div>
                      ) : (
                        childCases.map((childCase: any) => (
                          <button
                            key={childCase.id}
                            type="button"
                            onClick={() => navigate(`/${orgPrefix}/cases/${childCase.id}`)}
                            className="w-full border-t p-4 text-left first:border-t-0"
                            style={{ borderColor: "var(--border-default)", backgroundColor: "transparent" }}
                          >
                            <div className="flex items-center gap-2">
                              <GitBranchPlus size={14} style={{ color: "var(--color-teal-500)" }} />
                              <div className="font-medium" style={{ color: "var(--text-primary)" }}>{childCase.title}</div>
                            </div>
                            <div className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                              {childCase.identifier} · {childCase.status}
                            </div>
                            {childCase.description ? (
                              <p className="mt-2 text-sm line-clamp-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                {childCase.description}
                              </p>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>

                    <WorkspaceSubtle className="p-4">
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        후속 케이스 생성
                      </div>
                      <input
                        value={newChildCaseTitle}
                        onChange={(e) => setNewChildCaseTitle(e.target.value)}
                        placeholder="예: 보호자 답변 최종본"
                        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
                      />
                      <Textarea
                        value={newChildCaseDescription}
                        onChange={(e) => setNewChildCaseDescription(e.target.value)}
                        rows={6}
                        className="mt-3 text-sm"
                        placeholder="후속 작업 설명"
                      />
                      <Button
                        className="mt-3 w-full border-0 text-white"
                        style={{ backgroundColor: "var(--color-teal-500)" }}
                        disabled={!newChildCaseTitle.trim() || createChildCase.isPending}
                        onClick={() => createChildCase.mutate()}
                      >
                        {createChildCase.isPending ? <Loader2 size={14} className="animate-spin" /> : "후속 케이스 추가"}
                      </Button>
                    </WorkspaceSubtle>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "comments" ? (
              <div>
                <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Timeline {comments.length > 0 && `(${comments.length})`}
                </h2>
                <ChatThread caseId={caseData.id} comments={comments} orgPrefix={orgPrefix} />
              </div>
            ) : null}

            </div>
          </div>
        </div>
    </ScrollArea>
  )
}
