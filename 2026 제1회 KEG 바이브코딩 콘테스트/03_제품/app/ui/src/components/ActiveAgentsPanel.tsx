import { Loader2, Square } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn, timeAgo } from "@/lib/utils"
import { Identity } from "./Identity"
import { agentsApi } from "@/api/agents"

interface Agent {
  id: string
  name: string
  avatarUrl?: string
  status?: string
  currentCaseTitle?: string
  current_case_title?: string
  lastRunAt?: string
  last_run_at?: string
}

interface AgentRun {
  id: string
  agentId?: string
  agent_id?: string
  status: "running" | "completed" | "failed" | "queued"
  caseTitle?: string
  case_title?: string
  completedAt?: string
  completed_at?: string
  startedAt?: string
  started_at?: string
}

interface ActiveAgentsPanelProps {
  agents: Agent[]
  runs?: AgentRun[]
  loading?: boolean
  className?: string
}

function AgentCard({
  agent,
  isRunning,
  caseTitle,
  completedAt,
}: {
  agent: Agent
  isRunning: boolean
  caseTitle?: string
  completedAt?: string
}) {
  const queryClient = useQueryClient()

  const stopMutation = useMutation({
    mutationFn: () => agentsApi.stop(agent.id),
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })

  return (
    <Card
      className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: "var(--bg-elevated)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border-default)",
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <Identity
                name={agent.name}
                avatarUrl={agent.avatarUrl}
                type="agent"
                size="sm"
                showName={false}
              />
              {isRunning && (
                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {agent.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-xs"
              style={{ color: isRunning ? "var(--color-teal-500)" : "var(--text-tertiary)" }}
            >
              {isRunning
                ? "Live now"
                : completedAt
                ? `${timeAgo(completedAt)} 완료`
                : ""}
            </span>
            {isRunning && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0"
                disabled={stopMutation.isPending}
                onClick={() => stopMutation.mutate()}
                title="에이전트 중지"
              >
                {stopMutation.isPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Square size={11} />
                )}
              </Button>
            )}
          </div>
        </div>

        {caseTitle && (
          <p
            className="text-xs mt-2 truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {caseTitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function ActiveAgentsPanel({ agents, runs = [], loading, className }: ActiveAgentsPanelProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    )
  }

  // Support agents with embedded status (no separate runs array)
  const runningAgents = agents.filter((a) => a.status === "running")

  // Merge: prefer agents with status, fall back to runs array
  const displayItems: { agent: Agent; isRunning: boolean; caseTitle?: string; completedAt?: string }[] =
    runningAgents.length > 0
      ? runningAgents.map((a) => ({
          agent: a,
          isRunning: true,
          caseTitle: a.currentCaseTitle ?? a.current_case_title,
        }))
      : runs.length > 0
      ? runs.slice(0, 6).map((r) => {
          const agent = agents.find(
            (a) => a.id === (r.agentId ?? r.agent_id)
          ) ?? { id: r.agentId ?? r.agent_id ?? "", name: "에이전트" }
          return {
            agent,
            isRunning: r.status === "running",
            caseTitle: r.caseTitle ?? r.case_title,
            completedAt: r.completedAt ?? r.completed_at,
          }
        })
      : []

  if (displayItems.length === 0) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center py-8 text-center", className)}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          현재 실행 중인 에이전트가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {displayItems.map(({ agent, isRunning, caseTitle, completedAt }) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isRunning={isRunning}
          caseTitle={caseTitle}
          completedAt={completedAt}
        />
      ))}
    </div>
  )
}
