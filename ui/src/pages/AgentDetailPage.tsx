// v0.3.0
import { useEffect, useState, useContext } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { casesApi } from "@/api/cases"
import { queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Identity } from "@/components/Identity"
import { StatusBadge } from "@/components/StatusBadge"
import {
  Bot,
  Loader2,
  AlertCircle,
  Zap,
  Settings,
  History,
  Wallet,
  FileText,
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Square,
  ClipboardList,
  Heart,
  PauseCircle,
  PlayCircle,
  TrendingUp,
} from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ToastContext } from "@/components/ToastContext"

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "방금 전"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function formatDate(iso: string): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function statusColor(status: string): string {
  if (status === "running") return "var(--color-teal-500)"
  if (status === "error") return "var(--color-danger)"
  return "var(--text-tertiary)"
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    idle: "대기중",
    running: "실행중",
    error: "오류",
    paused: "일시정지",
  }
  return map[status] ?? status
}

// ─── chat bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ role, content }: { role: "user" | "agent"; content: string }) {
  const isAgent = role === "agent"
  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"} mb-2`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
        style={{
          backgroundColor: isAgent ? "rgba(20,184,166,0.08)" : "var(--bg-tertiary)",
          color: "var(--text-primary)",
          borderBottomLeftRadius: isAgent ? 4 : undefined,
          borderBottomRightRadius: isAgent ? undefined : 4,
        }}
      >
        {content}
      </div>
    </div>
  )
}

// ─── run row ─────────────────────────────────────────────────────────────────

function RunRow({ run, expanded, onToggle, showRerun }: { run: any; expanded?: boolean; onToggle?: () => void; showRerun?: boolean }) {
  const runStatus = run.status ?? "completed"
  const caseTitle = run.case?.title ?? run.caseTitle ?? "케이스 없음"
  const tokens = run.tokensUsed ?? run.tokens_used ?? null
  const startedAt = run.startedAt ?? run.started_at ?? run.createdAt ?? ""
  const duration = run.durationMs ?? run.duration_ms ?? null
  const inputData = run.input ?? run.inputData ?? null
  const outputData = run.output ?? run.outputData ?? run.result ?? null

  const icon =
    runStatus === "running" ? (
      <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-teal-500)" }} />
    ) : runStatus === "completed" ? (
      <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
    ) : runStatus === "failed" ? (
      <XCircle size={14} style={{ color: "var(--color-danger)" }} />
    ) : (
      <Clock size={14} style={{ color: "var(--text-tertiary)" }} />
    )

  return (
    <div>
      <div
        className="flex items-center gap-3 py-2.5 px-1 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className="shrink-0">{icon}</span>
        <span
          className="flex-1 text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {caseTitle}
        </span>
        {tokens != null && (
          <span className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>
            {tokens.toLocaleString()} 토큰
          </span>
        )}
        {startedAt && (
          <span className="text-xs shrink-0 w-16 text-right" style={{ color: "var(--text-tertiary)" }}>
            {timeAgo(startedAt)}
          </span>
        )}
        {onToggle && (
          <ChevronRight
            size={13}
            className="shrink-0 transition-transform"
            style={{
              color: "var(--text-tertiary)",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        )}
      </div>

      {expanded && (
        <div
          className="mx-1 mb-3 rounded-xl p-3 space-y-3"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
        >
          {/* Meta row */}
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {startedAt && <span>시작: {new Date(startedAt).toLocaleString("ko-KR")}</span>}
            {duration != null && <span>소요: {(duration / 1000).toFixed(1)}초</span>}
            {tokens != null && <span>토큰: {tokens.toLocaleString()}</span>}
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: runStatus === "completed"
                  ? "rgba(34,197,94,0.1)"
                  : runStatus === "failed"
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(107,114,128,0.1)",
                color: runStatus === "completed"
                  ? "var(--color-success)"
                  : runStatus === "failed"
                  ? "var(--color-danger)"
                  : "var(--text-tertiary)",
              }}
            >
              {runStatus === "completed" ? "완료" : runStatus === "failed" ? "실패" : runStatus}
            </span>
          </div>

          {/* Input */}
          {inputData != null && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>입력</p>
              <pre
                className="text-xs rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {typeof inputData === "string" ? inputData : JSON.stringify(inputData, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {outputData != null && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>출력</p>
              {typeof outputData === "object" && outputData?.draft ? (
                <div className="space-y-1">
                  <ChatBubble
                    role="agent"
                    content={[
                      outputData.category ? `분류: ${outputData.category}` : null,
                      outputData.severity ? `심각도: ${outputData.severity}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  />
                  {(outputData.category || outputData.severity) && (
                    <ChatBubble role="agent" content={outputData.draft} />
                  )}
                  {!(outputData.category || outputData.severity) && (
                    <ChatBubble role="agent" content={outputData.draft} />
                  )}
                  {outputData.reasoning && (
                    <p className="text-xs px-1 mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {outputData.reasoning}
                    </p>
                  )}
                </div>
              ) : typeof outputData === "object" && (outputData?.riskScore != null || outputData?.riskLevel != null) ? (
                <div className="space-y-1">
                  <ChatBubble
                    role="agent"
                    content={`이탈 위험도: ${outputData.riskLevel ?? "-"} (${outputData.riskScore ?? "-"})`}
                  />
                  {Array.isArray(outputData.signals) && outputData.signals.length > 0 && (
                    <div
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                    >
                      <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        신호
                      </p>
                      <ul className="space-y-0.5">
                        {(outputData.signals as string[]).map((s, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <span style={{ color: "var(--color-teal-500)" }}>•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(outputData.recommendedActions) && outputData.recommendedActions.length > 0 && (
                    <div
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                    >
                      <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        권장 조치
                      </p>
                      <ul className="space-y-0.5">
                        {(outputData.recommendedActions as string[]).map((a, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <pre
                  className="text-xs rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {typeof outputData === "string" ? outputData : JSON.stringify(outputData, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Re-run link */}
          {showRerun && run.status !== "running" && (
            <p className="text-xs mt-2" style={{ color: "var(--color-teal-500)", cursor: "pointer" }}>
              이 케이스 다시 실행 →
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function BudgetBar({
  used,
  limit,
  label,
}: {
  used: number
  limit: number
  label: string
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const color =
    pct >= 90
      ? "var(--color-danger)"
      : pct >= 70
      ? "#d97706"
      : "var(--color-teal-500)"

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {pct.toFixed(1)}% 사용
      </p>
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ agent, runs, memory }: { agent: any; runs: any[]; memory: any }) {
  const queryClient = useQueryClient()
  const { selectedOrgId } = useOrganization()
  const currentRun = runs.find((r) => r.status === "running")
  const sortedRuns = [...runs].sort((a, b) => {
    const aTime = a.startedAt ?? a.started_at ?? a.createdAt ?? ""
    const bTime = b.startedAt ?? b.started_at ?? b.createdAt ?? ""
    return bTime.localeCompare(aTime)
  })
  const recentRuns = sortedRuns.slice(0, 5)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(
    recentRuns.length > 0 ? (recentRuns[0].id ?? null) : null
  )
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignInstruction, setAssignInstruction] = useState("")
  const isRunning = agent.status === "running" || !!currentRun

  // Stats
  const totalRuns = runs.length
  const completedRuns = runs.filter((r) => r.status === "completed").length
  const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0
  const totalTokens = runs.reduce((s: number, r: any) => s + (r.tokensUsed ?? r.tokens_used ?? 0), 0)
  const lastRun = sortedRuns[0]

  const wakeupMutation = useMutation({
    mutationFn: () => agentsApi.wakeup(agent.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
  })

  const stopMutation = useMutation({
    mutationFn: () => agentsApi.stop(agent.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: () => agentsApi.update(agent.id, { status: "paused" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: () => agentsApi.update(agent.id, { status: "idle" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
  })

  const dispatchMutation = useMutation({
    mutationFn: () =>
      fetch("/api/orchestrator/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: assignInstruction, organizationId: selectedOrgId }),
      }),
    onSuccess: () => {
      setAssignDialogOpen(false)
      setAssignInstruction("")
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedOrgId ?? "") })
    },
  })

  return (
    <div className="space-y-5">
      {/* Agent identity block */}
      <div
        className="rounded-xl p-5 flex items-start gap-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 48,
            height: 48,
            background: "var(--color-primary-bg)",
          }}
        >
          <Bot size={24} style={{ color: "var(--color-teal-500)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {agent.name}
            </h2>
            {isRunning ? (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: "rgba(20,184,166,0.12)",
                  color: "var(--color-teal-500)",
                }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                실행 중...
              </span>
            ) : (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${statusColor(agent.status)} 12%, transparent)`,
                  color: statusColor(agent.status),
                }}
              >
                {statusLabel(agent.status ?? "idle")}
              </span>
            )}
          </div>
          {agent.description && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {agent.description}
            </p>
          )}
          <div
            className="flex items-center gap-4 mt-2 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {agent.role && <span>역할: {agent.role}</span>}
            {agent.createdAt && <span>생성: {formatDate(agent.createdAt)}</span>}
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Assign Task */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-8 w-full"
            onClick={() => setAssignDialogOpen(true)}
          >
            <ClipboardList size={13} />
            태스크 지시
          </Button>

          {/* Run Heartbeat / Stop */}
          {isRunning ? (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs h-8 w-full"
              disabled={stopMutation.isPending}
              onClick={() => stopMutation.mutate()}
            >
              {stopMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Square size={13} />}
              중지
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 w-full"
              style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
              disabled={wakeupMutation.isPending}
              onClick={() => wakeupMutation.mutate()}
            >
              {wakeupMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Heart size={13} />}
              하트비트 실행
            </Button>
          )}

          {/* Pause / Resume */}
          {agent.status === "paused" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 w-full"
              style={{ color: "var(--color-success)" }}
              disabled={resumeMutation.isPending}
              onClick={() => resumeMutation.mutate()}
            >
              {resumeMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
              재개
            </Button>
          ) : !isRunning ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 w-full"
              disabled={pauseMutation.isPending}
              onClick={() => pauseMutation.mutate()}
            >
              {pauseMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <PauseCircle size={13} />}
              일시정지
            </Button>
          ) : null}
        </div>
      </div>

      {/* Assign Task Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{agent.name}에게 태스크 지시</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea
              placeholder="이 에이전트에게 처리할 태스크를 지시하세요..."
              rows={4}
              value={assignInstruction}
              onChange={(e) => setAssignInstruction(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>취소</Button>
              <Button
                style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
                disabled={!assignInstruction.trim() || dispatchMutation.isPending}
                onClick={() => dispatchMutation.mutate()}
              >
                {dispatchMutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                실행
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats cards */}
      {totalRuns > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "총 실행", value: totalRuns },
            { label: "성공률", value: `${successRate}%` },
            { label: "총 토큰", value: totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens },
            { label: "마지막 실행", value: lastRun ? timeAgo(lastRun.startedAt ?? lastRun.createdAt ?? "") : "-" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-3 flex flex-col gap-0.5"
              style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</p>
              <p className="text-base font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{String(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Current case */}
      {currentRun && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: "rgba(20,184,166,0.06)",
            border: "1px solid rgba(20,184,166,0.2)",
          }}
        >
          <Loader2
            size={15}
            className="animate-spin shrink-0"
            style={{ color: "var(--color-teal-500)" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: "var(--color-teal-500)" }}>
              현재 실행 중
            </p>
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {currentRun.case?.title ?? currentRun.caseTitle ?? "케이스 처리 중"}
            </p>
          </div>
        </div>
      )}

      {/* Recent runs */}
      <div>
        <h3
          className="text-sm font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          최근 실행
        </h3>
        <div
          className="rounded-xl px-3"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          {recentRuns.length === 0 ? (
            <p
              className="text-sm py-4 text-center"
              style={{ color: "var(--text-tertiary)" }}
            >
              실행 이력이 없습니다.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {recentRuns.map((run: any, i: number) => {
                const runId = run.id ?? String(i)
                const isExpanded = expandedRunId === runId
                return (
                  <RunRow
                    key={runId}
                    run={run}
                    expanded={isExpanded}
                    onToggle={() => setExpandedRunId(isExpanded ? null : runId)}
                    showRerun
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agent Memory */}
      {memory && Object.keys(memory).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            에이전트 메모리
          </h3>
          <div className="space-y-2">
            {/* Soul / Identity */}
            {memory?.soul && (
              <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.2)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--color-teal-500)" }}>정체성</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{memory.soul}</p>
              </div>
            )}

            {/* Daily Notes */}
            {memory?.dailyNotes && Object.keys(memory.dailyNotes).length > 0 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>최근 메모</p>
                {Object.entries(memory.dailyNotes as Record<string, string>)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 3)
                  .map(([date, note]) => (
                    <div key={date} className="mb-2 last:mb-0">
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{date}</span>
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>{note}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* Learned Patterns */}
            {(memory?.learnedPatterns as string[] | undefined)?.length ? (
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>학습된 패턴</p>
                <ul className="space-y-1">
                  {(memory.learnedPatterns as string[]).map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--text-primary)" }}>
                      <span style={{ color: "var(--color-teal-500)" }}>•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Instructions tab ─────────────────────────────────────────────────────────

const SPECIAL_FILES = ["SOUL.md", "HEARTBEAT.md", "AGENTS.md"] as const
type SpecialFile = (typeof SPECIAL_FILES)[number]

function InstructionsTab({ agent, instructionFiles }: { agent: any; instructionFiles: any[] }) {
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const original = agent.systemPrompt ?? agent.system_prompt ?? agent.instructions ?? ""
  const [systemPromptValue, setSystemPromptValue] = useState(original)
  const isSystemDirty = systemPromptValue !== original

  type SubTab = SpecialFile | "시스템 프롬프트"
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("시스템 프롬프트")

  // Per-file editing state
  const [fileValues, setFileValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const f of instructionFiles) {
      map[f.filename] = f.content ?? ""
    }
    return map
  })
  const [fileOriginals, setFileOriginals] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const f of instructionFiles) {
      map[f.filename] = f.content ?? ""
    }
    return map
  })

  useEffect(() => {
    setSystemPromptValue(original)
  }, [original])

  useEffect(() => {
    const map: Record<string, string> = {}
    for (const f of instructionFiles) {
      map[f.filename] = f.content ?? ""
    }
    setFileValues(map)
    setFileOriginals(map)
  }, [instructionFiles])

  const systemSaveMutation = useMutation({
    mutationFn: () => agentsApi.update(agent.id, { systemPrompt: systemPromptValue }),
    onSuccess: () => {
      toast?.success("시스템 프롬프트가 저장되었습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
  })

  const saveFileMutation = useMutation({
    mutationFn: ({ filename, content }: { filename: string; content: string }) =>
      fetch(`/api/agents/${agent.id}/instructions/${filename}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_data, vars) => {
      toast?.success(`${vars.filename} 저장되었습니다.`)
      setFileOriginals((prev) => ({ ...prev, [vars.filename]: vars.content }))
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
    onError: (_err, vars) => {
      toast?.error(`${vars.filename} 저장에 실패했습니다.`)
    },
  })

  const createFileMutation = useMutation({
    mutationFn: ({ filename }: { filename: string }) =>
      fetch(`/api/agents/${agent.id}/instructions/${filename}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      }),
    onSuccess: (_data, vars) => {
      toast?.success(`${vars.filename} 생성되었습니다.`)
      setFileValues((prev) => ({ ...prev, [vars.filename]: "" }))
      setFileOriginals((prev) => ({ ...prev, [vars.filename]: "" }))
      void queryClient.invalidateQueries({ queryKey: ["agents", agent.id, "instructions"] })
    },
  })

  const subTabs: SubTab[] = [...SPECIAL_FILES, "시스템 프롬프트"]

  const getFileForTab = (tab: SpecialFile) => instructionFiles.find((f: any) => f.filename === tab)

  return (
    <div className="space-y-3">
      {/* Sub-tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        {subTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: activeSubTab === tab ? "var(--bg-elevated)" : "transparent",
              color: activeSubTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              border: activeSubTab === tab ? "1px solid var(--border-default)" : "1px solid transparent",
            }}
          >
            {tab === "시스템 프롬프트" ? "시스템 프롬프트" : tab.replace(".md", "")}
          </button>
        ))}
      </div>

      {/* Special file tabs: SOUL / HEARTBEAT / AGENTS */}
      {SPECIAL_FILES.map((fname) => {
        if (activeSubTab !== fname) return null
        const existing = getFileForTab(fname)
        const exists = !!existing
        const currentValue = fileValues[fname] ?? ""
        const originalValue = fileOriginals[fname] ?? ""
        const isDirty = currentValue !== originalValue
        const isSaving = saveFileMutation.isPending && saveFileMutation.variables?.filename === fname
        const isCreating = createFileMutation.isPending && createFileMutation.variables?.filename === fname

        return (
          <div key={fname} className="space-y-3">
            {!exists ? (
              <div
                className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
              >
                <FileText size={28} style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {fname} 파일이 아직 없습니다. 생성하시겠습니까?
                </p>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
                  disabled={isCreating}
                  onClick={() => createFileMutation.mutate({ filename: fname })}
                >
                  {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  생성
                </Button>
              </div>
            ) : (
              <>
                {isDirty && (
                  <div
                    className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: "rgba(var(--bg-elevated-rgb, 255,255,255), 0.9)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid var(--border-default)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>변경사항이 있습니다</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setFileValues((prev) => ({ ...prev, [fname]: originalValue }))}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
                        disabled={isSaving}
                        onClick={() => saveFileMutation.mutate({ filename: fname, content: currentValue })}
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        저장
                      </Button>
                    </div>
                  </div>
                )}
                <textarea
                  value={currentValue}
                  onChange={(e) => setFileValues((prev) => ({ ...prev, [fname]: e.target.value }))}
                  rows={20}
                  className="w-full rounded-xl p-4 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minHeight: "300px",
                  }}
                  placeholder={`${fname} 내용을 입력하세요...`}
                />
              </>
            )}
          </div>
        )
      })}

      {/* 시스템 프롬프트 tab */}
      {activeSubTab === "시스템 프롬프트" && (
        <div className="space-y-3 relative">
          {isSystemDirty && (
            <div
              className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-2"
              style={{
                backgroundColor: "rgba(var(--bg-elevated-rgb, 255,255,255), 0.9)",
                backdropFilter: "blur(8px)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>변경사항이 있습니다</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setSystemPromptValue(original)}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 gap-1.5"
                  style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
                  disabled={systemSaveMutation.isPending}
                  onClick={() => systemSaveMutation.mutate()}
                >
                  {systemSaveMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  저장
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            에이전트의 시스템 프롬프트를 편집합니다. 변경 후 저장하면 다음 실행부터 반영됩니다.
          </p>
          <textarea
            value={systemPromptValue}
            onChange={(e) => setSystemPromptValue(e.target.value)}
            rows={20}
            className="w-full rounded-xl p-4 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minHeight: "300px",
            }}
            placeholder="에이전트 시스템 프롬프트를 입력하세요..."
          />
        </div>
      )}
    </div>
  )
}

// ─── Skills tab ───────────────────────────────────────────────────────────────

function SkillsTab({ agent }: { agent: any }) {
  const navigate = useNavigate()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const { selectedOrgId } = useOrganization()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)

  const { data: mountedSkills = [], isLoading: mountedSkillsLoading } = useQuery<any[]>({
    queryKey: ["agents", agent.id, "skills"],
    queryFn: () => agentsApi.listSkills(agent.id),
  })

  useEffect(() => {
    if (!previewSlug && mountedSkills.length > 0) {
      setPreviewSlug(mountedSkills[0].slug)
    }
  }, [mountedSkills, previewSlug])

  const { data: catalogSkills = [], isLoading: catalogLoading } = useQuery<any[]>({
    queryKey: ["skills", "catalog"],
    queryFn: () => fetch(`/api/skills${selectedOrgId ? `?orgId=${selectedOrgId}` : ""}`).then((res) => res.json()),
    enabled: catalogOpen,
  })

  const previewDetailQuery = useQuery({
    queryKey: ["skills", previewSlug, "preview", selectedOrgId],
    queryFn: () => fetch(`/api/skills/${previewSlug}${selectedOrgId ? `?orgId=${selectedOrgId}` : ""}`).then((res) => res.json()),
    enabled: Boolean(previewSlug),
  })

  const persistSkills = async (nextSkills: Array<{ slug: string; enabled?: boolean; mountOrder?: number }>) => {
    await agentsApi.updateSkills(agent.id, nextSkills)
    await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    await queryClient.invalidateQueries({ queryKey: ["agents", agent.id, "skills"] })
    await queryClient.invalidateQueries({ queryKey: queryKeys.skills.all })
  }

  const addSkillMutation = useMutation({
    mutationFn: async (skill: any) => {
      const nextSkills = [
        ...mountedSkills.map((item, index) => ({
          slug: item.slug,
          enabled: item.enabled ?? true,
          mountOrder: item.mountOrder ?? index,
        })),
        {
          slug: skill.slug,
          enabled: true,
          mountOrder: mountedSkills.length,
        },
      ]
      await persistSkills(nextSkills)
      return skill
    },
    onSuccess: (_data, skill) => {
      toast?.success(`"${skill.name}" 스킬이 추가되었습니다.`)
      setPreviewSlug(skill.slug)
      setCatalogOpen(false)
    },
    onError: (_err, skill) => {
      toast?.error(`"${skill.name}" 스킬 추가에 실패했습니다.`)
    },
  })

  const updateSkillStateMutation = useMutation({
    mutationFn: async ({
      slug,
      enabled,
      remove = false,
    }: {
      slug: string
      enabled?: boolean
      remove?: boolean
    }) => {
      const nextSkills = mountedSkills
        .filter((item) => (remove ? item.slug !== slug : true))
        .map((item, index) => ({
          slug: item.slug,
          enabled: item.slug === slug ? (enabled ?? item.enabled ?? true) : item.enabled ?? true,
          mountOrder: index,
        }))
      await persistSkills(nextSkills)
    },
    onError: () => toast?.error("스킬 상태를 저장하지 못했습니다."),
  })

  const equippedSlugs = new Set(mountedSkills.map((s: any) => s.slug ?? s.name))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          에이전트에 실제 장착된 skill package와 본문 preview를 확인합니다.
        </p>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCatalogOpen(true)}>
          <Plus size={13} />
          스킬 추가
        </Button>
      </div>

      {mountedSkillsLoading ? (
        <div className="rounded-xl py-10 flex items-center justify-center" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
        </div>
      ) : mountedSkills.length === 0 ? (
        <div
          className="rounded-xl py-10 flex flex-col items-center gap-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <Zap size={28} style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            장착된 스킬이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <div className="space-y-2">
            {mountedSkills.map((skill: any, i: number) => {
              const key = skill.slug ?? skill.id ?? skill.name ?? String(i)
              const isPreview = previewSlug === skill.slug
              return (
                <button
                  key={key}
                  type="button"
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                  style={{
                    backgroundColor: isPreview ? "rgba(20,184,166,0.08)" : "var(--bg-elevated)",
                    border: `1px solid ${isPreview ? "rgba(20,184,166,0.24)" : "var(--border-default)"}`,
                    opacity: skill.enabled === false ? 0.6 : 1,
                  }}
                  onClick={() => setPreviewSlug(skill.slug)}
                >
                  <div
                    className="flex items-center justify-center rounded-lg shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: isPreview ? "rgba(20,184,166,0.12)" : "var(--bg-tertiary)",
                    }}
                  >
                    <Zap size={15} style={{ color: isPreview ? "var(--color-teal-500)" : "var(--text-tertiary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {skill.displayName ?? skill.name ?? skill.slug}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                      {skill.summary ?? skill.sourceBadge ?? "k-skill"}
                    </p>
                  </div>
                  <Badge className="text-xs border-0 shrink-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}>
                    #{skill.mountOrder ?? i}
                  </Badge>
                  <Switch
                    checked={skill.enabled !== false}
                    onCheckedChange={(nextValue) =>
                      updateSkillStateMutation.mutate({ slug: skill.slug, enabled: nextValue })
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </button>
              )
            })}
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            {previewDetailQuery.isLoading || !previewDetailQuery.data ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {previewDetailQuery.data.displayName}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {previewDetailQuery.data.namespace}/{previewDetailQuery.data.slug}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => orgPrefix && navigate(`/${orgPrefix}/skills/${previewDetailQuery.data.slug}`)}
                  >
                    <ChevronRight size={14} />
                    전체 보기
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {previewDetailQuery.data.summary}
                </p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {(previewDetailQuery.data.runtimeHealth ?? []).map((item: any) => (
                    <Badge
                      key={item.key}
                      className="text-xs border-0"
                      style={{
                        backgroundColor: item.ready ? "rgba(20,184,166,0.1)" : "rgba(245,158,11,0.12)",
                        color: item.ready ? "var(--color-teal-500)" : "#d97706",
                      }}
                    >
                      {item.label}
                    </Badge>
                  ))}
                </div>
                <div
                  className="mt-4 rounded-xl p-3 max-h-[260px] overflow-y-auto"
                  style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                >
                  <pre
                    className="text-xs whitespace-pre-wrap leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <code>{String(previewDetailQuery.data.skillMarkdown ?? "").slice(0, 1200)}</code>
                  </pre>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      updateSkillStateMutation.mutate({
                        slug: previewDetailQuery.data.slug,
                        remove: true,
                      })
                    }
                  >
                    <XCircle size={14} />
                    분리
                  </Button>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Agent view에서 `SKILL.md` 본문 미리보기를 제공합니다.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* k-skill 카탈로그 모달 */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent
          style={{
            backgroundColor: "var(--bg-base)",
            border: "1px solid var(--border-default)",
            maxWidth: 520,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-primary)" }}>k-skill 카탈로그</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto py-1">
            {catalogLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
              </div>
            ) : catalogSkills.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-tertiary)" }}>
                사용 가능한 스킬이 없습니다.
              </p>
            ) : (
              catalogSkills.map((skill: any) => {
                const isEquipped = equippedSlugs.has(skill.slug)
                const isAdding = addSkillMutation.isPending && addSkillMutation.variables?.slug === skill.slug
                return (
                  <div
                    key={skill.slug}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      opacity: isEquipped ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-lg shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "rgba(20,184,166,0.1)",
                      }}
                    >
                      <Zap size={15} style={{ color: "var(--color-teal-500)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {skill.name}
                      </p>
                      {skill.description && (
                        <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                          {skill.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isEquipped ? "outline" : "default"}
                      className="text-xs shrink-0"
                      disabled={isEquipped || isAdding}
                      style={
                        isEquipped
                          ? { color: "var(--text-tertiary)" }
                          : { backgroundColor: "var(--color-teal-500)", color: "#fff" }
                      }
                      onClick={() => !isEquipped && addSkillMutation.mutate(skill)}
                    >
                      {isAdding ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isEquipped ? (
                        "이미 추가됨"
                      ) : (
                        "추가"
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({ agent }: { agent: any }) {
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const settings = agent.settings ?? {}

  const [model, setModel] = useState<string>(
    agent.adapterConfig?.model ?? agent.model ?? settings.model ?? "claude-sonnet-4-6"
  )
  const [maxTokens, setMaxTokens] = useState<number>(
    agent.adapterConfig?.maxTokens ?? agent.maxTokens ?? settings.maxTokens ?? 4096
  )
  const [autoRun, setAutoRun] = useState<boolean>(
    agent.adapterConfig?.autoRun ?? agent.autoRun ?? settings.autoRun ?? false
  )

  const configMutation = useMutation({
    mutationFn: () =>
      agentsApi.update(agent.id, {
        adapterConfig: { ...agent.adapterConfig, model, maxTokens, autoRun },
      }),
    onSuccess: () => {
      toast?.success("설정이 저장되었습니다.")
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) })
    },
    onError: () => {
      toast?.error("설정 저장에 실패했습니다.")
    },
  })

  const agentTypeLabel: Record<string, string> = {
    orchestrator: "오케스트레이터",
    complaint: "민원담당",
    retention: "이탈방어",
    scheduler: "스케줄러",
    intake: "인테이크",
    staff: "스태프",
    compliance: "컴플라이언스",
    notification: "알림",
  }

  const metaRows = [
    { label: "에이전트 ID", value: agent.id },
    { label: "에이전트 유형", value: agentTypeLabel[agent.agentType] ?? agent.agentType ?? "-" },
    { label: "어댑터", value: agent.adapterType ?? "-" },
    { label: "슬러그", value: agent.slug ?? "-" },
    { label: "생성일", value: agent.createdAt ? formatDate(agent.createdAt) : "-" },
    { label: "최근 업데이트", value: agent.updatedAt ? formatDate(agent.updatedAt) : "-" },
  ]

  return (
    <div className="space-y-5">
      {agent.description && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.2)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-teal-500)" }}>설명</p>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>{agent.description}</p>
        </div>
      )}

      {/* Editable config */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>어댑터 설정</p>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "var(--text-secondary)" }}>모델</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
            <option value="claude-haiku-4-5">claude-haiku-4-5</option>
          </select>
        </div>

        {/* Max tokens */}
        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "var(--text-secondary)" }}>최대 토큰</label>
          <input
            type="number"
            value={maxTokens}
            min={256}
            max={200000}
            step={256}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Auto run */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>자동 실행</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              트리거 발생 시 자동으로 에이전트를 실행합니다
            </p>
          </div>
          <Switch checked={autoRun} onCheckedChange={setAutoRun} />
        </div>

        <Button
          className="w-full gap-1.5 text-xs h-9"
          style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
          disabled={configMutation.isPending}
          onClick={() => configMutation.mutate()}
        >
          {configMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          저장
        </Button>
      </div>

      {/* Read-only metadata */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
      >
        <p className="text-xs font-semibold px-4 pt-3 pb-1" style={{ color: "var(--text-secondary)" }}>에이전트 정보</p>
        {metaRows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-4 py-3",
              i < metaRows.length - 1 && "border-b border-[var(--border-default)]"
            )}
          >
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {row.label}
            </span>
            <span
              className="text-sm font-medium font-mono text-right max-w-[60%] truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {String(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Run history tab ──────────────────────────────────────────────────────────

function RunHistoryTab({ runs }: { runs: any[] }) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  if (runs.length === 0) {
    return (
      <div
        className="rounded-xl py-14 flex flex-col items-center gap-2"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        <History size={28} style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          실행 이력이 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl px-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="divide-y divide-[var(--border-default)]">
        {runs.map((run: any, i: number) => {
          const runId = run.id ?? String(i)
          return (
            <RunRow
              key={runId}
              run={run}
              expanded={expandedRunId === runId}
              onToggle={() => setExpandedRunId(expandedRunId === runId ? null : runId)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Budget tab ───────────────────────────────────────────────────────────────

function BudgetTab({ agent }: { agent: any }) {
  const tokenLimit = agent.tokenLimit ?? agent.token_limit ?? 100000
  const tokensUsed = agent.tokensUsed ?? agent.tokens_used ?? agent.tokensThisMonth ?? 0
  const costLimit = agent.costLimit ?? agent.cost_limit ?? 0
  const costUsed = agent.costUsed ?? agent.cost_used ?? 0

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        <BudgetBar
          used={tokensUsed}
          limit={tokenLimit}
          label="이번 달 토큰 사용량"
        />
        {costLimit > 0 && (
          <>
            <Separator />
            <BudgetBar
              used={costUsed}
              limit={costLimit}
              label="이번 달 비용 (원)"
            />
          </>
        )}
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "rgba(20,184,166,0.04)",
          border: "1px solid rgba(20,184,166,0.2)",
        }}
      >
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          토큰 한도 초과 시 에이전트 실행이 자동으로 일시중지됩니다. 한도 조정은 설정에서 가능합니다.
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AgentDetailPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix, id } = useParams<{ orgPrefix: string; id: string }>()

  useEffect(() => {
    setBreadcrumbs([
      { label: "에이전트 팀", href: `/${orgPrefix}/agents` },
      { label: id ?? "에이전트" },
    ])
  }, [setBreadcrumbs, orgPrefix, id])

  // ── fetch agent ────────────────────────────────────────────────────────────
  const {
    data: agent,
    isLoading: agentLoading,
    isError: agentError,
  } = useQuery({
    queryKey: queryKeys.agents.detail(id!),
    queryFn: () => agentsApi.get(id!),
    enabled: !!id,
  })

  // ── fetch instruction files ────────────────────────────────────────────────
  const { data: instructionFiles = { files: [] } } = useQuery({
    queryKey: ["agents", id, "instructions"],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${id}/instructions`)
      return res.json()
    },
    enabled: !!id,
  })

  // ── fetch agent memory ─────────────────────────────────────────────────────
  const { data: memory = {} } = useQuery({
    queryKey: ["agents", id, "memory"],
    queryFn: () => agentsApi.getMemory(id!),
    enabled: !!id,
  })

  // ── fetch cases to derive runs ─────────────────────────────────────────────
  const { data: allCases = [] } = useQuery({
    queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    queryFn: () => casesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  // Collect runs that belong to this agent
  const agentRuns: any[] = agent?.runs
    ?? (allCases as any[])
        .flatMap((c: any) => (c.runs ?? []).map((r: any) => ({ ...r, case: c })))
        .filter((r: any) => r.agentId === id || r.agent_id === id)

  // Update breadcrumb when agent name loads
  useEffect(() => {
    if (!agent) return
    setBreadcrumbs([
      { label: "에이전트 팀", href: `/${orgPrefix}/agents` },
      { label: agent.name ?? id ?? "에이전트" },
    ])
  }, [agent, setBreadcrumbs, orgPrefix, id])

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2
          size={24}
          className="animate-spin"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    )
  }

  if (agentError || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle size={28} style={{ color: "var(--color-danger)" }} />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          에이전트 정보를 불러오는 데 실패했습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
        {/* Tab bar */}
        <div
          className="px-6 pt-4"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <TabsList className="h-9 bg-transparent p-0 gap-1">
            {(
              [
                { value: "overview", label: "개요", icon: <Bot size={14} /> },
                { value: "instructions", label: "지시사항", icon: <FileText size={14} /> },
                { value: "skills", label: "스킬", icon: <Zap size={14} /> },
                { value: "settings", label: "설정", icon: <Settings size={14} /> },
                { value: "history", label: "실행 이력", icon: <History size={14} /> },
                { value: "budget", label: "예산", icon: <Wallet size={14} /> },
              ] as const
            ).map(({ value, label, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-8 px-3 text-xs font-medium rounded-md border-0 gap-1.5 data-[state=active]:bg-[var(--bg-tertiary)] data-[state=active]:text-[var(--text-primary)] data-[state=inactive]:text-[var(--text-tertiary)]"
              >
                {icon}
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab contents */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-2xl mx-auto">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab agent={agent} runs={agentRuns} memory={memory} />
              </TabsContent>

              <TabsContent value="instructions" className="mt-0">
                <InstructionsTab agent={agent} instructionFiles={(instructionFiles as any).files ?? []} />
              </TabsContent>

              <TabsContent value="skills" className="mt-0">
                <SkillsTab agent={agent} />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <SettingsTab agent={agent} />
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <RunHistoryTab runs={agentRuns} />
              </TabsContent>

              <TabsContent value="budget" className="mt-0">
                <BudgetTab agent={agent} />
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  )
}
