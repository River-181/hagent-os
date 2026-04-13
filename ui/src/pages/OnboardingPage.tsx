import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  Radio,
  Database,
  Users2,
  ClipboardList,
  Rocket,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  KeyRound,
  PlayCircle,
} from "lucide-react"
import { organizationsApi } from "@/api/organizations"
import { useOrganization } from "@/context/OrganizationContext"
import { queryKeys } from "@/lib/queryKeys"

const STEPS = [
  { id: "academy", label: "Academy", icon: Building2 },
  { id: "channels", label: "Channels", icon: Radio },
  { id: "data", label: "Data", icon: Database },
  { id: "team", label: "Team", icon: Users2 },
  { id: "setup", label: "Setup Project", icon: ClipboardList },
  { id: "launch", label: "Launch", icon: Rocket },
] as const

const MODEL_OPTIONS = [
  {
    value: "codex_qauth",
    model: "gpt-5-codex",
    label: "Codex QAuth (Recommended)",
    description: "ChatGPT 로그인 기반 실사용 실행",
  },
  {
    value: "codex_local",
    model: "gpt-5-codex",
    label: "Codex API Key",
    description: "OPENAI_API_KEY 기반 실행",
  },
  {
    value: "claude_local",
    model: "claude-sonnet-4-6",
    label: "Claude Sonnet",
    description: "fallback runtime",
  },
] as const

const AGENT_PRESETS = [
  {
    role: "orchestrator",
    label: "원장 오케스트레이터",
    defaultName: "원장",
    summary: "전체 운영 조율과 작업 분배",
    skills: ["complaint-classifier", "schedule-manager", "student-data-import"],
  },
  {
    role: "complaint",
    label: "민원 담당",
    defaultName: "민원담당",
    summary: "민원, 환불, 민감 응대",
    skills: ["complaint-classifier", "korean-tone-guide", "message-template-pack"],
  },
  {
    role: "counseling",
    label: "상담 코디네이터",
    defaultName: "상담 코디네이터",
    summary: "상담 분류와 답변 흐름",
    skills: ["korean-tone-guide", "message-template-pack", "student-360-view"],
  },
  {
    role: "retention",
    label: "재등록 분석가",
    defaultName: "이탈방어",
    summary: "이탈 위험 탐지와 개입",
    skills: ["churn-risk-calculator", "student-360-view", "korean-tone-guide"],
  },
  {
    role: "operations",
    label: "출결·결제 운영자",
    defaultName: "운영 코디네이터",
    summary: "출결/결제/후속 공지",
    skills: ["message-template-pack", "student-data-import"],
  },
  {
    role: "scheduler",
    label: "스케줄러",
    defaultName: "스케줄러",
    summary: "상담/보강/대체 수업 일정",
    skills: ["google-calendar-mcp", "schedule-manager", "schedule-optimizer"],
  },
  {
    role: "marketing",
    label: "프로모션 담당",
    defaultName: "프로모션 담당",
    summary: "프로젝트·캠페인 산출물",
    skills: ["message-template-pack", "korean-tone-guide"],
  },
] as const

const DEMO_ACADEMY_PRESET = {
  institutionName: "Tanzania English Academy",
  institutionType: "영어학원",
  institutionSize: "중형",
  topGoal: "민원 대응 속도와 재원 유지율을 동시에 높이기",
  description: "탄자니아 영어학원 데모 preset",
  principalName: "원장",
  starterProjectName: "운영 시작",
  setupProjectName: "Academy Setup",
  initialInstruction: "오늘 들어온 민원과 상담 요청, 이번 주 일정 이슈를 우선순위대로 정리해줘.",
  studentsImportMode: "preset" as const,
  studentsCountHint: "48",
  instructorsCountHint: "6",
  faqNotes: "자주 묻는 질문은 보강 규정, 환불 정책, 레벨 테스트 예약입니다.",
  counselingPolicy: "상담 요청은 24시간 이내 1차 답변, 필요시 3일 내 예약 확정",
  refundPolicy: "환불 문의는 접수 후 법령/약관 기준으로 초안 작성 후 원장 승인",
  attendancePolicy: "결석 2회 또는 지각 3회 이상 시 보호자 안내와 follow-up 생성",
}

type StepId = (typeof STEPS)[number]["id"]
type Mode = "scratch" | "demo"

interface TeamSelection {
  role: string
  enabled: boolean
  name: string
}

function ChannelCard({
  title,
  description,
  enabled,
  onToggle,
  children,
  status,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: (next: boolean) => void
  children?: ReactNode
  status: string
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: enabled ? "var(--color-teal-500)" : "var(--border-default)",
        background: enabled ? "var(--color-primary-bg)" : "var(--bg-base)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium" style={{ color: "var(--text-primary)" }}>{title}</div>
          <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{description}</div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: enabled ? "var(--color-teal-500)" : "var(--bg-tertiary)",
            color: enabled ? "#fff" : "var(--text-secondary)",
          }}
        >
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
        {status}
      </div>
      {children ? <div className="mt-4 space-y-3">{children}</div> : null}
    </div>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setSelectedOrgId } = useOrganization()

  const [stepIndex, setStepIndex] = useState(0)
  const [mode, setMode] = useState<Mode>("scratch")
  const [institutionName, setInstitutionName] = useState("")
  const [institutionType, setInstitutionType] = useState("영어학원")
  const [institutionSize, setInstitutionSize] = useState("중형")
  const [topGoal, setTopGoal] = useState("민원 대응 속도와 재원 유지율을 동시에 높이기")
  const [description, setDescription] = useState("")
  const [principalName, setPrincipalName] = useState("원장")
  const [starterTeamPreset, setStarterTeamPreset] = useState("academy-core")
  const [starterProjectName, setStarterProjectName] = useState("운영 시작")
  const [setupProjectName, setSetupProjectName] = useState("Academy Setup")
  const [initialInstruction, setInitialInstruction] = useState("오늘 들어온 민원과 상담 요청, 이번 주 일정 이슈를 우선순위대로 정리해줘.")
  const [selectedAdapterType, setSelectedAdapterType] = useState<(typeof MODEL_OPTIONS)[number]["value"]>("codex_qauth")
  const [byoApiKey, setByoApiKey] = useState("")
  const [testingAdapter, setTestingAdapter] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    preview?: string
    error?: string
    degraded?: boolean
  } | null>(null)

  // 초보자·심사위원용 가이드 오버레이 — localStorage 로 1회성
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem("hagent.onboarding.guide.seen") !== "true"
  })
  function dismissGuide() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hagent.onboarding.guide.seen", "true")
    }
    setShowGuide(false)
  }

  const [kakaoEnabled, setKakaoEnabled] = useState(true)
  const [kakaoChannelId, setKakaoChannelId] = useState("tanzania-channel")
  const [telegramEnabled, setTelegramEnabled] = useState(true)
  const [telegramBotToken, setTelegramBotToken] = useState("telegram-demo-token")
  const [telegramBotUsername, setTelegramBotUsername] = useState("tanzania_ops_bot")
  const [telegramOwnerControlEnabled, setTelegramOwnerControlEnabled] = useState(true)
  const [telegramOwnerControlPassword, setTelegramOwnerControlPassword] = useState("")
  const [telegramOwnerControlSessionTtl, setTelegramOwnerControlSessionTtl] = useState("240")
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [naverEnabled, setNaverEnabled] = useState(false)

  const [studentsImportMode, setStudentsImportMode] = useState<"manual" | "csv" | "preset">("preset")
  const [studentsCountHint, setStudentsCountHint] = useState("48")
  const [instructorsCountHint, setInstructorsCountHint] = useState("6")
  const [faqNotes, setFaqNotes] = useState("자주 묻는 질문은 보강 규정, 환불 정책, 레벨 테스트 예약입니다.")
  const [counselingPolicy, setCounselingPolicy] = useState("상담 요청은 24시간 이내 1차 답변, 필요시 3일 내 예약 확정")
  const [refundPolicy, setRefundPolicy] = useState("환불 문의는 접수 후 법령/약관 기준으로 초안 작성 후 원장 승인")
  const [attendancePolicy, setAttendancePolicy] = useState("결석 2회 또는 지각 3회 이상 시 보호자 안내와 follow-up 생성")

  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>(
    AGENT_PRESETS.map((preset) => ({
      role: preset.role,
      enabled: ["orchestrator", "complaint", "retention", "scheduler"].includes(preset.role),
      name: preset.role === "orchestrator" ? "원장" : preset.defaultName,
    })),
  )

  function applyDemoPreset() {
    setMode("demo")
    setInstitutionName(DEMO_ACADEMY_PRESET.institutionName)
    setInstitutionType(DEMO_ACADEMY_PRESET.institutionType)
    setInstitutionSize(DEMO_ACADEMY_PRESET.institutionSize)
    setTopGoal(DEMO_ACADEMY_PRESET.topGoal)
    setDescription(DEMO_ACADEMY_PRESET.description)
    setPrincipalName(DEMO_ACADEMY_PRESET.principalName)
    setStarterProjectName(DEMO_ACADEMY_PRESET.starterProjectName)
    setSetupProjectName(DEMO_ACADEMY_PRESET.setupProjectName)
    setInitialInstruction(DEMO_ACADEMY_PRESET.initialInstruction)
    setStudentsImportMode(DEMO_ACADEMY_PRESET.studentsImportMode)
    setStudentsCountHint(DEMO_ACADEMY_PRESET.studentsCountHint)
    setInstructorsCountHint(DEMO_ACADEMY_PRESET.instructorsCountHint)
    setFaqNotes(DEMO_ACADEMY_PRESET.faqNotes)
    setCounselingPolicy(DEMO_ACADEMY_PRESET.counselingPolicy)
    setRefundPolicy(DEMO_ACADEMY_PRESET.refundPolicy)
    setAttendancePolicy(DEMO_ACADEMY_PRESET.attendancePolicy)
    setTelegramOwnerControlEnabled(true)
  }

  function applyScratchMode() {
    setMode("scratch")
    if (institutionName === DEMO_ACADEMY_PRESET.institutionName) {
      setInstitutionName("")
    }
    if (description === DEMO_ACADEMY_PRESET.description) {
      setDescription("")
    }
  }

  const currentStep = STEPS[stepIndex]
  const selectedModel = useMemo(
    () => MODEL_OPTIONS.find((option) => option.value === selectedAdapterType)?.model ?? "gpt-5-codex",
    [selectedAdapterType],
  )
  const selectedAgents = useMemo(
    () =>
      teamSelections
        .filter((item) => item.enabled)
        .map((item) => {
          const preset = AGENT_PRESETS.find((candidate) => candidate.role === item.role)
          return {
            role: item.role,
            name: item.name,
            mountedSkills: preset?.skills ?? [],
            allowedChannels: ["kakao", "telegram"],
            adapterType: selectedAdapterType,
            model: selectedModel,
            autoRun: true,
          }
        }),
    [selectedAdapterType, selectedModel, teamSelections],
  )
  const selectedPacks = useMemo(() => {
    const packs = new Set<string>()
    if (kakaoEnabled || telegramEnabled || smsEnabled || naverEnabled) packs.add("channel-setup-pack")
    if (kakaoEnabled || telegramEnabled) packs.add("kakao-complaint-pack")
    if (refundPolicy.trim()) packs.add("compliance-setup-pack")
    if (refundPolicy.trim()) packs.add("compliance-refund-pack")
    if (attendancePolicy.trim()) packs.add("schedule-operations-pack")
    packs.add("document-setup-pack")
    packs.add("academy-bootstrap-pack")
    return Array.from(packs)
  }, [attendancePolicy, kakaoEnabled, naverEnabled, refundPolicy, smsEnabled, telegramEnabled])


  const bootstrapMutation = useMutation({
    mutationFn: () =>
      organizationsApi.bootstrap({
        institutionName,
        institutionType,
        institutionSize,
        topGoal,
        description,
        principalName,
        starterProjectName,
        starterTeamPreset,
        setupProjectName,
        initialInstruction,
        selectedAdapterType,
        selectedModel,
        byoApiKey: byoApiKey.trim() || undefined,
        mode,
        channels: {
          kakao: {
            enabled: kakaoEnabled,
            channelId: kakaoChannelId,
            displayName: "Kakao Channel",
            inboundPurpose: "민원/상담/보강 요청",
            routingPriority: 1,
          },
          telegram: {
            enabled: telegramEnabled,
            botToken: telegramBotToken,
            botUsername: telegramBotUsername,
            displayName: "Telegram Bot",
            inboundPurpose: "운영 알림/상담 수집",
            routingPriority: 2,
            ownerControl: telegramEnabled && telegramOwnerControlEnabled
              ? {
                  enabled: true,
                  password: telegramOwnerControlPassword.trim() || undefined,
                  sessionTtlMinutes: Number(telegramOwnerControlSessionTtl || 240),
                  allowNaturalLanguage: true,
                  confirmDangerousMutations: true,
                }
              : {
                  enabled: false,
                  sessionTtlMinutes: Number(telegramOwnerControlSessionTtl || 240),
                  allowNaturalLanguage: true,
                  confirmDangerousMutations: true,
                },
          },
          sms: {
            enabled: smsEnabled,
            displayName: "SMS",
            inboundPurpose: "결제/알림",
            routingPriority: 3,
          },
          naver: {
            enabled: naverEnabled,
            displayName: "Naver",
            inboundPurpose: "문의 수집",
            routingPriority: 4,
          },
        },
        dataImports: {
          students: {
            mode: studentsImportMode,
            countHint: Number(studentsCountHint || 0),
            sourceName: mode === "demo" ? "Tanzania preset" : "academy-import",
          },
          instructors: {
            mode: studentsImportMode,
            countHint: Number(instructorsCountHint || 0),
            sourceName: mode === "demo" ? "Tanzania preset" : "academy-import",
          },
        },
        policyInputs: {
          counselingPolicy,
          refundPolicy,
          attendancePolicy,
          faqNotes,
        },
        selectedAgents,
      }),
    onSuccess: (result) => {
      setSelectedOrgId(result.organization.id)
      queryClient.setQueryData<any[]>(queryKeys.organizations.all, (current = []) => {
        const next = Array.isArray(current) ? current.filter((item) => item.id !== result.organization.id) : []
        return [result.organization, ...next]
      })

      const projectId = result.setupProject?.id ?? result.project?.id
      const destination = projectId
        ? `/${result.organization.prefix}/projects/${projectId}`
        : `/${result.organization.prefix}/dashboard`

      navigate(destination, { replace: true })
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
    },
  })

  const canAdvance = () => {
    const stepId = currentStep.id as StepId
    if (stepId === "academy") return institutionName.trim().length >= 2 && topGoal.trim().length >= 2
    if (stepId === "channels") {
      const hasAnyPrimaryChannel = (kakaoEnabled && kakaoChannelId.trim().length > 0) || (telegramEnabled && telegramBotToken.trim().length > 0) || (!kakaoEnabled && !telegramEnabled)
      const ownerControlReady = !telegramEnabled || !telegramOwnerControlEnabled || telegramOwnerControlPassword.trim().length >= 4
      return hasAnyPrimaryChannel && ownerControlReady
    }
    if (stepId === "data") return counselingPolicy.trim().length >= 2 && refundPolicy.trim().length >= 2
    if (stepId === "team") return selectedAgents.length >= 2 && selectedAgents.some((agent) => agent.role === "orchestrator")
    if (stepId === "setup") return setupProjectName.trim().length >= 2 && initialInstruction.trim().length >= 2
    return true
  }

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex((value) => value + 1)
  }

  const prev = () => {
    if (stepIndex > 0) setStepIndex((value) => value - 1)
  }

  return (
    <div style={{ height: "100dvh", overflow: "auto", backgroundColor: "var(--bg-secondary)" }}>
    {showGuide ? <WelcomeGuide onClose={dismissGuide} onApplyDemo={() => { applyDemoPreset(); dismissGuide() }} /> : null}
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="rounded-3xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
        <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-tertiary)" }}>
          Academy Setup
        </div>
        <div className="mt-4 space-y-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const active = index === stepIndex
            const done = index < stepIndex
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (index <= stepIndex) setStepIndex(index)
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
                style={{
                  background: active ? "var(--color-primary-bg)" : "transparent",
                  color: active ? "var(--color-teal-500)" : "var(--text-secondary)",
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: done ? "rgba(16,185,129,0.12)" : "var(--bg-tertiary)" }}>
                  {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </span>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
                    Step {index + 1}
                  </div>
                  <div className="text-sm font-medium">{step.label}</div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="rounded-3xl border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
        {currentStep.id === "academy" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Academy 기본 정보</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                이번 온보딩은 기관 생성이 아니라 `Academy Setup Project`를 바로 시작하는 흐름입니다.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["scratch", "demo"] as Mode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    if (option === "demo") {
                      applyDemoPreset()
                      return
                    }
                    applyScratchMode()
                  }}
                  className="rounded-2xl border px-4 py-4 text-left"
                  style={{
                    borderColor: mode === option ? "var(--color-teal-500)" : "var(--border-default)",
                    background: mode === option ? "var(--color-primary-bg)" : "var(--bg-base)",
                  }}
                >
                  <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {option === "scratch" ? "Start from scratch" : "Load demo academy"}
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {option === "scratch" ? "처음부터 기관과 채널, 데이터, 팀을 구성" : "Tanzania English Academy preset을 바로 로드"}
                  </div>
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>기관명</span>
              <input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>기관 유형</span>
                <input value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>기관 규모</span>
                <input value={institutionSize} onChange={(e) => setInstitutionSize(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Top Goal</span>
              <textarea value={topGoal} onChange={(e) => setTopGoal(e.target.value)} rows={3} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>설명</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
          </div>
        ) : null}

        {currentStep.id === "channels" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>운영 채널 연결</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                1차 실연동은 `Kakao + Telegram`입니다. `SMS / Naver`는 readiness만 저장합니다.
              </p>
            </div>
            <ChannelCard
              title="Kakao Channel"
              description="민원, 상담, 환불, 보강 요청을 주요 인바운드 채널로 사용"
              enabled={kakaoEnabled}
              onToggle={setKakaoEnabled}
              status={kakaoEnabled && kakaoChannelId ? "connected candidate" : "inactive"}
            >
              <input value={kakaoChannelId} onChange={(e) => setKakaoChannelId(e.target.value)} placeholder="channel id" className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </ChannelCard>
            <ChannelCard
              title="Telegram Bot"
              description="운영 알림, 상담 수집, 원장 Telegram 제어"
              enabled={telegramEnabled}
              onToggle={setTelegramEnabled}
              status={telegramEnabled && telegramBotToken ? "connected candidate" : "inactive"}
            >
              <input value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="bot token" className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
              <input value={telegramBotUsername} onChange={(e) => setTelegramBotUsername(e.target.value)} placeholder="bot username" className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
              <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>원장 Telegram 제어 활성화</span>
                  <input type="checkbox" checked={telegramOwnerControlEnabled} onChange={(e) => setTelegramOwnerControlEnabled(e.target.checked)} />
                </label>
                <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  원장이 Telegram에서 `/login &lt;password&gt;` 후 케이스, 승인, 일정 조회와 변경 작업을 수행합니다.
                </div>
                {telegramOwnerControlEnabled ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input value={telegramOwnerControlPassword} onChange={(e) => setTelegramOwnerControlPassword(e.target.value)} placeholder="owner control password" className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
                    <input value={telegramOwnerControlSessionTtl} onChange={(e) => setTelegramOwnerControlSessionTtl(e.target.value.replace(/[^0-9]/g, ""))} placeholder="session ttl minutes" className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
                  </div>
                ) : null}
              </div>
            </ChannelCard>
            <div className="grid gap-4 md:grid-cols-2">
              <ChannelCard title="SMS" description="결제/공지 fallback" enabled={smsEnabled} onToggle={setSmsEnabled} status={smsEnabled ? "readiness only" : "inactive"} />
              <ChannelCard title="Naver" description="문의 채널 placeholder" enabled={naverEnabled} onToggle={setNaverEnabled} status={naverEnabled ? "readiness only" : "inactive"} />
            </div>
          </div>
        ) : null}

        {currentStep.id === "data" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>데이터와 정책</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                학생/강사 데이터와 운영 정책을 먼저 넣어야 에이전트가 빈 머리로 일하지 않습니다.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>학생 데이터 모드</span>
                <select value={studentsImportMode} onChange={(e) => setStudentsImportMode(e.target.value as "manual" | "csv" | "preset")} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }}>
                  <option value="preset">preset</option>
                  <option value="csv">csv</option>
                  <option value="manual">manual</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>학생 수 힌트</span>
                <input value={studentsCountHint} onChange={(e) => setStudentsCountHint(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>강사 수 힌트</span>
              <input value={instructorsCountHint} onChange={(e) => setInstructorsCountHint(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>상담 정책</span>
              <textarea value={counselingPolicy} onChange={(e) => setCounselingPolicy(e.target.value)} rows={3} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>환불 정책</span>
              <textarea value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} rows={3} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>출결 정책</span>
              <textarea value={attendancePolicy} onChange={(e) => setAttendancePolicy(e.target.value)} rows={3} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>FAQ / Notes</span>
              <textarea value={faqNotes} onChange={(e) => setFaqNotes(e.target.value)} rows={3} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
          </div>
        ) : null}

        {currentStep.id === "team" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>에이전트 고용과 모델</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                기본 UX는 추천 역할 선택, 고용, 정체성 세팅 순서입니다. 테스트 기준은 `Codex first`입니다.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>원장 이름</span>
              <input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <div className="space-y-3">
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedAdapterType(option.value)}
                  className="flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left"
                  style={{
                    borderColor: selectedAdapterType === option.value ? "var(--color-teal-500)" : "var(--border-default)",
                    background: selectedAdapterType === option.value ? "var(--color-primary-bg)" : "var(--bg-base)",
                  }}
                >
                  <div>
                    <div className="font-medium" style={{ color: "var(--text-primary)" }}>{option.label}</div>
                    <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{option.description}</div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>{option.model}</div>
                </button>
              ))}
            </div>

            {/* BYO API Key — 판사·사용자 자기 키로 테스트 */}
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium" style={{ color: "var(--text-primary)" }}>내 API 키로 연결 (선택)</div>
                  <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    비워두면 서버의 기본 키를 사용합니다. {selectedAdapterType === "claude_local" ? "Anthropic (sk-ant-...)" : "OpenAI (sk-proj-...)"} 키를 넣어 연결 테스트하세요.
                  </div>
                </div>
              </div>
              <input
                type="password"
                value={byoApiKey}
                onChange={(e) => {
                  setByoApiKey(e.target.value)
                  setTestResult(null)
                }}
                placeholder={selectedAdapterType === "claude_local" ? "sk-ant-..." : "sk-proj-..."}
                autoComplete="off"
                className="mt-3 w-full rounded-2xl border px-4 py-3 font-mono text-sm"
                style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={testingAdapter}
                  onClick={async () => {
                    setTestingAdapter(true)
                    setTestResult(null)
                    try {
                      const resp = await fetch("/api/adapters/test", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          key: selectedAdapterType,
                          model: selectedModel,
                          apiKey: byoApiKey.trim() || undefined,
                        }),
                      })
                      const data = await resp.json()
                      if (!resp.ok) {
                        setTestResult({ ok: false, error: data.error ?? "테스트 실패" })
                      } else {
                        setTestResult({
                          ok: true,
                          preview: data.preview,
                          degraded: data.degraded,
                        })
                      }
                    } catch (err) {
                      setTestResult({ ok: false, error: (err as Error).message })
                    } finally {
                      setTestingAdapter(false)
                    }
                  }}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    background: testingAdapter ? "var(--bg-tertiary)" : "var(--color-teal-500)",
                    color: testingAdapter ? "var(--text-secondary)" : "#fff",
                    opacity: testingAdapter ? 0.7 : 1,
                  }}
                >
                  {testingAdapter ? "테스트 중..." : "연결 테스트"}
                </button>
                {testResult ? (
                  testResult.ok ? (
                    <div className="text-sm" style={{ color: testResult.degraded ? "var(--text-secondary)" : "var(--color-teal-500)" }}>
                      {testResult.degraded ? "⚠ degraded (mock 응답)" : "✓ 연결 성공"} — {testResult.preview}
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: "var(--color-red-500, #ef4444)" }}>
                      ✗ {testResult.error}
                    </div>
                  )
                ) : null}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Starter Team Preset</span>
              <select value={starterTeamPreset} onChange={(e) => setStarterTeamPreset(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }}>
                <option value="academy-core">academy-core</option>
                <option value="academy-ops">academy-ops</option>
              </select>
            </label>
            <div className="space-y-3">
              {teamSelections.map((selection, index) => {
                const preset = AGENT_PRESETS.find((item) => item.role === selection.role)!
                return (
                  <div key={selection.role} className="rounded-2xl border p-4" style={{ borderColor: selection.enabled ? "var(--color-teal-500)" : "var(--border-default)", background: selection.enabled ? "var(--color-primary-bg)" : "var(--bg-base)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium" style={{ color: "var(--text-primary)" }}>{preset.label}</div>
                        <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{preset.summary}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTeamSelections((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, enabled: !item.enabled } : item,
                            ),
                          )
                        }
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          background: selection.enabled ? "var(--color-teal-500)" : "var(--bg-tertiary)",
                          color: selection.enabled ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {selection.enabled ? "Hired" : "Off"}
                      </button>
                    </div>
                    {selection.enabled ? (
                      <>
                        <input
                          value={selection.role === "orchestrator" ? principalName : selection.name}
                          onChange={(e) => {
                            const value = e.target.value
                            if (selection.role === "orchestrator") {
                              setPrincipalName(value)
                            }
                            setTeamSelections((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, name: value } : item,
                              ),
                            )
                          }}
                          className="mt-4 w-full rounded-2xl border px-4 py-3"
                          style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                        />
                        <div className="mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          Skills: {preset.skills.join(", ")}
                        </div>
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {currentStep.id === "setup" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Setup Project</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                온보딩 종료 후 dashboard 대신 setup project 상세로 바로 진입합니다.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Starter Project</span>
              <input value={starterProjectName} onChange={(e) => setStarterProjectName(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Setup Project Name</span>
              <input value={setupProjectName} onChange={(e) => setSetupProjectName(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Initial Instruction</span>
              <textarea value={initialInstruction} onChange={(e) => setInitialInstruction(e.target.value)} rows={6} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
          </div>
        ) : null}

        {currentStep.id === "launch" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Launch</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                아래 버튼으로 one-shot academy setup bootstrap을 실행합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => bootstrapMutation.mutate()}
              disabled={bootstrapMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--color-teal-500)" }}
            >
              {bootstrapMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              Academy Setup 실행
            </button>
            {bootstrapMutation.error ? (
              <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(239,68,68,0.25)", color: "var(--color-danger)", background: "rgba(239,68,68,0.06)" }}>
                {(bootstrapMutation.error as Error).message}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={prev} disabled={stepIndex === 0 || bootstrapMutation.isPending} className="rounded-2xl border px-4 py-2 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
            이전
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" onClick={next} disabled={!canAdvance()} className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ background: canAdvance() ? "var(--color-teal-500)" : "var(--bg-tertiary)" }}>
              다음
            </button>
          ) : null}
        </div>
      </section>

      <aside className="rounded-3xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
        <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-tertiary)" }}>
          Preview
        </div>
        <div className="mt-4 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Academy</div>
            <div className="mt-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{institutionName || "새 학원"}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {institutionType} · {institutionSize} · {mode === "demo" ? "Demo preset" : "Scratch mode"}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Channels</div>
            <div className="mt-2 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <div>Kakao: {kakaoEnabled ? kakaoChannelId || "enabled" : "off"}</div>
              <div>Telegram: {telegramEnabled ? telegramBotUsername || "enabled" : "off"}</div>
              <div>Telegram owner control: {telegramEnabled && telegramOwnerControlEnabled ? `on · ${telegramOwnerControlSessionTtl || "240"}m` : "off"}</div>
              <div>SMS: {smsEnabled ? "readiness" : "off"}</div>
              <div>Naver: {naverEnabled ? "readiness" : "off"}</div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Agents</div>
            <div className="mt-2 space-y-2">
              {selectedAgents.map((agent) => (
                <div key={agent.role} className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
                  <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{agent.name}</div>
                  <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {agent.role} · {selectedAdapterType} · {agent.mountedSkills.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Setup Output</div>
            <div className="mt-2 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <div>{setupProjectName}</div>
              <div>setup cases 5개+</div>
              <div>starter project: {starterProjectName}</div>
              <div>model: {selectedModel}</div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Capability Packs</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedPacks.map((pack) => (
                <span
                  key={pack}
                  className="inline-flex rounded-full px-3 py-1.5 text-xs"
                  style={{ backgroundColor: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
                >
                  {pack}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
    </div>
  )
}

/**
 * 첫 방문 / 심사위원용 웰컴 가이드.
 * 핵심 3가지: (1) 이 툴이 뭘 하는 서비스인지 (2) 데모 모드로 바로 체험 (3) 자기 API 키 연결 방법.
 */
function WelcomeGuide({ onClose, onApplyDemo }: { onClose: () => void; onApplyDemo: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border p-8 shadow-2xl"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "var(--color-primary-bg)", color: "var(--color-teal-500)" }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                HagentOS 에 오신 걸 환영합니다
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                학원 민원·이탈·일정을 AI 에이전트 팀으로 처리하는 운영 OS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2"
            style={{ background: "var(--bg-base)", color: "var(--text-tertiary)" }}
            aria-label="가이드 닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
            <PlayCircle size={20} style={{ color: "var(--color-teal-500)" }} />
            <div className="mt-2 font-medium" style={{ color: "var(--text-primary)" }}>1. 데모 바로 체험</div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              탄자니아 영어학원 프리셋으로 25건의 실제 민원·이탈 케이스, 5명 에이전트, 12개 문서가 세팅됩니다. API 키 없이도 mock 응답으로 동작.
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
            <KeyRound size={20} style={{ color: "var(--color-teal-500)" }} />
            <div className="mt-2 font-medium" style={{ color: "var(--text-primary)" }}>2. 내 AI 키로 실제 답변</div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Team 단계에서 OpenAI(sk-proj-...) 또는 Anthropic(sk-ant-...) 키를 붙여 <b>연결 테스트</b>하세요. 없으면 서버 기본 키가 쓰입니다.
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
            <Rocket size={20} style={{ color: "var(--color-teal-500)" }} />
            <div className="mt-2 font-medium" style={{ color: "var(--text-primary)" }}>3. 6단계 세팅</div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Academy → Channels → Data → Team → Setup → Launch. 각 단계는 건너뛸 수 있고, 마지막에 원샷 부트스트랩.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            🔑 API 키를 처음 받으시나요?
          </div>
          <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            <li>• <b>OpenAI</b>: <code style={{ background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 4 }}>platform.openai.com/api-keys</code> → Create new secret key → <code>sk-proj-...</code></li>
            <li>• <b>Anthropic</b>: <code style={{ background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 4 }}>console.anthropic.com/settings/keys</code> → Create key → <code>sk-ant-...</code></li>
            <li>• 키는 이 조직(학원) 한정으로만 저장되고 AI 호출에 사용됩니다.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border px-5 py-3 text-sm font-medium"
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--bg-base)" }}
          >
            직접 채우기
          </button>
          <button
            type="button"
            onClick={onApplyDemo}
            className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
            style={{ background: "var(--color-teal-500)", color: "#fff" }}
          >
            <Sparkles size={16} /> 탄자니아 데모로 시작
          </button>
        </div>
      </div>
    </div>
  )
}
