import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CaseStatus } from "./StatusIcon"

interface CaseData {
  id?: string
  status?: string
  priority?: number
  type?: string
  severity?: string
  assigneeAgentId?: string | null
  opsGroupId?: string | null
  project?: {
    id: string
    name: string
  } | null
  assigneeAgent?: {
    id: string
    name: string
    avatarUrl?: string
  }
  assignee_agent?: {
    id: string
    name: string
    avatarUrl?: string
  }
  reporter?: string
  studentName?: string
  student_name?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  dueAt?: string
  due_at?: string
}

interface CasePropertiesProps {
  /** Preferred prop name */
  caseData?: CaseData
  /** Alias for backwards compat */
  case?: CaseData
  onStatusChange?: (status: string) => void
  onUpdate?: (field: string, value: unknown) => void
  agents?: Array<{ id: string; name: string; agentType?: string }>
  projects?: Array<{ id: string; name: string }>
  className?: string
}

const statusOptions: { value: CaseStatus; label: string }[] = [
  { value: "backlog", label: "백로그" },
  { value: "todo", label: "할 일" },
  { value: "in_progress", label: "진행 중" },
  { value: "in_review", label: "검토 중" },
  { value: "blocked", label: "차단됨" },
  { value: "done", label: "완료" },
]

const priorityOptions: { value: string; label: string; priority: number }[] = [
  { value: "0", label: "P0 · 긴급", priority: 0 },
  { value: "1", label: "P1 · 높음", priority: 1 },
  { value: "2", label: "P2 · 보통", priority: 2 },
  { value: "3", label: "P3 · 낮음", priority: 3 },
  { value: "4", label: "미지정", priority: 4 },
]

function PropertyField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <div>{children}</div>
    </div>
  )
}

function formatDateLabel(value?: string | null) {
  if (!value) return "미설정"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  const hasExplicitTime =
    value.includes("T") &&
    (parsed.getHours() !== 0 || parsed.getMinutes() !== 0 || parsed.getSeconds() !== 0)

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    ...(hasExplicitTime ? { timeStyle: "short" } : {}),
  }).format(parsed)
}

export function CaseProperties({
  caseData,
  case: caseProp,
  onStatusChange,
  onUpdate,
  agents = [],
  projects = [],
  className,
}: CasePropertiesProps) {
  const data = caseData ?? caseProp ?? {}

  const status = (data.status ?? "backlog") as CaseStatus
  const priority = (data.priority ?? 4) as number
  const assigneeAgent = data.assigneeAgent ?? data.assignee_agent
  const assigneeAgentId = data.assigneeAgentId ?? assigneeAgent?.id ?? null
  const project = data.project ?? null
  const projectId = data.opsGroupId ?? project?.id ?? null
  const studentName = data.studentName ?? data.student_name
  const createdAt = data.createdAt ?? data.created_at
  const updatedAt = data.updatedAt ?? data.updated_at
  const dueAt = data.dueAt ?? data.due_at

  const handleStatusChange = (value: string) => {
    onStatusChange?.(value)
    onUpdate?.("status", value)
  }

  const handlePriorityChange = (value: string) => {
    onUpdate?.("priority", Number(value))
  }

  const handleAssigneeChange = (value: string) => {
    onUpdate?.("assigneeAgentId", value === "__none__" ? null : value)
  }

  const handleProjectChange = (value: string) => {
    onUpdate?.("opsGroupId", value === "__none__" ? null : value)
  }

  const canEdit = !!(onStatusChange ?? onUpdate)
  const editableControlClassName =
    "h-9 w-full rounded-lg border px-3 text-sm shadow-none transition-colors focus:outline-none"
  const staticBadgeClassName = "border-0 px-2 py-1 text-xs font-medium"
  const detailFields = [
    data.type ? { label: "유형", value: data.type, badge: true } : null,
    data.severity ? { label: "심각도", value: data.severity, badge: true } : null,
    data.reporter ? { label: "보고자", value: data.reporter } : null,
    studentName ? { label: "학생", value: studentName } : null,
    createdAt ? { label: "생성일", value: formatDateLabel(createdAt) } : null,
    updatedAt ? { label: "최근 수정", value: formatDateLabel(updatedAt) } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; badge?: boolean }>

  return (
    <div className={cn("space-y-4 text-sm", className)}>
      {canEdit ? (
        <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
          상태, 우선순위, 담당 에이전트, 프로젝트 배정은 이 패널에서 바로 수정됩니다.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <PropertyField label="상태">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={!canEdit}
            className={editableControlClassName}
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </PropertyField>

        <PropertyField label="우선순위">
          <select
            value={String(priority)}
            onChange={(e) => handlePriorityChange(e.target.value)}
            disabled={!onUpdate}
            className={editableControlClassName}
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </PropertyField>

        <PropertyField label="담당 에이전트">
          <select
            value={assigneeAgentId ?? "__none__"}
            onChange={(e) => handleAssigneeChange(e.target.value)}
            disabled={!onUpdate}
            className={editableControlClassName}
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            <option value="__none__">미배정</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </PropertyField>

        <PropertyField label="프로젝트 배정">
          <select
            value={projectId ?? "__none__"}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={!onUpdate}
            className={editableControlClassName}
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            <option value="__none__">미연결</option>
            {projects.map((projectOption) => (
              <option key={projectOption.id} value={projectOption.id}>
                {projectOption.name}
              </option>
            ))}
          </select>
        </PropertyField>

        <PropertyField label="마감일">
          <div
            className="flex min-h-9 items-center rounded-lg border px-3 text-sm"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-subtle)",
              color: dueAt ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {formatDateLabel(dueAt)}
          </div>
        </PropertyField>
      </div>

      {detailFields.length > 0 ? (
        <details
          className="rounded-lg border px-4 py-3"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: "var(--bg-subtle)",
          }}
        >
          <summary
            className="cursor-pointer text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            자세히
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {detailFields.map((field) => (
              <PropertyField key={field.label} label={field.label}>
                {field.badge ? (
                  <Badge
                    className={staticBadgeClassName}
                    style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                  >
                    {field.value}
                  </Badge>
                ) : (
                  <span className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    {field.value}
                  </span>
                )}
              </PropertyField>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
