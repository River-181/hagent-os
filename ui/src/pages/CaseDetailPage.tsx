import React, { useEffect, useState, useContext, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { approvalsApi } from "@/api/approvals"
import { activityApi } from "@/api/activity"
import { documentsApi } from "@/api/documents"
import { queryKeys } from "@/lib/queryKeys"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusIcon, type CaseStatus } from "@/components/StatusIcon"
import { PriorityIcon } from "@/components/PriorityIcon"
import { Identity } from "@/components/Identity"
import { StatusBadge } from "@/components/StatusBadge"
import { LiveRunWidget } from "@/components/LiveRunWidget"
import { CaseProperties } from "@/components/CaseProperties"
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
  Scale,
  Coins,
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
}: {
  caseId: string
  draft: string
  approvalId?: string
}) {
  const toast = useContext(ToastContext)
  const queryClient = useQueryClient()
  const { selectedOrgId } = useOrganization()

  const approve = useMutation({
    mutationFn: () => approvalsApi.approve(approvalId!),
    onSuccess: () => {
      toast?.success("초안이 승인되었습니다.")
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.list(selectedOrgId ?? ""),
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
        queryKey: queryKeys.approvals.list(selectedOrgId ?? ""),
      })
    },
    onError: () => toast?.error("반려 중 오류가 발생했습니다."),
  })

  const isBusy = approve.isPending || reject.isPending

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(20,184,166,0.25)",
        backgroundColor: "rgba(20,184,166,0.04)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(20,184,166,0.15)" }}
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
            style={{ borderTop: "1px solid rgba(20,184,166,0.15)" }}
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
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
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
        className="flex gap-2 mt-2 rounded-xl p-3"
        style={{
          backgroundColor: "var(--bg-elevated)",
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
  const { selectedOrgId } = useOrganization()
  const { orgPrefix, id } = useParams<{ orgPrefix: string; id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const { setPanelContent } = usePanel()
  const [newDocumentTitle, setNewDocumentTitle] = useState("")
  const [newDocumentBody, setNewDocumentBody] = useState("")
  const [newChildCaseTitle, setNewChildCaseTitle] = useState("")
  const [newChildCaseDescription, setNewChildCaseDescription] = useState("")
  const [activeTab, setActiveTab] = useState("documents")

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
    queryKey: [...queryKeys.activity.list(selectedOrgId ?? ""), "case-detail", id],
    queryFn: () => activityApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
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
        queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
      })
    },
    onError: () => toast?.error("변경에 실패했습니다."),
  })

  // ── dispatch agent mutation ────────────────────────────────────────────────
  const dispatchForCase = useMutation({
    mutationFn: async () => {
      return api.post("/orchestrator/dispatch", {
        instruction: `케이스 "${caseData?.title}" (${caseData?.type}) 처리. 설명: ${caseData?.description ?? '없음'}`,
        organizationId: selectedOrgId!,
      })
    },
    onSuccess: () => {
      toast?.success("에이전트가 배정되었습니다.")
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
    },
    onError: () => toast?.error("에이전트 배정에 실패했습니다."),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(selectedOrgId ?? "") })
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
    onSuccess: () => {
      toast?.success(`${resolveChannelLabel(caseData?.source)} 회신 상태를 갱신했습니다.`)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id!) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(selectedOrgId ?? "") })
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

  // ── derived data ───────────────────────────────────────────────────────────
  const runs = caseData?.runs ?? []
  const hasActiveRun = runs.some(
    (r: any) =>
      r.status === "running" || r.status === "pending_approval"
  )
  const agentDraft =
    caseData?.agentDraft ?? caseData?.agent_draft ?? null
  const approvals = caseData?.approvals ?? []
  const pendingApproval = approvals.find(
    (a: any) => a.status === "pending"
  )
  const comments = caseData?.comments ?? []
  const documents = caseData?.documents ?? []
  const childCases = caseData?.childCases ?? []
  const runIds = runs.map((run: any) => run.id)
  const approvalIds = approvals.map((approval: any) => approval.id)
  const relatedActivity = caseData ? filterCaseActivity(orgActivity as any[], caseData.id, runIds, approvalIds) : []
  const status = (caseData?.status ?? "backlog") as CaseStatus
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
  const reviewSummary =
    pendingApproval
      ? "AI 초안과 회신 상태를 검토한 뒤 승인, 반려, 수정 요청 또는 후속 케이스로 넘길 수 있습니다."
      : status === "in_review"
        ? "검토 상태로 이동한 케이스입니다. 다음 액션을 정하고 기록을 남기세요."
        : null
  useEffect(() => {
    const studentId = caseData?.studentId
    const pendingApprovalId = pendingApproval?.id
    const statusLabel = statusOptions.find((item) => item.value === status)?.label ?? status

    setPanelContent(
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">케이스 운영 요약</p>
          <p className="mt-1 text-sm text-slate-500">
            케이스의 연결 객체와 다음 액션을 한 번에 확인합니다.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">상태</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{statusLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">연결 문서</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{documents.length}건</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">운영 연결</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span>채널</span>
              <span className="font-medium text-slate-900">{channelLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>승인 요청</span>
              <span className="font-medium text-slate-900">{approvals.length}건</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>서브 케이스</span>
              <span className="font-medium text-slate-900">{childCases.length}건</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>최근 처리</span>
              <span className="font-medium text-slate-900">{relatedActivity.length}건</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-600">바로 실행</p>
          <div className="mt-3 flex flex-col gap-2">
            {studentId && orgPrefix ? (
              <Button size="sm" variant="outline" className="justify-start" onClick={() => navigate(`/${orgPrefix}/students/${studentId}`)}>
                학생 상세 보기
              </Button>
            ) : null}
            {pendingApprovalId ? (
              <Button
                size="sm"
                className="justify-start bg-teal-600 text-white hover:bg-teal-700"
                disabled={outboundMutation.isPending}
                onClick={() => outboundMutation.mutate({ approvalId: pendingApprovalId, mode: "auto" })}
              >
                {channelLabel} 답변 초안 발송
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="justify-start" onClick={() => dispatchForCase.mutate()} disabled={dispatchForCase.isPending || hasActiveRun}>
              AI 팀 다시 배정
            </Button>
          </div>
        </div>
      </div>,
    )

    return () => setPanelContent(null)
  }, [
    approvals.length,
    caseData?.studentId,
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
    setPanelContent,
    status,
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
      <div className="p-6 max-w-5xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
        {/* Case header */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <StatusIcon status={status} size={18} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
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
              </div>
              <h1
                className="text-xl font-bold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {caseData.title ?? "제목 없음"}
              </h1>
            </div>
          </div>

          {/* Status select + assign agent */}
          <div className="flex items-center gap-3 pl-7">
            <Select
              value={status}
              onValueChange={(v) => updateCase.mutate({ status: v })}
              disabled={updateCase.isPending}
            >
              <SelectTrigger className="w-36 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={() => {
                if (selectedOrgId) {
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
              에이전트 배정
            </Button>
          </div>
        </div>

        <Separator />

        {/* Live run widget */}
        {hasActiveRun && selectedOrgId && (
          <LiveRunWidget caseId={caseData.id} organizationId={selectedOrgId} />
        )}

        {/* Description */}
        {caseData.description && (
          <div>
            <h2
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
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

        {/* Agent draft */}
        {agentDraft && (
          <AgentDraftSection
            caseId={caseData.id}
            draft={agentDraft}
            approvalId={pendingApproval?.id}
          />
        )}

            <Separator />

            {reviewSummary ? (
              <div
                className="rounded-2xl border px-4 py-4"
                style={{
                  borderColor: pendingApproval ? "rgba(245,158,11,0.28)" : "var(--border-default)",
                  backgroundColor: pendingApproval ? "rgba(245,158,11,0.08)" : "var(--bg-elevated)",
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
                          setActiveTab("childCases")
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
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "documents", label: `Documents${documents.length > 0 ? ` (${documents.length})` : ""}` },
                  { value: "approvals", label: `Approvals${approvals.length > 0 ? ` (${approvals.length})` : ""}` },
                  { value: "activity", label: `Activity${relatedActivity.length > 0 ? ` (${relatedActivity.length})` : ""}` },
                  { value: "comments", label: `Comments${comments.length > 0 ? ` (${comments.length})` : ""}` },
                  { value: "childCases", label: `Child Cases${childCases.length > 0 ? ` (${childCases.length})` : ""}` },
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

              {activeTab === "documents" ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-3">
                    {documents.length === 0 ? (
                      <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                        아직 연결된 문서 결과물이 없습니다.
                      </div>
                    ) : (
                      documents.map((document: any) => (
                        <div
                          key={document.id}
                          className="rounded-xl border p-4"
                          style={{
                            borderColor:
                              document.title?.includes("질문 브리프") ? "rgba(20,184,166,0.24)" : "var(--border-default)",
                            backgroundColor:
                              document.title?.includes("질문 브리프") ? "rgba(20,184,166,0.05)" : "var(--bg-secondary)",
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
                      ))
                    )}
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>문서 추가</div>
                    <input value={newDocumentTitle} onChange={(e) => setNewDocumentTitle(e.target.value)} placeholder="예: 보호자 답변 초안" className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }} />
                    <Textarea value={newDocumentBody} onChange={(e) => setNewDocumentBody(e.target.value)} rows={8} className="mt-3 text-sm" placeholder="문서 초안을 입력하세요" />
                    <Button className="mt-3 w-full border-0 text-white" style={{ backgroundColor: "var(--color-teal-500)" }} disabled={!newDocumentTitle.trim() || createDocument.isPending} onClick={() => createDocument.mutate()}>
                      {createDocument.isPending ? <Loader2 size={14} className="animate-spin" /> : "문서 저장"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeTab === "approvals" ? (
                approvals.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                    아직 생성된 approval이 없습니다.
                  </div>
                ) : (
                  approvals.map((approval: any) => (
                    <ApprovalCard
                      key={approval.id}
                      approval={approval}
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
                      isPending={approvalDecision.isPending && approvalDecision.variables?.approvalId === approval.id}
                      pendingAction={approvalDecision.variables?.decision}
                      sending={outboundMutation.isPending && outboundMutation.variables?.approvalId === approval.id}
                      sendingMode={
                        outboundMutation.variables?.approvalId === approval.id
                          ? outboundMutation.variables?.mode
                          : null
                      }
                    />
                  ))
                )
              ) : null}

              {activeTab === "activity" ? (
                <ActivityTab events={relatedActivity} orgPrefix={orgPrefix} />
              ) : null}

              {activeTab === "comments" ? (
                <div>
                  <h2
                    className="text-sm font-semibold mb-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    대화 {comments.length > 0 && `(${comments.length})`}
                  </h2>
                  <ChatThread caseId={caseData.id} comments={comments} orgPrefix={orgPrefix} />
                </div>
              ) : null}

              {activeTab === "childCases" ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-3">
                    {childCases.length === 0 ? (
                      <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                        아직 연결된 서브 케이스가 없습니다.
                      </div>
                    ) : (
                      childCases.map((childCase: any) => (
                        <button
                          key={childCase.id}
                          type="button"
                          onClick={() => navigate(`/${orgPrefix}/cases/${childCase.id}`)}
                          className="w-full rounded-xl border p-4 text-left"
                          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
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
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>서브 케이스 생성</div>
                    <input value={newChildCaseTitle} onChange={(e) => setNewChildCaseTitle(e.target.value)} placeholder="예: 보호자 답변 최종본" className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }} />
                    <Textarea value={newChildCaseDescription} onChange={(e) => setNewChildCaseDescription(e.target.value)} rows={6} className="mt-3 text-sm" placeholder="후속 작업 설명" />
                    <Button className="mt-3 w-full border-0 text-white" style={{ backgroundColor: "var(--color-teal-500)" }} disabled={!newChildCaseTitle.trim() || createChildCase.isPending} onClick={() => createChildCase.mutate()}>
                      {createChildCase.isPending ? <Loader2 size={14} className="animate-spin" /> : "서브 케이스 추가"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <FileText size={14} style={{ color: "var(--color-teal-500)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Case Properties
                </h2>
              </div>
              <CaseProperties
                case={{
                  id: caseData.id,
                  status: caseData.status ?? "backlog",
                  priority: caseData.priority ?? 4,
                  type: caseData.type,
                  severity: caseData.severity,
                  assigneeAgent: caseData.assignee ?? caseData.agent,
                  reporter: caseData.reporter ?? caseData.reporterName ?? caseData.reporterId,
                  studentName: caseData.studentName ?? caseData.student?.name,
                  createdAt: caseData.createdAt ?? caseData.created_at,
                  updatedAt: caseData.updatedAt ?? caseData.updated_at,
                  dueAt: caseData.dueAt ?? caseData.due_at,
                }}
                onUpdate={(field, value) => updateCase.mutate({ [field]: value })}
              />
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare size={14} style={{ color: "var(--color-teal-500)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Linked Context
                </h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div style={{ color: "var(--text-tertiary)" }}>Student</div>
                  <div style={{ color: "var(--text-primary)" }}>
                    {caseData.student?.name ?? caseData.studentName ?? caseData.studentId ?? "미연결"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-tertiary)" }}>Reporter</div>
                  <div style={{ color: "var(--text-primary)" }}>
                    {caseData.reporterName ?? caseData.reporterId ?? "없음"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-tertiary)" }}>Runs</div>
                  <div style={{ color: "var(--text-primary)" }}>{(caseData.runs ?? []).length}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-tertiary)" }}>Pending Approval</div>
                  <div style={{ color: "var(--text-primary)" }}>{pendingApproval ? "있음" : "없음"}</div>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Bot size={14} style={{ color: "var(--color-teal-500)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  AI 실행 컨텍스트
                </h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div style={{ color: "var(--text-tertiary)" }}>Used Skills</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {usedSkills.length === 0 ? (
                      <span style={{ color: "var(--text-secondary)" }}>표시 가능한 스킬이 없습니다.</span>
                    ) : (
                      usedSkills.map((skill: any) => (
                        <Badge key={skill.slug ?? skill.name} className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                          {skill.displayName ?? skill.name ?? skill.slug}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                {skillContext ? (
                  <div>
                    <div style={{ color: "var(--text-tertiary)" }}>Skill Context</div>
                    <pre
                      className="mt-2 whitespace-pre-wrap rounded-xl border px-3 py-3 text-xs leading-relaxed"
                      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", fontFamily: "inherit" }}
                    >
                      {String(skillContext).slice(0, 900)}
                    </pre>
                  </div>
                ) : null}
                {legalBasis ? (
                  <div>
                    <div style={{ color: "var(--text-tertiary)" }}>Legal Basis</div>
                    <div
                      className="mt-2 rounded-xl border px-3 py-3"
                      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-center gap-2 font-medium" style={{ color: "var(--text-primary)" }}>
                        <Scale size={13} style={{ color: "var(--color-teal-500)" }} />
                        {String((legalBasis as any).summary ?? "근거 요약 없음")}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div style={{ color: "var(--text-tertiary)" }}>Outbound</div>
                    <div style={{ color: "var(--text-primary)" }}>{caseData.outboundStatus ?? latestOutboundStatus ?? "없음"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-tertiary)" }}>Latest Cost</div>
                    <div style={{ color: "var(--text-primary)" }}>
                      {latestUsage ? `₩${Number(latestUsage.estimatedCostKrw ?? 0).toLocaleString("ko-KR")}` : "없음"}
                    </div>
                  </div>
                </div>
                {latestUsage ? (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <Coins size={12} />
                    입력 {Number(latestUsage.inputTokens ?? 0).toLocaleString()} / 출력 {Number(latestUsage.outputTokens ?? 0).toLocaleString()} / 총 {Number(latestUsage.totalTokens ?? 0).toLocaleString()} tokens
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ScrollArea>
  )
}
