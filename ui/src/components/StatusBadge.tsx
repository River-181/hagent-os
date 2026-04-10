import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type RunStatus = "queued" | "running" | "completed" | "pending_approval" | "failed"

interface StatusBadgeProps {
  status: RunStatus
  className?: string
}

const statusConfig: Record<
  RunStatus,
  {
    label: string
    icon: React.ReactNode
    bg: string
    text: string
    extraClass?: string
  }
> = {
  queued: {
    label: "대기 중",
    icon: <Clock size={12} />,
    bg: "var(--bg-tertiary)",
    text: "var(--text-secondary)",
  },
  running: {
    label: "실행 중",
    icon: <Loader2 size={12} className="animate-spin" />,
    bg: "var(--color-teal-500)",
    text: "#fff",
    extraClass: "animate-pulse",
  },
  completed: {
    label: "완료",
    icon: <CheckCircle2 size={12} />,
    bg: "var(--color-success)",
    text: "#fff",
  },
  pending_approval: {
    label: "승인 대기",
    icon: <Clock size={12} />,
    bg: "#d97706",
    text: "#fff",
  },
  failed: {
    label: "실패",
    icon: <XCircle size={12} />,
    bg: "var(--color-danger)",
    text: "#fff",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, icon, bg, text, extraClass } = statusConfig[status]
  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 border-0",
        extraClass,
        className
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      {icon}
      {label}
    </Badge>
  )
}
