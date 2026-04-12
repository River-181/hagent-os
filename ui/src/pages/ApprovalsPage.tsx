import { useEffect, useContext, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useActiveOrgId } from "@/context/OrganizationContext"
import { approvalsApi } from "@/api/approvals"
import { casesApi } from "@/api/cases"
import { queryKeys } from "@/lib/queryKeys"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  WorkspaceEmptyState,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import { ToastContext } from "@/components/ToastContext"
import { usePanel } from "@/context/PanelContext"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Send,
  XCircle,
} from "lucide-react"
import { timeAgo } from "@/lib/utils"

type ApprovalStatusTab = "all" | "pending" | "approved" | "rejected"

interface ApprovalDecisionDialogState {
  id: string
  reason: string
}

function filterApprovals(approvals: any[], tab: ApprovalStatusTab) {
  if (tab === "pending") return approvals.filter((approval) => approval.status === "pending")
  if (tab === "approved") return approvals.filter((approval) => approval.status === "approved")
  if (tab === "rejected") return approvals.filter((approval) => approval.status === "rejected")
  return approvals
}

function resolveDeliveryStatus(approval: any): string | null {
  return (
    approval?.decision?.sideEffects?.telegramMessage?.status ??
    approval?.decision?.sideEffects?.kakaoMessage?.status ??
    null
  )
}

function isDoneCaseApproval(approval: any) {
  const caseStatus = approval?.case?.status ?? approval?.caseStatus ?? null
  return caseStatus === "done" || caseStatus === "closed" || caseStatus === "resolved"
}

async function decideApproval(id: string, decision: "approved" | "rejected", comment?: string) {
  return approvalsApi.decide(id, decision, comment)
}

function getApprovalPreview(approval: any) {
  const draft =
    typeof approval?.payload?.draft === "string" ? approval.payload.draft.trim() : ""
  if (draft) return draft

  const suggestedReply =
    typeof approval?.payload?.suggestedReply === "string"
      ? approval.payload.suggestedReply.trim()
      : ""
  if (suggestedReply) return suggestedReply

  const comment =
    typeof approval?.decision?.comment === "string" ? approval.decision.comment.trim() : ""
  if (comment) return comment

  const reason = typeof approval?.reason === "string" ? approval.reason.trim() : ""
  return reason
}

function getApprovalBadge(approval: any) {
  const deliveryStatus = resolveDeliveryStatus(approval)
  if (deliveryStatus === "ready_to_send") {
    return {
      label: "발송 준비",
      backgroundColor: "var(--status-warning-soft)",
      color: "var(--color-warning)",
    }
  }
  if (deliveryStatus === "sent") {
    return {
      label: "발송 완료",
      backgroundColor: "var(--status-success-soft)",
      color: "var(--color-success)",
    }
  }
  if (deliveryStatus === "failed") {
    return {
      label: "발송 실패",
      backgroundColor: "var(--status-danger-soft)",
      color: "var(--color-danger)",
    }
  }

  if (approval.status === "approved") {
    return {
      label: "승인됨",
      backgroundColor: "var(--status-success-soft)",
      color: "var(--color-success)",
    }
  }
  if (approval.status === "rejected") {
    return {
      label: "거절됨",
      backgroundColor: "var(--status-danger-soft)",
      color: "var(--color-danger)",
    }
  }
  if (approval.status === "revision_requested") {
    return {
      label: "재검토",
      backgroundColor: "var(--status-info-soft)",
      color: "var(--color-info)",
    }
  }

  return {
    label: "대기",
    backgroundColor: "var(--status-warning-soft)",
    color: "var(--color-warning)",
  }
}

function ApprovalRow({
  approval,
  selected,
  onSelectedChange,
  caseHref,
  channelLabel,
  onApprove,
  onReject,
  onSend,
  isApprovePending,
  sending,
  sendingMode,
}: {
  approval: any
  selected: boolean
  onSelectedChange: (checked: boolean) => void
  caseHref?: string
  channelLabel: string
  onApprove: () => void
  onReject: () => void
  onSend: (mode?: "auto" | "confirm_bridge") => void
  isApprovePending: boolean
  sending: boolean
  sendingMode: "auto" | "confirm_bridge" | null
}) {
  const createdAt = approval.createdAt ?? approval.created_at
  const agentName = approval.agent?.name ?? approval.agentName ?? "에이전트"
  const badge = getApprovalBadge(approval)
  const preview = getApprovalPreview(approval)
  const deliveryStatus = resolveDeliveryStatus(approval)
  const pending = approval.status === "pending"
  const canSend = deliveryStatus === "ready_to_send" || deliveryStatus === "failed" || approval.status === "approved"

  return (
    <article
      className="flex flex-col gap-4 px-4 py-4 md:px-6 transition-colors hover:bg-[var(--bg-muted)]"
      style={{
        backgroundColor: selected ? "var(--accent-primary-soft)" : "transparent",
        boxShadow: selected ? "inset 2px 0 0 var(--accent-primary)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelectedChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded"
          aria-label="승인 항목 선택"
          style={{
            accentColor: "var(--color-primary)",
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-2">
              {caseHref ? (
                <Button
                  asChild
                  variant="link"
                  className="h-auto justify-start p-0 text-left font-semibold no-underline hover:no-underline"
                >
                  <Link to={caseHref} style={{ color: "var(--text-primary)" }}>
                    {approval.case?.title ?? approval.caseTitle ?? "승인 항목"}
                  </Link>
                </Button>
              ) : (
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {approval.case?.title ?? approval.caseTitle ?? "승인 항목"}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                <span>{agentName}</span>
                <span>{channelLabel}</span>
                {createdAt ? <span>{timeAgo(createdAt)}</span> : null}
              </div>
            </div>

            <Badge
              className="border-0 px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: badge.backgroundColor,
                color: badge.color,
              }}
            >
              {badge.label}
            </Badge>
          </div>

          {preview ? (
            <p className="mt-3 text-sm leading-6 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
              {preview}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pl-7">
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {pending
            ? "승인 후 발송 상태를 이어서 처리합니다."
            : deliveryStatus === "ready_to_send"
              ? "운영자 발송 처리를 남겨둔 상태입니다."
              : deliveryStatus === "failed"
                ? "자동 발송 실패를 운영자 처리로 마감하세요."
                : deliveryStatus === "sent"
                  ? "채널 전송이 완료되었습니다."
                  : "승인 큐에서 케이스로 이동할 수 있습니다."}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pending ? (
            <Button
              className="gap-2"
              disabled={isApprovePending}
              onClick={onApprove}
            >
              {isApprovePending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              승인
            </Button>
          ) : canSend ? (
            <Button
              variant="outline"
              className="gap-2"
              disabled={sending}
              onClick={() => onSend(deliveryStatus === "failed" ? "confirm_bridge" : "auto")}
            >
              {sending && sendingMode ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {deliveryStatus === "failed" ? "운영자 발송" : "발송 처리"}
            </Button>
          ) : null}

          {caseHref ? (
            <Button asChild variant="outline" className="gap-2">
              <Link to={caseHref}>
                <ExternalLink size={14} />
                케이스 열기
              </Link>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="추가 작업">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {pending ? (
                <DropdownMenuItem
                  style={{ color: "var(--color-danger)" }}
                  onClick={onReject}
                >
                  거절
                </DropdownMenuItem>
              ) : null}
              {canSend ? (
                <DropdownMenuItem onClick={() => onSend(deliveryStatus === "failed" ? "confirm_bridge" : "auto")}>
                  발송 처리
                </DropdownMenuItem>
              ) : null}
              {caseHref ? (
                <DropdownMenuItem onClick={() => window.open(caseHref, "_self")}>
                  케이스 열기
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}

export function ApprovalsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const activeOrgId = useActiveOrgId(orgPrefix)
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const { setPanelContent, openPanel } = usePanel()

  const [activeTab, setActiveTab] = useState<ApprovalStatusTab>("pending")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [rejectDialog, setRejectDialog] = useState<ApprovalDecisionDialogState | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: "승인 큐" }])
  }, [setBreadcrumbs])

  useEffect(() => {
    openPanel()
  }, [openPanel])

  const {
    data: allApprovals = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.approvals.list(activeOrgId ?? ""),
    queryFn: () => approvalsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: allCases = [] } = useQuery({
    queryKey: queryKeys.cases.list(activeOrgId ?? ""),
    queryFn: () => casesApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const caseMap = useMemo(() => {
    const map: Record<string, { title: string; source: string | null }> = {}
    for (const c of allCases as any[]) {
      if (c.id) {
        map[c.id] = {
          title: c.title ?? c.identifier ?? c.id,
          source: typeof c.source === "string" ? c.source : null,
        }
      }
    }
    return map
  }, [allCases])

  const approvals = (allApprovals as any[]).filter((approval) => !isDoneCaseApproval(approval))
  const filteredApprovals = useMemo(
    () => filterApprovals(approvals, activeTab),
    [approvals, activeTab]
  )

  const pendingCount = approvals.filter((approval) => approval.status === "pending").length
  const approvedCount = approvals.filter((approval) => approval.status === "approved").length
  const rejectedCount = approvals.filter((approval) => approval.status === "rejected").length
  const readyToSendCount = approvals.filter((approval) => resolveDeliveryStatus(approval) === "ready_to_send").length
  const sentCount = approvals.filter((approval) => resolveDeliveryStatus(approval) === "sent").length
  const failedCount = approvals.filter((approval) => resolveDeliveryStatus(approval) === "failed").length

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
    void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") })
    void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
  }

  const updateApprovalMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string
      status: "approved" | "rejected"
      reason?: string
    }) => decideApproval(id, status, reason),
    onSuccess: (_data, variables) => {
      toast?.[variables.status === "approved" ? "success" : "info"](
        variables.status === "approved" ? "승인되었습니다." : "거절되었습니다."
      )
      setRejectDialog(null)
      setSelectedIds((current) => current.filter((id) => id !== variables.id))
      invalidateAll()
    },
    onError: (_error, variables) => {
      toast?.error(
        variables.status === "approved"
          ? "승인 처리에 실패했습니다."
          : "거절 처리에 실패했습니다."
      )
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await decideApproval(id, "approved")
      }
      return ids.length
    },
    onSuccess: (count) => {
      toast?.success(`${count}건 승인 완료`)
      setSelectedIds([])
      invalidateAll()
    },
    onError: () => {
      toast?.error("일괄 승인 중 오류가 발생했습니다.")
    },
  })

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await decideApproval(id, "rejected")
      }
      return ids.length
    },
    onSuccess: (count) => {
      toast?.info(`${count}건 거절 완료`)
      setSelectedIds([])
      invalidateAll()
    },
    onError: () => {
      toast?.error("일괄 거절 중 오류가 발생했습니다.")
    },
  })

  const outboundMutation = useMutation({
    mutationFn: ({
      id,
      mode,
    }: {
      id: string
      mode: "auto" | "confirm_bridge"
    }) => approvalsApi.send(id, { mode }),
    onSuccess: (result, variables) => {
      const approval = approvals.find((item) => item.id === variables.id)
      const resolvedCaseId = approval?.caseId ?? approval?.case_id ?? approval?.case?.id
      const source = resolvedCaseId ? caseMap[resolvedCaseId]?.source : null
      const channelLabel = source === "telegram" ? "텔레그램" : source === "kakao" ? "카카오톡" : "채널"
      const deliveryStatus = result?.deliveryStatus ?? result?.approval?.decision?.sideEffects?.kakaoMessage?.status ?? result?.approval?.decision?.sideEffects?.telegramMessage?.status
      const provider = result?.provider
      toast?.success(
        variables.mode === "confirm_bridge"
          ? `${channelLabel} 회신을 운영자 발송 완료로 처리했습니다.`
          : deliveryStatus === "sent"
            ? provider?.includes("auto_send")
              ? `${channelLabel} 회신을 자동 발송했습니다.`
              : `${channelLabel} 회신을 운영자 발송 완료로 기록했습니다.`
            : deliveryStatus === "ready_to_send"
              ? `${channelLabel} 회신이 발송 준비 상태입니다. 채널에서 보내거나 전송 완료 처리하세요.`
              : deliveryStatus === "failed"
                ? `${channelLabel} 자동 발송이 실패했습니다. 운영자 브리지를 사용하세요.`
                : `${channelLabel} 회신 발송을 시도했습니다.`,
      )
      invalidateAll()
    },
    onError: () => {
      toast?.error("채널 회신 처리에 실패했습니다.")
    },
  })

  const selectedVisibleIds = selectedIds.filter((id) =>
    filteredApprovals.some((approval) => approval.id === id)
  )

  const pendingVisibleIds = filteredApprovals
    .filter((approval) => approval.status === "pending")
    .map((approval) => approval.id)

  const tabLabel = {
    all: "전체",
    pending: "대기중",
    approved: "승인됨",
    rejected: "거절됨",
  }[activeTab]

  useEffect(() => {
    setPanelContent(
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            승인 속성
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            승인 대기, 발송 대기, 일괄 처리를 한 패널에서 확인합니다.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ["현재 탭", tabLabel],
            ["선택된 항목", `${selectedVisibleIds.length}건`],
            ["승인 대기", `${pendingCount}건`],
            ["발송 준비", `${readyToSendCount}건`],
            ["발송 완료", `${sentCount}건`],
            ["발송 실패", `${failedCount}건`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0"
              style={{ borderColor: "var(--border-default)" }}
            >
              <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>,
    )
    return () => setPanelContent(null)
  }, [activeTab, failedCount, pendingCount, readyToSendCount, selectedVisibleIds.length, sentCount, setPanelContent])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((current) => Array.from(new Set([...current, ...pendingVisibleIds])))
    } else {
      setSelectedIds((current) => current.filter((id) => !pendingVisibleIds.includes(id)))
    }
  }

  const toggleSelected = (approvalId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, approvalId])) : current.filter((id) => id !== approvalId)
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="승인 큐"
        description="승인 요청을 검토하고, 필요하면 같은 화면에서 발송 처리까지 마감합니다."
        action={
          <Button variant="outline" className="gap-2" onClick={invalidateAll}>
            <RefreshCcw size={15} />
            새로고침
          </Button>
        }
      />

      <WorkspacePanel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex flex-col gap-4 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              승인 항목
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {selectedVisibleIds.length > 0
                ? `${selectedVisibleIds.length}건 선택됨`
                : `${pendingVisibleIds.length}건 선택 가능`}
            </p>
          </div>

                  {selectedVisibleIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-2"
                disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
                onClick={() => bulkApproveMutation.mutate(selectedVisibleIds)}
              >
                {bulkApproveMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                일괄 승인
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSelectedIds((current) => current.filter((id) => !selectedVisibleIds.includes(id)))}
              >
                선택 해제
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="일괄 작업 더보기">
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuItem onClick={() => bulkRejectMutation.mutate(selectedVisibleIds)}>
                    일괄 거부
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedIds(pendingVisibleIds)}>
                    현재 탭 전체 선택
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ApprovalStatusTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="px-4 pt-4 md:px-6">
            <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto">
              {(
                [
                  { value: "all" as ApprovalStatusTab, label: "전체", count: approvals.length },
                  { value: "pending" as ApprovalStatusTab, label: "대기중", count: pendingCount },
                  { value: "approved" as ApprovalStatusTab, label: "승인됨", count: approvedCount },
                  { value: "rejected" as ApprovalStatusTab, label: "거절됨", count: rejectedCount },
                ] satisfies { value: ApprovalStatusTab; label: string; count: number }[]
              ).map(({ value, label, count }) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  {label}
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="flex-1 min-h-0 px-4 pb-4 pt-4 md:px-6 md:pb-6">
            {isLoading ? (
              <WorkspaceEmptyState
                icon={<Loader2 size={18} className="animate-spin" />}
                title="승인 항목을 불러오는 중입니다."
                description="잠시만 기다려 주세요."
                className="min-h-[180px]"
              />
            ) : isError ? (
              <WorkspaceEmptyState
                icon={<AlertCircle size={18} />}
                title="승인 목록을 불러오지 못했습니다."
                description="잠시 후 다시 시도해 주세요."
                className="min-h-[180px]"
              />
            ) : filteredApprovals.length === 0 ? (
              <WorkspaceEmptyState
                icon={
                  activeTab === "pending" ? (
                    <Clock size={18} />
                  ) : activeTab === "approved" ? (
                    <CheckCircle size={18} />
                  ) : activeTab === "rejected" ? (
                    <XCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )
                }
                title={
                  activeTab === "pending"
                    ? "대기 중인 승인 항목이 없습니다."
                    : activeTab === "approved"
                      ? "승인된 항목이 없습니다."
                      : activeTab === "rejected"
                        ? "거절된 항목이 없습니다."
                        : "표시할 승인 항목이 없습니다."
                }
                description="에이전트 승인 요청이 들어오면 이 화면에서 바로 처리할 수 있습니다."
                className="min-h-[180px]"
              />
            ) : (
              <div className="h-full min-h-0 overflow-y-auto">
                <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                  {filteredApprovals.map((approval) => {
                    const isApprovePending =
                      updateApprovalMutation.isPending &&
                      updateApprovalMutation.variables?.id === approval.id &&
                      updateApprovalMutation.variables?.status === "approved"
                    const resolvedCaseId = approval.caseId ?? approval.case_id ?? approval.case?.id
                    const caseTitle =
                      approval.case?.title ??
                      approval.caseTitle ??
                      (resolvedCaseId ? caseMap[resolvedCaseId]?.title : undefined)
                    const caseHref = resolvedCaseId
                      ? `/${orgPrefix ?? ""}/cases/${resolvedCaseId}`
                      : undefined
                    const channelLabel =
                      resolvedCaseId && caseMap[resolvedCaseId]?.source === "telegram"
                        ? "텔레그램"
                        : resolvedCaseId && caseMap[resolvedCaseId]?.source === "kakao"
                          ? "카카오톡"
                          : "채널"

                    return (
                      <ApprovalRow
                        key={approval.id}
                        approval={{
                          ...approval,
                          caseTitle,
                        }}
                        selected={selectedIds.includes(approval.id)}
                        onSelectedChange={(checked) => toggleSelected(approval.id, checked)}
                        caseHref={caseHref}
                        channelLabel={channelLabel}
                        onApprove={() =>
                          updateApprovalMutation.mutate({
                            id: approval.id,
                            status: "approved",
                          })
                        }
                        onReject={() =>
                          setRejectDialog({
                            id: approval.id,
                            reason: approval.reason ?? "",
                          })
                        }
                        onSend={(mode) =>
                          outboundMutation.mutate({
                            id: approval.id,
                            mode: mode ?? "auto",
                          })
                        }
                        isApprovePending={isApprovePending}
                        sending={outboundMutation.isPending && outboundMutation.variables?.id === approval.id}
                        sendingMode={
                          outboundMutation.variables?.id === approval.id
                            ? (outboundMutation.variables?.mode ?? null)
                            : null
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <Dialog
        open={rejectDialog != null}
        onOpenChange={(open) => {
          if (!open) setRejectDialog(null)
        }}
      >
        <DialogContent
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-primary)" }}>
              거절 사유 입력
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              승인 요청을 거절하는 이유를 남겨 주세요.
            </p>
            <textarea
              value={rejectDialog?.reason ?? ""}
              onChange={(event) => {
                const value = event.target.value
                setRejectDialog((current) => (current ? { ...current, reason: value } : current))
              }}
              rows={5}
              className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none"
              style={{
                backgroundColor: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
              placeholder="거절 사유를 입력하세요..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              취소
            </Button>
            <Button
              className="gap-1.5"
              style={{ backgroundColor: "var(--color-danger)", color: "var(--text-on-primary)" }}
              disabled={!rejectDialog || updateApprovalMutation.isPending}
              onClick={() => {
                if (!rejectDialog) return
                updateApprovalMutation.mutate({
                  id: rejectDialog.id,
                  status: "rejected",
                  reason: rejectDialog.reason.trim(),
                })
              }}
            >
              {updateApprovalMutation.isPending &&
              updateApprovalMutation.variables?.status === "rejected" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              거절 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
