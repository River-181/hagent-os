import { useNavigate } from "react-router-dom"
import { cn, timeAgo } from "@/lib/utils"
import { Identity } from "./Identity"

type IdentityType = "agent" | "user" | "system"

interface ActivityEvent {
  id?: string
  actorType?: IdentityType
  actor_type?: IdentityType
  actorId?: string
  actor_id?: string
  actorName?: string
  actor_name?: string
  action?: string
  entityType?: string
  entity_type?: string
  entityId?: string
  entity_id?: string
  entityTitle?: string
  entity_title?: string
  createdAt?: string
  created_at?: string
  metadata?: Record<string, unknown>
  // Allow passing as top-level "activity" prop
  [key: string]: unknown
}

interface ActivityRowProps {
  /** Pass either event or activity (aliases) */
  event?: ActivityEvent
  activity?: ActivityEvent
  orgPrefix?: string
  className?: string
}

const actionVerbs: Record<string, string> = {
  checked_out: "체크아웃",
  commented_on: "댓글 작성",
  changed_status: "상태 변경",
  created: "생성",
  updated: "수정",
  deleted: "삭제",
  assigned: "담당자 지정",
  approved: "승인",
  rejected: "반려",
  completed: "완료",
  started: "시작",
}

function entityPath(entityType: string, entityId: string, orgPrefix?: string): string | null {
  const base = orgPrefix ? `/${orgPrefix}` : ""
  if (entityType === "case") return `${base}/cases/${entityId}`
  if (entityType === "agent") return `${base}/agents/${entityId}`
  if (entityType === "approval") return `${base}/inbox`
  return null
}

export function ActivityRow({ event, activity, orgPrefix, className }: ActivityRowProps) {
  const data = activity ?? event ?? {}
  const navigate = useNavigate()

  const actorType = (data.actorType ?? data.actor_type ?? "user") as IdentityType
  const actorName = (data.actorName ?? data.actor_name ?? "사용자") as string
  const action = (data.action ?? "") as string
  const entityType = (data.entityType ?? data.entity_type ?? "") as string
  const entityId = (data.entityId ?? data.entity_id ?? "") as string
  const entityTitle = (data.entityTitle ?? data.entity_title ?? "") as string
  const createdAt = (data.createdAt ?? data.created_at ?? "") as string

  const verbLabel = actionVerbs[action] ?? action
  const path = entityType && entityId ? entityPath(entityType, entityId, orgPrefix) : null

  const handleEntityClick = () => {
    if (path) navigate(path)
  }

  return (
    <div
      className={cn("flex items-start gap-3 py-3 px-4", className)}
      style={{ borderBottom: "1px solid var(--border-default)" }}
    >
      <div className="shrink-0 mt-0.5">
        <Identity
          name={actorName}
          type={actorType}
          size="sm"
          showName={false}
        />
      </div>

      <div className="flex-1 min-w-0 text-sm" style={{ color: "var(--text-secondary)" }}>
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {actorName}
        </span>
        {verbLabel && (
          <>
            {" "}
            <span>{verbLabel}</span>
          </>
        )}
        {entityTitle && (
          <>
            {" on "}
            <button
              onClick={handleEntityClick}
              className={cn(
                "font-medium underline-offset-2 hover:underline transition-colors",
                path ? "cursor-pointer" : "cursor-default"
              )}
              style={{ color: "var(--color-teal-500)" }}
            >
              {entityTitle}
            </button>
          </>
        )}
      </div>

      {createdAt && (
        <span
          className="shrink-0 text-xs whitespace-nowrap mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {timeAgo(createdAt)}
        </span>
      )}
    </div>
  )
}
