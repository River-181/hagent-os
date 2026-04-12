import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { activityApi } from "@/api/activity"
import { queryKeys } from "@/lib/queryKeys"
import { Activity, Inbox } from "lucide-react"
import { WorkspaceEmptyState, WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"

function formatActivityTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
}

export function ActivityPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()

  useEffect(() => {
    setBreadcrumbs([{ label: "처리 이력" }])
  }, [setBreadcrumbs])

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.activity.list(selectedOrgId ?? ""),
    queryFn: () => activityApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="처리 이력"
        description="케이스, 승인, 에이전트 실행의 최근 변화를 한 흐름으로 확인합니다."
      />

      <WorkspacePanel className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
            로딩 중...
          </div>
        ) : isError ? (
          <div className="p-6 text-sm" style={{ color: "var(--color-danger)" }}>
            활동 이력을 불러오는 데 실패했습니다.
          </div>
        ) : events.length === 0 ? (
          <div className="p-6">
            <WorkspaceEmptyState
              icon={<Inbox size={40} />}
              title="활동 이력이 없습니다."
              description="새로운 케이스나 에이전트 실행이 생기면 여기서 시간순으로 보입니다."
            />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
            {events.map((item: any) => {
              const actor = item.actor?.name ?? item.actorName ?? item.agent?.name ?? item.agentName ?? "시스템"
              const action = item.action ?? item.event_type ?? item.eventType ?? "이벤트"
              const entityTitle = item.entity?.title ?? item.entityTitle ?? item.case?.title ?? item.caseTitle ?? null
              const timestamp = item.created_at ?? item.createdAt ?? item.at ?? item.timestamp ?? null

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-4 py-4 md:px-6"
                >
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--bg-subtle)", color: "var(--color-primary)" }}
                  >
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {entityTitle ? `${action} — ${entityTitle}` : action}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {actor}{timestamp ? ` · ${formatActivityTime(timestamp)}` : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </WorkspacePanel>
    </div>
  )
}
