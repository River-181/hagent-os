import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as LucideIcons from "lucide-react"
import { Bot, MessageSquare, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatusIcon, CaseStatus } from "@/components/StatusIcon"
import { Identity } from "@/components/Identity"
import { CaseTypeBadge } from "@/components/CaseTypeBadge"
import { CaseSeverityBadge } from "@/components/CaseSeverityBadge"
import { cn } from "@/lib/utils"
import { casesApi } from "@/api/cases"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { useOrganization } from "@/context/OrganizationContext"

interface KanbanBoardProps {
  cases: any[]
}

interface ColumnConfig {
  status: CaseStatus
  label: string
  tint: string
  headerColor: string
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "backlog",
    label: "백로그",
    tint: "rgba(148,163,184,0.06)",
    headerColor: "var(--text-tertiary)",
  },
  {
    status: "todo",
    label: "할 일",
    tint: "rgba(59,130,246,0.06)",
    headerColor: "#3b82f6",
  },
  {
    status: "in_progress",
    label: "진행 중",
    tint: "rgba(20,184,166,0.06)",
    headerColor: "var(--color-teal-500)",
  },
  {
    status: "in_review",
    label: "검토 중",
    tint: "rgba(168,85,247,0.06)",
    headerColor: "#a855f7",
  },
  {
    status: "blocked",
    label: "차단됨",
    tint: "rgba(239,68,68,0.06)",
    headerColor: "var(--color-danger)",
  },
]

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

function timeAgoLocal(iso?: string): string {
  if (!iso) return "활동 없음"
  const diff = Date.now() - new Date(iso).getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return "방금 전"
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`
  return `${Math.floor(diff / day)}일 전`
}

function getPriorityColor(priority: unknown) {
  switch (priority) {
    case "urgent":
    case 0:
      return "#ef4444"
    case "high":
    case 1:
      return "#f97316"
    case "medium":
    case 2:
      return "#eab308"
    case "low":
    case 3:
    case 4:
    default:
      return "#d1d5db"
  }
}

function getLastActivityAt(caseItem: any) {
  return (
    caseItem.lastActivityAt ??
    caseItem.last_activity_at ??
    caseItem.updatedAt ??
    caseItem.updated_at ??
    caseItem.createdAt ??
    caseItem.created_at
  )
}

function getCommentCount(caseItem: any) {
  if (typeof caseItem.commentCount === "number") return caseItem.commentCount
  if (typeof caseItem.comment_count === "number") return caseItem.comment_count
  if (Array.isArray(caseItem.comments)) return caseItem.comments.length
  return 0
}

function getAgentIcon(iconName?: string): LucideIcon {
  if (!iconName) return Bot
  const candidate = (LucideIcons as Record<string, unknown>)[iconName]
  return typeof candidate === "function" ? (candidate as LucideIcon) : Bot
}

function KanbanCard({
  c,
  orgPrefix,
  onDragStart,
}: {
  c: any
  orgPrefix: string
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string) => void
}) {
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)
  const assigneeName = c.assignee?.name ?? c.agent?.name ?? null
  const assigneeType: "agent" | "user" = c.agent?.name ? "agent" : "user"
  const AgentIcon = getAgentIcon(c.agent?.icon ?? c.assigneeAgent?.icon)
  const lastActivityLabel = timeAgoLocal(getLastActivityAt(c))
  const commentCount = getCommentCount(c)

  return (
    <Card
      draggable={true}
      className="cursor-pointer transition-shadow hover:shadow-md mb-2"
      style={{
        backgroundColor: "var(--bg-base)",
        border: "1px solid var(--border-default)",
        borderLeft: `4px solid ${getPriorityColor(c.priority ?? c.severity ?? c.urgency)}`,
        borderRadius: 10,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={() => navigate(`/${orgPrefix}/cases/${c.id}`)}
      onDragStart={(e) => {
        setIsDragging(true)
        onDragStart(e, c.id)
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <CardContent className="px-3 pt-3 pb-2.5 space-y-2.5">
        <div>
          {c.identifier && (
            <span
              className="block text-xs font-mono mb-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {c.identifier}
            </span>
          )}
          <p
            className="text-sm font-medium leading-snug line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {c.title}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {c.type && <CaseTypeBadge type={c.type} />}
          {c.severity && <CaseSeverityBadge severity={c.severity} />}
          {c.urgency && !c.severity && <CaseSeverityBadge severity={c.urgency} />}
          {c.source && c.source !== "manual" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: c.source === "kakao" ? "#FEE500" : "rgba(59,130,246,0.1)",
                color: c.source === "kakao" ? "#3C1E1E" : "#3b82f6",
              }}
            >
              {c.source === "kakao" ? "카카오" : "SMS"}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {assigneeName ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--color-teal-500)",
                }}
              >
                <AgentIcon size={13} />
              </span>
              <Identity name={assigneeName} size="xs" type={assigneeType} showName />
            </div>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-disabled)" }}>
              담당 에이전트 없음
            </span>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {lastActivityLabel}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <MessageSquare size={12} />
              {commentCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KanbanColumn({
  config,
  cards,
  orgPrefix,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
}: {
  config: ColumnConfig
  cards: any[]
  orgPrefix: string
  isDragOver: boolean
  onDragOver: (e: React.DragEvent<HTMLDivElement>, status: CaseStatus) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: CaseStatus) => void
  onCardDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string) => void
}) {
  return (
    <div
      className="flex flex-col rounded-xl min-w-[220px] w-[220px] flex-shrink-0"
      style={{
        backgroundColor: config.tint,
        border: isDragOver
          ? "2px dashed var(--color-teal-500)"
          : "1px solid var(--border-default)",
        transition: "border 0.15s ease",
      }}
      onDragOver={(e) => onDragOver(e, config.status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, config.status)}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-2">
          <StatusIcon status={config.status} size={14} />
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: config.headerColor }}
          >
            {config.label}
          </span>
        </div>
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-tertiary)",
          }}
        >
          {cards.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <div
            className="rounded-lg p-4 flex items-center justify-center text-center min-h-28"
            style={{ border: "1px dashed var(--border-default)" }}
          >
            <span className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              여기에 드래그하거나 + 버튼으로 추가
            </span>
          </div>
        ) : (
          cards.map((c) => (
            <KanbanCard
              key={c.id}
              c={c}
              orgPrefix={orgPrefix}
              onDragStart={onCardDragStart}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ cases }: KanbanBoardProps) {
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const { selectedOrgId } = useOrganization()
  const queryClient = useQueryClient()
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const updateCaseMutation = useMutation({
    mutationFn: async ({
      caseId,
      status,
      assigneeAgentId,
    }: {
      caseId: string
      status: string
      assigneeAgentId?: string
    }) => {
      await casesApi.update(caseId, { status })
      if (status === "in_progress" && assigneeAgentId) {
        await agentsApi.wakeup(assigneeAgentId, { caseId })
      }
    },
    onSuccess: () => {
      if (selectedOrgId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(selectedOrgId) })
      }
    },
  })

  const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>, caseId: string) => {
    e.dataTransfer.setData("caseId", caseId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: CaseStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: CaseStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const caseId = e.dataTransfer.getData("caseId")
    if (!caseId) return

    const droppedCase = cases.find((caseItem) => caseItem.id === caseId)
    if (!droppedCase || normalizeCaseStatus(droppedCase.status) === status) return

    const assigneeAgentId = droppedCase.assigneeAgentId ?? droppedCase.agent?.id ?? undefined
    updateCaseMutation.mutate({ caseId, status, assigneeAgentId })
  }

  const grouped = COLUMNS.reduce<Record<string, any[]>>((acc, col) => {
    acc[col.status] = cases.filter((caseItem) => normalizeCaseStatus(caseItem.status) === col.status)
    return acc
  }, {})

  const doneCount = cases.filter((caseItem) => normalizeCaseStatus(caseItem.status) === "done").length

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-3",
          "scrollbar-thin scrollbar-thumb-[var(--border-default)] scrollbar-track-transparent"
        )}
        style={{ minHeight: 480 }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            config={col}
            cards={grouped[col.status] ?? []}
            orgPrefix={orgPrefix ?? ""}
            isDragOver={dragOverColumn === col.status}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onCardDragStart={handleCardDragStart}
          />
        ))}
      </div>

      {doneCount > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <StatusIcon status="done" size={14} />
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            완료된 케이스 {doneCount}개가 숨겨져 있습니다.
          </span>
        </div>
      )}
    </div>
  )
}
