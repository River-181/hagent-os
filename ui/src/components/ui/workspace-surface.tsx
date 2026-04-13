import * as React from "react"

import { cn } from "@/lib/utils"

export function WorkspacePanel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-[var(--bg-elevated)] shadow-[var(--shadow-xs)] transition-[background-color,border-color,box-shadow]",
        className,
      )}
      style={{ borderColor: "var(--border-default)" }}
      {...props}
    />
  )
}

export function WorkspaceSubtle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-[var(--bg-subtle)]",
        className,
      )}
      style={{ borderColor: "var(--border-default)" }}
      {...props}
    />
  )
}

export function WorkspaceHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}

export function WorkspaceEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center rounded-lg border px-6 py-10 text-center",
        className,
      )}
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}
    >
      {icon ? (
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ color: "var(--text-tertiary)", backgroundColor: "var(--bg-muted)" }}
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
