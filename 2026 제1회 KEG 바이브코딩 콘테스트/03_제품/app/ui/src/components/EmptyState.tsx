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
      className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
    >
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
        style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {description && (
        <p className="text-sm mb-5 max-w-xs" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      )}
      {action && (
        <Button
          size="sm"
          className="text-xs font-semibold border-0 text-white"
          style={{ backgroundColor: "var(--color-teal-500)" }}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
