import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn, timeAgo } from "@/lib/utils"
import { Identity } from "./Identity"
import { StatusIcon } from "./StatusIcon"
import { PriorityIcon, priorityLabel } from "./PriorityIcon"
import type { CaseStatus } from "./StatusIcon"

interface CaseData {
  id?: string
  status?: string
  priority?: number
  type?: string
  severity?: string
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

function PropertyRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs shrink-0 w-24" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

export function CaseProperties({
  caseData,
  case: caseProp,
  onStatusChange,
  onUpdate,
  className,
}: CasePropertiesProps) {
  const data = caseData ?? caseProp ?? {}

  const status = (data.status ?? "backlog") as CaseStatus
  const priority = (data.priority ?? 4) as number
  const assigneeAgent = data.assigneeAgent ?? data.assignee_agent
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

  const canEdit = !!(onStatusChange ?? onUpdate)

  return (
    <div className={cn("text-sm", className)}>
      {/* Status */}
      <PropertyRow label="상태">
        <Select value={status} onValueChange={handleStatusChange} disabled={!canEdit}>
          <SelectTrigger
            className="h-7 text-xs w-36 border-0 focus:ring-0"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
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
      </PropertyRow>

      <Separator style={{ backgroundColor: "var(--border-default)" }} />

      {/* Priority */}
      <PropertyRow label="우선순위">
        <Select
          value={String(priority)}
          onValueChange={handlePriorityChange}
          disabled={!onUpdate}
        >
          <SelectTrigger
            className="h-7 text-xs w-36 border-0 focus:ring-0"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
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
      </PropertyRow>

      {data.type && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="유형">
            <Badge
              className="text-xs border-0 px-2 py-0.5 font-medium"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {data.type}
            </Badge>
          </PropertyRow>
        </>
      )}

      {data.severity && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="심각도">
            <Badge
              className="text-xs border-0 px-2 py-0.5 font-medium"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {data.severity}
            </Badge>
          </PropertyRow>
        </>
      )}

      {assigneeAgent && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="담당 에이전트">
            <Identity
              name={assigneeAgent.name}
              avatarUrl={assigneeAgent.avatarUrl}
              type="agent"
              size="xs"
            />
          </PropertyRow>
        </>
      )}

      {data.reporter && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="보고자">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {data.reporter}
            </span>
          </PropertyRow>
        </>
      )}

      {studentName && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="학생">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {studentName}
            </span>
          </PropertyRow>
        </>
      )}

      {createdAt && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="생성일">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {timeAgo(createdAt)}
            </span>
          </PropertyRow>
        </>
      )}

      {dueAt && (
        <>
          <Separator style={{ backgroundColor: "var(--border-default)" }} />
          <PropertyRow label="마감일">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {timeAgo(dueAt)}
            </span>
          </PropertyRow>
        </>
      )}
    </div>
  )
}
