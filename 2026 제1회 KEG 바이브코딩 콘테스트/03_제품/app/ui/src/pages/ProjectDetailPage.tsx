// v0.3.0
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { projectsApi } from "@/api/projects"
import { queryKeys } from "@/lib/queryKeys"
import { CaseTypeBadge } from "@/components/CaseTypeBadge"
import { CaseSeverityBadge } from "@/components/CaseSeverityBadge"
import { StatusIcon, type CaseStatus } from "@/components/StatusIcon"
import { FolderKanban, CalendarDays, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "overview" | "cases"

export function ProjectDetailPage() {
  const { id, orgPrefix } = useParams<{ id: string; orgPrefix: string }>()
  const { setBreadcrumbs } = useBreadcrumbs()
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const { data: project, isLoading } = useQuery<any>({
    queryKey: queryKeys.projects.detail(id ?? ""),
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (project) {
      setBreadcrumbs([
        { label: "프로젝트", href: `/${orgPrefix}/projects` },
        { label: project.name },
      ])
    }
  }, [project, setBreadcrumbs, orgPrefix])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 rounded animate-pulse mb-4" style={{ background: "var(--bg-tertiary)" }} />
        <div className="h-4 w-48 rounded animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--text-secondary)" }}>프로젝트를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const cases: any[] = project.cases ?? []
  const activeCases = cases.filter((c) => c.status !== "done")
  const doneCases = cases.filter((c) => c.status === "done")

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: project.color ? `${project.color}20` : "var(--bg-tertiary)" }}
        >
          <FolderKanban size={20} style={{ color: project.color ?? "var(--color-teal-500)" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {project.name}
            </h1>
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.color ?? "var(--color-teal-500)" }}
            />
          </div>
          {project.description && (
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mb-6"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        {(["overview", "cases"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors -mb-px",
              activeTab === tab
                ? "border-b-2"
                : "hover:bg-[var(--bg-secondary)]"
            )}
            style={{
              color: activeTab === tab ? "var(--color-teal-500)" : "var(--text-secondary)",
              borderColor: activeTab === tab ? "var(--color-teal-500)" : "transparent",
            }}
          >
            {tab === "overview" ? "개요" : `케이스 (${cases.length})`}
          </button>
        ))}
      </div>

      {/* Tab: 개요 */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <StatCard label="전체 케이스" value={cases.length} icon={<Layers size={16} />} />
            <StatCard label="진행 중" value={activeCases.length} color="#f59e0b" icon={<Layers size={16} />} />
            <StatCard label="완료" value={doneCases.length} color="var(--color-success)" icon={<Layers size={16} />} />
            <StatCard
              label="생성일"
              value={new Date(project.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
              icon={<CalendarDays size={16} />}
            />
          </div>

          {project.description && (
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                설명
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {project.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: 케이스 */}
      {activeTab === "cases" && (
        <div>
          {cases.length === 0 ? (
            <div
              className="rounded-xl p-10 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Layers size={36} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                이 프로젝트에 연결된 케이스가 없습니다.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {cases.map((c, idx) => (
                <Link
                  key={c.id}
                  to={`/${orgPrefix}/cases/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors",
                    idx !== 0 && "border-t"
                  )}
                  style={{
                    textDecoration: "none",
                    backgroundColor: "var(--bg-elevated)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <StatusIcon status={(c.status as CaseStatus) ?? "backlog"} size={15} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {c.identifier && (
                        <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          {c.identifier}
                        </span>
                      )}
                      <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {c.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.type && <CaseTypeBadge type={c.type} />}
                    {c.severity && <CaseSeverityBadge severity={c.severity} />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string | number
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span
        className="text-lg font-bold"
        style={{ color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  )
}
