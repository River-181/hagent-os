import { useQuery } from "@tanstack/react-query"
import { adaptersApi } from "@/api/adapters"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ToastContext"
import { Bot, Cable, Copy, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react"

function statusTone(item: { connected?: boolean; missingEnv?: string[] }) {
  if (item.connected) return { bg: "rgba(34,197,94,0.12)", color: "var(--color-success)", label: "connected" }
  if ((item.missingEnv ?? []).length > 0) return { bg: "rgba(245,158,11,0.12)", color: "#d97706", label: "missing credentials" }
  return { bg: "var(--bg-tertiary)", color: "var(--text-secondary)", label: "inactive" }
}

export function AdaptersPage() {
  const { success } = useToast()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.adapters.all,
    queryFn: () => adaptersApi.list(),
  })

  const adapters = data?.adapters ?? []
  const integrations = data?.integrations ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            어댑터 & 연동
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Codex/Claude 실행 계층과 외부 MCP·캘린더·메시징 상태를 한 번에 점검합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCcw size={14} className={isRefetching ? "animate-spin" : ""} />
          상태 새로고침
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="rounded-2xl border p-5"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center gap-2">
            <Bot size={16} style={{ color: "var(--color-teal-500)" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Runtime Adapters
            </h2>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            bootstrap과 agent execution에서 실제로 선택되는 모델 계층입니다.
          </p>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                어댑터 상태를 불러오는 중...
              </div>
            ) : (
              adapters.map((adapter: any) => {
                const tone = statusTone(adapter)
                return (
                  <div
                    key={adapter.key}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {adapter.label}
                        </div>
                        <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {adapter.description}
                        </div>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: tone.bg, color: tone.color }}>
                        {tone.label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                        default: {adapter.defaultModel}
                      </Badge>
                      {(adapter.availableModels ?? []).map((model: string) => (
                        <Badge key={model} className="border-0" style={{ backgroundColor: "rgba(20,184,166,0.08)", color: "var(--color-teal-500)" }}>
                          {model}
                        </Badge>
                      ))}
                    </div>
                    {(adapter.missingEnv ?? []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {adapter.missingEnv.map((envName: string) => (
                          <button
                            key={envName}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs"
                            style={{ backgroundColor: "rgba(245,158,11,0.10)", color: "#d97706" }}
                            onClick={async () => {
                              await navigator.clipboard.writeText(envName)
                              success(`${envName} copied`)
                            }}
                          >
                            {envName}
                            <Copy size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center gap-2">
            <Cable size={16} style={{ color: "var(--color-teal-500)" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              External Integrations
            </h2>
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            MCP, Calendar, Messaging readiness를 실행 전 점검합니다.
          </p>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                연동 상태를 불러오는 중...
              </div>
            ) : (
              integrations.map((integration: any) => {
                const tone = statusTone(integration)
                return (
                  <div
                    key={integration.key}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {integration.label}
                        </div>
                        <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {integration.description}
                        </div>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: tone.bg, color: tone.color }}>
                        {tone.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <ShieldCheck size={12} />
                      category: {integration.category}
                    </div>
                    {(integration.missingEnv ?? []).length > 0 ? (
                      <div className="mt-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: "#d97706" }}>
                          <TriangleAlert size={12} />
                          필요한 환경 변수
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {integration.missingEnv.map((envName: string) => (
                            <button
                              key={envName}
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs"
                              style={{ backgroundColor: "rgba(245,158,11,0.10)", color: "#d97706" }}
                              onClick={async () => {
                                await navigator.clipboard.writeText(envName)
                                success(`${envName} copied`)
                              }}
                            >
                              {envName}
                              <Copy size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs" style={{ color: "var(--color-success)" }}>
                        credentials ready
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
