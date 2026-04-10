import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react"
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
  status: "pending" | "approved" | "rejected"
  payload?: {
    draft?: string
    [key: string]: unknown
  }
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
  approving?: boolean
  rejecting?: boolean
  isPending?: boolean
  pendingAction?: "approve" | "reject"
  className?: string
  selected?: boolean
  onSelectedChange?: (checked: boolean) => void
  caseHref?: string
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
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  approving = false,
  rejecting = false,
  isPending = false,
  pendingAction,
  className,
  selected = false,
  onSelectedChange,
  caseHref,
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
  const anyPending = isApprovePending || isRejectPending

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
            <div className="flex justify-end">
              {runStatus && <StatusBadge status={runStatus} />}
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
