import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { notificationsApi } from "@/api/notifications"
import { api } from "@/api/client"
import { queryKeys } from "@/lib/queryKeys"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, timeAgo } from "@/lib/utils"
import {
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
} from "lucide-react"

type FeedFilter = "all" | "pending_approvals" | "case_updates" | "agent_completed"

type NotificationType =
  | "approval_needed"
  | "case_update"
  | "case_created"
  | "agent_completed"
  | "reminder"
  | string

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  entityType?: string | null
  entityId?: string | null
  read?: boolean
  createdAt: string
}

interface ApprovalItem {
  id: string
  status: "pending" | "approved" | "rejected" | "revision_requested"
  payload?: Record<string, unknown> | null
  caseId?: string | null
  caseTitle?: string | null
  createdAt?: string
  created_at?: string
}

type FeedItem =
  | {
      id: string
      kind: "approval"
      category: "pending_approvals"
      title: string
      body: string
      createdAt: string
      read: boolean
      approvalId: string
      caseId?: string | null
    }
  | {
      id: string
      kind: "notification"
      category: Exclude<FeedFilter, "all" | "pending_approvals">
      title: string
      body: string
      createdAt: string
      read: boolean
      entityType?: string | null
      entityId?: string | null
    }

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending_approvals", label: "승인대기" },
  { key: "case_updates", label: "케이스 업데이트" },
  { key: "agent_completed", label: "에이전트 완료" },
]

function getNotificationCategory(item: NotificationItem): FeedItem["category"] | null {
  if (item.type === "agent_completed" || item.entityType === "agent_run") {
    return "agent_completed"
  }

  if (
    item.type === "case_update" ||
    item.type === "case_created" ||
    item.entityType === "case"
  ) {
    return "case_updates"
  }

  return null
}

function feedIcon(item: FeedItem) {
  if (item.kind === "approval") {
    return <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
  }

  switch (item.category) {
    case "agent_completed":
      return <Bot size={18} style={{ color: "var(--color-teal-500)" }} />
    case "case_updates":
      return <FileText size={18} style={{ color: "var(--text-secondary)" }} />
    default:
      return <Bell size={18} style={{ color: "var(--text-secondary)" }} />
  }
}

function buildApprovalBody(approval: ApprovalItem) {
  const draft = typeof approval.payload?.draft === "string" ? approval.payload.draft : null
  if (draft) {
    return draft.length > 80 ? `${draft.slice(0, 80)}...` : draft
  }
  return approval.caseTitle ? `${approval.caseTitle} 관련 승인이 필요합니다.` : "검토가 필요한 승인 요청입니다."
}

export function InboxPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all")
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setBreadcrumbs([{ label: "알림함" }])
  }, [setBreadcrumbs])

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<NotificationItem[]>({
    queryKey: queryKeys.notifications.list(selectedOrgId ?? ""),
    queryFn: () => notificationsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery<ApprovalItem[]>({
    queryKey: [...queryKeys.approvals.list(selectedOrgId ?? ""), "pending"],
    queryFn: () => api.get<ApprovalItem[]>(`/organizations/${selectedOrgId}/approvals?status=pending`),
    enabled: !!selectedOrgId,
  })

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      api.patch(`/approvals/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedOrgId ?? "") })
    },
  })

  const feedItems = useMemo<FeedItem[]>(() => {
    const approvalItems: FeedItem[] = approvals.map((approval) => ({
      id: `approval:${approval.id}`,
      kind: "approval",
      category: "pending_approvals",
      title: approval.caseTitle ?? "승인 요청",
      body: buildApprovalBody(approval),
      createdAt: approval.createdAt ?? approval.created_at ?? new Date().toISOString(),
      read: false,
      approvalId: approval.id,
      caseId: approval.caseId,
    }))

    const notificationItems: FeedItem[] = notifications
      .flatMap((notification) => {
        const category = getNotificationCategory(notification)
        if (!category || category === "pending_approvals") return []

        const item: FeedItem = {
          id: `notification:${notification.id}`,
          kind: "notification",
          category: category as Exclude<FeedFilter, "all" | "pending_approvals">,
          title: notification.title,
          body: notification.body,
          createdAt: notification.createdAt,
          read: notification.read ?? false,
          entityType: notification.entityType,
          entityId: notification.entityId,
        }
        return [item]
      })

    return [...approvalItems, ...notificationItems].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )
  }, [approvals, notifications])

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return feedItems
    return feedItems.filter((item) => item.category === activeFilter)
  }, [activeFilter, feedItems])

  const unreadCount = filteredItems.filter((item) => !item.read && !readIds.has(item.id)).length
  const totalUnreadCount = feedItems.filter((item) => !item.read && !readIds.has(item.id)).length

  const markAsRead = (itemId: string) => {
    setReadIds((current) => {
      const next = new Set(current)
      next.add(itemId)
      return next
    })
  }

  const markAllRead = () => {
    setReadIds(new Set(feedItems.map((item) => item.id)))
  }

  const handleItemClick = (item: FeedItem) => {
    markAsRead(item.id)

    if (!orgPrefix) return

    if (item.kind === "approval") {
      if (item.caseId) {
        navigate(`/${orgPrefix}/cases/${item.caseId}`)
        return
      }
      navigate(`/${orgPrefix}/approvals`)
      return
    }

    if (item.entityType === "case" && item.entityId) {
      navigate(`/${orgPrefix}/cases/${item.entityId}`)
      return
    }

    if (item.entityType === "agent_run" || item.category === "agent_completed") {
      navigate(`/${orgPrefix}/agents`)
    }
  }

  const isLoading = notificationsLoading || approvalsLoading

  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  알림함
                </h1>
                {totalUnreadCount > 0 && (
                  <Badge
                    className="text-xs font-bold px-2 py-0.5 border-0"
                    style={{ background: "var(--color-teal-500)", color: "#fff" }}
                  >
                    {totalUnreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                승인 요청과 운영 알림을 한 곳에서 확인합니다.
              </p>
            </div>
            {totalUnreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="text-xs"
              >
                모두 읽음
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const count =
                filter.key === "all"
                  ? feedItems.length
                  : feedItems.filter((item) => item.category === filter.key).length

              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      activeFilter === filter.key ? "var(--color-teal-500)" : "var(--bg-tertiary)",
                    color: activeFilter === filter.key ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {filter.label} {count > 0 ? `(${count})` : ""}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {unreadCount > 0 ? `선택한 탭에 읽지 않은 항목 ${unreadCount}개` : "읽지 않은 항목이 없습니다"}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="rounded-xl p-10 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Bell size={40} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                선택한 필터에 해당하는 알림이 없습니다.
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
              {filteredItems.map((item, index) => {
                const isUnread = !item.read && !readIds.has(item.id)
                const isCurrentApprovalPending =
                  decisionMutation.isPending &&
                  decisionMutation.variables?.id === (item.kind === "approval" ? item.approvalId : undefined)

                return (
                  <div
                    key={item.id}
                    className={cn("px-4 py-4", index > 0 && "border-t")}
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: isUnread ? "var(--bg-secondary)" : "var(--bg-elevated)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className="flex flex-1 items-start gap-3 text-left"
                      >
                        <div className="mt-0.5 shrink-0">{feedIcon(item)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn("text-sm", isUnread && "font-semibold")}
                              style={{ color: "var(--text-primary)" }}
                            >
                              {item.title}
                            </span>
                            {isUnread && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: "var(--color-teal-500)" }}
                              />
                            )}
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                            {item.body}
                          </p>
                        </div>
                      </button>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {timeAgo(item.createdAt)}
                        </span>

                        {item.kind === "approval" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              style={{ color: "#dc2626", borderColor: "rgba(220,38,38,0.25)" }}
                              disabled={isCurrentApprovalPending}
                              onClick={() => {
                                markAsRead(item.id)
                                decisionMutation.mutate({ id: item.approvalId, status: "rejected" })
                              }}
                            >
                              {isCurrentApprovalPending && decisionMutation.variables?.status === "rejected" ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                "거절"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs text-white"
                              style={{ backgroundColor: "#16a34a" }}
                              disabled={isCurrentApprovalPending}
                              onClick={() => {
                                markAsRead(item.id)
                                decisionMutation.mutate({ id: item.approvalId, status: "approved" })
                              }}
                            >
                              {isCurrentApprovalPending && decisionMutation.variables?.status === "approved" ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                "승인"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--color-teal-500)" }}
                          >
                            보기
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
