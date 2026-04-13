// v0.2.0
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Filters {
  status: string
  priority: string
  type: string
  assignee: string
}

interface FilterBarProps {
  onFilterChange: (filters: Filters) => void
  agents: any[]
  filters?: Filters
}

const DEFAULT_FILTERS: Filters = {
  status: "all",
  priority: "all",
  type: "all",
  assignee: "all",
}

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 중" },
  { value: "pending", label: "대기" },
  { value: "review", label: "검토 중" },
  { value: "blocked", label: "차단" },
  { value: "closed", label: "완료" },
]

const PRIORITY_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "urgent", label: "긴급" },
  { value: "high", label: "높음" },
  { value: "medium", label: "보통" },
  { value: "low", label: "낮음" },
]

const TYPE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "complaint", label: "민원" },
  { value: "refund", label: "환불" },
  { value: "makeup", label: "보강" },
  { value: "inquiry", label: "문의" },
  { value: "churn", label: "이탈" },
  { value: "schedule", label: "일정" },
]

export function FilterBar({ onFilterChange, agents, filters = DEFAULT_FILTERS }: FilterBarProps) {
  const handleChange = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status */}
      <Select
        value={filters.status}
        onValueChange={(v) => handleChange("status", v)}
      >
        <SelectTrigger
          className="h-8 text-xs min-w-[90px]"
          style={{
            backgroundColor: "var(--bg-base)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority */}
      <Select
        value={filters.priority}
        onValueChange={(v) => handleChange("priority", v)}
      >
        <SelectTrigger
          className="h-8 text-xs min-w-[90px]"
          style={{
            backgroundColor: "var(--bg-base)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <SelectValue placeholder="우선순위" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type */}
      <Select
        value={filters.type}
        onValueChange={(v) => handleChange("type", v)}
      >
        <SelectTrigger
          className="h-8 text-xs min-w-[90px]"
          style={{
            backgroundColor: "var(--bg-base)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <SelectValue placeholder="유형" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee */}
      <Select
        value={filters.assignee}
        onValueChange={(v) => handleChange("assignee", v)}
      >
        <SelectTrigger
          className="h-8 text-xs min-w-[100px]"
          style={{
            backgroundColor: "var(--bg-base)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <SelectValue placeholder="담당자" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">전체</SelectItem>
          {(agents as any[]).map((agent) => (
            <SelectItem key={agent.id} value={agent.id} className="text-xs">
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
