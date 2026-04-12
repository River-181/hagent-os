import { useContext, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { approvalsApi } from "@/api/approvals"
import { ToastContext } from "@/components/ToastContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApprovalPayloadRenderer } from "@/components/ApprovalPayloadRenderer"
import {
  WorkspaceEmptyState,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { queryKeys } from "@/lib/queryKeys"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from "lucide-react"

const levelConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "낮음", bg: "var(--status-info-soft)", text: "var(--color-info)" },
  medium: { label: "중간", bg: "var(--status-warning-soft)", text: "var(--color-warning)" },
  high: { label: "높음", bg: "var(--status-danger-soft)", text: "var(--color-danger)" },
  critical: { label: "긴급", bg: "var(--status-danger-soft)", text: "var(--color-danger)" },
}

export function ApprovalDetailPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix, id } = useParams<{ orgPrefix: string; id: string }>()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState("")
  const [showRaw, setShowRaw] = useState(false)

  const {
    data: approval,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["approvals", id],
    queryFn: () => approvalsApi.get(id!),
    enabled: !!id,
  })

  useEffect(() => {
    const label = approval?.id ? `승인 #${approval.id.slice(0, 8)}` : `승인 ${id}`
    setBreadcrumbs([
      { label: "승인 큐", href: `/${orgPrefix}/approvals` },
      { label },
    ])
  }, [approval, id, orgPrefix, setBreadcrumbs])

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["approvals", id] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedOrgId ?? "") })
    void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(selectedOrgId ?? "") })
    void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(selectedOrgId ?? "") })
  }

  const decideMutation = useMutation({
    mutationFn: ({
      decision,
      comment,
    }: {
      decision: "approved" | "rejected"
      comment?: string
    }) => approvalsApi.decide(id!, decision, comment),
    onSuccess: (_data, variables) => {
      toast?.[variables.decision === "approved" ? "success" : "info"](
        variables.decision === "approved" ? "승인되었습니다." : "거절되었습니다.",
      )
      setRejectDialogOpen(false)
      setRejectComment("")
      invalidateAll()
    },
    onError: (_error, variables) => {
      toast?.error(
        variables.decision === "approved"
          ? "승인 처리에 실패했습니다."
          : "거절 처리에 실패했습니다.",
      )
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <WorkspaceEmptyState
          title="승인 정보를 불러오는 중입니다"
          description="잠시만 기다리면 상세 내용이 표시됩니다."
          icon={<Loader2 size={24} className="animate-spin" />}
        />
      </div>
    )
  }

  if (isError || !approval) {
    return (
      <div className="p-6 md:p-8">
        <WorkspaceEmptyState
          title="승인 정보를 불러오지 못했습니다"
          description="다시 시도해 주세요."
          icon={<AlertCircle size={28} />}
        />
      </div>
    )
  }

  const level = approval.level != null ? String(approval.level) : "medium"
  const levelKey = isNaN(Number(level))
    ? level
    : Number(level) <= 1
      ? "low"
      : Number(level) === 2
        ? "medium"
        : Number(level) === 3
          ? "high"
          : "critical"
  const levelCfg = levelConfig[levelKey] ?? levelConfig.medium
  const isDecided = approval.status !== "pending"
  const isApprovePending = decideMutation.isPending && decideMutation.variables?.decision === "approved"
  const isRejectPending = decideMutation.isPending && decideMutation.variables?.decision === "rejected"
  const statusLabel =
    approval.status === "pending"
      ? "승인 대기"
      : approval.status === "approved"
        ? "승인됨"
        : "거절됨"

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="승인 상세"
        description="요청 내용을 확인하고 승인 또는 거절하세요."
        action={
          isDecided ? (
            <Badge
              className="border-0 px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor:
                  approval.status === "approved"
                    ? "var(--status-success-soft)"
                    : "var(--status-danger-soft)",
                color:
                  approval.status === "approved"
                    ? "var(--color-success)"
                    : "var(--color-danger)",
              }}
            >
              {statusLabel}
            </Badge>
          ) : (
            <>
              <Button
                className="gap-2"
                disabled={decideMutation.isPending}
                onClick={() => decideMutation.mutate({ decision: "approved" })}
              >
                {isApprovePending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                승인
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={decideMutation.isPending}
                onClick={() => setRejectDialogOpen(true)}
                style={{ color: "var(--color-danger)" }}
              >
                {isRejectPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                거절
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
        <span>ID {approval.id}</span>
        <span>상태 {statusLabel}</span>
        <span>위험도 {levelCfg.label}</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <WorkspacePanel className="overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 border-b px-6 py-4"
            style={{ borderColor: "var(--border-default)" }}
          >
            <div className="min-w-0">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                요청 내용
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                payload와 raw JSON을 한 곳에서 확인합니다.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowRaw((prev) => !prev)}
            >
              {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showRaw ? "Raw 숨기기" : "Raw 보기"}
            </Button>
          </div>

          <div className="space-y-5 p-6 md:p-8">
            <ApprovalPayloadRenderer
              payload={approval.payload}
              decision={approval.decision}
              type={level}
            />

            {showRaw ? (
              <pre
                className="overflow-x-auto rounded-lg p-4 text-xs leading-relaxed"
                style={{
                  backgroundColor: "var(--bg-muted)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                {JSON.stringify(approval.payload, null, 2)}
              </pre>
            ) : null}
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="space-y-5 p-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              검토 요약
            </h2>
            <p className="text-xs leading-6" style={{ color: "var(--text-tertiary)" }}>
              상태와 메모만 빠르게 확인할 수 있게 정리했습니다.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span style={{ color: "var(--text-tertiary)" }}>현재 상태</span>
              <span className="text-right" style={{ color: "var(--text-primary)" }}>
                {statusLabel}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span style={{ color: "var(--text-tertiary)" }}>위험도</span>
              <Badge
                className="border-0 px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: levelCfg.bg, color: levelCfg.text }}
              >
                {levelCfg.label}
              </Badge>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span style={{ color: "var(--text-tertiary)" }}>결정 메모</span>
              <span className="max-w-[16rem] text-right leading-6" style={{ color: "var(--text-primary)" }}>
                {(approval.decision as any)?.comment?.trim() || "메모 없음"}
              </span>
            </div>
          </div>

          <div
            className="rounded-lg border px-4 py-3 text-sm leading-6"
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            {isDecided
              ? "이 승인 요청은 이미 처리되었습니다. 기록은 상세 패널에서 확인할 수 있습니다."
              : "아직 결정되지 않았습니다. 승인 또는 거절로 다음 단계가 진행됩니다."}
          </div>
        </WorkspacePanel>
      </div>

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open) setRejectDialogOpen(false)
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
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg p-3 text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
              placeholder="거절 사유를 입력하세요..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button
              className="gap-1.5"
              style={{ backgroundColor: "var(--color-danger)", color: "var(--text-on-primary)" }}
              disabled={decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate({
                  decision: "rejected",
                  comment: rejectComment.trim() || undefined,
                })
              }
            >
              {isRejectPending ? (
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
