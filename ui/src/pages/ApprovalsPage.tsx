import { useEffect, useContext, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { approvalsApi } from "@/api/approvals"
import { casesApi } from "@/api/cases"
import { queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApprovalCard } from "@/components/ApprovalCard"
import { EmptyState } from "@/components/EmptyState"
import { ToastContext } from "@/components/ToastContext"
import { usePanel } from "@/context/PanelContext"
import { Loader2, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react"

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

async function decideApproval(id: string, decision: "approved" | "rejected", comment?: string) {
  return approvalsApi.decide(id, decision, comment)
}

export function ApprovalsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
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
    queryKey: queryKeys.approvals.list(selectedOrgId ?? ""),
    queryFn: () => approvalsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: allCases = [] } = useQuery({
    queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    queryFn: () => casesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
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

  const approvals = allApprovals as any[]
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
    void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedOrgId ?? "") })
    void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(selectedOrgId ?? "") })
    void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(selectedOrgId ?? "") })
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

  const allPendingSelected =
    pendingVisibleIds.length > 0 &&
    pendingVisibleIds.every((id) => selectedIds.includes(id))

  useEffect(() => {
    setPanelContent(
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">승인 속성</p>
          <p className="mt-1 text-sm text-slate-500">
            승인 대기, 발송 대기, 일괄 처리를 한 패널에서 확인합니다.
          </p>
        </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-700">승인 대기</p>
              <p className="mt-1 text-xl font-semibold text-amber-900">{pendingCount}건</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs text-sky-700">발송 준비</p>
              <p className="mt-1 text-xl font-semibold text-sky-900">{readyToSendCount}건</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">선택된 항목</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{selectedVisibleIds.length}건</p>
            </div>
          </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">현재 상태</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span>현재 탭</span>
              <span className="font-medium text-slate-900">
                {activeTab === "pending" ? "대기중" : activeTab === "approved" ? "승인됨" : activeTab === "rejected" ? "거절됨" : "전체"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>승인 완료</span>
              <span className="font-medium text-slate-900">{approvedCount}건</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>발송 완료</span>
              <span className="font-medium text-slate-900">{sentCount}건</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>발송 실패</span>
              <span className="font-medium text-slate-900">{failedCount}건</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>거절 완료</span>
              <span className="font-medium text-slate-900">{rejectedCount}건</span>
            </div>
          </div>
        </div>
      </div>,
    )
    return () => setPanelContent(null)
  }, [activeTab, approvedCount, failedCount, pendingCount, readyToSendCount, rejectedCount, selectedVisibleIds.length, sentCount, setPanelContent])

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
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-4 gap-3"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            승인 큐
          </h1>
          {pendingCount > 0 && (
            <Badge
              className="text-xs border-0"
              style={{
                backgroundColor: "rgba(217,119,6,0.12)",
                color: "#d97706",
              }}
            >
              {pendingCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendingVisibleIds.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="h-4 w-4 rounded"
                aria-label="전체 선택"
              />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>전체 선택</span>
            </label>
          )}
          {selectedVisibleIds.length > 0 && (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                style={{ backgroundColor: "var(--color-success)", color: "#fff" }}
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
                size="sm"
                variant="outline"
                className="gap-1.5"
                style={{ color: "var(--color-danger)", borderColor: "rgba(239,68,68,0.25)" }}
                disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
                onClick={() => bulkRejectMutation.mutate(selectedVisibleIds)}
              >
                {bulkRejectMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                일괄 거부
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2
            size={22}
            className="animate-spin"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle size={28} style={{ color: "var(--color-danger)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            승인 목록을 불러오는 데 실패했습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="px-6 pt-4">
            <div
              className="rounded-2xl border px-4 py-4"
              style={{
                borderColor: "rgba(245,158,11,0.18)",
                backgroundColor: "rgba(245,158,11,0.06)",
              }}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    운영자 발송 브리지 큐
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    승인 완료 후 `발송 준비`로 올라온 항목은 문안 확인, 채널 열기, 전송 완료 처리 순서로 마감합니다.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-0" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#d97706" }}>
                    발송 준비 {readyToSendCount}건
                  </Badge>
                  <Badge className="border-0" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "var(--color-danger)" }}>
                    발송 실패 {failedCount}건
                  </Badge>
                  <Badge className="border-0" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--color-success)" }}>
                    발송 완료 {sentCount}건
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ApprovalStatusTab)}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="px-6 pt-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
              <TabsList className="h-9 bg-transparent p-0 gap-1">
                {(
                  [
                    { value: "all" as ApprovalStatusTab, label: "전체", count: approvals.length },
                    { value: "pending" as ApprovalStatusTab, label: "대기중", count: pendingCount },
                    { value: "approved" as ApprovalStatusTab, label: "승인됨", count: approvedCount },
                    { value: "rejected" as ApprovalStatusTab, label: "거절됨", count: rejectedCount },
                  ] satisfies { value: ApprovalStatusTab; label: string; count: number }[]
                ).map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      "h-8 px-3 text-xs font-medium rounded-md border-0 data-[state=active]:bg-[var(--bg-tertiary)] data-[state=active]:text-[var(--text-primary)] data-[state=inactive]:text-[var(--text-tertiary)]"
                    )}
                  >
                    {label}
                    {count > 0 && (
                      <span className="ml-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-6 max-w-3xl mx-auto space-y-3">
                {filteredApprovals.length === 0 ? (
                  <EmptyState
                    icon={
                      activeTab === "pending" ? (
                        <Clock size={32} />
                      ) : activeTab === "approved" ? (
                        <CheckCircle size={32} />
                      ) : (
                        <XCircle size={32} />
                      )
                    }
                    title={
                      activeTab === "pending"
                        ? "대기 중인 승인이 없습니다"
                        : activeTab === "approved"
                          ? "승인된 항목이 없습니다"
                          : activeTab === "rejected"
                            ? "거절된 항목이 없습니다"
                            : "표시할 승인 항목이 없습니다"
                    }
                    description="에이전트의 승인 요청이 들어오면 여기에서 바로 처리할 수 있습니다."
                  />
                ) : (
                  filteredApprovals.map((approval) => {
                    const isPending =
                      updateApprovalMutation.isPending &&
                      updateApprovalMutation.variables?.id === approval.id
                    const resolvedCaseId = approval.caseId ?? approval.case_id ?? approval.case?.id
                    const resolvedCaseTitle =
                      approval.case?.title ??
                      approval.caseTitle ??
                      (resolvedCaseId ? caseMap[resolvedCaseId]?.title : undefined)
                    const channelLabel =
                      resolvedCaseId && caseMap[resolvedCaseId]?.source === "telegram"
                        ? "텔레그램"
                        : resolvedCaseId && caseMap[resolvedCaseId]?.source === "kakao"
                          ? "카카오톡"
                          : "채널"

                    return (
                      <ApprovalCard
                        key={approval.id}
                        approval={{
                          ...approval,
                          caseTitle: resolvedCaseTitle,
                        }}
                        channelLabel={channelLabel}
                        selected={selectedIds.includes(approval.id)}
                        onSelectedChange={(checked) => toggleSelected(approval.id, checked)}
                        caseHref={
                          resolvedCaseId
                            ? `/${orgPrefix ?? ""}/cases/${resolvedCaseId}`
                            : undefined
                        }
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
                        onSend={(_approvalId, mode) =>
                          outboundMutation.mutate({
                            id: approval.id,
                            mode: mode ?? "auto",
                          })
                        }
                        isPending={isPending}
                        pendingAction={
                          updateApprovalMutation.variables?.status === "rejected"
                            ? "reject"
                            : "approve"
                        }
                        sending={outboundMutation.isPending && outboundMutation.variables?.id === approval.id}
                        sendingMode={
                          outboundMutation.variables?.id === approval.id
                            ? outboundMutation.variables?.mode
                            : null
                        }
                      />
                    )
                  })
                )}
              </div>
            </div>
          </Tabs>

          <Dialog
            open={rejectDialog != null}
            onOpenChange={(open) => {
              if (!open) setRejectDialog(null)
            }}
          >
            <DialogContent
              style={{
                backgroundColor: "var(--bg-base)",
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
                    backgroundColor: "var(--bg-elevated)",
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
                  style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}
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
        </>
      )}
    </div>
  )
}
