import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { queryKeys } from "@/lib/queryKeys"
import { Plus, Inbox, LayoutList, LayoutGrid, Search, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { StatusIcon, CaseStatus } from "@/components/StatusIcon"
import { Identity } from "@/components/Identity"
import { CaseTypeBadge } from "@/components/CaseTypeBadge"
import { CaseSeverityBadge } from "@/components/CaseSeverityBadge"
import { KanbanBoard } from "@/components/KanbanBoard"
import { NewCaseDialog } from "@/components/NewCaseDialog"
import { FilterBar, Filters } from "@/components/FilterBar"

const STATUS_ORDER: CaseStatus[] = ["backlog", "todo", "in_progress", "in_review", "blocked", "done"]

const statusGroupConfig: Record<CaseStatus, { label: string; color: string }> = {
  backlog: { label: "백로그", color: "var(--text-tertiary)" },
  todo: { label: "할 일", color: "#3b82f6" },
  in_progress: { label: "진행 중", color: "var(--color-teal-500)" },
  in_review: { label: "검토 중", color: "#a855f7" },
  blocked: { label: "차단됨", color: "var(--color-danger)" },
  done: { label: "완료", color: "var(--color-success)" },
}

function normalizeCaseStatus(status?: string): CaseStatus {
  switch (status) {
    case "open":
      return "todo"
    case "pending_approval":
      return "in_review"
    case "resolved":
    case "closed":
      return "done"
    case "backlog":
    case "todo":
    case "in_progress":
    case "in_review":
    case "blocked":
    case "done":
      return status
    default:
      return "backlog"
  }
}

function CaseRow({ c, orgPrefix }: { c: any; orgPrefix: string }) {
  const assigneeName = c.assignee?.name ?? c.agent?.name ?? null
  const assigneeType: "agent" | "user" = c.agent?.name ? "agent" : "user"
  const normalizedStatus = normalizeCaseStatus(c.status)

  return (
    <Link
      to={`/${orgPrefix}/cases/${c.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
      style={{ textDecoration: "none", borderBottom: "1px solid var(--border-default)" }}
    >
      <StatusIcon status={normalizedStatus} size={15} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {c.identifier && (
            <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-tertiary)" }}>
              {c.identifier}
            </span>
          )}
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {c.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {c.type && <CaseTypeBadge type={c.type} />}
        {(c.severity || c.urgency) && <CaseSeverityBadge severity={c.severity ?? c.urgency} />}
      </div>

      {assigneeName && (
        <div className="shrink-0 hidden sm:block">
          <Identity name={assigneeName} size="xs" type={assigneeType} showName />
        </div>
      )}
    </Link>
  )
}

function StatusGroup({
  status,
  cases,
  orgPrefix,
  defaultOpen = true,
}: {
  status: CaseStatus
  cases: any[]
  orgPrefix: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const config = statusGroupConfig[status]

  if (cases.length === 0) return null

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors"
        style={{ borderBottom: open ? "1px solid var(--border-default)" : undefined }}
      >
        <StatusIcon status={status} size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: config.color }}>
          {config.label}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full ml-0.5"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
        >
          {cases.length}
        </span>
        <span className="ml-auto" style={{ color: "var(--text-tertiary)" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {open && (
        <div>
          {cases.map((c) => (
            <CaseRow key={c.id} c={c} orgPrefix={orgPrefix} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CasesPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const { selectedOrgId } = useOrganization()

  const [viewMode, setViewMode] = useState<"list" | "board">("list")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    priority: "all",
    type: "all",
    assignee: "all",
  })

  useEffect(() => {
    setBreadcrumbs([{ label: "케이스" }])
  }, [setBreadcrumbs])

  const { data: cases = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    queryFn: () => casesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const searchFiltered = search.trim()
    ? cases.filter(
        (caseItem: any) =>
          caseItem.title?.toLowerCase().includes(search.toLowerCase()) ||
          caseItem.identifier?.toLowerCase().includes(search.toLowerCase())
      )
    : cases

  const filtered = searchFiltered.filter((caseItem: any) => {
    const normalizedStatus = normalizeCaseStatus(caseItem.status)

    if (filters.status !== "all") {
      const statusMap: Record<string, CaseStatus[]> = {
        active: ["in_progress"],
        pending: ["todo", "backlog"],
        review: ["in_review"],
        blocked: ["blocked"],
        closed: ["done"],
      }
      const mapped = statusMap[filters.status]
      if (mapped && !mapped.includes(normalizedStatus)) return false
    }

    if (filters.priority !== "all" && (caseItem.severity ?? caseItem.urgency ?? caseItem.priority) !== filters.priority) {
      return false
    }
    if (filters.type !== "all" && caseItem.type !== filters.type) return false
    if (filters.assignee !== "all") {
      const assigneeId = caseItem.assigneeId ?? caseItem.agent?.id ?? caseItem.assignee?.id
      if (assigneeId !== filters.assignee) return false
    }
    return true
  })

  const grouped = STATUS_ORDER.reduce<Record<string, any[]>>((acc, status) => {
    acc[status] = filtered.filter((caseItem: any) => normalizeCaseStatus(caseItem.status) === status)
    return acc
  }, {})

  const hasAny = filtered.length > 0

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-xl font-bold mr-auto" style={{ color: "var(--text-primary)" }}>
          케이스
        </h1>

        <div className="relative w-52">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="검색..."
            className="pl-8 h-8 text-sm"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-default)",
            }}
          />
        </div>

        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "list" ? "text-white" : "hover:bg-[var(--bg-tertiary)]"
            )}
            style={{
              backgroundColor: viewMode === "list" ? "var(--color-teal-500)" : undefined,
              color: viewMode === "list" ? "#fff" : "var(--text-secondary)",
            }}
          >
            <LayoutList size={13} />
            리스트
          </button>
          <button
            type="button"
            onClick={() => setViewMode("board")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "board" ? "text-white" : "hover:bg-[var(--bg-tertiary)]"
            )}
            style={{
              backgroundColor: viewMode === "board" ? "var(--color-teal-500)" : undefined,
              color: viewMode === "board" ? "#fff" : "var(--text-secondary)",
            }}
          >
            <LayoutGrid size={13} />
            보드
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "var(--color-teal-500)", color: "#fff" }}
        >
          <Plus size={13} />
          새 케이스
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {cases.length}
          </span>
          전체 케이스
        </div>
        <span style={{ color: "var(--border-default)" }}>|</span>
        {[
          { status: "in_progress" as CaseStatus, label: "진행 중", color: "var(--color-teal-500)" },
          { status: "todo" as CaseStatus, label: "할 일", color: "#3b82f6" },
          { status: "backlog" as CaseStatus, label: "백로그", color: "var(--text-tertiary)" },
          { status: "done" as CaseStatus, label: "완료", color: "var(--color-success)" },
        ].map(({ status, label, color }) => {
          const count = (cases as any[]).filter((caseItem: any) => normalizeCaseStatus(caseItem.status) === status).length
          if (count === 0) return null
          return (
            <div key={status} className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mb-4">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          agents={(cases as any[]).reduce<any[]>((acc, caseItem) => {
            const agent = caseItem.agent
            if (agent && !acc.find((item) => item.id === agent.id)) acc.push(agent)
            return acc
          }, [])}
        />
      </div>

      {isLoading ? (
        <div
          className="rounded-xl p-8 flex items-center justify-center"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            로딩 중...
          </p>
        </div>
      ) : isError ? (
        <div
          className="rounded-xl p-8 flex items-center justify-center"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-danger)" }}>
            케이스를 불러오는 데 실패했습니다.
          </p>
        </div>
      ) : !hasAny ? (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <Inbox size={40} style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {search ? "검색 결과가 없습니다." : "등록된 케이스가 없습니다."}
          </p>
        </div>
      ) : viewMode === "board" ? (
        <KanbanBoard cases={filtered} />
      ) : (
        <div>
          {STATUS_ORDER.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              cases={grouped[status]}
              orgPrefix={orgPrefix ?? ""}
              defaultOpen={status !== "done"}
            />
          ))}
        </div>
      )}

      <NewCaseDialog open={dialogOpen} onOpenChange={setDialogOpen} casesCount={cases.length} />
    </div>
  )
}
