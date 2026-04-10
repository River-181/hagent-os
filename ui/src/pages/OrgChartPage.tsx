// v0.4.0 — reportsTo-based dynamic tree
import { useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { Identity } from "@/components/Identity"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Upload,
  Download,
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
import { Button } from "@/components/ui/button"

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
    running: "var(--color-teal-500)",
    error: "var(--color-danger)",
    paused: "#f59e0b",
    idle: "#6b7280",
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
        backgroundColor: "var(--bg-elevated)",
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
            backgroundColor: "var(--color-primary-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconComponent
            size={size === "lg" ? 20 : 16}
            style={{ color: "var(--color-teal-500)" }}
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
          backgroundColor: "var(--color-primary-bg)",
          color: "var(--color-teal-500)",
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
}

const DEFAULT_INSTRUCTORS: Instructor[] = [
  { id: "inst-1", name: "김민수", subject: "영어회화" },
  { id: "inst-2", name: "박서연", subject: "문법" },
  { id: "inst-3", name: "이준호", subject: "독해" },
  { id: "inst-4", name: "최하늘", subject: "토익" },
]

function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl"
      style={{
        backgroundColor: "rgba(59,130,246,0.06)",
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
          backgroundColor: "rgba(59,130,246,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <User size={18} style={{ color: "#3b82f6" }} />
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
          backgroundColor: "rgba(59,130,246,0.12)",
          color: "#3b82f6",
        }}
      >
        직원
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

function EmptyOrg({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <Bot size={40} style={{ color: "var(--text-tertiary)" }} />
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          아직 에이전트가 없습니다
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          첫 에이전트를 생성하면 조직도가 표시됩니다.
        </p>
      </div>
      {onNavigate && (
        <Button
          size="sm"
          className="text-xs border-0 text-white"
          style={{ backgroundColor: "var(--color-teal-500)" }}
          onClick={onNavigate}
        >
          첫 에이전트 생성
        </Button>
      )}
    </div>
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

  const agentList = agents as any[]

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
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                에이전트 조직도
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                에이전트 계층 구조 및 역할 시각화
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs gap-1.5"
              >
                <Upload size={13} />
                Import company
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs gap-1.5"
              >
                <Download size={13} />
                Export company
              </Button>
            </div>
          </div>

          {/* Chart area */}
          <div
            className="rounded-2xl p-8 overflow-x-auto"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              minHeight: 320,
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </div>
            ) : agentList.length === 0 ? (
              <EmptyOrg onNavigate={handleCreateAgent} />
            ) : roots.length === 0 ? (
              /* All agents have reportsTo but none match — render flat */
              <div className="flex flex-wrap gap-6 justify-center">
                {agentList.map((agent: any) => (
                  <AgentNode
                    key={agent.id}
                    agent={agent}
                    onClick={() => handleAgentClick(agent)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-12 items-center">
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

          {/* Legend */}
          {!isLoading && agentList.length > 0 && (
            <div className="mt-4 flex items-center gap-6">
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
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Human staff section */}
          <div className="mt-8">
            <div className="mb-4">
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                직원
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                학원 강사 및 스태프
              </p>
            </div>
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="flex flex-wrap gap-4">
                {DEFAULT_INSTRUCTORS.map((instructor) => (
                  <InstructorCard key={instructor.id} instructor={instructor} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
