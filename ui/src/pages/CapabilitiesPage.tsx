import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { capabilitiesApi } from "@/api/capabilities"
import { skillsApi } from "@/api/skills"
import { adaptersApi } from "@/api/adapters"
import { agentsApi } from "@/api/agents"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { useToast } from "@/context/ToastContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryKeys } from "@/lib/queryKeys"
import {
  Bot,
  Cable,
  CheckCircle2,
  Cpu,
  FileText,
  FolderTree,
  Loader2,
  PackagePlus,
  Puzzle,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react"

type CapabilityTab = "all" | "system" | "pack" | "skill" | "integration" | "runtime"

const TAB_ORDER: Array<{ value: CapabilityTab; label: string }> = [
  { value: "all", label: "전체" },
  { value: "system", label: "시스템" },
  { value: "pack", label: "묶음" },
  { value: "skill", label: "스킬" },
  { value: "integration", label: "연동" },
  { value: "runtime", label: "런타임" },
]

function capabilityIcon(kind: string) {
  if (kind === "system") return <Sparkles size={16} />
  if (kind === "pack") return <PackagePlus size={16} />
  if (kind === "integration") return <Cable size={16} />
  if (kind === "runtime") return <Cpu size={16} />
  return <Puzzle size={16} />
}

function capabilityTypeLabel(kind: string) {
  if (kind === "system") return "시스템"
  if (kind === "pack") return "묶음"
  if (kind === "integration") return "연동"
  if (kind === "runtime") return "런타임"
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

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-20 shrink-0 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function CapabilityCard({
  item,
  active,
  onClick,
}: {
  item: any
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all"
      style={{
        background: active
          ? "linear-gradient(180deg, rgba(20,184,166,0.12), rgba(15,23,42,0.02) 90%)"
          : "var(--bg-elevated)",
        border: `1px solid ${active ? "rgba(20,184,166,0.30)" : "var(--border-default)"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: active ? "rgba(20,184,166,0.14)" : "var(--bg-secondary)",
            color: active ? "var(--color-teal-500)" : "var(--text-tertiary)",
          }}
        >
          {capabilityIcon(item.capabilityType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {item.displayName}
            </p>
            <Badge className="border-0 text-[11px]" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
              {capabilityTypeLabel(item.capabilityType)}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
            {item.summary}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Badge
              className="border-0 text-[11px]"
              style={{
                backgroundColor: item.ready ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                color: item.ready ? "var(--color-success)" : "#d97706",
              }}
            >
              {item.ready ? "사용 가능" : "설정 필요"}
            </Badge>
            {typeof item.sourceBadge === "string" ? (
              <Badge className="border-0 text-[11px]" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
                {item.sourceBadge}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

function CapabilityProperties({
  detail,
  allCapabilities,
  orgAgents,
  selectedAgentId,
  onSelectedAgentIdChange,
  onAssign,
  onRemove,
  onInstall,
  onUninstall,
  onTest,
}: {
  detail: any
  allCapabilities: any[]
  orgAgents: any[]
  selectedAgentId: string
  onSelectedAgentIdChange: (value: string) => void
  onAssign: () => void
  onRemove: () => void
  onInstall: () => void
  onUninstall: () => void
  onTest: () => void
}) {
  const duplicateCandidates = allCapabilities.filter((item) => {
    if (item.slug === detail.slug && item.capabilityType === detail.capabilityType) return false
    return capabilityCanonicalKey(item) === capabilityCanonicalKey(detail)
  })
  const mountedAgentIds = new Set((detail.mountedAgents ?? []).map((item: any) => item.agentId))
  const selectedAgentMounted = selectedAgentId ? mountedAgentIds.has(selectedAgentId) : false

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          역량 속성
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          기관 설치, 에이전트 배정, 중복 후보를 이 패널에서 정리합니다.
        </p>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
        <PropertyRow label="종류">
          <Badge className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {capabilityTypeLabel(detail.capabilityType)}
          </Badge>
        </PropertyRow>
        <PropertyRow label="기관 설치">
          <div className="flex flex-wrap gap-2">
            {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && !detail.installed ? (
              <Button size="sm" onClick={onInstall}>설치</Button>
            ) : null}
            {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && detail.installed ? (
              <Button size="sm" variant="outline" onClick={onUninstall}>제거</Button>
            ) : null}
            {(detail.capabilityType === "integration" || detail.capabilityType === "runtime") ? (
              <Button size="sm" variant="outline" onClick={onTest}>연결 테스트</Button>
            ) : null}
          </div>
        </PropertyRow>
        <PropertyRow label="중복 후보">
          <div className="space-y-2">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {duplicateCandidates.length}개
            </span>
            {duplicateCandidates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {duplicateCandidates.map((item) => (
                  <Badge key={`${item.capabilityType}/${item.slug}`} className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    {item.displayName}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </PropertyRow>
      </div>

      {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") ? (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
            에이전트 배정
          </p>
          <div className="mt-3 space-y-3">
            <PropertyRow label="대상">
              <Select value={selectedAgentId} onValueChange={onSelectedAgentIdChange}>
                <SelectTrigger className="w-full" style={{ backgroundColor: "var(--bg-elevated)" }}>
                  <SelectValue placeholder="에이전트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {orgAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>
            <PropertyRow label="장착 상태">
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {selectedAgentId ? (selectedAgentMounted ? "장착됨" : "미장착") : "선택 필요"}
              </span>
            </PropertyRow>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onAssign} disabled={!selectedAgentId}>
                배정
              </Button>
              <Button size="sm" variant="outline" onClick={onRemove} disabled={!selectedAgentId || !selectedAgentMounted}>
                <Trash2 size={14} />
                제거
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CapabilitiesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { setPanelContent, openPanel, closePanel } = usePanel()
  const { orgPrefix, kind, slug } = useParams<{ orgPrefix: string; kind?: string; slug?: string }>()
  const { selectedOrgId } = useOrganization()
  const { setBreadcrumbs } = useBreadcrumbs()
  const [activeTab, setActiveTab] = useState<CapabilityTab>("all")
  const [search, setSearch] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState("")

  useEffect(() => {
    setBreadcrumbs([
      { label: "역량", href: `/${orgPrefix}/capabilities` },
      ...(slug ? [{ label: slug }] : []),
    ])
  }, [orgPrefix, setBreadcrumbs, slug])

  const listQuery = useQuery({
    queryKey: [...queryKeys.capabilities.all, selectedOrgId],
    queryFn: () => capabilitiesApi.list(selectedOrgId ?? undefined),
    enabled: Boolean(selectedOrgId),
  })

  const filtered = useMemo(() => {
    const all = dedupeCapabilities(listQuery.data?.capabilities ?? [])
    const searchLower = search.trim().toLowerCase()
    return all.filter((item: any) => {
      const kindMatch = activeTab === "all" ? true : item.capabilityType === activeTab
      const searchMatch =
        searchLower.length === 0 ||
        [item.displayName, item.summary, item.slug, item.capabilityType].some((value) =>
          String(value ?? "").toLowerCase().includes(searchLower),
        )
      return kindMatch && searchMatch
    })
  }, [activeTab, listQuery.data?.capabilities, search])

  useEffect(() => {
    if (!kind || !slug) {
      const first = filtered[0]
      if (first && orgPrefix) {
        navigate(`/${orgPrefix}/capabilities/${first.capabilityType}/${first.slug}`, { replace: true })
      }
    }
  }, [filtered, kind, navigate, orgPrefix, slug])

  useEffect(() => {
    setSelectedAgentId("")
  }, [slug])

  const detailQuery = useQuery({
    queryKey: queryKeys.capabilities.detail(kind ?? "__none__", slug ?? "__none__"),
    queryFn: () => capabilitiesApi.get(kind!, slug!, selectedOrgId ?? undefined),
    enabled: Boolean(kind && slug),
  })

  const { data: orgAgents = [] } = useQuery<any[]>({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: Boolean(selectedOrgId),
  })

  const installMutation = useMutation({
    mutationFn: () => skillsApi.install(selectedOrgId!, slug!),
    onSuccess: async () => {
      toast.success("기관에 설치했습니다.")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.detail(kind ?? "__none__", slug ?? "__none__") }),
      ])
    },
    onError: () => toast.error("설치에 실패했습니다."),
  })

  const uninstallMutation = useMutation({
    mutationFn: () => skillsApi.uninstall(selectedOrgId!, slug!),
    onSuccess: async () => {
      toast.success("기관에서 제거했습니다.")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.detail(kind ?? "__none__", slug ?? "__none__") }),
      ])
    },
    onError: () => toast.error("제거에 실패했습니다."),
  })

  const forkMutation = useMutation({
    mutationFn: () => skillsApi.fork(slug!),
    onSuccess: async () => {
      toast.success("`hagent` 네임스페이스로 포크했습니다.")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.detail(kind ?? "__none__", slug ?? "__none__") }),
      ])
    },
    onError: () => toast.error("포크에 실패했습니다."),
  })

  const adapterTestMutation = useMutation({
    mutationFn: (key: string) => adaptersApi.test(key, selectedOrgId ?? undefined),
    onSuccess: () => toast.success("연결 테스트를 완료했습니다."),
    onError: () => toast.error("연결 테스트에 실패했습니다."),
  })

  const equipMutation = useMutation({
    mutationFn: async () => {
      const detail = detailQuery.data
      const targetAgent = detail?.recommendedAgents?.[0]
      if (!targetAgent || !selectedOrgId || !slug) return
      const agents = await agentsApi.list(selectedOrgId)
      const match = agents.find((agent: any) => agent.agentType === targetAgent)
      if (!match) throw new Error("추천 에이전트를 찾지 못했습니다.")
      const current = await agentsApi.listSkills(match.id)
      const next = Array.isArray(current) ? current.slice() : []
      if (!next.some((item: any) => item.slug === slug)) {
        next.push({ slug, enabled: true, mountOrder: next.length })
      }
      await agentsApi.updateSkills(match.id, next)
      return match
    },
    onSuccess: (agent) => {
      if (agent) toast.success(`${agent.name} 에 capability를 장착했습니다.`)
    },
    onError: () => toast.error("추천 에이전트 장착에 실패했습니다."),
  })

  const assignMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const current = await agentsApi.listSkills(agentId)
      const next = Array.isArray(current) ? current.slice() : []
      if (!next.some((item: any) => item.slug === slug)) {
        next.push({ slug, enabled: true, mountOrder: next.length })
      }
      await agentsApi.updateSkills(agentId, next)
    },
    onSuccess: async () => {
      toast.success("선택한 에이전트에 배정했습니다.")
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.detail(kind ?? "__none__", slug ?? "__none__") })
    },
    onError: () => toast.error("에이전트 배정에 실패했습니다."),
  })

  const removeAssignmentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const current = await agentsApi.listSkills(agentId)
      const next = (Array.isArray(current) ? current : [])
        .filter((item: any) => item.slug !== slug)
        .map((item: any, index: number) => ({
          slug: item.slug,
          enabled: item.enabled ?? true,
          mountOrder: index,
        }))
      await agentsApi.updateSkills(agentId, next)
    },
    onSuccess: async () => {
      toast.success("선택한 에이전트에서 제거했습니다.")
      await queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.detail(kind ?? "__none__", slug ?? "__none__") })
    },
    onError: () => toast.error("에이전트 제거에 실패했습니다."),
  })

  const detail = detailQuery.data

  useEffect(() => {
    if (!selectedAgentId && orgAgents.length > 0) {
      setSelectedAgentId(detail?.mountedAgents?.[0]?.agentId ?? orgAgents[0].id)
    }
  }, [detail?.mountedAgents, orgAgents, selectedAgentId])

  useEffect(() => {
    if (!detail) return
    setPanelContent(
      <CapabilityProperties
        detail={detail}
        allCapabilities={listQuery.data?.capabilities ?? []}
        orgAgents={orgAgents}
        selectedAgentId={selectedAgentId}
        onSelectedAgentIdChange={setSelectedAgentId}
        onAssign={() => selectedAgentId && assignMutation.mutate(selectedAgentId)}
        onRemove={() => selectedAgentId && removeAssignmentMutation.mutate(selectedAgentId)}
        onInstall={() => installMutation.mutate()}
        onUninstall={() => uninstallMutation.mutate()}
        onTest={() => detail.slug && adapterTestMutation.mutate(detail.slug)}
      />,
    )
    openPanel()
    return () => {
      setPanelContent(null)
      closePanel()
    }
  }, [
    adapterTestMutation,
    assignMutation,
    closePanel,
    detail,
    installMutation,
    listQuery.data?.capabilities,
    openPanel,
    orgAgents,
    removeAssignmentMutation,
    selectedAgentId,
    setPanelContent,
    uninstallMutation,
  ])

  return (
    <div className="space-y-6">
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(20,184,166,0.18), rgba(15,23,42,0.02) 55%), var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge className="border-0 text-xs" style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "var(--color-teal-500)" }}>
              운영 제어면
            </Badge>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
                역량
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                업무 스킬, 외부 연동, AI 런타임, 학원 운영 pack을 한 흐름에서 설치·설정·장착·점검합니다.
                운영자는 여기서 준비 상태를 확인하고 case, project, agent에 바로 연결할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: "var(--text-tertiary)" }}>
              <span>스킬 {listQuery.data?.stats?.skills ?? 0}</span>
              <span>•</span>
              <span>시스템 {listQuery.data?.stats?.systems ?? 0}</span>
              <span>•</span>
              <span>묶음 {listQuery.data?.stats?.packs ?? 0}</span>
              <span>•</span>
              <span>연동 {listQuery.data?.stats?.integrations ?? 0}</span>
              <span>•</span>
              <span>런타임 {listQuery.data?.stats?.runtimes ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className="rounded-3xl overflow-hidden"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          <div className="p-4 border-b" style={{ borderColor: "var(--border-default)" }}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CapabilityTab)}>
              <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto">
                {TAB_ORDER.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div
              className="mt-3 flex items-center gap-2 rounded-xl px-3"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
            >
              <Search size={14} style={{ color: "var(--text-tertiary)" }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="역량 검색"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-21rem)] min-h-[540px]">
            <div className="p-4 space-y-3">
              {listQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
                  <Loader2 size={16} className="animate-spin" />
                  역량 카탈로그를 불러오는 중...
                </div>
              ) : (
                filtered.map((item: any) => (
                  <CapabilityCard
                    key={`${item.capabilityType}/${item.slug}`}
                    item={item}
                    active={kind === item.capabilityType && slug === item.slug}
                    onClick={() => orgPrefix && navigate(`/${orgPrefix}/capabilities/${item.capabilityType}/${item.slug}`)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <section
          className="rounded-3xl overflow-hidden"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
        >
          {!detail || detailQuery.isLoading ? (
            <div className="h-full min-h-[720px] flex flex-col items-center justify-center gap-3">
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                역량 상세 정보를 불러오는 중...
              </p>
            </div>
          ) : (
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="border-0 text-xs" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
                      {capabilityTypeLabel(detail.capabilityType)}
                    </Badge>
                    <Badge
                      className="border-0 text-xs"
                      style={{
                        backgroundColor: detail.ready ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                        color: detail.ready ? "var(--color-success)" : "#d97706",
                      }}
                    >
                      {detail.ready ? "사용 가능" : "설정 필요"}
                    </Badge>
                    {detail.sourceStatus ? (
                      <Badge className="border-0 text-xs" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>
                        {detail.sourceStatus}
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                      {detail.displayName}
                    </h2>
                    <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                      {detail.summary}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && !detail.installed ? (
                    <Button disabled={installMutation.isPending || !selectedOrgId} className="gap-2" onClick={() => installMutation.mutate()}>
                      {installMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                      기관에 설치
                    </Button>
                  ) : null}
                  {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && detail.installed ? (
                    <Button variant="outline" className="gap-2" disabled={uninstallMutation.isPending} onClick={() => uninstallMutation.mutate()}>
                      {uninstallMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      기관에서 제거
                    </Button>
                  ) : null}
                  {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && detail.readOnly ? (
                    <Button variant="outline" className="gap-2" disabled={forkMutation.isPending} onClick={() => forkMutation.mutate()}>
                      {forkMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <FolderTree size={15} />}
                      hagent 포크
                    </Button>
                  ) : null}
                  {detail.capabilityType === "integration" || detail.capabilityType === "runtime" ? (
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={adapterTestMutation.isPending}
                      onClick={() => adapterTestMutation.mutate(detail.slug)}
                    >
                      {adapterTestMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      연결 테스트
                    </Button>
                  ) : null}
                  {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") && (detail.recommendedAgents?.length ?? 0) > 0 ? (
                    <Button variant="outline" className="gap-2" disabled={equipMutation.isPending} onClick={() => equipMutation.mutate()}>
                      {equipMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
                      추천 에이전트 장착
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "종류", value: capabilityTypeLabel(detail.capabilityType), icon: capabilityIcon(detail.capabilityType) },
                  { label: "장착 에이전트", value: String(detail.mountedAgents?.length ?? 0), icon: <Bot size={16} /> },
                  { label: "추천 진입점", value: String(detail.recommendedEntrypoints?.length ?? 0), icon: <Zap size={16} /> },
                  { label: "파일 수", value: String(detail.fileTree?.length ?? 0), icon: <FileText size={16} /> },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {card.icon}
                      {card.label}
                    </div>
                    <p className="mt-3 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    <Sparkles size={16} />
                    역량 구성
                  </div>
                  <div className="mt-4 space-y-4">
                    {(detail.packIncludes?.skills?.length ?? 0) > 0 ? (
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>스킬</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {detail.packIncludes.skills.map((entry: string) => (
                            <Badge key={entry} className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(detail.packIncludes?.integrations?.length ?? 0) > 0 ? (
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>연동</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {detail.packIncludes.integrations.map((entry: string) => (
                            <Badge key={entry} className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(detail.packIncludes?.runtimes?.length ?? 0) > 0 ? (
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>런타임</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {detail.packIncludes.runtimes.map((entry: string) => (
                            <Badge key={entry} className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(detail.recommendedAgents?.length ?? 0) > 0 ? (
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>추천 에이전트</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {detail.recommendedAgents.map((entry: string) => (
                            <Badge key={entry} className="border-0" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(detail.recommendedEntrypoints?.length ?? 0) > 0 ? (
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>추천 진입점</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {detail.recommendedEntrypoints.map((entry: string) => (
                            <Badge key={entry} className="border-0" style={{ backgroundColor: "rgba(20,184,166,0.10)", color: "var(--color-teal-500)" }}>
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {detail.ready ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    실행 준비 상태
                  </div>
                  <div className="mt-4 space-y-3">
                    {(detail.runtimeHealth ?? []).length > 0 ? (
                      detail.runtimeHealth.map((item: any) => (
                        <div key={item.key} className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--bg-elevated)" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {item.label}
                            </span>
                            <Badge
                              className="border-0 text-xs"
                              style={{
                                backgroundColor: item.ready ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                color: item.ready ? "var(--color-success)" : "#d97706",
                              }}
                            >
                              {item.ready ? "준비됨" : "조치 필요"}
                            </Badge>
                          </div>
                          {item.missingEnv?.length > 0 ? (
                            <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                              필요한 환경 변수: {item.missingEnv.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        등록된 runtime dependency가 없습니다.
                      </p>
                    )}
                    {detail.statusDetail ? (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                        {detail.statusDetail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") ? (
                <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    <FileText size={16} />
                    SKILL.md Preview
                  </div>
                  <pre className="mt-4 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    <code>{String(detail.skillMarkdown ?? "").slice(0, 3200)}</code>
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
