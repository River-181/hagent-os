import { cn } from "@/lib/utils"

export type CaseSeverity = "immediate" | "same_day" | "normal" | "low"

interface CaseSeverityBadgeProps {
  severity: string
  className?: string
}

const severityConfig: Record<string, { label: string; color: string }> = {
  // API values
  immediate: { label: "즉시", color: "var(--color-danger)" },
  same_day: { label: "당일", color: "#eab308" },
  normal: { label: "일반", color: "var(--text-secondary)" },
  low: { label: "낮음", color: "var(--text-tertiary)" },
  // Legacy values from CaseNewPage
  urgent: { label: "즉시", color: "var(--color-danger)" },
  today: { label: "당일", color: "#eab308" },
  // Legacy from CasesPage
  high: { label: "높음", color: "var(--color-danger)" },
  medium: { label: "중간", color: "#eab308" },
  critical: { label: "긴급", color: "var(--color-danger)" },
}

export function CaseSeverityBadge({ severity, className }: CaseSeverityBadgeProps) {
  const config = severityConfig[severity] ?? { label: severity, color: "var(--text-tertiary)" }

  return (
    <span
      className={cn("inline-flex items-center text-xs font-medium", className)}
      style={{ color: config.color }}
    >
      {config.label}
    </span>
  )
}

export function caseSeverityLabel(severity: string): string {
  return severityConfig[severity]?.label ?? severity
}
