import { useEffect, useState, useRef, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { useToast } from "@/components/ToastContext"
import { organizationsApi } from "@/api/organizations"
import { adaptersApi } from "@/api/adapters"
import { pluginsApi } from "@/api/plugins"
import { skillsApi } from "@/api/skills"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Bot,
  Building2,
  Cable,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Loader2,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
} from "lucide-react"

const SETTINGS_ENV_PATH = "/Users/river/workspace/active/hagent-os/.env"

const institutionTypeLabelMap: Record<string, string> = {
  academy: "학원",
  english_academy: "영어학원",
  math_academy: "수학학원",
}

const institutionSizeLabelMap: Record<string, string> = {
  small: "소형",
  mid: "중형",
  medium: "중형",
  large: "대형",
}

function humanizeInstitutionType(value: string | undefined) {
  if (!value) return ""
  return institutionTypeLabelMap[value] ?? value
}

function humanizeInstitutionSize(value: string | undefined) {
  if (!value) return ""
  return institutionSizeLabelMap[value] ?? value
}

function isObjectRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function SectionCard({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="rounded-lg border p-6"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-primary)" }}>{icon}</span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <div className="space-y-1">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
        </div>
        {hint ? (
          <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {hint}
          </div>
        ) : null}
      </div>
      {children}
    </label>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-lg border px-4 py-4"
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}
    >
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </div>
        <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {description}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: "good" | "warn" | "muted"
  children: ReactNode
}) {
  const palette = {
    good: {
      backgroundColor: "var(--status-success-soft)",
      color: "var(--color-success)",
    },
    warn: {
      backgroundColor: "var(--status-warning-soft)",
      color: "var(--color-warning)",
    },
    muted: {
      backgroundColor: "var(--bg-muted)",
      color: "var(--text-secondary)",
    },
  } as const

  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={palette[tone]}>
      {children}
    </span>
  )
}

type IntegrationPreference = {
  enabled: boolean
  preferredChannel?: string
  notes?: string
}

export function SettingsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId, organizations } = useOrganization()
  const { closePanel, setPanelContent } = usePanel()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const pageRef = useRef<HTMLDivElement>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const downloadLinkRef = useRef<HTMLAnchorElement>(null)

  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [institutionType, setInstitutionType] = useState("")
  const [institutionSize, setInstitutionSize] = useState("")
  const [topGoal, setTopGoal] = useState("")
  const [principalName, setPrincipalName] = useState("")

  const [primaryAdapterType, setPrimaryAdapterType] = useState("codex_qauth")
  const [primaryModel, setPrimaryModel] = useState("gpt-5-codex")
  const [fallbackAdapterType, setFallbackAdapterType] = useState("claude_local")
  const [autoRun, setAutoRun] = useState(true)
  const [allowDegradedMode, setAllowDegradedMode] = useState(true)
  const [applyToExistingAgents, setApplyToExistingAgents] = useState(true)
  const [monthlyBudgetKrw, setMonthlyBudgetKrw] = useState("500000")
  const [primaryInputUnitCost, setPrimaryInputUnitCost] = useState("6")
  const [primaryOutputUnitCost, setPrimaryOutputUnitCost] = useState("18")
  const [fallbackInputUnitCost, setFallbackInputUnitCost] = useState("5")
  const [fallbackOutputUnitCost, setFallbackOutputUnitCost] = useState("15")

  const [integrationPrefs, setIntegrationPrefs] = useState<Record<string, IntegrationPreference>>({})
  const [censorLogs, setCensorLogs] = useState(false)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true)
  const [feedbackSharing, setFeedbackSharing] = useState("prompt")
  const [adapterTestResult, setAdapterTestResult] = useState<Record<string, any>>({})

  useEffect(() => {
    setBreadcrumbs([{ label: "설정" }])
  }, [setBreadcrumbs])

  useEffect(() => {
    setPanelContent(null)
    closePanel()
  }, [closePanel, setPanelContent])

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? null

  const adaptersQuery = useQuery({
    queryKey: queryKeys.adapters.all,
    queryFn: () => adaptersApi.list(),
  })
  const channelsQuery = useQuery({
    queryKey: [...queryKeys.organizations.detail(selectedOrgId ?? ""), "channels", "settings"],
    queryFn: () => organizationsApi.getChannels(selectedOrgId!),
    enabled: !!selectedOrgId,
  })
  const pluginsQuery = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
  })
  const skillsQuery = useQuery({
    queryKey: [...queryKeys.skills.all, selectedOrgId, "settings"],
    queryFn: () => skillsApi.list(selectedOrgId ?? undefined),
    enabled: !!selectedOrgId,
  })

  const adapters = adaptersQuery.data?.adapters ?? []
  const integrations = adaptersQuery.data?.integrations ?? []
  const channels = channelsQuery.data ?? {}
  const plugins = pluginsQuery.data ?? []
  const skills = skillsQuery.data ?? []

  useEffect(() => {
    if (!selectedOrg) return
    const config = (selectedOrg.agentTeamConfig ?? {}) as Record<string, any>
    const bootstrap = (config.bootstrap ?? {}) as Record<string, any>
    const general = (config.general ?? {}) as Record<string, any>
    const aiPolicy = (config.aiPolicy ?? {}) as Record<string, any>
    const integrationConfig = (config.integrations ?? {}) as Record<string, IntegrationPreference>
    const instance = (config.instance ?? {}) as Record<string, any>

    setCompanyName(selectedOrg.name ?? "")
    setDescription(selectedOrg.description ?? "")
    setInstitutionType(
      humanizeInstitutionType(
        (general.institutionType as string | undefined) ?? (bootstrap.institutionType as string | undefined),
      ),
    )
    setInstitutionSize(
      humanizeInstitutionSize(
        (general.institutionSize as string | undefined) ?? (bootstrap.institutionSize as string | undefined),
      ),
    )
    setTopGoal((general.topGoal as string | undefined) ?? (bootstrap.topGoal as string | undefined) ?? "")
    setPrincipalName((general.principalName as string | undefined) ?? "원장")

    setPrimaryAdapterType((aiPolicy.primaryAdapterType as string | undefined) ?? (bootstrap.selectedAdapterType as string | undefined) ?? "codex_qauth")
    setPrimaryModel((aiPolicy.primaryModel as string | undefined) ?? (bootstrap.selectedModel as string | undefined) ?? "gpt-5-codex")
    setFallbackAdapterType((aiPolicy.fallbackAdapterType as string | undefined) ?? "claude_local")
    setAutoRun((aiPolicy.autoRun as boolean | undefined) ?? true)
    setAllowDegradedMode((aiPolicy.allowDegradedMode as boolean | undefined) ?? true)
    setApplyToExistingAgents(true)
    setMonthlyBudgetKrw(String(aiPolicy.monthlyBudgetKrw ?? 500000))

    const modelPricing =
      isObjectRecord(aiPolicy.modelPricing) ? (aiPolicy.modelPricing as Record<string, any>) : {}
    const primaryPricing = isObjectRecord(modelPricing[(aiPolicy.primaryModel as string | undefined) ?? (bootstrap.selectedModel as string | undefined) ?? "gpt-5-codex"])
      ? modelPricing[(aiPolicy.primaryModel as string | undefined) ?? (bootstrap.selectedModel as string | undefined) ?? "gpt-5-codex"]
      : {}
    const fallbackPricing = isObjectRecord(modelPricing["claude-sonnet-4-6"]) ? modelPricing["claude-sonnet-4-6"] : {}
    setPrimaryInputUnitCost(String(primaryPricing.inputPer1kKrw ?? primaryPricing.input ?? 6))
    setPrimaryOutputUnitCost(String(primaryPricing.outputPer1kKrw ?? primaryPricing.output ?? 18))
    setFallbackInputUnitCost(String(fallbackPricing.inputPer1kKrw ?? fallbackPricing.input ?? 5))
    setFallbackOutputUnitCost(String(fallbackPricing.outputPer1kKrw ?? fallbackPricing.output ?? 15))

    const nextIntegrationPrefs: Record<string, IntegrationPreference> = {}
    for (const item of integrations) {
      nextIntegrationPrefs[item.key] = {
        enabled: integrationConfig[item.key]?.enabled ?? true,
        preferredChannel: integrationConfig[item.key]?.preferredChannel ?? "",
        notes: integrationConfig[item.key]?.notes ?? "",
      }
    }
    setIntegrationPrefs(nextIntegrationPrefs)

    setCensorLogs((instance.censorLogs as boolean | undefined) ?? false)
    setKeyboardShortcuts((instance.keyboardShortcuts as boolean | undefined) ?? true)
    setFeedbackSharing((instance.feedbackSharing as string | undefined) ?? "prompt")
    setAdapterTestResult(
      isObjectRecord(instance.connectionTests) ? (instance.connectionTests as Record<string, any>) : {},
    )
  }, [selectedOrg, integrations])

  const selectedAdapter = adapters.find((adapter: any) => adapter.key === primaryAdapterType) ?? adapters[0] ?? null
  const selectedCodexAdapterKey = primaryAdapterType === "codex_qauth" ? "codex_qauth" : "codex_local"
  const selectedCodexAdapterTest = adapterTestResult[selectedCodexAdapterKey]
  const installedSkills = skills.filter((item: any) => item.installed)
  const actionRequiredSkills = skills.filter((item: any) => !item.ready)
  const connectedIntegrations = integrations.filter((item: any) => item.connected)
  const connectionTestEntries = Object.entries(adapterTestResult)
    .filter(([, value]) => isObjectRecord(value))
    .sort(([, left], [, right]) => {
      const leftTime = typeof left.testedAt === "string" ? left.testedAt : ""
      const rightTime = typeof right.testedAt === "string" ? right.testedAt : ""
      return rightTime.localeCompare(leftTime)
    })
    .slice(0, 4)

  const saveMutation = useMutation({
    mutationFn: async ({
      payload,
      message,
    }: {
      payload: Record<string, unknown>
      message: string
    }) => {
      if (!selectedOrgId) throw new Error("선택된 기관이 없습니다.")
      await organizationsApi.update(selectedOrgId, payload)
      return message
    },
    onSuccess: async (message) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adapters.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all }),
      ])
      success(message)
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : "설정 저장에 실패했습니다.")
    },
  })

  const adapterTestMutation = useMutation({
    mutationFn: (key: string) => adaptersApi.test(key, selectedOrgId ?? undefined),
    onSuccess: async (result, key) => {
      setAdapterTestResult((prev) => ({ ...prev, [key]: result }))
      try {
        if (selectedOrgId) {
          await organizationsApi.update(selectedOrgId, {
            settings: {
              instance: {
                connectionTests: {
                  [key]: result,
                },
              },
            },
          })
          await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
        }
      } catch (persistError) {
        toastError(persistError instanceof Error ? persistError.message : "연결 테스트 결과 저장에 실패했습니다.")
      }
      success(result.connected ? "연결 테스트가 성공했습니다." : "연결 테스트는 응답했지만 실연동은 아닙니다.")
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : "연결 테스트에 실패했습니다.")
    },
  })

  useEffect(() => {
    const hash = location.hash
    if (!hash || !pageRef.current) return
    const id = hash.replace(/^#/, "")
    const target = pageRef.current.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [location.hash])

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrgId) throw new Error("선택된 기관이 없습니다.")
      return organizationsApi.delete(selectedOrgId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
      setDeleteDialogOpen(false)
      setDeleteConfirmText("")
      navigate("/")
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : "기관 삭제에 실패했습니다.")
    },
  })

  function handleExport() {
    if (!selectedOrgId) return
    const url = organizationsApi.exportData(selectedOrgId)
    const a = downloadLinkRef.current
    if (a) {
      a.href = url
      a.click()
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      success(`${value} 복사됨`)
    } catch {
      toastError("클립보드 복사에 실패했습니다.")
    }
  }

  return (
    <div ref={pageRef} className="p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl gap-6">
      <aside
        className="sticky top-20 hidden h-fit w-72 shrink-0 rounded-lg border p-4 xl:block"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div className="mb-4">
          <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            운영 설정
          </div>
          <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            학원 기본 정보, AI 실행 정책, 연결 상태를 한 화면에서 관리합니다.
          </div>
        </div>
        <div className="space-y-2">
          {[
            { href: "#company-settings", label: "기관 기본 정보", icon: <Building2 size={15} /> },
            { href: "#ai-policy", label: "AI 운영 정책", icon: <Bot size={15} /> },
            { href: "#integrations", label: "연결", icon: <Cable size={15} /> },
            { href: "#channel-operations", label: "채널 운영", icon: <MessageSquare size={15} /> },
            { href: "#instance", label: "앱 환경", icon: <SlidersHorizontal size={15} /> },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-subtle)" }}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={selectedOrg ? "good" : "warn"}>
              {selectedOrg ? "bootstrap 완료" : "조직 선택 필요"}
            </StatusPill>
            <StatusPill tone={selectedAdapter?.connected ? "good" : "warn"}>
              {selectedAdapter?.label ?? "adapter 없음"}
            </StatusPill>
          </div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            연결 수 {connectedIntegrations.length} / {integrations.length}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <WorkspaceHeader
          title="설정"
          description="기관 정보, Codex 실행 상태, 연결 준비 여부와 운영 기본값을 여기서 조정합니다."
        />
        {saveMutation.isPending ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <Loader2 size={14} className="animate-spin" />
            저장 중
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-4">
          {[
            {
              label: "기본 실행",
              value: selectedAdapter?.label ?? primaryAdapterType,
              detail: selectedAdapter?.connected ? "실행 준비됨" : "degraded 또는 연결 확인 필요",
            },
            {
              label: "연동 준비",
              value: `${connectedIntegrations.length}/${integrations.length}`,
              detail: connectedIntegrations.length > 0 ? "실제 연결된 항목 기준" : "연결 테스트가 더 필요합니다.",
            },
            {
              label: "월 예산",
              value: `${Number(monthlyBudgetKrw || 0).toLocaleString("ko-KR")}원`,
              detail: autoRun ? "자동 실행 허용" : "수동 승인 중심",
            },
            {
              label: "최근 테스트",
              value:
                connectionTestEntries.length > 0
                  ? `${connectionTestEntries.filter(([, value]) => Boolean(value.connected)).length}건 통과`
                  : "기록 없음",
              detail:
                connectionTestEntries.length > 0
                  ? new Date(String(connectionTestEntries[0][1].testedAt)).toLocaleString("ko-KR")
                  : "아직 연결 테스트를 저장하지 않았습니다.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border px-4 py-4"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                {item.label}
              </div>
              <div className="mt-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {item.value}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <SectionCard
          id="company-settings"
          icon={<Building2 size={16} />}
          title="기관 기본 정보"
          description="학원 이름, 규모, 운영 목표와 현재 세팅 상태를 관리합니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="기관명">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
            <Field label="대표 사용자">
              <Input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} />
            </Field>
            <Field label="기관 유형">
              <Input value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} placeholder="영어학원, 수학학원" />
            </Field>
            <Field label="기관 규모">
              <Input value={institutionSize} onChange={(e) => setInstitutionSize(e.target.value)} placeholder="원생 120명, 직원 8명" />
            </Field>
          </div>
          <Field label="핵심 목표">
            <Textarea value={topGoal} onChange={(e) => setTopGoal(e.target.value)} rows={3} />
          </Field>
          <Field label="기관 설명">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </Field>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                스킬
              </div>
              <div className="mt-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {installedSkills.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                설치된 기본 스킬
              </div>
            </div>
            <div className="rounded-lg border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                연동
              </div>
              <div className="mt-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {connectedIntegrations.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                연결 상태
              </div>
            </div>
            <div className="rounded-lg border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                조치 필요
              </div>
              <div className="mt-2 text-xl font-semibold" style={{ color: actionRequiredSkills.length ? "var(--color-warning)" : "var(--text-primary)" }}>
                {actionRequiredSkills.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                실행 환경 점검 필요
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveMutation.mutate({
                  message: "기관 설정을 저장했습니다.",
                  payload: {
                    name: companyName.trim(),
                    description: description.trim() || null,
                    settings: {
                      general: {
                        institutionType,
                        institutionSize,
                        topGoal,
                        principalName,
                      },
                    },
                  },
                })
              }
              disabled={!selectedOrgId || saveMutation.isPending}
            >
              기관 설정 저장
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          id="ai-policy"
          icon={<Bot size={16} />}
          title="AI 운영 정책"
          description="Codex 우선 모델, fallback 전략, 자동 실행 정책을 저장합니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="기본 실행 어댑터">
              <Select value={primaryAdapterType} onValueChange={setPrimaryAdapterType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adapters.map((adapter: any) => (
                    <SelectItem key={adapter.key} value={adapter.key}>
                      {adapter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="기본 모델">
              <Select value={primaryModel} onValueChange={setPrimaryModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedAdapter?.availableModels ?? ["gpt-5-codex"]).map((model: string) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="보조 어댑터">
              <Select value={fallbackAdapterType} onValueChange={setFallbackAdapterType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adapters.map((adapter: any) => (
                    <SelectItem key={adapter.key} value={adapter.key}>
                      {adapter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="현재 실행 상태"
              hint="연결 여부는 서버 env 기준이고, 저장값은 이 기관의 기본 정책입니다."
            >
              <div className="flex h-10 items-center gap-2 rounded-lg border px-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
                {selectedAdapter?.connected ? <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} /> : <TriangleAlert size={15} style={{ color: "var(--color-warning)" }} />}
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {selectedAdapter?.connected ? "실연동 가능" : "degraded mode 예정"}
                </span>
              </div>
            </Field>
          </div>

          <ToggleRow
            title="기본 자동 실행"
            description="새로 생성되는 에이전트와 기존 에이전트의 기본 실행 모드를 자동 실행으로 둡니다."
            checked={autoRun}
            onCheckedChange={setAutoRun}
          />
          <ToggleRow
            title="degraded mode 허용"
            description="실연동 키가 없어도 mock fallback으로 기본 흐름을 유지합니다."
            checked={allowDegradedMode}
            onCheckedChange={setAllowDegradedMode}
          />
          <ToggleRow
            title="기존 에이전트에도 반영"
            description="저장 시 현재 기관 에이전트의 adapter/model 설정도 함께 갱신합니다."
            checked={applyToExistingAgents}
            onCheckedChange={setApplyToExistingAgents}
          />

          {connectionTestEntries.length > 0 ? (
            <div
              className="rounded-lg border px-4 py-4"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    최근 연결 테스트
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    Codex, 법령 조회, 채널 브리지 테스트 결과를 최근 순서대로 보여줍니다.
                  </div>
                </div>
                <StatusPill tone="muted">{connectionTestEntries.length}건</StatusPill>
              </div>
              <div className="mt-3 grid gap-2">
                {connectionTestEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    style={{ backgroundColor: "var(--bg-subtle)" }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {key}
                      </div>
                      <div className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                        {typeof value.preview === "string" && value.preview ? value.preview : "최근 미리보기 없음"}
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusPill tone={value.connected ? "good" : "warn"}>
                        {value.connected ? "connected" : "degraded"}
                      </StatusPill>
                      {typeof value.testedAt === "string" ? (
                        <div className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(value.testedAt).toLocaleString("ko-KR")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="월 예산 (KRW)" hint="조직 전체 AI 실행 예산 경고 기준입니다.">
              <Input
                value={monthlyBudgetKrw}
                onChange={(e) => setMonthlyBudgetKrw(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="500000"
              />
            </Field>
            <Field label={`${primaryModel} 입력 단가`} hint="1K input tokens 당 원화 추정값">
              <Input
                value={primaryInputUnitCost}
                onChange={(e) => setPrimaryInputUnitCost(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="6"
              />
            </Field>
            <Field label={`${primaryModel} 출력 단가`} hint="1K output tokens 당 원화 추정값">
              <Input
                value={primaryOutputUnitCost}
                onChange={(e) => setPrimaryOutputUnitCost(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="18"
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Fallback 입력 단가" hint="보조 모델 입력 토큰 단가입니다.">
              <Input
                value={fallbackInputUnitCost}
                onChange={(e) => setFallbackInputUnitCost(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="5"
              />
            </Field>
            <Field label="Fallback 출력 단가" hint="보조 모델 출력 토큰 단가입니다.">
              <Input
                value={fallbackOutputUnitCost}
                onChange={(e) => setFallbackOutputUnitCost(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="15"
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                <ShieldCheck size={14} style={{ color: "var(--color-primary)" }} />
                Codex 연결 상태
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                `Codex qauth 로그인` 또는 `OPENAI_API_KEY`가 있으면 실제 케이스를 Codex로 처리합니다. 없으면 `mock_local` fallback이 사용됩니다.
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                연결 방법: 심사 환경에서는 `codex login`으로 ChatGPT 로그인 상태를 유지하세요. API key 방식을 쓸 경우에는 `{SETTINGS_ENV_PATH}`에 `OPENAI_API_KEY=...`를 넣고 서버를 다시 시작하면 됩니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={selectedAdapter?.connected ? "good" : "warn"}>
                  {selectedAdapter?.connected
                    ? "Codex 연결됨"
                    : primaryAdapterType === "codex_qauth"
                      ? "Codex 로그인 필요"
                      : "OPENAI_API_KEY 필요"}
                </StatusPill>
                {selectedAdapter?.missingEnv?.map((item: string) => (
                  <button
                    key={item}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                    style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                    onClick={() => handleCopy(item)}
                  >
                    <Copy size={12} />
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={adapterTestMutation.isPending}
                  onClick={() => adapterTestMutation.mutate(selectedCodexAdapterKey)}
                >
                  {adapterTestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Codex 연결 테스트
                </Button>
                {selectedCodexAdapterTest ? (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {selectedCodexAdapterTest.connected
                      ? `실연동 응답: ${selectedCodexAdapterTest.preview ?? "-"}`
                      : `degraded 응답: ${selectedCodexAdapterTest.preview ?? "-"}`
                    }
                    {selectedCodexAdapterTest.testedAt
                      ? ` · ${new Date(selectedCodexAdapterTest.testedAt).toLocaleString("ko-KR")}`
                      : ""}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                <ShieldCheck size={14} style={{ color: "var(--color-primary)" }} />
                법령 조회 상태
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                환불, 근로, 학원법 이슈는 `LAW_OC`가 있어야 실제 법령 근거를 붙일 수 있습니다.
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                연결 방법: `{SETTINGS_ENV_PATH}`에 `LAW_OC=...`를 넣고 서버를 다시 시작하면 됩니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={integrations.find((item: any) => item.key === "korean-law-mcp")?.connected ? "good" : "warn"}>
                  {integrations.find((item: any) => item.key === "korean-law-mcp")?.connected ? "법령 조회 가능" : "LAW_OC 필요"}
                </StatusPill>
                {integrations.find((item: any) => item.key === "korean-law-mcp")?.missingEnv?.map((item: string) => (
                  <button
                    key={item}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                    style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                    onClick={() => handleCopy(item)}
                  >
                    <Copy size={12} />
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={adapterTestMutation.isPending}
                  onClick={() => adapterTestMutation.mutate("korean-law-mcp")}
                >
                  {adapterTestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  법령 조회 테스트
                </Button>
                {adapterTestResult["korean-law-mcp"] ? (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {adapterTestResult["korean-law-mcp"].connected
                      ? `조회 가능: ${adapterTestResult["korean-law-mcp"].preview ?? "-"}`
                      : `degraded: ${adapterTestResult["korean-law-mcp"].preview ?? "-"}`
                    }
                    {adapterTestResult["korean-law-mcp"].testedAt
                      ? ` · ${new Date(adapterTestResult["korean-law-mcp"].testedAt).toLocaleString("ko-KR")}`
                      : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveMutation.mutate({
                  message: "AI 정책을 저장했습니다.",
                  payload: {
                    settings: {
                      aiPolicy: {
                        primaryAdapterType,
                        primaryModel,
                        fallbackAdapterType,
                        autoRun,
                        allowDegradedMode,
                        applyToExistingAgents,
                        monthlyBudgetKrw: Number(monthlyBudgetKrw || 0),
                        modelPricing: {
                          [primaryModel]: {
                            inputPer1kKrw: Number(primaryInputUnitCost || 0),
                            outputPer1kKrw: Number(primaryOutputUnitCost || 0),
                          },
                          "claude-sonnet-4-6": {
                            inputPer1kKrw: Number(fallbackInputUnitCost || 0),
                            outputPer1kKrw: Number(fallbackOutputUnitCost || 0),
                          },
                        },
                      },
                    },
                  },
                })
              }
              disabled={!selectedOrgId || saveMutation.isPending}
            >
              AI 정책 저장
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          id="integrations"
          icon={<Cable size={16} />}
          title="연결"
          description="실연동 준비 상태와 이 기관의 운영 선호 설정을 함께 관리합니다. 스킬 화면에서는 필요 여부만 보여주고, 실제 연결은 여기서 관리합니다."
        >
          <div className="space-y-3">
            {integrations.map((integration: any) => {
              const preference = integrationPrefs[integration.key] ?? { enabled: true, preferredChannel: "", notes: "" }
              return (
                <div
                  key={integration.key}
                  className="rounded-lg border p-4"
                  style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {integration.label}
                        </div>
                        <StatusPill tone={integration.connected ? "good" : "warn"}>
                          {integration.connected ? "연결됨" : "환경변수 필요"}
                        </StatusPill>
                      </div>
                      <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {integration.description}
                      </div>
                    </div>
                    <Switch
                      checked={preference.enabled}
                      onCheckedChange={(checked) =>
                        setIntegrationPrefs((prev) => ({
                          ...prev,
                          [integration.key]: {
                            ...prev[integration.key],
                            enabled: checked,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                    <Field label="우선 채널" hint="메시징 연동은 기본 채널명, 나머지는 운영 메모처럼 사용합니다.">
                      <Input
                        value={preference.preferredChannel ?? ""}
                        onChange={(e) =>
                          setIntegrationPrefs((prev) => ({
                            ...prev,
                            [integration.key]: {
                              ...prev[integration.key],
                              preferredChannel: e.target.value,
                            },
                          }))
                        }
                        placeholder={integration.category === "messaging" ? "kakao, sms" : "default"}
                      />
                    </Field>
                    <Field label="운영 메모">
                      <Input
                        value={preference.notes ?? ""}
                        onChange={(e) =>
                          setIntegrationPrefs((prev) => ({
                            ...prev,
                            [integration.key]: {
                              ...prev[integration.key],
                              notes: e.target.value,
                            },
                          }))
                        }
                        placeholder="운영 메모"
                      />
                    </Field>
                  </div>

                  {integration.missingEnv?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {integration.missingEnv.map((item: string) => (
                        <button
                          key={item}
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                          style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                          onClick={() => handleCopy(item)}
                        >
                          <Copy size={12} />
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveMutation.mutate({
                  message: "연동 선호 설정을 저장했습니다.",
                  payload: {
                    settings: {
                      integrations: integrationPrefs,
                    },
                  },
                })
              }
              disabled={!selectedOrgId || saveMutation.isPending}
            >
              연동 설정 저장
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          id="channel-operations"
          icon={<MessageSquare size={16} />}
          title="채널 운영"
          description="실제 문의가 들어오는 채널 상태와 Kakao/Telegram 회신 경로를 운영 관점에서 확인합니다."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                key: "kakao",
                label: "Kakao Channel",
                description: "학부모 민원/상담 인바운드",
                status: channels.kakao?.enabled ? "활성" : "비활성",
                detail: channels.kakao?.channelUrl ?? channels.kakao?.searchId ?? "channel not configured",
              },
              {
                key: "telegram",
                label: "Telegram Bot",
                description: "운영 요청/상담 인바운드",
                status: channels.telegram?.enabled ? "활성" : "비활성",
                detail: channels.telegram?.botUsername ?? "bot not configured",
              },
              {
                key: "kakao-outbound",
                label: "Kakao Outbound",
                description: "승인 후 자동 회신 또는 운영자 발송 브리지",
                status: integrations.find((item: any) => item.key === "kakao-outbound")?.connected ? "자동 발송 가능" : "operator bridge fallback",
                detail:
                  adapterTestResult["kakao-outbound"]?.preview ??
                  integrations.find((item: any) => item.key === "kakao-outbound")?.description ??
                  "provider not configured",
              },
              {
                key: "telegram-outbound",
                label: "Telegram Outbound",
                description: "승인 후 텔레그램 자동 회신 또는 운영자 브리지",
                status:
                  channels.telegram?.enabled && channels.telegram?.botToken
                    ? "자동 발송 가능"
                    : "operator bridge fallback",
                detail:
                  adapterTestResult["telegram-outbound"]?.preview ??
                  channels.telegram?.botUsername ??
                  "bot not configured",
              },
            ].map((channel) => (
              <div
                key={channel.key}
              className="rounded-lg border px-4 py-4"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}
            >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {channel.label}
                  </div>
                  <StatusPill tone={/가능|활성/.test(channel.status) ? "good" : "warn"}>
                    {channel.status}
                  </StatusPill>
                </div>
                <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {channel.description}
                </div>
                <div className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {channel.detail}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={adapterTestMutation.isPending}
              onClick={() => adapterTestMutation.mutate("kakao-outbound")}
            >
              {adapterTestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Kakao 발송 경로 테스트
            </Button>
            {adapterTestResult["kakao-outbound"]?.testedAt ? (
              <span className="text-xs self-center" style={{ color: "var(--text-secondary)" }}>
                마지막 테스트 {new Date(adapterTestResult["kakao-outbound"].testedAt).toLocaleString("ko-KR")}
              </span>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={adapterTestMutation.isPending}
              onClick={() => adapterTestMutation.mutate("telegram-outbound")}
            >
              {adapterTestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Telegram 발송 경로 테스트
            </Button>
            {adapterTestResult["telegram-outbound"]?.testedAt ? (
              <span className="text-xs self-center" style={{ color: "var(--text-secondary)" }}>
                마지막 테스트 {new Date(adapterTestResult["telegram-outbound"].testedAt).toLocaleString("ko-KR")}
              </span>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          id="instance"
          icon={<Cpu size={16} />}
          title="앱 환경"
          description="운영 화면에서 쓰는 기본 동작과 표시 정책을 저장합니다."
        >
          <ToggleRow
            title="로그 사용자명 가리기"
            description="운영 로그와 transcript에서 홈 디렉터리 사용자명을 가립니다."
            checked={censorLogs}
            onCheckedChange={setCensorLogs}
          />
          <ToggleRow
            title="키보드 단축키 사용"
            description="운영 화면에서 keyboard shortcut을 기본 활성화 상태로 둡니다."
            checked={keyboardShortcuts}
            onCheckedChange={setKeyboardShortcuts}
          />

          <Field label="AI 피드백 공유" hint="평가/피드백 공유 기본 정책을 저장합니다.">
            <Select value={feedbackSharing} onValueChange={setFeedbackSharing}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prompt">처음 사용할 때 묻기</SelectItem>
                <SelectItem value="allow">항상 허용</SelectItem>
                <SelectItem value="deny">공유 안 함</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="rounded-lg border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-subtle)" }}>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              <Cpu size={14} style={{ color: "var(--color-primary)" }} />
              현재 로드된 모듈
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {plugins.map((plugin: any) => (
                <Badge key={plugin.key} className="border-0" style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                  {plugin.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveMutation.mutate({
                  message: "인스턴스 정책을 저장했습니다.",
                  payload: {
                    settings: {
                      instance: {
                        censorLogs,
                        keyboardShortcuts,
                        feedbackSharing,
                      },
                    },
                  },
                })
              }
              disabled={!selectedOrgId || saveMutation.isPending}
            >
              인스턴스 설정 저장
            </Button>
          </div>
        </SectionCard>

        {/* Danger Zone */}
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: "var(--color-danger)" }}
        >
          <div
            className="flex items-center gap-2 px-5 py-4"
            style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--status-danger-soft)" }}
          >
            <TriangleAlert size={15} style={{ color: "var(--color-danger)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-danger)" }}>위험 구역</span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>데이터 내보내기</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  학원 전체 데이터(에이전트, 케이스, 학생, 강사, 일정 등)를 JSON 파일로 다운로드합니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={!selectedOrgId}
                onClick={handleExport}
              >
                <Download size={14} />
                내보내기
              </Button>
            </div>

            <Separator style={{ backgroundColor: "var(--border-default)" }} />

            {/* Delete */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>기관 삭제</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  이 학원과 모든 하위 데이터(에이전트, 케이스, 학생 등)를 영구 삭제합니다. 되돌릴 수 없습니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                disabled={!selectedOrgId}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={14} />
                기관 삭제
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden download anchor */}
      <a ref={downloadLinkRef} download className="hidden" />

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeleteConfirmText("") } }}>
        <DialogContent style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--color-danger)" }}>기관 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              이 작업은 <strong style={{ color: "var(--text-primary)" }}>되돌릴 수 없습니다.</strong> 이 학원의 모든 에이전트, 케이스, 승인, 학생, 강사, 일정 데이터가 영구 삭제됩니다.
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              계속하려면 아래에 <strong style={{ color: "var(--text-primary)" }}>삭제</strong>를 입력하세요.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="삭제"
              style={{ borderColor: deleteConfirmText === "삭제" ? "var(--color-danger)" : undefined }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText("") }}>
              취소
            </Button>
            <Button
              className="gap-1.5"
              style={{ backgroundColor: "var(--color-danger)", color: "var(--text-on-primary)" }}
              disabled={deleteConfirmText !== "삭제" || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
