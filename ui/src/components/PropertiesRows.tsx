import type { ReactNode } from "react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface PropertiesCardProps {
  children: ReactNode
  className?: string
}

interface PropertiesRowProps {
  label: string
  value: ReactNode
}

interface CommonPropertiesRowsProps {
  status?: ReactNode
  priority?: ReactNode
  assignee?: ReactNode
  project?: ReactNode
  created?: ReactNode
  updated?: ReactNode
}

function renderValue(value: ReactNode | undefined) {
  if (value === undefined || value === null || value === "") {
    return <span style={{ color: "var(--text-tertiary)" }}>-</span>
  }
  return value
}

export function PropertiesCard({ children, className }: PropertiesCardProps) {
  return (
    <div
      className={cn("rounded-2xl p-4", className)}
      style={{ backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }}
    >
      {children}
    </div>
  )
}

export function PropertiesRow({ label, value }: PropertiesRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs shrink-0 w-24" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <div className="flex-1 flex justify-end text-xs" style={{ color: "var(--text-primary)" }}>
        {renderValue(value)}
      </div>
    </div>
  )
}

export function CommonPropertiesRows({
  status,
  priority,
  assignee,
  project,
  created,
  updated,
}: CommonPropertiesRowsProps) {
  return (
    <PropertiesCard>
      <PropertiesRow label="Status" value={status} />
      <Separator style={{ backgroundColor: "var(--border-default)" }} />
      <PropertiesRow label="Priority" value={priority} />
      <Separator style={{ backgroundColor: "var(--border-default)" }} />
      <PropertiesRow label="Assignee" value={assignee} />
      <Separator style={{ backgroundColor: "var(--border-default)" }} />
      <PropertiesRow label="Project" value={project} />
      <Separator style={{ backgroundColor: "var(--border-default)" }} />
      <PropertiesRow label="Created" value={created} />
      <Separator style={{ backgroundColor: "var(--border-default)" }} />
      <PropertiesRow label="Updated" value={updated} />
    </PropertiesCard>
  )
}
