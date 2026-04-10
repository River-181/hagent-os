import { useQuery } from "@tanstack/react-query"
import { pluginsApi } from "@/api/plugins"
import { adaptersApi } from "@/api/adapters"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cpu, RefreshCcw, ShieldCheck, Workflow } from "lucide-react"

function tone(connected: boolean, inactive: boolean) {
  if (connected) return { bg: "rgba(34,197,94,0.12)", color: "var(--color-success)", label: "connected" }
  if (inactive) return { bg: "rgba(245,158,11,0.12)", color: "#d97706", label: "attention" }
  return { bg: "var(--bg-tertiary)", color: "var(--text-secondary)", label: "registry" }
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
            플러그인
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            bootstrap, skills, audit, integration manager가 현재 control plane에서 어떤 역할을 하는지 확인합니다.
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
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Loaded Plugins</span>
          </div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{plugins.length}</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: "var(--color-teal-500)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Connected Integrations</span>
          </div>
          <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{connectedIntegrations}</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <Workflow size={16} style={{ color: "var(--color-teal-500)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Core Path</span>
          </div>
          <div className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            bootstrap → dispatch → runs → approvals → skills/integrations
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
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    key: {plugin.key}
                  </Badge>
                  <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    category: {plugin.category ?? "general"}
                  </Badge>
                  <Badge className="border-0" style={{ backgroundColor: plugin.installed ? "rgba(34,197,94,0.12)" : "var(--bg-tertiary)", color: plugin.installed ? "var(--color-success)" : "var(--text-secondary)" }}>
                    {plugin.installed ? "installed" : "not installed"}
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
