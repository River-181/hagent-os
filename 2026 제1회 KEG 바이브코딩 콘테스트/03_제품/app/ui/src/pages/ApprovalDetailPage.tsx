import { useContext, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { approvalsApi } from "@/api/approvals"
import { queryKeys } from "@/lib/queryKeys"
import { ToastContext } from "@/components/ToastContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ApprovalPayloadRenderer } from "@/components/ApprovalPayloadRenderer"
import { StatusBadge } from "@/components/StatusBadge"
import type { RunStatus } from "@/components/StatusBadge"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

const levelConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "낮음", bg: "rgba(2,132,199,0.1)", text: "#0284c7" },
  medium: { label: "중간", bg: "rgba(217,119,6,0.1)", text: "#d97706" },
  high: { label: "높음", bg: "rgba(234,88,12,0.1)", text: "#ea580c" },
  critical: { label: "긴급", bg: "rgba(220,38,38,0.1)", text: "#dc2626" },
}

const runStatusMap: Record<string, RunStatus | null> = {
  pending: null,
  approved: "completed",
  rejected: "failed",
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
      { label: label },
    ])
  }, [setBreadcrumbs, orgPrefix, id, approval])

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["approvals", id] })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.approvals.list(selectedOrgId ?? ""),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.activity.list(selectedOrgId ?? ""),
    })
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
        variables.decision === "approved" ? "승인되었습니다." : "거절되었습니다."
      )
      setRejectDialogOpen(false)
      setRejectComment("")
      invalidateAll()
    },
    onError: (_error, variables) => {
      toast?.error(
        variables.decision === "approved"
          ? "승인 처리에 실패했습니다."
          : "거절 처리에 실패했습니다."
      )
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    )
  }

  if (isError || !approval) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle size={28} style={{ color: "var(--color-danger)" }} />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          승인 정보를 불러오지 못했습니다.
        </p>
      </div>
    )
  }

  const level = approval.level != null ? String(approval.level) : "medium"
  const levelKey = isNaN(Number(level)) ? level : (Number(level) <= 1 ? "low" : Number(level) === 2 ? "medium" : Number(level) === 3 ? "high" : "critical")
  const levelCfg = levelConfig[levelKey] ?? levelConfig.medium
  const runStatus = runStatusMap[approval.status] ?? null
  const isDecided = approval.status !== "pending"
  const isApprovePending = decideMutation.isPending && decideMutation.variables?.decision === "approved"
  const isRejectPending = decideMutation.isPending && decideMutation.variables?.decision === "rejected"

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            승인 상세
          </h1>
          <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-tertiary)" }}>
            {approval.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className="text-xs font-medium border-0 px-2 py-0.5"
            style={{ backgroundColor: levelCfg.bg, color: levelCfg.text }}
          >
            {levelCfg.label}
          </Badge>
          {runStatus && <StatusBadge status={runStatus} />}
        </div>
      </div>

      {/* Payload card */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          요청 내용
        </h2>
        <ApprovalPayloadRenderer payload={approval.payload} type={level} />

        {/* Raw payload toggle */}
        <div>
          <button
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--text-tertiary)" }}
            onClick={() => setShowRaw((prev) => !prev)}
          >
            {showRaw ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Raw payload {showRaw ? "숨기기" : "보기"}
          </button>
          {showRaw && (
            <pre
              className="mt-2 rounded-lg p-3 text-xs overflow-x-auto"
              style={{
                backgroundColor: "var(--bg-base)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              {JSON.stringify(approval.payload, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Decision section */}
      {isDecided ? (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor:
              approval.status === "approved"
                ? "rgba(20,184,166,0.06)"
                : "rgba(239,68,68,0.06)",
            border: `1px solid ${
              approval.status === "approved"
                ? "rgba(20,184,166,0.2)"
                : "rgba(239,68,68,0.2)"
            }`,
          }}
        >
          {approval.status === "approved" ? (
            <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} />
          ) : (
            <XCircle size={16} style={{ color: "var(--color-danger)" }} />
          )}
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {approval.status === "approved" ? "승인됨" : "거절됨"}
            </p>
            {(approval.decision as any)?.comment && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {(approval.decision as any).comment}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            className="flex-1 gap-1.5 text-white border-0"
            style={{ backgroundColor: "var(--color-success)" }}
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
            className="flex-1 gap-1.5"
            variant="outline"
            style={{ color: "var(--color-danger)", borderColor: "rgba(239,68,68,0.25)" }}
            disabled={decideMutation.isPending}
            onClick={() => setRejectDialogOpen(true)}
          >
            {isRejectPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <XCircle size={14} />
            )}
            거절
          </Button>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open) setRejectDialogOpen(false)
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
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
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
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              className="gap-1.5"
              style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}
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
