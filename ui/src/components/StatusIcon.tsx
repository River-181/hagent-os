import { Circle, CircleDot, Loader2, Eye, Ban, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type CaseStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "done"

interface StatusIconProps {
  status: CaseStatus
  size?: number
  className?: string
}

const statusConfig: Record<
  CaseStatus,
  { Icon: React.FC<{ size: number; className?: string }>; color: string; animate?: boolean }
> = {
  backlog: {
    Icon: ({ size, className }) => <Circle size={size} className={className} />,
    color: "var(--text-tertiary)",
  },
  todo: {
    Icon: ({ size, className }) => <CircleDot size={size} className={className} />,
    color: "#3b82f6",
  },
  in_progress: {
    Icon: ({ size, className }) => <Loader2 size={size} className={cn("animate-spin", className)} />,
    color: "var(--color-teal-500)",
    animate: true,
  },
  in_review: {
    Icon: ({ size, className }) => <Eye size={size} className={className} />,
    color: "#a855f7",
  },
  blocked: {
    Icon: ({ size, className }) => <Ban size={size} className={className} />,
    color: "var(--color-danger)",
  },
  done: {
    Icon: ({ size, className }) => <CheckCircle2 size={size} className={className} />,
    color: "var(--color-success)",
  },
}

export function StatusIcon({ status, size = 16, className }: StatusIconProps) {
  const { Icon, color } = statusConfig[status]
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ color }}
    >
      <Icon size={size} />
    </span>
  )
}
