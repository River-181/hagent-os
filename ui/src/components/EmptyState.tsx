import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center rounded-lg border px-6 py-10 text-center",
        className,
      )}
      style={{
        borderColor: "var(--border-default)",
        backgroundColor: "var(--bg-subtle)",
      }}
    >
      <div
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-tertiary)" }}
      >
        {icon}
      </div>
      <p className="mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {description && (
        <p className="mb-5 max-w-xs text-sm leading-6" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" className="gap-1.5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
