import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Bot, CheckCircle2, ExternalLink, FolderTree, Loader2, Rocket, ShieldAlert, Trash2 } from "lucide-react"
import { agentsApi } from "@/api/agents"
import { capabilitiesApi } from "@/api/capabilities"
import { skillsApi } from "@/api/skills"
import { adaptersApi } from "@/api/adapters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { queryKeys } from "@/lib/queryKeys"
import { useToast } from "@/context/ToastContext"

interface CapabilitySuggestion {
  slug: string
  kind?: "skill" | "pack" | "system" | "integration" | "runtime"
  label?: string
  reason?: string
}

interface CapabilityWorkspacePanelProps {
  title: string
  description: string
  orgId?: string | null
  orgPrefix?: string
  suggestions: CapabilitySuggestion[]
  availableAgents?: Array<{ id: string; name: string; agentType?: string }>
  lockedAgentId?: string | null
}

function capabilityTypeLabel(kind?: string) {
  if (kind === "system") return "설정 스킬"
  if (kind === "pack") return "스킬 묶음"
  if (kind === "integration") return "연결"
  if (kind === "runtime") return "실행기"
  return "스킬"
}

function capabilityCanonicalKey(item: any) {
  if (item?.forkOf?.namespace && item?.forkOf?.slug) {
    return `${item.capabilityType}:${item.forkOf.namespace}/${item.forkOf.slug}`
  }
  return `${item.capabilityType}:${item.slug}`
}

function capabilityScore(item: any) {
  let score = 0
  if (item?.installed) score += 100
  if (item?.namespace === "hagent") score += 50
  if (item?.sourceStatus === "local") score += 30
  if (item?.ready) score += 10
  return score
}

function dedupeCapabilities(items: any[]) {
  const preferred = new Map<string, any>()
  for (const item of items) {
    const key = capabilityCanonicalKey(item)
    const current = preferred.get(key)
    if (!current || capabilityScore(item) > capabilityScore(current)) {
      preferred.set(key, item)
    }
  }
  return Array.from(preferred.values())
}

function PropertyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <div className="text-right text-sm" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  )
}

export function CapabilityWorkspacePanel({
  title,
  description,
  orgId,
  orgPrefix,
  suggestions,
  availableAgents = [],
  lockedAgentId,
}: CapabilityWorkspacePanelProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selectedKey, setSelectedKey] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState(lockedAgentId ?? "")

  const listQuery = useQuery({
    queryKey: [...queryKeys.capabilities.all, orgId, "workspace-panel"],
    queryFn: () => capabilitiesApi.list(orgId ?? undefined),
    enabled: Boolean(orgId),
  })

  const agentsQuery = useQuery<any[]>({
    queryKey: [...queryKeys.agents.list(orgId ?? ""), "workspace-panel"],
    queryFn: () => agentsApi.list(orgId!),
    enabled: Boolean(orgId) && availableAgents.length === 0,
  })

  const agents = availableAgents.length > 0 ? availableAgents : (agentsQuery.data ?? [])

  const relevantCapabilities = useMemo(() => {
    const suggestionMap = new Map(suggestions.map((item) => [item.slug, item]))
    const filtered = dedupeCapabilities(listQuery.data?.capabilities ?? []).filter((item: any) => suggestionMap.has(item.slug))
    return filtered
      .map((item: any) => ({ ...item, suggestion: suggestionMap.get(item.slug) }))
      .sort((a: any, b: any) => suggestions.findIndex((item) => item.slug === a.slug) - suggestions.findIndex((item) => item.slug === b.slug))
  }, [listQuery.data?.capabilities, suggestions])

  useEffect(() => {
    if (!selectedKey && relevantCapabilities.length > 0) {
      setSelectedKey(`${relevantCapabilities[0].capabilityType}:${relevantCapabilities[0].slug}`)
    }
  }, [relevantCapabilities, selectedKey])

  useEffect(() => {
    if (lockedAgentId) {
      setSelectedAgentId(lockedAgentId)
      return
    }
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agents, lockedAgentId, selectedAgentId])

  const selectedMeta = useMemo(
    () => relevantCapabilities.find((item: any) => `${item.capabilityType}:${item.slug}` === selectedKey) ?? null,
    [relevantCapabilities, selectedKey],
  )

  const detailQuery = useQuery({
    queryKey: [...queryKeys.capabilities.detail(selectedMeta?.capabilityType ?? "__none__", selectedMeta?.slug ?? "__none__"), orgId, "workspace-panel"],
    queryFn: () => capabilitiesApi.get(selectedMeta!.capabilityType, selectedMeta!.slug, orgId ?? undefined),
    enabled: Boolean(selectedMeta && orgId),
  })

  const detail = detailQuery.data
  const mountedAgentIds = new Set((detail?.mountedAgents ?? []).map((item: any) => item.agentId))
  const selectedAgentMounted = selectedAgentId ? mountedAgentIds.has(selectedAgentId) : false

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
      selectedMeta
        ? queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.detail(selectedMeta.capabilityType, selectedMeta.slug) })
        : Promise.resolve(),
    ])
  }

  const installMutation = useMutation({
    mutationFn: () => skillsApi.install(orgId!, selectedMeta!.slug),
    onSuccess: async () => {
      toast.success("기관에 설치했습니다.")
      await invalidate()
    },
    onError: () => toast.error("설치에 실패했습니다."),
  })

  const uninstallMutation = useMutation({
    mutationFn: () => skillsApi.uninstall(orgId!, selectedMeta!.slug),
    onSuccess: async () => {
      toast.success("기관에서 제거했습니다.")
      await invalidate()
    },
    onError: () => toast.error("제거에 실패했습니다."),
  })

  const forkMutation = useMutation({
    mutationFn: () => skillsApi.fork(selectedMeta!.slug),
    onSuccess: async () => {
      toast.success("`hagent` 네임스페이스로 포크했습니다.")
      await invalidate()
    },
    onError: () => toast.error("포크에 실패했습니다."),
  })

  const testMutation = useMutation({
    mutationFn: () => adaptersApi.test(selectedMeta!.slug, orgId ?? undefined),
    onSuccess: () => toast.success("연결 테스트를 완료했습니다."),
    onError: () => toast.error("연결 테스트에 실패했습니다."),
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      const current = await agentsApi.listSkills(selectedAgentId)
      const next = Array.isArray(current) ? current.slice() : []
      if (!next.some((item: any) => item.slug === selectedMeta!.slug)) {
        next.push({ slug: selectedMeta!.slug, enabled: true, mountOrder: next.length })
      }
      await agentsApi.updateSkills(selectedAgentId, next)
    },
    onSuccess: async () => {
      toast.success("에이전트에 배정했습니다.")
      await invalidate()
    },
    onError: () => toast.error("배정에 실패했습니다."),
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const current = await agentsApi.listSkills(selectedAgentId)
      const next = (Array.isArray(current) ? current : [])
        .filter((item: any) => item.slug !== selectedMeta!.slug)
        .map((item: any, index: number) => ({
          slug: item.slug,
          enabled: item.enabled ?? true,
          mountOrder: index,
        }))
      await agentsApi.updateSkills(selectedAgentId, next)
    },
    onSuccess: async () => {
      toast.success("에이전트에서 제거했습니다.")
      await invalidate()
    },
    onError: () => toast.error("제거에 실패했습니다."),
  })

  const duplicateCount = useMemo(() => {
    if (!selectedMeta) return 0
    return (listQuery.data?.capabilities ?? []).filter((item: any) => {
      if (item.slug === selectedMeta.slug && item.capabilityType === selectedMeta.capabilityType) return false
      return capabilityCanonicalKey(item) === capabilityCanonicalKey(selectedMeta)
    }).length
  }, [listQuery.data?.capabilities, selectedMeta])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{description}</p>
      </div>

      {relevantCapabilities.length === 0 ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
          연결할 스킬 후보가 아직 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {relevantCapabilities.map((item: any) => {
            const active = selectedKey === `${item.capabilityType}:${item.slug}`
            return (
              <button
                key={`${item.capabilityType}:${item.slug}`}
                type="button"
                onClick={() => setSelectedKey(`${item.capabilityType}:${item.slug}`)}
                className="w-full rounded-2xl border px-3 py-3 text-left"
                style={{
                  borderColor: active ? "rgba(20,184,166,0.24)" : "var(--border-default)",
                  backgroundColor: active ? "rgba(20,184,166,0.08)" : "var(--bg-elevated)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {item.suggestion?.label ?? item.displayName}
                    </div>
                    <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {item.suggestion?.reason ?? item.summary}
                    </div>
                  </div>
                  <Badge className="border-0" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
                    {capabilityTypeLabel(item.capabilityType)}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {detail ? (
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{detail.displayName}</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{detail.summary}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                if (!orgPrefix) return
                if (detail.capabilityType === "integration" || detail.capabilityType === "runtime") {
                  navigate(`/${orgPrefix}/settings#integrations`)
                  return
                }
                navigate(`/${orgPrefix}/skills/${detail.slug}`)
              }}
            >
              <ExternalLink size={13} />
              보기
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border-0" style={{ backgroundColor: detail.ready ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: detail.ready ? "var(--color-success)" : "#d97706" }}>
              {detail.ready ? "사용 가능" : "설정 필요"}
            </Badge>
            <Badge className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
              {detail.installed ? "설치됨" : "미설치"}
            </Badge>
            {detail.sourceStatus ? (
              <Badge className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
                {detail.sourceStatus}
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 space-y-1">
            <PropertyRow label="필요한 연결" value={(detail.runtime?.requiredIntegrations ?? []).length > 0 ? (detail.runtime.requiredIntegrations.join(", ")) : "없음"} />
            <PropertyRow label="연결 상태" value={`${(detail.runtimeHealth ?? []).filter((item: any) => item.ready).length}/${(detail.runtimeHealth ?? []).length || 0}`} />
            <PropertyRow label="추천 에이전트" value={(detail.recommendedAgents ?? []).length > 0 ? detail.recommendedAgents.join(", ") : "없음"} />
            <PropertyRow label="진입점" value={(detail.recommendedEntrypoints ?? []).length > 0 ? detail.recommendedEntrypoints.join(", ") : "없음"} />
            <PropertyRow label="중복 후보" value={`${duplicateCount}개`} />
            {detail.curatedSource ? (
              <PropertyRow
                label="Curated"
                value={
                  <div className="space-y-1">
                    <div>{detail.curatedSource.label}</div>
                    <a href={detail.curatedSource.repo} target="_blank" rel="noreferrer" style={{ color: "var(--color-teal-500)" }}>
                      upstream
                    </a>
                  </div>
                }
              />
            ) : null}
            {detail.forkInfo ? (
              <PropertyRow label="Forked From" value={`${detail.forkInfo.sourceNamespace}/${detail.forkInfo.sourceSlug}`} />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && !detail.installed ? (
              <Button size="sm" className="gap-1.5" onClick={() => installMutation.mutate()} disabled={installMutation.isPending || !orgId}>
                {installMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
                설치
              </Button>
            ) : null}
            {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && detail.installed ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => uninstallMutation.mutate()} disabled={uninstallMutation.isPending}>
                {uninstallMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                제거
              </Button>
            ) : null}
            {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && detail.readOnly ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => forkMutation.mutate()} disabled={forkMutation.isPending}>
                {forkMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <FolderTree size={13} />}
                포크
              </Button>
            ) : null}
            {(detail.capabilityType === "integration" || detail.capabilityType === "runtime") ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                {testMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} />}
                테스트
              </Button>
            ) : null}
            {((detail.runtime?.requiredIntegrations ?? []).length > 0 || detail.capabilityType === "integration" || detail.capabilityType === "runtime") ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => orgPrefix && navigate(`/${orgPrefix}/settings#integrations`)}>
                <ExternalLink size={13} />
                설정으로 이동
              </Button>
            ) : null}
          </div>

          {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") ? (
            <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>에이전트 배정</p>
              {!lockedAgentId ? (
                <div className="mt-3">
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="w-full" style={{ backgroundColor: "var(--bg-secondary)" }}>
                      <SelectValue placeholder="에이전트를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {selectedAgentId ? (selectedAgentMounted ? "장착됨" : "미장착") : "대상 선택 필요"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => assignMutation.mutate()} disabled={!selectedAgentId || assignMutation.isPending || selectedAgentMounted}>
                    {assignMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                    배정
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeMutation.mutate()} disabled={!selectedAgentId || removeMutation.isPending || !selectedAgentMounted}>
                    {removeMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    제거
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {(detail.runtimeHealth ?? []).length > 0 ? (
            <div className="mt-4 space-y-2">
              {(detail.runtimeHealth ?? []).map((item: any) => (
                <div key={item.key} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                    <CheckCircle2 size={14} style={{ color: item.ready ? "var(--color-success)" : "#d97706" }} />
                  </div>
                  {item.missingEnv?.length > 0 ? (
                    <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {item.missingEnv.join(", ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
