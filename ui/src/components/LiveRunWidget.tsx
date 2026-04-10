import { useEffect, useRef, useState } from "react"
import { Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Identity } from "./Identity"
import { StatusBadge } from "./StatusBadge"

interface RunData {
  id: string
  status: string
  output?: string
  startedAt?: string
  started_at?: string
  agent?: {
    id?: string
    name?: string
  }
  agentName?: string
  agent_name?: string
}

interface LiveRunWidgetProps {
  caseId?: string
  organizationId?: string
  /** Pre-fetched active runs; if provided, no polling occurs */
  runs?: RunData[]
  className?: string
}

function useElapsedSeconds(startedAt: string | undefined): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }
    const start = new Date(startedAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return elapsed
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function RunCard({ run }: { run: RunData }) {
  const startedAt = run.startedAt ?? run.started_at
  const elapsed = useElapsedSeconds(startedAt)
  const agentName = run.agent?.name ?? run.agentName ?? run.agent_name ?? "에이전트"

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        borderColor: "var(--color-teal-500)",
        backgroundColor: "var(--bg-base)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-3">
          <Identity name={agentName} type="agent" size="sm" />
          <StatusBadge status="running" />
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {formatElapsed(elapsed)}
          </span>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 border-0"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <Square size={12} className="fill-current" style={{ color: "var(--color-danger)" }} />
          </Button>
        </div>
      </div>

      {/* Output area */}
      <ScrollArea style={{ maxHeight: 320 }}>
        <div className="px-4 py-3">
          {run.output ? (
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              {run.output}
            </pre>
          ) : (
            <p className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>
              에이전트 출력 대기 중...
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function LiveRunWidget({ runs, className }: LiveRunWidgetProps) {
  const activeRuns = (runs ?? []).filter(
    (r) => r.status === "running" || r.status === "pending_approval"
  )

  if (activeRuns.length === 0) return null

  return (
    <div className={cn("space-y-3", className)}>
      {activeRuns.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  )
}
