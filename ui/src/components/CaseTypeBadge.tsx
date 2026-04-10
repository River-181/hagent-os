import { cn } from "@/lib/utils"

export type CaseType =
  | "complaint"
  | "refund"
  | "makeup"
  | "inquiry"
  | "churn"
  | "schedule"

interface CaseTypeBadgeProps {
  type: string
  className?: string
}

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  complaint: { label: "민원", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  refund: { label: "환불", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  makeup: { label: "보강", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  inquiry: { label: "문의", color: "var(--text-secondary)", bg: "var(--bg-tertiary)" },
  churn: { label: "이탈", color: "var(--color-danger)", bg: "rgba(239,68,68,0.12)" },
  schedule: { label: "일정", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
}

export function CaseTypeBadge({ type, className }: CaseTypeBadgeProps) {
  const config = typeConfig[type] ?? {
    label: type,
    color: "var(--text-secondary)",
    bg: "var(--bg-tertiary)",
  }

  return (
    <span
      className={cn("inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded", className)}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      {config.label}
    </span>
  )
}

export function caseTypeLabel(type: string): string {
  return typeConfig[type]?.label ?? type
}
