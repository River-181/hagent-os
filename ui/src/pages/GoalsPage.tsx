import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/components/ToastContext"
import { goalsApi } from "@/api/goals"
import { agentsApi } from "@/api/agents"
import { orchestratorApi } from "@/api/orchestrator"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Target,
  Plus,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Bot,
  Sparkles,
  Check,
} from "lucide-react"

type GoalStatus = "achieved" | "in_progress" | "delayed"
type GoalCategory = "매출" | "학생수" | "만족도" | "운영"

interface GoalMilestone {
  id: string
  title: string
  completed: boolean
}

interface LinkedCase {
  id: string
  title: string
  status: string
}

interface GoalCardData {
  id: string
  title: string
  description: string
  status: GoalStatus
  targetDate?: string
  category: GoalCategory
  agentId?: string
  agentName?: string
  progress: number
  milestones: GoalMilestone[]
  linkedCases: LinkedCase[]
}

interface AgentOption {
  id: string
  name: string
}

const GOAL_CATEGORIES: GoalCategory[] = ["매출", "학생수", "만족도", "운영"]

const FALLBACK_AGENTS: AgentOption[] = [
  { id: "agent-sales", name: "매출 성장 에이전트" },
  { id: "agent-student", name: "학생 관리 에이전트" },
  { id: "agent-ops", name: "운영 최적화 에이전트" },
]

const FALLBACK_GOALS: GoalCardData[] = [
  {
    id: "goal-1",
    title: "2026년 상반기 매출 목표 달성",
    description: "신규 등록 확대와 재원율 개선으로 상반기 목표 매출을 달성합니다.",
    status: "in_progress",
    targetDate: "2026-06-30",
    category: "매출",
    agentId: "agent-sales",
    agentName: "매출 성장 에이전트",
    milestones: [
      { id: "goal-1-m1", title: "체험 수업 문의 120건 확보", completed: true },
      { id: "goal-1-m2", title: "신규 등록 50명 달성", completed: false },
      { id: "goal-1-m3", title: "재등록률 82% 유지", completed: false },
    ],
    progress: 33,
    linkedCases: [
      { id: "case-101", title: "봄학기 체험수업 전환 캠페인", status: "진행중" },
      { id: "case-102", title: "재등록 대상 학부모 리마인드", status: "대기" },
    ],
  },
  {
    id: "goal-2",
    title: "학생 만족도 4.7점 유지",
    description: "수업 피드백과 상담 응답 시간을 개선해 만족도 지표를 안정화합니다.",
    status: "achieved",
    targetDate: "2026-03-31",
    category: "만족도",
    agentId: "agent-student",
    agentName: "학생 관리 에이전트",
    milestones: [
      { id: "goal-2-m1", title: "월간 만족도 설문 회수율 70% 확보", completed: true },
      { id: "goal-2-m2", title: "상담 응답 SLA 24시간 이내", completed: true },
    ],
    progress: 100,
    linkedCases: [{ id: "case-201", title: "만족도 저하 반 대응 플로우", status: "완료" }],
  },
  {
    id: "goal-3",
    title: "운영 자동화율 80% 확보",
    description: "반복 행정 업무를 자동화해 원장 승인 업무만 남기는 것이 목표입니다.",
    status: "delayed",
    targetDate: "2026-03-20",
    category: "운영",
    agentId: "agent-ops",
    agentName: "운영 최적화 에이전트",
    milestones: [
      { id: "goal-3-m1", title: "상담 예약 분류 자동화", completed: true },
      { id: "goal-3-m2", title: "출결 이상 감지 자동화", completed: false },
      { id: "goal-3-m3", title: "월말 정산 초안 자동 생성", completed: false },
    ],
    progress: 34,
    linkedCases: [
      { id: "case-301", title: "월말 정산 자동화 QA", status: "진행중" },
      { id: "case-302", title: "출결 이상 감지 튜닝", status: "지연" },
      { id: "case-303", title: "운영 대시보드 알림 연결", status: "대기" },
    ],
  },
]

const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; bg: string; color: string }
> = {
  achieved: {
    label: "달성",
    bg: "rgba(16,185,129,0.12)",
    color: "var(--color-success)",
  },
  in_progress: {
    label: "진행중",
    bg: "var(--color-primary-bg)",
    color: "var(--color-teal-500)",
  },
  delayed: {
    label: "지연",
    bg: "rgba(239,68,68,0.12)",
    color: "var(--color-danger, #ef4444)",
  },
}

function formatTargetDate(iso?: string) {
  if (!iso) return "기한 미정"
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`
}

function isOverdue(goal: GoalCardData) {
  if (!goal.targetDate || goal.status === "achieved") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(goal.targetDate)
  due.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

function getProgress(goal: GoalCardData) {
  if (goal.milestones.length === 0) return goal.progress
  return Math.round(
    (goal.milestones.filter((milestone) => milestone.completed).length /
      goal.milestones.length) *
      100
  )
}

function normalizeGoal(raw: any): GoalCardData {
  const milestonesSource = Array.isArray(raw.milestones) ? raw.milestones : []
  const milestones: GoalMilestone[] =
    milestonesSource.length > 0
      ? milestonesSource.map((milestone: any, index: number) => ({
          id: String(milestone.id ?? `${raw.id}-m${index + 1}`),
          title: String(
            milestone.title ?? milestone.name ?? `세부 마일스톤 ${index + 1}`
          ),
          completed: Boolean(
            milestone.completed ?? milestone.isCompleted ?? milestone.done
          ),
        }))
      : [
          { id: `${raw.id}-m1`, title: "세부 계획 수립", completed: true },
          { id: `${raw.id}-m2`, title: "실행 점검", completed: false },
          { id: `${raw.id}-m3`, title: "결과 리뷰", completed: false },
        ]

  const completedCount = milestones.filter((milestone) => milestone.completed).length
  const computedProgress =
    milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

  let status: GoalStatus = "in_progress"
  if (raw.status === "completed" || raw.status === "achieved" || computedProgress === 100) {
    status = "achieved"
  } else if (raw.status === "delayed") {
    status = "delayed"
  }

  const linkedCases =
    Array.isArray(raw.linkedCases) && raw.linkedCases.length > 0
      ? raw.linkedCases.map((linkedCase: any, index: number) => ({
          id: String(linkedCase.id ?? `${raw.id}-case-${index + 1}`),
          title: String(linkedCase.title ?? linkedCase.name ?? `연결 케이스 ${index + 1}`),
          status: String(linkedCase.status ?? "진행중"),
        }))
      : []

  const normalized: GoalCardData = {
    id: String(raw.id),
    title: String(raw.title ?? raw.name ?? "이름 없는 목표"),
    description: String(raw.description ?? ""),
    status,
    targetDate: raw.targetDate ?? raw.dueDate ?? undefined,
    category: GOAL_CATEGORIES.includes(raw.category) ? raw.category : "운영",
    agentId: raw.agentId ?? raw.agent?.id ?? undefined,
    agentName: raw.agentName ?? raw.agent?.name ?? undefined,
    progress: Number(raw.progress ?? computedProgress),
    milestones,
    linkedCases,
  }

  if (isOverdue(normalized) && normalized.status !== "achieved") {
    normalized.status = "delayed"
  }

  normalized.progress = getProgress(normalized)
  return normalized
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      className="border-0 px-2 py-0.5 text-xs"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </Badge>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: "var(--text-secondary)" }}>진척도</span>
        <span style={{ color: "var(--text-primary)" }}>{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(value, 100))}%`,
            backgroundColor: "var(--color-teal-500)",
          }}
        />
      </div>
    </div>
  )
}

function NewGoalDialog({
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
    title: string
    description: string
    dueDate: string
    agentId: string
    category: GoalCategory
  }) => Promise<void>
  isSubmitting: boolean
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [agentId, setAgentId] = useState("")
  const [category, setCategory] = useState<GoalCategory>("운영")

  const reset = () => {
    setTitle("")
    setDescription("")
    setDueDate("")
    setAgentId("")
    setCategory("운영")
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      dueDate,
      agentId,
      category,
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
      <DialogContent
        style={{
          backgroundColor: "var(--bg-base)",
          border: "1px solid var(--border-default)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>목표 추가</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              목표 이름
            </p>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
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
              마감일
            </p>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              담당 에이전트
            </p>
            <Select value={agentId} onValueChange={setAgentId}>
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
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              카테고리
            </p>
            <Select value={category} onValueChange={(value) => setCategory(value as GoalCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
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
              disabled={!title.trim() || isSubmitting}
              onClick={handleSubmit}
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

export function GoalsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const { success, error, info } = useToast()

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [createdGoals, setCreatedGoals] = useState<GoalCardData[]>([])
  const [goalOverrides, setGoalOverrides] = useState<Record<string, GoalCardData>>({})
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({})
  const [submittingGoal, setSubmittingGoal] = useState(false)
  const [milestoneUpdatingId, setMilestoneUpdatingId] = useState<string | null>(null)
  const [dispatchingGoalId, setDispatchingGoalId] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: "운영 목표" }])
  }, [setBreadcrumbs])

  const { data: apiGoals, isLoading } = useQuery({
    queryKey: queryKeys.goals.list(selectedOrgId ?? ""),
    queryFn: () => goalsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
    retry: false,
  })

  const { data: apiAgents } = useQuery({
    queryKey: ["agents", "goal-dialog", selectedOrgId ?? ""],
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
    retry: false,
  })

  const agentOptions = useMemo<AgentOption[]>(() => {
    const list = Array.isArray(apiAgents) && apiAgents.length > 0 ? apiAgents : FALLBACK_AGENTS
    return list.map((agent: any) => ({
      id: String(agent.id),
      name: String(agent.name ?? agent.title ?? "이름 없는 에이전트"),
    }))
  }, [apiAgents])

  const baseGoals = useMemo<GoalCardData[]>(() => {
    const source = Array.isArray(apiGoals) && apiGoals.length > 0 ? apiGoals : FALLBACK_GOALS
    return source.map((goal: any) => normalizeGoal(goal))
  }, [apiGoals])

  const goals = useMemo(() => {
    const merged = [...baseGoals, ...createdGoals].map((goal) => goalOverrides[goal.id] ?? goal)
    return merged
  }, [baseGoals, createdGoals, goalOverrides])

  const handleMilestoneToggle = async (goal: GoalCardData, milestoneId: string) => {
    const previous = goalOverrides[goal.id] ?? goal
    const updatedMilestones = previous.milestones.map((milestone) =>
      milestone.id === milestoneId
        ? { ...milestone, completed: !milestone.completed }
        : milestone
    )

    const nextGoal = normalizeGoal({
      ...previous,
      milestones: updatedMilestones,
      status:
        updatedMilestones.every((milestone) => milestone.completed)
          ? "achieved"
          : previous.status === "achieved"
            ? "in_progress"
            : previous.status,
    })

    setGoalOverrides((prev) => ({ ...prev, [goal.id]: nextGoal }))
    setMilestoneUpdatingId(milestoneId)

    const shouldMock = !(Array.isArray(apiGoals) && apiGoals.length > 0 && selectedOrgId)
    if (shouldMock) {
      setMilestoneUpdatingId(null)
      success("마일스톤 상태를 반영했습니다.")
      return
    }

    try {
      await goalsApi.update(goal.id, { milestones: updatedMilestones })
      success("마일스톤 상태를 저장했습니다.")
    } catch {
      setGoalOverrides((prev) => ({ ...prev, [goal.id]: previous }))
      error("마일스톤 저장에 실패해 이전 상태로 되돌렸습니다.")
    } finally {
      setMilestoneUpdatingId(null)
    }
  }

  const handleCreateGoal = async (payload: {
    title: string
    description: string
    dueDate: string
    agentId: string
    category: GoalCategory
  }) => {
    setSubmittingGoal(true)

    const agent = agentOptions.find((item) => item.id === payload.agentId)
    const localGoal = normalizeGoal({
      id: `goal-local-${Date.now()}`,
      title: payload.title,
      description: payload.description,
      dueDate: payload.dueDate || undefined,
      category: payload.category,
      agentId: payload.agentId || undefined,
      agentName: agent?.name,
      milestones: [
        { id: `goal-local-m1-${Date.now()}`, title: "초기 계획 수립", completed: false },
        { id: `goal-local-m2-${Date.now()}`, title: "중간 점검", completed: false },
        { id: `goal-local-m3-${Date.now()}`, title: "성과 검토", completed: false },
      ],
      linkedCases: [],
    })

    const shouldMock = !(selectedOrgId && Array.isArray(apiGoals) && apiGoals.length > 0)

    if (shouldMock) {
      setCreatedGoals((prev) => [localGoal, ...prev])
      success("목표를 추가했습니다. 현재는 mock 저장입니다.")
      setSubmittingGoal(false)
      return
    }

    try {
      const created = await goalsApi.create(selectedOrgId!, {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate || undefined,
        category: payload.category,
        agentId: payload.agentId || undefined,
      })
      setCreatedGoals((prev) => [normalizeGoal(created ?? localGoal), ...prev])
      success("목표를 추가했습니다.")
    } catch {
      setCreatedGoals((prev) => [localGoal, ...prev])
      info("백엔드 응답이 없어 mock 목표로 추가했습니다.")
    } finally {
      setSubmittingGoal(false)
    }
  }

  const handleDispatchPlan = async (goal: GoalCardData) => {
    setDispatchingGoalId(goal.id)
    const instruction = `${goal.title} 목표 달성을 위한 단계별 실행 계획을 수립하세요. 카테고리: ${goal.category}`
    const shouldMock = !selectedOrgId

    if (shouldMock) {
      success("에이전트에게 목표 달성 계획 요청을 보냈습니다.")
      setDispatchingGoalId(null)
      return
    }

    try {
      await orchestratorApi.dispatch({
        instruction,
        organizationId: selectedOrgId,
      })
      success("에이전트에게 목표 달성 계획 요청을 보냈습니다.")
    } catch {
      info("오케스트레이터 API가 없어 mock 요청으로 처리했습니다.")
    } finally {
      setDispatchingGoalId(null)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              운영 목표
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              학원 운영 목표와 달성 계획을 한 곳에서 관리합니다.
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
              onClick={() => setShowNewDialog(true)}
              className="gap-1 border-0 text-xs text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
            >
              <Plus size={14} />
              목표 추가
            </Button>
          </div>
        </div>

        {goals.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="운영 목표가 없습니다"
            description="학원 운영 목표를 추가하면 에이전트가 달성 계획을 제안합니다."
            action={{ label: "목표 추가", onClick: () => setShowNewDialog(true) }}
          />
        ) : (
          <div className="grid gap-4">
            {goals.map((goal) => {
              const overdue = isOverdue(goal)
              const progress = getProgress(goal)
              const isExpanded = expandedCases[goal.id] ?? false

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl p-5"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: overdue
                      ? "1px solid var(--color-danger, #ef4444)"
                      : "1px solid var(--border-default)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={goal.status} />
                          <Badge
                            className="border-0 px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: "var(--bg-tertiary)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {goal.category}
                          </Badge>
                          {overdue && (
                            <Badge
                              className="border-0 px-2 py-0.5 text-xs"
                              style={{
                                backgroundColor: "rgba(239,68,68,0.12)",
                                color: "var(--color-danger, #ef4444)",
                              }}
                            >
                              기한 초과
                            </Badge>
                          )}
                        </div>
                        <h2
                          className="text-lg font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {goal.title}
                        </h2>
                        {goal.description && (
                          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <div className="min-w-[180px] rounded-xl px-3 py-2" style={{ backgroundColor: "var(--bg-secondary)" }}>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Calendar size={12} />
                          <span>마감일 {formatTargetDate(goal.targetDate)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Bot size={12} />
                          <span>{goal.agentName ?? "담당 에이전트 미지정"}</span>
                        </div>
                      </div>
                    </div>

                    <ProgressBar value={progress} />

                    <div>
                      <p className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        세부 마일스톤
                      </p>
                      <div className="grid gap-2">
                        {goal.milestones.map((milestone) => (
                          <button
                            key={milestone.id}
                            type="button"
                            onClick={() => handleMilestoneToggle(goal, milestone.id)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors"
                            style={{
                              backgroundColor: milestone.completed
                                ? "rgba(20,184,166,0.08)"
                                : "var(--bg-secondary)",
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded-full border"
                              style={{
                                borderColor: milestone.completed
                                  ? "var(--color-teal-500)"
                                  : "var(--border-default)",
                                backgroundColor: milestone.completed
                                  ? "var(--color-teal-500)"
                                  : "transparent",
                                color: milestone.completed ? "#fff" : "transparent",
                              }}
                            >
                              <Check size={12} />
                            </span>
                            <span
                              className="flex-1 text-sm"
                              style={{
                                color: "var(--text-primary)",
                                textDecoration: milestone.completed ? "line-through" : "none",
                              }}
                            >
                              {milestone.title}
                            </span>
                            {milestoneUpdatingId === milestone.id && (
                              <Loader2
                                size={14}
                                className="animate-spin"
                                style={{ color: "var(--text-tertiary)" }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-secondary)" }}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCases((prev) => ({ ...prev, [goal.id]: !isExpanded }))
                        }
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          연결된 케이스 {goal.linkedCases.length}개
                        </span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      {isExpanded && (
                        <div className="mt-3 grid gap-2">
                          {goal.linkedCases.length === 0 ? (
                            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                              아직 연결된 케이스가 없습니다.
                            </p>
                          ) : (
                            goal.linkedCases.map((linkedCase) => (
                              <button
                                key={linkedCase.id}
                                type="button"
                                onClick={() =>
                                  navigate(`/${orgPrefix}/cases/${linkedCase.id}`)
                                }
                                className="flex items-center justify-between rounded-lg px-3 py-2 w-full text-left transition-colors group"
                                style={{
                                  backgroundColor: "var(--bg-elevated)",
                                  border: "1px solid var(--border-default)",
                                }}
                              >
                                <span
                                  className="text-sm group-hover:underline group-hover:decoration-teal-500"
                                  style={{
                                    color: "var(--text-primary)",
                                    textUnderlineOffset: "3px",
                                  }}
                                >
                                  {linkedCase.title}
                                </span>
                                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                  {linkedCase.status}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleDispatchPlan(goal)}
                        disabled={dispatchingGoalId === goal.id}
                        className="gap-1 border-0 text-white"
                        style={{ backgroundColor: "var(--color-teal-500)" }}
                      >
                        {dispatchingGoalId === goal.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        에이전트에게 달성 계획 요청
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <NewGoalDialog
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
          agents={agentOptions}
          onSubmit={handleCreateGoal}
          isSubmitting={submittingGoal}
        />
      </div>
    </ScrollArea>
  )
}
