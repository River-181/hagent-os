// v0.4.0 — reportsTo-based dynamic tree
import { useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { instructorsApi } from "@/api/students"
import { queryKeys } from "@/lib/queryKeys"
import { Identity } from "@/components/Identity"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  WorkspaceEmptyState,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import {
  Loader2,
  Bot,
  User,
  Brain,
  Shield,
  Heart,
  Calendar,
  Sparkles,
  Cpu,
  Cog,
  Lightbulb,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "idle" | "running" | "error" | "paused"

function resolveStatus(agent: any): AgentStatus {
  const s = agent.status ?? ""
  if (s === "running") return "running"
  if (s === "error" || s === "failed") return "error"
  if (s === "paused") return "paused"
  return "idle"
}

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  brain: Brain,
  shield: Shield,
  heart: Heart,
  calendar: Calendar,
  sparkles: Sparkles,
  cpu: Cpu,
  cog: Cog,
  lightbulb: Lightbulb,
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  const colorMap: Record<AgentStatus, string> = {
    running: "var(--color-primary)",
    error: "var(--color-danger)",
    paused: "var(--color-warning)",
    idle: "var(--text-tertiary)",
  }

  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: 8,
        height: 8,
        backgroundColor: colorMap[status],
        animation:
          status === "running"
            ? "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite"
            : undefined,
        flexShrink: 0,
      }}
    />
  )
}

// ─── Agent node card ──────────────────────────────────────────────────────────

function AgentNode({
  agent,
  size = "default",
  onClick,
}: {
  agent: any
  size?: "lg" | "default"
  onClick?: () => void
}) {
  const status = resolveStatus(agent)
  const agentType: string = agent.agentType ?? agent.type ?? "worker"

  const statusLabel: Record<AgentStatus, string> = {
    idle: "대기",
    running: "실행 중",
    error: "오류",
    paused: "일시정지",
  }

  const iconKey = agent.icon as string | undefined
  const IconComponent = iconKey ? ICON_MAP[iconKey] : null

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl cursor-pointer hover:scale-105 transition-transform"
      style={{
        backgroundColor: "var(--bg-subtle)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: size === "lg" ? "20px 24px" : "16px",
        minWidth: size === "lg" ? 180 : 160,
        textAlign: "center",
        boxShadow: "var(--shadow-sm)",
      }}
      onClick={onClick}
    >
      {IconComponent ? (
        <div
          style={{
            width: size === "lg" ? 40 : 32,
            height: size === "lg" ? 40 : 32,
            borderRadius: "50%",
            backgroundColor: "var(--color-primary-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconComponent
            size={size === "lg" ? 20 : 16}
            style={{ color: "var(--color-primary)" }}
          />
        </div>
      ) : (
        <Identity
          name={agent.name ?? "에이전트"}
          type="agent"
          size={size === "lg" ? "lg" : "default"}
          showName={false}
        />
      )}
      <div>
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-primary)", maxWidth: 140 }}
        >
          {agent.name ?? "에이전트"}
        </p>
        {agent.title && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {agent.title}
          </p>
        )}
      </div>
      <Badge
        className="text-xs border-0 px-2 py-0.5"
        style={{
          backgroundColor: "var(--color-primary-soft)",
          color: "var(--color-primary)",
        }}
      >
        {agentType}
      </Badge>
      <div className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {statusLabel[status]}
        </span>
      </div>
    </div>
  )
}

// ─── Human staff card ─────────────────────────────────────────────────────────

interface Instructor {
  id: string
  name: string
  subject: string
  role?: string
}

function InstructorCard({ instructor }: { instructor: Instructor }) {
  const roleLabel =
    instructor.role === "teacher"
      ? "강사"
      : instructor.role === "staff"
        ? "직원"
        : instructor.role === "hybrid"
          ? "운영+강의"
          : "직원"
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl"
      style={{
        backgroundColor: "var(--bg-subtle)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "16px",
        minWidth: 140,
        textAlign: "center",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: "var(--color-primary-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <User size={18} style={{ color: "var(--color-primary)" }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {instructor.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {instructor.subject}
        </p>
      </div>
      <Badge
        className="text-xs border-0 px-2 py-0.5"
        style={{
          backgroundColor: "var(--color-primary-soft)",
          color: "var(--color-primary)",
        }}
      >
        {roleLabel}
      </Badge>
    </div>
  )
}

// ─── Connector lines ──────────────────────────────────────────────────────────

function VLine({ height = 40 }: { height?: number }) {
  return (
    <div
      style={{
        width: 2,
        height,
        backgroundColor: "var(--border-default)",
        margin: "0 auto",
      }}
    />
  )
}

// ─── Recursive OrgTree node ───────────────────────────────────────────────────

function OrgTreeNode({
  agent,
  allAgents,
  onAgentClick,
  isRoot,
}: {
  agent: any
  allAgents: any[]
  onAgentClick: (agent: any) => void
  isRoot?: boolean
}) {
  const children = allAgents.filter(
    (a: any) => a.reportsTo === agent.id || a.reports_to === agent.id,
  )

  return (
    <div className="flex flex-col items-center">
      <AgentNode
        agent={agent}
        size={isRoot ? "lg" : "default"}
        onClick={() => onAgentClick(agent)}
      />

      {children.length > 0 && (
        <>
          <VLine height={32} />

          {/* Horizontal connector bar */}
          {children.length > 1 && (
            <div
              style={{
                position: "relative",
                width: `calc(${children.length} * 220px - 60px)`,
                height: 2,
                backgroundColor: "var(--border-default)",
              }}
            />
          )}

          <div
            className="flex items-start gap-8"
            style={{ flexWrap: children.length > 4 ? "wrap" : "nowrap", justifyContent: "center" }}
          >
            {children.map((child: any) => (
              <div key={child.id} className="flex flex-col items-center">
                {children.length === 1 ? null : <VLine height={24} />}
                <OrgTreeNode
                  agent={child}
                  allAgents={allAgents}
                  onAgentClick={onAgentClick}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyOrg() {
  return (
    <WorkspaceEmptyState
      title="아직 에이전트가 없습니다"
      description="첫 에이전트를 생성하면 조직도가 표시됩니다."
      icon={<Bot size={40} />}
      className="py-20"
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OrgChartPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const navigate = useNavigate()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()

  useEffect(() => {
    setBreadcrumbs([{ label: "에이전트 조직도" }])
  }, [setBreadcrumbs])

  const { data: agents = [], isLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: instructors = [] } = useQuery({
    queryKey: queryKeys.instructors.list(selectedOrgId ?? ""),
    queryFn: () => instructorsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const agentList = agents as any[]
  const instructorList = instructors as Instructor[]
  const staffInstructors = instructorList.filter((item) => item.role !== "teacher")
  const teacherInstructors = instructorList.filter((item) => item.role === "teacher")

  // Roots = agents with no reportsTo (or reportsTo === null/undefined/"")
  const roots = agentList.filter(
    (a: any) => !a.reportsTo && !a.reports_to,
  )

  const handleAgentClick = useCallback(
    (agent: any) => {
      if (orgPrefix) {
        navigate(`/${orgPrefix}/agents/${agent.id}`)
      }
    },
    [navigate, orgPrefix],
  )

  const handleCreateAgent = useCallback(() => {
    if (orgPrefix) {
      navigate(`/${orgPrefix}/agents/new`)
    }
  }, [navigate, orgPrefix])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="에이전트 조직도"
        description="에이전트 계층 구조와 역할을 한 화면에서 확인합니다."
        action={
          <Button className="gap-2" onClick={handleCreateAgent} disabled={!orgPrefix}>
            <Bot size={14} />
            새 에이전트
          </Button>
        }
      />

      <WorkspacePanel className="overflow-hidden">
        <div
          className="flex items-center justify-between gap-3 border-b px-6 py-4"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="min-w-0">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              조직도
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              계층이 없으면 평면 목록으로, 있으면 트리 형태로 보여줍니다.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {(
              [
                { status: "idle" as AgentStatus, label: "대기" },
                { status: "running" as AgentStatus, label: "실행 중" },
                { status: "error" as AgentStatus, label: "오류" },
                { status: "paused" as AgentStatus, label: "일시정지" },
              ] as { status: AgentStatus; label: string }[]
            ).map(({ status, label }) => (
              <div key={status} className="flex items-center gap-1.5">
                <StatusDot status={status} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="overflow-auto"
          style={{
            minHeight: 320,
            height: "70vh",
            width: "100%",
            maxWidth: "100%",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
            </div>
          ) : agentList.length === 0 ? (
            <EmptyOrg />
          ) : roots.length === 0 ? (
            <div className="flex min-w-max flex-wrap justify-center gap-6 p-6 sm:p-8">
              {agentList.map((agent: any) => (
                <AgentNode
                  key={agent.id}
                  agent={agent}
                  onClick={() => handleAgentClick(agent)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-w-max flex-col items-center gap-12 p-6 pb-8 sm:p-8">
              {roots.map((root: any) => (
                <OrgTreeNode
                  key={root.id}
                  agent={root}
                  allAgents={agentList}
                  onAgentClick={handleAgentClick}
                  isRoot
                />
              ))}
            </div>
          )}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-5 p-6">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            직원/강사
          </h2>
          <p className="text-xs leading-6" style={{ color: "var(--text-tertiary)" }}>
            운영 인력과 강사 역할을 나눠서 확인합니다.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              운영 인력
            </p>
            <div className="flex flex-wrap gap-4">
              {staffInstructors.length > 0 ? (
                staffInstructors.map((instructor) => (
                  <InstructorCard key={instructor.id} instructor={instructor} />
                ))
              ) : (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  등록된 운영 인력이 없습니다.
                </p>
              )}
            </div>
          </div>

          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              강사진
            </p>
            <div className="flex flex-wrap gap-4">
              {teacherInstructors.length > 0 ? (
                teacherInstructors.map((instructor) => (
                  <InstructorCard key={instructor.id} instructor={instructor} />
                ))
              ) : (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  등록된 강사가 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  )
}
