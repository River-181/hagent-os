import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, timeAgo } from "@/lib/utils"
import { StatusIcon } from "./StatusIcon"
import { PriorityIcon, priorityLabel } from "./PriorityIcon"
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
  { value: "0", label: "긴급", priority: 0 },
  { value: "1", label: "높음", priority: 1 },
  { value: "2", label: "보통", priority: 2 },
  { value: "3", label: "낮음", priority: 3 },
  { value: "4", label: "없음", priority: 4 },
]

function PropertyField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  )
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
  const editableTriggerClassName =
    "h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-xs text-[var(--text-primary)] shadow-none transition-colors hover:bg-[var(--bg-tertiary)] focus:ring-0"
  const staticBadgeClassName = "border-0 px-2 py-1 text-xs font-medium"

  return (
    <div className={cn("space-y-4 text-sm", className)}>
      {canEdit ? (
        <p className="text-[11px] leading-5" style={{ color: "var(--text-tertiary)" }}>
          드롭다운으로 표시된 항목은 이 패널에서 바로 수정됩니다.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PropertyField label="상태">
          <Select value={status} onValueChange={handleStatusChange} disabled={!canEdit}>
            <SelectTrigger className={editableTriggerClassName}>
              <SelectValue>
                <span className="flex items-center gap-1.5">
                  <StatusIcon status={status} size={12} />
                  {statusOptions.find((s) => s.value === status)?.label ?? status}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-1.5">
                    <StatusIcon status={opt.value} size={12} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyField>

        <PropertyField label="우선순위">
          <Select value={String(priority)} onValueChange={handlePriorityChange} disabled={!onUpdate}>
            <SelectTrigger className={editableTriggerClassName}>
              <SelectValue>
                <span className="flex items-center gap-1.5">
                  <PriorityIcon priority={priority as 0 | 1 | 2 | 3 | 4} size={12} />
                  {priorityLabel(priority)}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-1.5">
                    <PriorityIcon priority={opt.priority as 0 | 1 | 2 | 3 | 4} size={12} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyField>

        <PropertyField label="담당 에이전트">
          <Select value={assigneeAgentId ?? "__none__"} onValueChange={handleAssigneeChange} disabled={!onUpdate}>
            <SelectTrigger className={editableTriggerClassName}>
              <SelectValue placeholder="미배정" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">미배정</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyField>

        <PropertyField label="프로젝트">
          <Select value={projectId ?? "__none__"} onValueChange={handleProjectChange} disabled={!onUpdate}>
            <SelectTrigger className={editableTriggerClassName}>
              <SelectValue placeholder="미연결" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">미연결</SelectItem>
              {projects.map((projectOption) => (
                <SelectItem key={projectOption.id} value={projectOption.id}>
                  {projectOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.type && (
          <PropertyField label="유형">
            <Badge
              className={staticBadgeClassName}
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {data.type}
            </Badge>
          </PropertyField>
        )}

        {data.severity && (
          <PropertyField label="심각도">
            <Badge
              className={staticBadgeClassName}
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {data.severity}
            </Badge>
          </PropertyField>
        )}

        {data.reporter && (
          <PropertyField label="보고자">
            <span className="text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
              {data.reporter}
            </span>
          </PropertyField>
        )}

        {studentName && (
          <PropertyField label="학생">
            <span className="text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
              {studentName}
            </span>
          </PropertyField>
        )}

        {createdAt && (
          <PropertyField label="생성일">
            <span className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
              {timeAgo(createdAt)}
            </span>
          </PropertyField>
        )}

        {dueAt && (
          <PropertyField label="마감일">
            <span className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
              {timeAgo(dueAt)}
            </span>
          </PropertyField>
        )}
      </div>
    </div>
  )
}
