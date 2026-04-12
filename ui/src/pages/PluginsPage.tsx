import { useQuery } from "@tanstack/react-query"
import { pluginsApi } from "@/api/plugins"
import { adaptersApi } from "@/api/adapters"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cpu, RefreshCcw, ShieldCheck, Workflow } from "lucide-react"

function tone(connected: boolean, inactive: boolean) {
  if (connected) return { bg: "rgba(34,197,94,0.12)", color: "var(--color-success)", label: "연결됨" }
  if (inactive) return { bg: "rgba(245,158,11,0.12)", color: "#d97706", label: "확인 필요" }
  return { bg: "var(--bg-tertiary)", color: "var(--text-secondary)", label: "대기" }
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            외부 연동
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            카카오, 텔레그램, 캘린더, 법령 조회처럼 학원 운영에 직접 연결되는 서비스를 한 곳에서 점검합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { void pluginsQuery.refetch(); void adaptersQuery.refetch() }}>
          <RefreshCcw size={14} />
          상태 새로고침
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <Cpu size={16} style={{ color: "var(--color-teal-500)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>연동 항목</span>
          </div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{plugins.length}</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: "var(--color-teal-500)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>연결됨</span>
          </div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{connectedIntegrations}</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <Workflow size={16} style={{ color: "var(--color-teal-500)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>조치 필요</span>
          </div>
          <div className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {Math.max(integrations.length - connectedIntegrations, 0)}개 항목은 키 입력 또는 연결 확인이 더 필요합니다.
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
      >
        <div className="flex items-center gap-2">
          <Workflow size={16} style={{ color: "var(--color-teal-500)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>이 화면에서 보는 것</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-secondary)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>연동 서비스</p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              카카오, 텔레그램, 캘린더, 법령 조회처럼 실제 업무 결과를 밖으로 보내거나 가져오는 서비스입니다.
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-secondary)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>판단 기준</p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              연결됨은 바로 사용 가능, 확인 필요는 키 또는 계정 점검 필요, 대기는 아직 붙이지 않은 상태입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pluginsQuery.isLoading ? (
          <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
            플러그인 상태를 불러오는 중...
          </div>
        ) : (
          plugins.map((plugin: any) => {
            const status = tone(plugin.connected, plugin.inactive)
            return (
              <div key={plugin.key} className="rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {plugin.label}
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {plugin.description}
                    </p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color }}>
                    {plugin.connected ? "연결됨" : plugin.inactive ? "확인 필요" : "대기"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    코드: {plugin.key}
                  </Badge>
                  <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    구분: {plugin.category ?? "general"}
                  </Badge>
                  <Badge className="border-0" style={{ backgroundColor: plugin.installed ? "rgba(34,197,94,0.12)" : "var(--bg-tertiary)", color: plugin.installed ? "var(--color-success)" : "var(--text-secondary)" }}>
                    {plugin.installed ? "설치됨" : "미설치"}
                  </Badge>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
