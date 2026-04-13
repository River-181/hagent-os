import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriorityIconProps {
  priority: 0 | 1 | 2 | 3 | 4
  size?: number
  className?: string
}

type PriorityLevel = 0 | 1 | 2 | 3 | 4

const priorityConfig: Record<
  PriorityLevel,
  { Icon: React.FC<{ size: number }>; color: string; label: string }
> = {
  0: {
    Icon: ({ size }) => <AlertTriangle size={size} />,
    color: "var(--color-danger)",
    label: "긴급",
  },
  1: {
    Icon: ({ size }) => <ArrowUp size={size} />,
    color: "#f97316",
    label: "높음",
  },
  2: {
    Icon: ({ size }) => <Minus size={size} />,
    color: "#eab308",
    label: "보통",
  },
  3: {
    Icon: ({ size }) => <ArrowDown size={size} />,
    color: "#3b82f6",
    label: "낮음",
  },
  4: {
    Icon: ({ size }) => <Minus size={size} />,
    color: "var(--text-tertiary)",
    label: "없음",
  },
}

export function PriorityIcon({ priority, size = 16, className }: PriorityIconProps) {
  const level = (Math.max(0, Math.min(4, priority)) as PriorityLevel)
  const { Icon, color } = priorityConfig[level]
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ color }}
      title={priorityConfig[level].label}
    >
      <Icon size={size} />
    </span>
  )
}

export function priorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    0: "긴급",
    1: "높음",
    2: "보통",
    3: "낮음",
    4: "없음",
  }
  return labels[priority] ?? "없음"
}
