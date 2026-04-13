import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/components/ToastContext"
import { routinesApi } from "@/api/routines"
import { agentsApi } from "@/api/agents"
import { orchestratorApi } from "@/api/orchestrator"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, Loader2, Bot, Play, CalendarClock, Zap, ChevronDown, ChevronRight } from "lucide-react"

type TriggerType = "매일" | "매주" | "매월" | "이벤트"

interface AgentOption {
  id: string
  name: string
}

interface RoutineRunHistory {
  id: string
  ranAt: string
  status: string
  duration?: string
  message?: string
}

interface RoutineData {
  id: string
  name: string
  description: string
  triggerType: TriggerType
  triggerTime: string
  triggerCondition: string
  assignedAgentId?: string
  assignedAgentName?: string
  isActive: boolean
  estimatedDuration: string
  averageCost: number
  history: RoutineRunHistory[]
}

const FALLBACK_AGENTS: AgentOption[] = [
  { id: "agent-notify", name: "알림 에이전트" },
  { id: "agent-retention", name: "이탈방지 에이전트" },
  { id: "agent-ops", name: "운영 오케스트레이터" },
]

const FALLBACK_ROUTINES: RoutineData[] = [
  {
    id: "routine-1",
    name: "일일 이탈 위험 스캔",
    description: "재원 학생 행동 신호를 분석해 이탈 위험 학생을 식별합니다.",
    triggerType: "매일",
    triggerTime: "07:00",
    triggerCondition: "매일 07:00 실행",
    assignedAgentId: "agent-retention",
    assignedAgentName: "이탈방지 에이전트",
    isActive: true,
    estimatedDuration: "약 8분",
    averageCost: 420,
    history: [
      { id: "r1-h1", ranAt: "2026-04-10T07:00:00+09:00", status: "성공" },
      { id: "r1-h2", ranAt: "2026-04-09T07:00:00+09:00", status: "성공" },
      { id: "r1-h3", ranAt: "2026-04-08T07:00:00+09:00", status: "성공" },
      { id: "r1-h4", ranAt: "2026-04-07T07:00:00+09:00", status: "성공" },
      { id: "r1-h5", ranAt: "2026-04-06T07:00:00+09:00", status: "경고" },
    ],
  },
  {
    id: "routine-2",
    name: "주간 학부모 리포트 발송",
    description: "한 주간 학습 요약과 과제를 정리해 학부모에게 발송합니다.",
    triggerType: "매주",
    triggerTime: "09:00",
    triggerCondition: "매주 월요일 09:00 실행",
    assignedAgentId: "agent-notify",
    assignedAgentName: "알림 에이전트",
    isActive: true,
    estimatedDuration: "약 15분",
    averageCost: 880,
    history: [
      { id: "r2-h1", ranAt: "2026-04-07T09:00:00+09:00", status: "성공" },
      { id: "r2-h2", ranAt: "2026-03-31T09:00:00+09:00", status: "성공" },
      { id: "r2-h3", ranAt: "2026-03-24T09:00:00+09:00", status: "성공" },
      { id: "r2-h4", ranAt: "2026-03-17T09:00:00+09:00", status: "성공" },
      { id: "r2-h5", ranAt: "2026-03-10T09:00:00+09:00", status: "실패" },
    ],
  },
  {
    id: "routine-3",
    name: "월말 정산 집계",
    description: "수납, 환불, 미납 데이터를 월말 보고서 초안으로 정리합니다.",
    triggerType: "매월",
    triggerTime: "18:30",
    triggerCondition: "매월 말일 18:30 실행",
    assignedAgentId: "agent-ops",
    assignedAgentName: "운영 오케스트레이터",
    isActive: false,
    estimatedDuration: "약 21분",
    averageCost: 1430,
    history: [
      { id: "r3-h1", ranAt: "2026-03-31T18:30:00+09:00", status: "성공" },
      { id: "r3-h2", ranAt: "2026-02-28T18:30:00+09:00", status: "성공" },
      { id: "r3-h3", ranAt: "2026-01-31T18:30:00+09:00", status: "성공" },
      { id: "r3-h4", ranAt: "2025-12-31T18:30:00+09:00", status: "성공" },
      { id: "r3-h5", ranAt: "2025-11-30T18:30:00+09:00", status: "경고" },
    ],
  },
]

function parseCron(cron: string): string {
  if (!cron) return ""
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return cron
  const [minute, hour, dayOfMonth, , dayOfWeek] = parts
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`

  if (dayOfMonth === "*" && dayOfWeek === "*") return `매일 ${time} 실행`
  if (dayOfMonth === "*" && dayOfWeek !== "*") return `매주 ${time} 실행`
  return `매월 ${time} 실행`
}

function inferTriggerType(schedule?: string): TriggerType {
  if (!schedule) return "이벤트"
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) return "이벤트"
  const [, , dayOfMonth, , dayOfWeek] = parts
  if (dayOfMonth === "*" && dayOfWeek === "*") return "매일"
  if (dayOfMonth === "*" && dayOfWeek !== "*") return "매주"
  return "매월"
}

function formatHistoryDate(iso: string) {
  const date = new Date(iso)
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(
    2,
    "0"
  )} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function normalizeRoutine(raw: any): RoutineData {
  const triggerType = inferTriggerType(raw.schedule)
  const triggerTime = raw.triggerTime ?? raw.schedule?.split(/\s+/).slice(0, 2).reverse().join(":") ?? "09:00"
  return {
    id: String(raw.id),
    name: String(raw.name ?? "이름 없는 루틴"),
    description: String(raw.description ?? "등록된 설명이 없습니다."),
    triggerType,
    triggerTime,
    triggerCondition: String(raw.triggerCondition ?? parseCron(raw.schedule ?? "")),
    assignedAgentId: raw.assignedAgentId ?? raw.agent?.id ?? undefined,
    assignedAgentName: raw.assignedAgentName ?? raw.agentName ?? raw.agent?.name ?? "-",
    isActive: Boolean(raw.isActive ?? raw.enabled ?? false),
    estimatedDuration: String(raw.estimatedDuration ?? "약 10분"),
    averageCost: Number(raw.averageCost ?? 650),
    history:
      Array.isArray(raw.history) && raw.history.length > 0
        ? raw.history.slice(0, 5).map((item: any, index: number) => ({
            id: String(item.id ?? `${raw.id}-h${index + 1}`),
            ranAt: String(item.ranAt ?? item.createdAt ?? new Date().toISOString()),
            status: String(item.status ?? "성공"),
            duration: item.duration ? String(item.duration) : undefined,
            message: item.message ? String(item.message) : undefined,
          }))
        : [
            {
              id: `${raw.id}-history-1`,
              ranAt: raw.lastRun ?? raw.last_run ?? new Date().toISOString(),
              status: "성공",
            },
          ],
  }
}

function AddRoutineDialog({
  open,
  onOpenChange,
  agents,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: AgentOption[]
  onSubmit: (payload: {
    name: string
    description: string
    triggerType: TriggerType
    triggerTime: string
    assignedAgentId: string
  }) => Promise<void>
  isSubmitting: boolean
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [triggerType, setTriggerType] = useState<TriggerType>("매일")
  const [triggerTime, setTriggerTime] = useState("09:00")
  const [assignedAgentId, setAssignedAgentId] = useState("")

  const reset = () => {
    setName("")
    setDescription("")
    setTriggerType("매일")
    setTriggerTime("09:00")
    setAssignedAgentId("")
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      triggerType,
      triggerTime,
      assignedAgentId,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>루틴 추가</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              이름
            </p>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              설명
            </p>
            <Textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              트리거 타입
            </p>
            <Select value={triggerType} onValueChange={(value) => setTriggerType(value as TriggerType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="매일">매일</SelectItem>
                <SelectItem value="매주">매주</SelectItem>
                <SelectItem value="매월">매월</SelectItem>
                <SelectItem value="이벤트">이벤트</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              트리거 시간
            </p>
            <Input
              type="time"
              value={triggerTime}
              onChange={(event) => setTriggerTime(event.target.value)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              담당 에이전트
            </p>
            <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="에이전트 선택" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isSubmitting}
              className="border-0 text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "추가"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RoutinesPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { success, error, info } = useToast()

  const [showDialog, setShowDialog] = useState(false)
  const [createdRoutines, setCreatedRoutines] = useState<RoutineData[]>([])
  const [routineOverrides, setRoutineOverrides] = useState<Record<string, RoutineData>>({})
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null)
  const [submittingRoutine, setSubmittingRoutine] = useState(false)
  const [runningRoutineId, setRunningRoutineId] = useState<string | null>(null)
  const [updatingRoutineId, setUpdatingRoutineId] = useState<string | null>(null)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: "루틴" }])
  }, [setBreadcrumbs])

  const { data: apiRoutines, isLoading } = useQuery({
    queryKey: queryKeys.routines.list(selectedOrgId ?? ""),
    queryFn: () => routinesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
    retry: false,
  })

  const { data: apiAgents } = useQuery({
    queryKey: ["agents", "routine-dialog", selectedOrgId ?? ""],
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
    retry: false,
  })

  const agents = useMemo<AgentOption[]>(() => {
    const source = Array.isArray(apiAgents) && apiAgents.length > 0 ? apiAgents : FALLBACK_AGENTS
    return source.map((agent: any) => ({
      id: String(agent.id),
      name: String(agent.name ?? "이름 없는 에이전트"),
    }))
  }, [apiAgents])

  const baseRoutines = useMemo<RoutineData[]>(() => {
    const source = Array.isArray(apiRoutines) && apiRoutines.length > 0 ? apiRoutines : FALLBACK_ROUTINES
    return source.map((routine: any) => normalizeRoutine(routine))
  }, [apiRoutines])

  const routines = useMemo(() => {
    return [...baseRoutines, ...createdRoutines].map(
      (routine) => routineOverrides[routine.id] ?? routine
    )
  }, [baseRoutines, createdRoutines, routineOverrides])

  const selectedRoutine =
    routines.find((routine) => routine.id === selectedRoutineId) ?? null

  const handleCreateRoutine = async (payload: {
    name: string
    description: string
    triggerType: TriggerType
    triggerTime: string
    assignedAgentId: string
  }) => {
    setSubmittingRoutine(true)
    const agent = agents.find((item) => item.id === payload.assignedAgentId)
    const localRoutine = normalizeRoutine({
      id: `routine-local-${Date.now()}`,
      name: payload.name,
      description: payload.description,
      triggerCondition:
        payload.triggerType === "이벤트"
          ? "이벤트 발생 시 실행"
          : `${payload.triggerType} ${payload.triggerTime} 실행`,
      triggerTime: payload.triggerTime,
      assignedAgentId: payload.assignedAgentId || undefined,
      assignedAgentName: agent?.name,
      isActive: true,
      estimatedDuration: "약 12분",
      averageCost: 590,
      history: [],
    })

    const shouldMock = !(selectedOrgId && Array.isArray(apiRoutines) && apiRoutines.length > 0)
    if (shouldMock) {
      setCreatedRoutines((prev) => [localRoutine, ...prev])
      success("루틴을 추가했습니다. 현재는 mock 저장입니다.")
      setSubmittingRoutine(false)
      return
    }

    try {
      const created = await routinesApi.create(selectedOrgId!, {
        name: payload.name,
        description: payload.description,
        triggerType: payload.triggerType,
        triggerTime: payload.triggerTime,
        assignedAgentId: payload.assignedAgentId || undefined,
      })
      setCreatedRoutines((prev) => [normalizeRoutine(created ?? localRoutine), ...prev])
      success("루틴을 추가했습니다.")
    } catch {
      setCreatedRoutines((prev) => [localRoutine, ...prev])
      info("백엔드 응답이 없어 mock 루틴으로 추가했습니다.")
    } finally {
      setSubmittingRoutine(false)
    }
  }

  const handleToggle = async (routine: RoutineData, nextValue: boolean) => {
    const previous = routineOverrides[routine.id] ?? routine
    const nextRoutine = { ...previous, isActive: nextValue }
    setRoutineOverrides((prev) => ({ ...prev, [routine.id]: nextRoutine }))
    setUpdatingRoutineId(routine.id)

    const shouldMock = !(Array.isArray(apiRoutines) && apiRoutines.length > 0 && selectedOrgId)
    if (shouldMock) {
      success("루틴 활성 상태를 반영했습니다.")
      setUpdatingRoutineId(null)
      return
    }

    try {
      await routinesApi.update(routine.id, { isActive: nextValue })
      success("루틴 활성 상태를 저장했습니다.")
    } catch {
      setRoutineOverrides((prev) => ({ ...prev, [routine.id]: previous }))
      error("루틴 상태 저장에 실패해 이전 값으로 되돌렸습니다.")
    } finally {
      setUpdatingRoutineId(null)
    }
  }

  const handleManualRun = async (routine: RoutineData) => {
    setRunningRoutineId(routine.id)
    const shouldMock = !selectedOrgId

    if (shouldMock) {
      success("루틴을 즉시 실행했습니다.")
      setRunningRoutineId(null)
      return
    }

    try {
      await orchestratorApi.dispatch({
        organizationId: selectedOrgId,
        instruction: `${routine.name} 루틴을 즉시 실행하세요. 설명: ${routine.description}`,
      })
      success("루틴을 즉시 실행했습니다.")
    } catch {
      info("오케스트레이터 API가 없어 mock 실행으로 처리했습니다.")
    } finally {
      setRunningRoutineId(null)
    }
  }

  const enabledCount = routines.filter((routine) => routine.isActive).length

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              루틴
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {enabledCount}/{routines.length} 활성화됨
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "var(--text-tertiary)" }}
              />
            )}
            <Button
              size="sm"
              onClick={() => setShowDialog(true)}
              className="gap-1 border-0 text-xs text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
            >
              <Plus size={14} />
              루틴 추가
            </Button>
          </div>
        </div>

        {routines.length === 0 ? (
          <EmptyState
            icon={<Clock size={22} />}
            title="등록된 루틴이 없습니다"
            description="정기적으로 실행할 자동화 루틴을 추가하세요."
            action={{ label: "루틴 추가", onClick: () => setShowDialog(true) }}
          />
        ) : (
          <div className="grid gap-3">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                  opacity: routine.isActive ? 1 : 0.72,
                }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoutineId(routine.id)
                      setExpandedRunId(null)
                    }}
                    className="flex min-w-0 flex-1 items-start gap-4 text-left"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: routine.isActive
                          ? "var(--color-primary-bg)"
                          : "var(--bg-tertiary)",
                        color: routine.isActive
                          ? "var(--color-teal-500)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {routine.name}
                        </p>
                        <Badge
                          className="border-0 px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: routine.isActive
                              ? "var(--color-primary-bg)"
                              : "var(--bg-tertiary)",
                            color: routine.isActive
                              ? "var(--color-teal-500)"
                              : "var(--text-tertiary)",
                          }}
                        >
                          {routine.triggerType}
                        </Badge>
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {routine.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <span className="flex items-center gap-1">
                          <CalendarClock size={12} />
                          {routine.triggerCondition}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bot size={12} />
                          {routine.assignedAgentName ?? "-"}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualRun(routine)}
                      disabled={runningRoutineId === routine.id}
                      className="gap-1"
                    >
                      {runningRoutineId === routine.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )}
                      지금 실행
                    </Button>
                    <div className="flex items-center gap-2">
                      {updatingRoutineId === routine.id && (
                        <Loader2
                          size={14}
                          className="animate-spin"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                      )}
                      <Switch
                        checked={routine.isActive}
                        onCheckedChange={(checked) => handleToggle(routine, checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AddRoutineDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          agents={agents}
          onSubmit={handleCreateRoutine}
          isSubmitting={submittingRoutine}
        />

        <Sheet open={!!selectedRoutine} onOpenChange={(open) => !open && setSelectedRoutineId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            {selectedRoutine && (
              <>
                <SheetHeader className="border-b" style={{ borderColor: "var(--border-default)" }}>
                  <SheetTitle>{selectedRoutine.name}</SheetTitle>
                  <SheetDescription>{selectedRoutine.description}</SheetDescription>
                </SheetHeader>
                <div className="grid gap-5 p-4">
                  <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-secondary)" }}>
                    <p className="mb-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      실행 조건
                    </p>
                    <div className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <p>트리거 타입: {selectedRoutine.triggerType}</p>
                      <p>트리거 조건: {selectedRoutine.triggerCondition}</p>
                      <p>시간/이벤트: {selectedRoutine.triggerType === "이벤트" ? "이벤트 기반" : selectedRoutine.triggerTime}</p>
                      <p>담당 에이전트: {selectedRoutine.assignedAgentName ?? "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-secondary)" }}>
                      <p className="mb-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        예상 소요 시간
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {selectedRoutine.estimatedDuration}
                      </p>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-secondary)" }}>
                      <p className="mb-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        평균 비용
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {selectedRoutine.averageCost.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      최근 실행 이력
                    </p>
                    <div className="grid gap-2">
                      {selectedRoutine.history.slice(0, 5).map((history) => {
                        const isFailed = history.status === "실패"
                        const isWarning = history.status === "경고"
                        const isExpanded = expandedRunId === history.id

                        const dotColor = isFailed
                          ? "#ef4444"
                          : isWarning
                          ? "#f59e0b"
                          : "#10b981"

                        const rowBg = isFailed
                          ? "rgba(239,68,68,0.06)"
                          : "var(--bg-secondary)"

                        const rowBorder = isFailed
                          ? "1px solid rgba(239,68,68,0.25)"
                          : "1px solid var(--border-default)"

                        return (
                          <div key={history.id} className="rounded-xl overflow-hidden" style={{ border: rowBorder }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRunId((prev) => (prev === history.id ? null : history.id))
                              }
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:brightness-95"
                              style={{ backgroundColor: rowBg }}
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: dotColor }}
                              />
                              <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                                {formatHistoryDate(history.ranAt)}
                              </span>
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                {history.status}
                              </span>
                              {isExpanded ? (
                                <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                              )}
                            </button>
                            {isExpanded && (
                              <div
                                className="px-4 py-3 grid gap-1.5 text-xs"
                                style={{
                                  backgroundColor: "var(--bg-tertiary)",
                                  borderTop: "1px solid var(--border-default)",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <p>
                                  <span style={{ color: "var(--text-tertiary)" }}>실행 시각: </span>
                                  {new Date(history.ranAt).toLocaleString("ko-KR")}
                                </p>
                                <p>
                                  <span style={{ color: "var(--text-tertiary)" }}>상태: </span>
                                  <span
                                    style={{
                                      color: isFailed
                                        ? "#ef4444"
                                        : isWarning
                                        ? "#f59e0b"
                                        : "#10b981",
                                    }}
                                  >
                                    {history.status}
                                  </span>
                                </p>
                                {history.duration && (
                                  <p>
                                    <span style={{ color: "var(--text-tertiary)" }}>소요 시간: </span>
                                    {history.duration}
                                  </p>
                                )}
                                {history.message && (
                                  <p>
                                    <span style={{ color: "var(--text-tertiary)" }}>결과 메시지: </span>
                                    {history.message}
                                  </p>
                                )}
                                {!history.duration && !history.message && (
                                  <p style={{ color: "var(--text-tertiary)" }}>상세 로그 없음</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleManualRun(selectedRoutine)}
                    disabled={runningRoutineId === selectedRoutine.id}
                    className="gap-1 border-0 text-white"
                    style={{ backgroundColor: "var(--color-teal-500)" }}
                  >
                    {runningRoutineId === selectedRoutine.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Zap size={14} />
                    )}
                    지금 실행
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </ScrollArea>
  )
}
