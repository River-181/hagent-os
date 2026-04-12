import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { capabilitiesApi } from "@/api/capabilities"
import { skillsApi } from "@/api/skills"
import { adaptersApi } from "@/api/adapters"
import { agentsApi } from "@/api/agents"
import { Switch } from "@/components/ui/switch"
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
import { WorkspaceHeader, WorkspaceSubtle } from "@/components/ui/workspace-surface"
import { queryKeys } from "@/lib/queryKeys"
import { CAPABILITY_BUNDLES, findBundleByCapability, type CapabilityBundleDefinition } from "@/lib/capabilityBundles"
import {
  Bot,
  Cable,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileText,
  FolderTree,
  Loader2,
  PackagePlus,
  Puzzle,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  Trash2,
  Zap,
} from "lucide-react"

type CapabilityTab = "all" | "system" | "workflow" | "integration"

const TAB_ORDER: Array<{ value: CapabilityTab; label: string }> = [
  { value: "all", label: "전체" },
  { value: "system", label: "시스템" },
  { value: "workflow", label: "스킬·묶음" },
  { value: "integration", label: "연동·런타임" },
]

const TAB_FILTERS: Record<CapabilityTab, string[]> = {
  all: [],
  system: ["system"],
  workflow: ["pack", "skill"],
  integration: ["integration", "runtime"],
}

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

function capabilityStatusLabel(item: any) {
  if (!item.ready) return "점검 필요"
  if (item.installed) return "설치됨"
  return "사용 가능"
}

function capabilityStatusStyle(item: any) {
  if (!item.ready) {
    return {
      backgroundColor: "var(--status-warning-soft)",
      color: "var(--color-warning)",
    }
  }
  return {
    backgroundColor: item.installed ? "var(--accent-primary-soft)" : "var(--bg-muted)",
    color: item.installed ? "var(--accent-primary)" : "var(--text-tertiary)",
  }
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
      className="w-full rounded-xl p-4 text-left transition-all"
      style={{
        backgroundColor: active ? "var(--bg-subtle)" : "var(--bg-elevated)",
        border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-default)"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: active ? "var(--accent-primary-soft)" : "var(--bg-subtle)",
            color: active ? "var(--accent-primary)" : "var(--text-tertiary)",
          }}
        >
          {capabilityIcon(item.capabilityType)}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {item.displayName}
              </p>
              <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
                {capabilityTypeLabel(item.capabilityType)}
                {typeof item.sourceBadge === "string" ? ` · ${item.sourceBadge}` : ""}
              </p>
            </div>
            <Badge className="border-0 text-xs" style={capabilityStatusStyle(item)}>
              {capabilityStatusLabel(item)}
            </Badge>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {item.summary}
          </p>
        </div>
      </div>
    </button>
  )
}

function BundleCard({
  bundle,
  stats,
  active,
  onClick,
}: {
  bundle: CapabilityBundleDefinition
  stats: { ready: number; total: number; installed: boolean; missingConnections: number }
  active: boolean
  onClick: () => void
}) {
  const readinessLabel =
    stats.total === 0 ? "준비 정보 없음" : stats.ready === stats.total ? "바로 사용 가능" : stats.installed ? "연결 필요" : "설치 필요"

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-4 text-left transition-all"
      style={{
        backgroundColor: active ? "var(--bg-subtle)" : "var(--bg-elevated)",
        border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-default)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {bundle.title}
          </div>
          <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {bundle.summary}
          </p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: active ? "var(--accent-primary-soft)" : "var(--bg-subtle)", color: "var(--accent-primary)" }}
        >
          <Sparkles size={18} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
        <span>{readinessLabel}</span>
        <span>·</span>
        <span>추천 팀 {bundle.teamTemplate.roles.length}명</span>
        {stats.missingConnections > 0 ? (
          <>
            <span>·</span>
            <span>{stats.missingConnections}개 연결 필요</span>
          </>
        ) : null}
      </div>
    </button>
  )
}

function TeamRoleRow({
  role,
  matchedAgent,
}: {
  role: CapabilityBundleDefinition["teamTemplate"]["roles"][number]
  matchedAgent?: any
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {role.label}
        </div>
        <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {matchedAgent ? `${matchedAgent.name} 연결됨` : "아직 팀에 없습니다."}
        </div>
      </div>
      <Badge className="border-0" style={{ backgroundColor: matchedAgent ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: matchedAgent ? "var(--color-success)" : "#d97706" }}>
        {matchedAgent ? "준비됨" : role.required ? "필수" : "선택"}
      </Badge>
    </div>
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
    <WorkspaceSubtle className="space-y-4 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          역량 속성
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          기관 설치, 에이전트 배정, 중복 후보를 이 패널에서 정리합니다.
        </p>
      </div>

      <div className="space-y-1">
        <PropertyRow label="종류">
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>
            {capabilityTypeLabel(detail.capabilityType)}
          </span>
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
          <div className="space-y-1">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {duplicateCandidates.length > 0 ? `${duplicateCandidates.length}개` : "없음"}
            </span>
            {duplicateCandidates.length > 0 ? (
              <div className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {duplicateCandidates.map((item) => (
                  <p key={`${item.capabilityType}/${item.slug}`}>{item.displayName}</p>
                ))}
              </div>
            ) : null}
          </div>
        </PropertyRow>
      </div>

      {(detail.capabilityType === "skill" || detail.capabilityType === "pack" || detail.capabilityType === "system") ? (
        <WorkspaceSubtle className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
            에이전트 배정
          </p>
          <div className="space-y-3">
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
        </WorkspaceSubtle>
      ) : null}
    </WorkspaceSubtle>
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
  const [advancedView, setAdvancedView] = useState(false)

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
      const kindMatch = TAB_FILTERS[activeTab].length === 0 ? true : TAB_FILTERS[activeTab].includes(item.capabilityType)
      const searchMatch =
        searchLower.length === 0 ||
        [item.displayName, item.summary, item.slug, item.capabilityType].some((value) =>
          String(value ?? "").toLowerCase().includes(searchLower),
        )
      return kindMatch && searchMatch
    })
  }, [activeTab, listQuery.data?.capabilities, search])

  const bundleCards = useMemo(() => {
    const capabilities = listQuery.data?.capabilities ?? []
    return CAPABILITY_BUNDLES.map((bundle) => {
      const included = capabilities.filter((item: any) => bundle.includedSlugs.includes(item.slug))
      const runtimeHealth = included.flatMap((item: any) => item.runtimeHealth ?? [])
      const missingConnections = runtimeHealth.filter((item: any) => !item.ready).length
      const ready = included.filter((item: any) => item.ready).length
      const installed = included.some((item: any) => item.installed)
      return {
        bundle,
        stats: {
          ready,
          total: included.length,
          installed,
          missingConnections,
        },
      }
    })
  }, [listQuery.data?.capabilities])

  const selectedBundle = useMemo(() => {
    if (!slug) return bundleCards[0]?.bundle ?? null
    return findBundleByCapability(slug) ?? bundleCards[0]?.bundle ?? null
  }, [bundleCards, slug])

  const basicDetailTarget = selectedBundle
    ? { kind: selectedBundle.primaryKind, slug: selectedBundle.primarySlug }
    : { kind, slug }

  useEffect(() => {
    if (!kind || !slug) {
      if (!advancedView) {
        const firstBundle = bundleCards[0]?.bundle
        if (firstBundle && orgPrefix) {
          navigate(`/${orgPrefix}/capabilities/${firstBundle.primaryKind}/${firstBundle.primarySlug}`, { replace: true })
          return
        }
      }
      const first = filtered[0]
      if (first && orgPrefix) {
        navigate(`/${orgPrefix}/capabilities/${first.capabilityType}/${first.slug}`, { replace: true })
      }
    }
  }, [advancedView, bundleCards, filtered, kind, navigate, orgPrefix, slug])

  useEffect(() => {
    setSelectedAgentId("")
  }, [slug])

  const detailQuery = useQuery({
    queryKey: [...queryKeys.capabilities.detail((advancedView ? kind : basicDetailTarget.kind) ?? "__none__", (advancedView ? slug : basicDetailTarget.slug) ?? "__none__"), selectedOrgId, advancedView ? "advanced" : "basic"],
    queryFn: () =>
      capabilitiesApi.get(
        advancedView ? kind! : basicDetailTarget.kind!,
        advancedView ? slug! : basicDetailTarget.slug!,
        selectedOrgId ?? undefined,
      ),
    enabled: Boolean((advancedView ? kind && slug : basicDetailTarget.kind && basicDetailTarget.slug) && selectedOrgId),
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

  const createMissingTeamMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId || !selectedBundle) return []
      const created: any[] = []
      for (const role of selectedBundle.teamTemplate.roles) {
        const exists = orgAgents.find((agent: any) => agent.agentType === role.agentType)
        if (exists) continue
        const agent = await agentsApi.create(selectedOrgId, {
          name: role.createName,
          title: role.label,
          agentType: role.agentType,
          model: "gpt-5-codex",
        })
        created.push(agent)
      }
      return created
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedOrgId ?? "") })
      if (created?.length) {
        toast.success(`팀 구성원 ${created.length}명을 만들었습니다.`)
      } else {
        toast.success("이미 필요한 팀이 준비되어 있습니다.")
      }
    },
    onError: () => toast.error("팀 생성에 실패했습니다."),
  })

  const equipBundleTeamMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId || !selectedBundle) return
      const capabilitiesBySlug = new Map((listQuery.data?.capabilities ?? []).map((item: any) => [item.slug, item]))
      const installableSlugs = Array.from(
        new Set(
          selectedBundle.teamTemplate.roles.flatMap((role) => role.skills)
            .filter((skillSlug) => {
              const meta = capabilitiesBySlug.get(skillSlug)
              return meta && ["skill", "pack", "system"].includes(meta.capabilityType)
            }),
        ),
      )

      for (const capabilitySlug of installableSlugs) {
        const meta = capabilitiesBySlug.get(capabilitySlug)
        if (meta && !meta.installed) {
          await skillsApi.install(selectedOrgId, capabilitySlug)
        }
      }

      const refreshedAgents = await agentsApi.list(selectedOrgId)
      for (const role of selectedBundle.teamTemplate.roles) {
        const targetAgent = refreshedAgents.find((agent: any) => agent.agentType === role.agentType)
        if (!targetAgent) continue
        const current = await agentsApi.listSkills(targetAgent.id)
        const next = Array.isArray(current)
          ? current.map((item: any, index: number) => ({
              slug: item.slug,
              enabled: item.enabled ?? true,
              mountOrder: item.mountOrder ?? index,
            }))
          : []
        for (const skillSlug of role.skills) {
          if (!next.some((item: any) => item.slug === skillSlug)) {
            next.push({ slug: skillSlug, enabled: true, mountOrder: next.length })
          }
        }
        await agentsApi.updateSkills(targetAgent.id, next)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.capabilities.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
      ])
      toast.success("추천 팀에 역량을 일괄 배정했습니다.")
    },
    onError: () => toast.error("추천 팀 배정에 실패했습니다."),
  })

  const detail = detailQuery.data
  const bundleAgents = useMemo(() => {
    if (!selectedBundle) return []
    return selectedBundle.teamTemplate.roles.map((role) => ({
      role,
      matchedAgent: orgAgents.find((agent: any) => agent.agentType === role.agentType),
    }))
  }, [orgAgents, selectedBundle])

  useEffect(() => {
    if (!selectedAgentId && orgAgents.length > 0) {
      setSelectedAgentId(detail?.mountedAgents?.[0]?.agentId ?? orgAgents[0].id)
    }
  }, [detail?.mountedAgents, orgAgents, selectedAgentId])

  useEffect(() => {
    if (!detail) return
    if (!advancedView && selectedBundle) {
      const runtimeHealth = (detail.runtimeHealth ?? []) as any[]
      const missingConnections = runtimeHealth.filter((item) => !item.ready)
      setPanelContent(
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              실행 요약
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              이 업무 묶음을 지금 바로 쓸 수 있는지와 추천 팀 상태만 간단히 보여줍니다.
            </p>
          </div>

          <WorkspaceSubtle className="space-y-3 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                  업무 묶음
                </p>
                <p style={{ color: "var(--text-primary)" }}>{selectedBundle.title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                  설치 여부
                </p>
                <p style={{ color: "var(--text-primary)" }}>{detail.installed ? "설치됨" : "미설치"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                  준비 상태
                </p>
                <p style={{ color: "var(--text-primary)" }}>{detail.ready ? "바로 사용 가능" : "연결/설정 필요"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                  연결 필요
                </p>
                <p style={{ color: "var(--text-primary)" }}>{missingConnections.length > 0 ? `${missingConnections.length}건` : "없음"}</p>
              </div>
            </div>
          </WorkspaceSubtle>

          <WorkspaceSubtle className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
              추천 팀
            </p>
            <div className="space-y-2">
              {bundleAgents.map(({ role, matchedAgent }) => (
                <div key={role.agentType} className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{role.label}</span>
                  <span className="text-xs" style={{ color: matchedAgent ? "var(--color-success)" : "var(--text-tertiary)" }}>
                    {matchedAgent ? matchedAgent.name : "없음"}
                  </span>
                </div>
              ))}
            </div>
          </WorkspaceSubtle>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => createMissingTeamMutation.mutate()} disabled={createMissingTeamMutation.isPending}>
              {createMissingTeamMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
              팀 만들기
            </Button>
            <Button size="sm" variant="outline" onClick={() => equipBundleTeamMutation.mutate()} disabled={equipBundleTeamMutation.isPending}>
              {equipBundleTeamMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
              일괄 배정
            </Button>
            <Button size="sm" variant="outline" onClick={() => orgPrefix && navigate(`/${orgPrefix}/settings#integrations`)}>
              <ExternalLink size={14} />
              설정으로 이동
            </Button>
          </div>
        </div>,
      )
      openPanel()
      return () => {
        setPanelContent(null)
        closePanel()
      }
    }
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
    advancedView,
    bundleAgents,
    closePanel,
    detail,
    listQuery.data?.capabilities,
    navigate,
    openPanel,
    orgAgents,
    orgPrefix,
    selectedAgentId,
    selectedBundle,
    setPanelContent,
  ])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="역량"
        description={
          advancedView
            ? "스킬, 시스템, 연동, 런타임을 한 화면에서 점검합니다."
            : "무슨 일을 자동화할지 먼저 고르세요. 기술 용어는 숨기고, 바로 쓸 수 있는 업무 묶음만 보여줍니다."
        }
        action={
          <div
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                고급 보기
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                스킬, 연동, 런타임을 모두 봅니다.
              </p>
            </div>
            <Switch checked={advancedView} onCheckedChange={setAdvancedView} />
          </div>
        }
      />

      {!advancedView ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bundleCards.map(({ bundle, stats }) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                stats={stats}
                active={selectedBundle?.id === bundle.id}
                onClick={() => orgPrefix && navigate(`/${orgPrefix}/capabilities/${bundle.primaryKind}/${bundle.primarySlug}`)}
              />
            ))}
          </section>

          {!detail || detailQuery.isLoading ? (
            <section
              className="rounded-xl min-h-[420px] flex flex-col items-center justify-center gap-3"
              style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                업무 묶음 상세를 불러오는 중...
              </p>
            </section>
          ) : selectedBundle ? (
            <section
              className="rounded-xl p-6 md:p-8"
              style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                      무엇을 하는 역량인가
                    </p>
                    <h2 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                      {selectedBundle.title}
                    </h2>
                    <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                      {selectedBundle.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBundle.examples.map((example) => (
                        <Badge
                          key={example}
                          className="border-0"
                          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                        >
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      <Zap size={16} />
                      추천 진입점
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(detail.recommendedEntrypoints?.length ?? 0) > 0 ? (
                        detail.recommendedEntrypoints.map((entry: string) => (
                          <Badge
                            key={entry}
                            className="border-0"
                            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                          >
                            {entry}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          case, project, agent에서 바로 연결할 수 있습니다.
                        </span>
                      )}
                    </div>
                  </div>

                  <details
                    className="rounded-xl p-5"
                    style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      기술 정보
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
                          구성 요소
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedBundle.includedSlugs.map((entry) => (
                            <Badge
                              key={entry}
                              className="border-0"
                              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                            >
                              {entry}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
                          연결 상태
                        </p>
                        <div className="mt-2 space-y-2">
                          {(detail.runtimeHealth ?? []).length > 0 ? (
                            detail.runtimeHealth.map((item: any) => (
                              <div key={item.key} className="flex items-center justify-between gap-3">
                                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                                  {item.label}
                                </span>
                                <Badge
                                  className="border-0"
                                  style={{
                                    backgroundColor: item.ready ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                    color: item.ready ? "var(--color-success)" : "#d97706",
                                  }}
                                >
                                  {item.ready ? "준비됨" : "연결 필요"}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                              연결 정보가 아직 없습니다.
                            </span>
                          )}
                        </div>
                      </div>
                      {(detail.curatedSource || detail.forkInfo || detail.upstreamSync) ? (
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
                            원본/포크
                          </p>
                          <div className="mt-2 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                            {detail.curatedSource ? <p>원본: {detail.curatedSource.label}</p> : null}
                            {detail.forkInfo?.forkedFrom ? <p>forked from: {detail.forkInfo.forkedFrom}</p> : null}
                            {detail.upstreamSync?.status ? <p>업데이트 상태: {detail.upstreamSync.status}</p> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </details>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      <Users size={16} />
                      추천 팀
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {selectedBundle.teamTemplate.label}
                    </p>
                    <div className="mt-4 space-y-3">
                      {bundleAgents.map(({ role, matchedAgent }) => (
                        <TeamRoleRow key={role.agentType} role={role} matchedAgent={matchedAgent} />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => createMissingTeamMutation.mutate()} disabled={createMissingTeamMutation.isPending}>
                        {createMissingTeamMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                        팀 한 번에 만들기
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => equipBundleTeamMutation.mutate()} disabled={equipBundleTeamMutation.isPending}>
                        {equipBundleTeamMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                        이 팀에 역량 일괄 배정
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => createMissingTeamMutation.mutate()} disabled={createMissingTeamMutation.isPending}>
                        빠진 역할만 채우기
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => orgPrefix && navigate(`/${orgPrefix}/agents`)}>
                        개별 조정
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      <Cable size={16} />
                      연결 안내
                    </div>
                    <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                      {selectedBundle.settingsHint}
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => orgPrefix && navigate(`/${orgPrefix}/settings#integrations`)}>
                      <ExternalLink size={14} />
                      설정으로 이동
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className="rounded-xl overflow-hidden"
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
            className="rounded-xl overflow-hidden"
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
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                    {capabilityTypeLabel(detail.capabilityType)}
                    {detail.sourceStatus ? ` · ${detail.sourceStatus}` : ""}
                  </p>
                  <div>
                    <h2 className="text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                      {detail.displayName}
                    </h2>
                    <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                      {detail.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-0 text-xs" style={capabilityStatusStyle(detail)}>
                      {capabilityStatusLabel(detail)}
                    </Badge>
                    {detail.readOnly ? (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        읽기 전용
                      </span>
                    ) : null}
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

              <WorkspaceSubtle className="p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "종류", value: capabilityTypeLabel(detail.capabilityType) },
                    { label: "장착 에이전트", value: String(detail.mountedAgents?.length ?? 0) },
                    { label: "추천 진입점", value: String(detail.recommendedEntrypoints?.length ?? 0) },
                    { label: "파일 수", value: String(detail.fileTree?.length ?? 0) },
                  ].map((card) => (
                    <div key={card.label} className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                        {card.label}
                      </p>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
              </WorkspaceSubtle>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
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

                <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
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
                <div className="rounded-xl p-5" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}>
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
      )}
    </div>
  )
}
