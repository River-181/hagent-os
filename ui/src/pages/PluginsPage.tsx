import { useQuery } from "@tanstack/react-query"
import { pluginsApi } from "@/api/plugins"
import { adaptersApi } from "@/api/adapters"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Workflow } from "lucide-react"
import { WorkspaceEmptyState, WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"

function tone(connected: boolean, inactive: boolean) {
  if (connected) return { bg: "var(--status-success-soft)", color: "var(--color-success)", label: "연결됨" }
  if (inactive) return { bg: "var(--status-warning-soft)", color: "var(--color-warning)", label: "확인 필요" }
  return { bg: "var(--bg-muted)", color: "var(--text-secondary)", label: "대기" }
}

export function PluginsPage() {
  const pluginsQuery = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
  })
  const adaptersQuery = useQuery({
    queryKey: [...queryKeys.plugins.all, "integrations-summary"],
    queryFn: () => adaptersApi.list(),
  })

  const plugins = pluginsQuery.data ?? []
  const integrations = adaptersQuery.data?.integrations ?? []
  const connectedIntegrations = integrations.filter((item: any) => item.connected).length

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="외부 연동"
        description="카카오, 텔레그램, 캘린더, 법령 조회처럼 학원 운영에 직접 연결되는 서비스를 점검합니다."
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              void pluginsQuery.refetch()
              void adaptersQuery.refetch()
            }}
          >
            <RefreshCcw size={14} />
            상태 새로고침
          </Button>
        }
      />

      <WorkspacePanel className="overflow-hidden">
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-4 text-xs"
          style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
        >
          <span>연동 항목 {plugins.length}개</span>
          <span>연결됨 {connectedIntegrations}개</span>
          <span>조치 필요 {Math.max(integrations.length - connectedIntegrations, 0)}개</span>
        </div>

        {pluginsQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 py-12 text-sm" style={{ color: "var(--text-tertiary)" }}>
            플러그인 상태를 불러오는 중...
          </div>
        ) : plugins.length === 0 ? (
          <WorkspaceEmptyState
            icon={<Workflow size={22} />}
            title="등록된 플러그인이 없습니다"
            description="연동이 추가되면 여기에서 연결 상태와 설치 여부를 확인할 수 있습니다."
            className="rounded-none border-0 bg-transparent"
          />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
            {plugins.map((plugin: any) => {
              const status = tone(plugin.connected, plugin.inactive)
              const installTone = plugin.installed
                ? { bg: "var(--status-success-soft)", color: "var(--color-success)", label: "설치됨" }
                : { bg: "var(--bg-muted)", color: "var(--text-secondary)", label: "미설치" }

              return (
                <div key={plugin.key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {plugin.label}
                        </p>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        {plugin.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className="border-0"
                          style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                        >
                          코드 {plugin.key}
                        </Badge>
                        <Badge
                          className="border-0"
                          style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                        >
                          구분 {plugin.category ?? "general"}
                        </Badge>
                        <Badge
                          className="border-0"
                          style={{ backgroundColor: installTone.bg, color: installTone.color }}
                        >
                          {installTone.label}
                        </Badge>
                      </div>
                    </div>
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
