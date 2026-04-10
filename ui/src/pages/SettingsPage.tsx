import { useEffect, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
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
  Bot,
  Building2,
  Cable,
  CheckCircle2,
  Copy,
  Cpu,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react"

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
      className="rounded-3xl border p-5"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-teal-500)" }}>{icon}</span>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
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
      className="flex items-start justify-between gap-4 rounded-2xl border px-4 py-4"
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
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
      backgroundColor: "rgba(34,197,94,0.12)",
      color: "var(--color-success)",
    },
    warn: {
      backgroundColor: "rgba(245,158,11,0.12)",
      color: "#d97706",
    },
    muted: {
      backgroundColor: "var(--bg-tertiary)",
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
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [institutionType, setInstitutionType] = useState("")
  const [institutionSize, setInstitutionSize] = useState("")
  const [topGoal, setTopGoal] = useState("")
  const [principalName, setPrincipalName] = useState("")

  const [primaryAdapterType, setPrimaryAdapterType] = useState("codex_local")
  const [primaryModel, setPrimaryModel] = useState("gpt-5-codex")
  const [fallbackAdapterType, setFallbackAdapterType] = useState("claude_local")
  const [autoRun, setAutoRun] = useState(true)
  const [allowDegradedMode, setAllowDegradedMode] = useState(true)
  const [applyToExistingAgents, setApplyToExistingAgents] = useState(true)

  const [integrationPrefs, setIntegrationPrefs] = useState<Record<string, IntegrationPreference>>({})
  const [censorLogs, setCensorLogs] = useState(false)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true)
  const [feedbackSharing, setFeedbackSharing] = useState("prompt")

  useEffect(() => {
    setBreadcrumbs([{ label: "설정" }])
  }, [setBreadcrumbs])

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? null

  const adaptersQuery = useQuery({
    queryKey: queryKeys.adapters.all,
    queryFn: () => adaptersApi.list(),
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
    setInstitutionType((general.institutionType as string | undefined) ?? (bootstrap.institutionType as string | undefined) ?? "")
    setInstitutionSize((general.institutionSize as string | undefined) ?? (bootstrap.institutionSize as string | undefined) ?? "")
    setTopGoal((general.topGoal as string | undefined) ?? (bootstrap.topGoal as string | undefined) ?? "")
    setPrincipalName((general.principalName as string | undefined) ?? "원장")

    setPrimaryAdapterType((aiPolicy.primaryAdapterType as string | undefined) ?? (bootstrap.selectedAdapterType as string | undefined) ?? "codex_local")
    setPrimaryModel((aiPolicy.primaryModel as string | undefined) ?? (bootstrap.selectedModel as string | undefined) ?? "gpt-5-codex")
    setFallbackAdapterType((aiPolicy.fallbackAdapterType as string | undefined) ?? "claude_local")
    setAutoRun((aiPolicy.autoRun as boolean | undefined) ?? true)
    setAllowDegradedMode((aiPolicy.allowDegradedMode as boolean | undefined) ?? true)
    setApplyToExistingAgents(true)

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
  }, [selectedOrg, integrations])

  const selectedAdapter = adapters.find((adapter: any) => adapter.key === primaryAdapterType) ?? adapters[0] ?? null
  const installedSkills = skills.filter((item: any) => item.installed)
  const actionRequiredSkills = skills.filter((item: any) => !item.ready)
  const connectedIntegrations = integrations.filter((item: any) => item.connected)

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

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      success(`${value} copied`)
    } catch {
      toastError("클립보드 복사에 실패했습니다.")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 py-8">
      <aside
        className="sticky top-20 hidden h-fit w-72 shrink-0 rounded-3xl border p-4 xl:block"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="mb-4">
          <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Settings
          </div>
          <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            paperclip식 운영 설정 구조를 기준으로, 기관 정책과 AI 런타임을 바로 수정합니다.
          </div>
        </div>
        <div className="space-y-2">
          {[
            { href: "#company-settings", label: "Company Settings", icon: <Building2 size={15} /> },
            { href: "#ai-policy", label: "AI Policy", icon: <Bot size={15} /> },
            { href: "#integrations", label: "Integrations", icon: <Cable size={15} /> },
            { href: "#instance", label: "Instance", icon: <SlidersHorizontal size={15} /> },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)" }}
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
            connected integrations {connectedIntegrations.length} / {integrations.length}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              설정
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              기관 정보, Codex-first 정책, 외부 연동 선호도와 운영 기본값을 한 화면에서 관리합니다.
            </p>
          </div>
          {saveMutation.isPending ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Loader2 size={14} className="animate-spin" />
              저장 중
            </div>
          ) : null}
        </div>

        <SectionCard
          id="company-settings"
          icon={<Building2 size={16} />}
          title="Company Settings"
          description="기관명과 운영 목표를 저장하고, 현재 bootstrap 상태를 확인합니다."
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
              <Input value={institutionSize} onChange={(e) => setInstitutionSize(e.target.value)} placeholder="원생 120명, 강사 8명" />
            </Field>
          </div>
          <Field label="핵심 목표">
            <Textarea value={topGoal} onChange={(e) => setTopGoal(e.target.value)} rows={3} />
          </Field>
          <Field label="기관 설명">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </Field>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                Skills
              </div>
              <div className="mt-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {installedSkills.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                installed starter skills
              </div>
            </div>
            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                Integrations
              </div>
              <div className="mt-2 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {connectedIntegrations.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                connected integrations
              </div>
            </div>
            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                Action Required
              </div>
              <div className="mt-2 text-xl font-semibold" style={{ color: actionRequiredSkills.length ? "#d97706" : "var(--text-primary)" }}>
                {actionRequiredSkills.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                runtime setup needed
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
          title="AI Policy"
          description="Codex-first 기본 모델과 fallback 전략을 저장하고, 기존 에이전트에 즉시 반영할 수 있습니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Primary Adapter">
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
            <Field label="Primary Model">
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
            <Field label="Fallback Adapter">
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
              label="Current Runtime"
              hint="현재 연결 상태는 env 기준이며, 저장은 조직 정책 기준입니다."
            >
              <div className="flex h-10 items-center gap-2 rounded-2xl border px-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                {selectedAdapter?.connected ? <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} /> : <TriangleAlert size={15} style={{ color: "#d97706" }} />}
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {selectedAdapter?.connected ? "live adapter connected" : "degraded path will be used"}
                </span>
              </div>
            </Field>
          </div>

          <ToggleRow
            title="Auto-run by default"
            description="새로 생성되는 starter agent와 기존 에이전트의 기본 실행 모드를 자동 실행으로 둡니다."
            checked={autoRun}
            onCheckedChange={setAutoRun}
          />
          <ToggleRow
            title="Allow degraded mode"
            description="실연동 키가 없어도 mock fallback으로 orchestration과 approval surface를 유지합니다."
            checked={allowDegradedMode}
            onCheckedChange={setAllowDegradedMode}
          />
          <ToggleRow
            title="Apply to existing agents"
            description="저장 시 현재 기관의 에이전트 adapter/model 설정도 함께 갱신합니다."
            checked={applyToExistingAgents}
            onCheckedChange={setApplyToExistingAgents}
          />

          <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              <ShieldCheck size={14} style={{ color: "var(--color-teal-500)" }} />
              Codex-first Runtime
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              현재 실사용 기본 경로는 `codex_local`입니다. `OPENAI_API_KEY`가 없으면 degraded mode 정책에 따라
              `mock_local`로 내려가고, fallback adapter는 별도로 기록됩니다.
            </p>
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
          title="Integrations"
          description="연동 readiness와 조직의 운영 선호 설정을 함께 저장합니다."
        >
          <div className="space-y-3">
            {integrations.map((integration: any) => {
              const preference = integrationPrefs[integration.key] ?? { enabled: true, preferredChannel: "", notes: "" }
              return (
                <div
                  key={integration.key}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {integration.label}
                        </div>
                        <StatusPill tone={integration.connected ? "good" : "warn"}>
                          {integration.connected ? "connected" : "missing env"}
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
                    <Field label="Preferred Channel" hint="메시징 계열이면 default channel, 아니면 운영 메모로 사용합니다.">
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
                    <Field label="Ops Notes">
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
                          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
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
          id="instance"
          icon={<Cpu size={16} />}
          title="Instance"
          description="운영자가 보는 control plane 기본 동작을 저장합니다."
        >
          <ToggleRow
            title="Censor username in logs"
            description="운영 로그와 transcript에서 홈 디렉터리 사용자명을 감추는 정책을 저장합니다."
            checked={censorLogs}
            onCheckedChange={setCensorLogs}
          />
          <ToggleRow
            title="Enable keyboard shortcuts"
            description="operator 화면에서 keyboard shortcut을 기본 활성화 상태로 둡니다."
            checked={keyboardShortcuts}
            onCheckedChange={setKeyboardShortcuts}
          />

          <Field label="AI Feedback Sharing" hint="paperclip 캡처처럼 기본 투표 공유 정책을 저장합니다.">
            <Select value={feedbackSharing} onValueChange={setFeedbackSharing}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prompt">Prompt on first use</SelectItem>
                <SelectItem value="allow">Always allow</SelectItem>
                <SelectItem value="deny">Don't allow</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              <Cpu size={14} style={{ color: "var(--color-teal-500)" }} />
              Loaded Control Plane Modules
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {plugins.map((plugin: any) => (
                <Badge key={plugin.key} className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
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
      </div>
    </div>
  )
}
