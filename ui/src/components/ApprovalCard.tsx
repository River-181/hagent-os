import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Copy, ExternalLink, Loader2, Send, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { cn, timeAgo } from "@/lib/utils"
import { Identity } from "./Identity"
import { StatusBadge } from "./StatusBadge"
import type { RunStatus } from "./StatusBadge"
import { ApprovalPayloadRenderer } from "./ApprovalPayloadRenderer"

interface ApprovalCase {
  id: string
  title: string
}

interface ApprovalAgent {
  id: string
  name: string
  avatarUrl?: string
}

interface ApprovalItem {
  id: string
  level?: "low" | "medium" | "high" | "critical"
  status: "pending" | "approved" | "rejected" | "revision_requested"
  payload?: {
    draft?: string
    [key: string]: unknown
  }
  decision?: Record<string, unknown>
  case?: ApprovalCase
  caseTitle?: string
  agent?: ApprovalAgent
  agentName?: string
  createdAt?: string
  created_at?: string
}

interface ApprovalCardProps {
  approval: ApprovalItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onSend?: (id: string, mode?: "auto" | "confirm_bridge") => void
  approving?: boolean
  rejecting?: boolean
  sending?: boolean
  sendingMode?: "auto" | "confirm_bridge" | null
  isPending?: boolean
  pendingAction?: "approve" | "reject" | "revision"
  className?: string
  selected?: boolean
  onSelectedChange?: (checked: boolean) => void
  caseHref?: string
  channelLabel?: string
}

const levelConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "낮음", bg: "#f0f9ff", text: "#0284c7" },
  medium: { label: "중간", bg: "#fffbeb", text: "#d97706" },
  high: { label: "높음", bg: "#fff7ed", text: "#ea580c" },
  critical: { label: "긴급", bg: "#fef2f2", text: "#dc2626" },
}

const runStatusMap: Record<ApprovalItem["status"], RunStatus | null> = {
  pending: null,
  approved: "completed",
  rejected: "failed",
  revision_requested: null,
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onSend,
  approving = false,
  rejecting = false,
  sending = false,
  sendingMode = null,
  isPending = false,
  pendingAction,
  className,
  selected = false,
  onSelectedChange,
  caseHref,
  channelLabel = "회신",
}: ApprovalCardProps) {
  const level = approval.level ?? "medium"
  const levelCfg = levelConfig[level] ?? levelConfig.medium
  const runStatus = runStatusMap[approval.status]
  const isDecided = approval.status !== "pending"
  const createdAt = approval.createdAt ?? approval.created_at
  const agentName = approval.agent?.name ?? approval.agentName ?? "에이전트"
  const caseTitle = approval.case?.title ?? approval.caseTitle ?? ""

  const isApprovePending = approving || (isPending && pendingAction === "approve")
  const isRejectPending = rejecting || (isPending && pendingAction === "reject")
  const isRevisionPending = isPending && pendingAction === "revision"
  const anyPending = isApprovePending || isRejectPending || isRevisionPending
  const decision = approval.decision ?? {}
  const sideEffects =
    typeof decision.sideEffects === "object" && decision.sideEffects && !Array.isArray(decision.sideEffects)
      ? (decision.sideEffects as Record<string, unknown>)
      : {}
  const deliveryMessage =
    typeof sideEffects.telegramMessage === "object" && sideEffects.telegramMessage && !Array.isArray(sideEffects.telegramMessage)
      ? (sideEffects.telegramMessage as Record<string, any>)
      : typeof sideEffects.kakaoMessage === "object" && sideEffects.kakaoMessage && !Array.isArray(sideEffects.kakaoMessage)
        ? (sideEffects.kakaoMessage as Record<string, any>)
        : null
  const deliveryStatus = typeof deliveryMessage?.status === "string" ? deliveryMessage.status : null
  const bridge = typeof deliveryMessage?.bridge === "object" && deliveryMessage.bridge ? deliveryMessage.bridge : null
  const replyDraft =
    (typeof deliveryMessage?.draft === "string" && deliveryMessage.draft) ||
    (typeof approval.payload?.draft === "string" && approval.payload.draft) ||
    (typeof approval.payload?.suggestedReply === "string" && approval.payload.suggestedReply) ||
    ""

  const copyDraft = async () => {
    if (!replyDraft) return
    await navigator.clipboard.writeText(replyDraft)
  }

  const openChannel = () => {
    const target = bridge?.chatUrl ?? bridge?.channelUrl
    if (typeof target === "string" && target) {
      window.open(target, "_blank", "noopener,noreferrer")
    }
  }

  const outboundTone =
    deliveryStatus === "sent"
      ? { bg: "rgba(34,197,94,0.12)", text: "var(--color-success)", label: "발송 완료" }
      : deliveryStatus === "failed"
        ? { bg: "rgba(239,68,68,0.12)", text: "var(--color-danger)", label: "발송 실패" }
        : deliveryStatus === "ready_to_send"
          ? { bg: "rgba(245,158,11,0.12)", text: "#d97706", label: "발송 준비" }
          : null

  return (
    <Card
      className={cn("border-0", className)}
      style={{
        backgroundColor: "var(--bg-base)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {onSelectedChange && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onSelectedChange(event.target.checked)}
                className="mt-1 h-4 w-4 rounded"
                aria-label="승인 항목 선택"
              />
            )}

            <div className="min-w-0">
              <Identity
                name={agentName}
                avatarUrl={approval.agent?.avatarUrl}
                type="agent"
                size="sm"
              />
              {caseTitle && (
                <p className="text-sm font-medium mt-2 truncate" style={{ color: "var(--text-primary)" }}>
                  {caseTitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              className="text-xs font-medium border-0 px-2 py-0.5"
              style={{ backgroundColor: levelCfg.bg, color: levelCfg.text }}
            >
              {levelCfg.label}
            </Badge>
            {createdAt && (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {timeAgo(createdAt)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <ApprovalPayloadRenderer payload={approval.payload} type={approval.level} />
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        <div className="flex items-center justify-between gap-3 w-full">
          {caseHref ? (
            <Link
              to={caseHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--color-teal-500)" }}
            >
              케이스 보기
              <ArrowRight size={12} />
            </Link>
          ) : (
            <span />
          )}

          {isDecided ? (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {outboundTone ? (
                  <Badge
                    className="text-xs font-medium border-0 px-2 py-0.5"
                    style={{ backgroundColor: outboundTone.bg, color: outboundTone.text }}
                  >
                    {outboundTone.label}
                  </Badge>
                ) : null}
                {runStatus && <StatusBadge status={runStatus} />}
              </div>
              {deliveryStatus && onSend ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {replyDraft ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => void copyDraft()}
                    >
                      <Copy size={12} />
                      문안 복사
                    </Button>
                  ) : null}
                  {(bridge?.chatUrl || bridge?.channelUrl) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={openChannel}
                    >
                      <ExternalLink size={12} />
                      채널 열기
                    </Button>
                  ) : null}
                  {deliveryStatus !== "sent" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      disabled={sending}
                      onClick={() => onSend(approval.id, "auto")}
                    >
                      {sending && sendingMode === "auto" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      {channelLabel} 자동 발송
                    </Button>
                  ) : null}
                  {(deliveryStatus === "ready_to_send" || deliveryStatus === "failed") ? (
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs text-white"
                      style={{ backgroundColor: "var(--color-teal-500)" }}
                      disabled={sending}
                      onClick={() => onSend(approval.id, "confirm_bridge")}
                    >
                      {sending && sendingMode === "confirm_bridge" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      전송 완료 처리
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onApprove(approval.id)}
                disabled={anyPending}
                className="text-xs border-0 text-white gap-1.5"
                style={{ backgroundColor: "var(--color-success)" }}
              >
                <CheckCircle2 size={12} />
                {isApprovePending ? "승인 중..." : "승인"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(approval.id)}
                disabled={anyPending}
                className="text-xs gap-1.5"
                style={{
                  color: "var(--color-danger)",
                  borderColor: "rgba(239,68,68,0.25)",
                }}
              >
                <XCircle size={12} />
                {isRejectPending ? "거절 중..." : "거절"}
              </Button>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
