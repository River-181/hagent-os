import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { activityApi } from "@/api/activity"
import { queryKeys } from "@/lib/queryKeys"
import { Activity, Inbox } from "lucide-react"

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
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        처리 이력
      </h1>

      {isLoading ? (
        <div
          className="rounded-xl p-8 flex items-center justify-center"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            로딩 중...
          </p>
        </div>
      ) : isError ? (
        <div
          className="rounded-xl p-8 flex items-center justify-center"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-danger)" }}>
            활동 이력을 불러오는 데 실패했습니다.
          </p>
        </div>
      ) : events.length === 0 ? (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <Inbox size={40} style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            활동 이력이 없습니다.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {events.map((item: any, i: number) => {
            const actor = item.actor?.name ?? item.actorName ?? item.agent?.name ?? item.agentName ?? "시스템"
            const action = item.action ?? item.event_type ?? item.eventType ?? "이벤트"
            const entityTitle = item.entity?.title ?? item.entityTitle ?? item.case?.title ?? item.caseTitle ?? null
            const timestamp = item.created_at ?? item.createdAt ?? item.at ?? item.timestamp ?? null
            return (
              <div
                key={item.id ?? i}
                className="flex items-center gap-4 px-5 py-4"
                style={{
                  borderBottom: i < events.length - 1 ? "1px solid var(--border-default)" : undefined,
                }}
              >
                <Activity size={16} style={{ color: "var(--color-teal-500)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {entityTitle ? `${action} — ${entityTitle}` : action}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {actor}{timestamp ? ` · ${timestamp}` : ""}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
