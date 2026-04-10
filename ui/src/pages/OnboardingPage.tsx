import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Bot, ClipboardList, Rocket, Loader2, CheckCircle2 } from "lucide-react"
import { organizationsApi } from "@/api/organizations"
import { useOrganization } from "@/context/OrganizationContext"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { queryKeys } from "@/lib/queryKeys"

const STEPS = [
  { id: "institution", label: "Institution", icon: Building2 },
  { id: "team", label: "Team", icon: Bot },
  { id: "task", label: "Task", icon: ClipboardList },
  { id: "launch", label: "Launch", icon: Rocket },
] as const

const MODEL_OPTIONS = [
  {
    value: "codex_local",
    model: "gpt-5-codex",
    label: "Codex (Recommended)",
    description: "실사용 테스트 기준 모델",
  },
  {
    value: "claude_local",
    model: "claude-sonnet-4-6",
    label: "Claude Sonnet",
    description: "fallback runtime",
  },
] as const

const STARTER_SKILLS = [
  "complaint-classifier",
  "korean-tone-guide",
  "churn-risk-calculator",
  "student-360-view",
  "schedule-manager",
  "google-calendar-mcp",
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setSelectedOrgId } = useOrganization()
  const { setBreadcrumbs } = useBreadcrumbs()

  const [stepIndex, setStepIndex] = useState(0)
  const [institutionName, setInstitutionName] = useState("")
  const [institutionType, setInstitutionType] = useState("영어학원")
  const [institutionSize, setInstitutionSize] = useState("중형")
  const [topGoal, setTopGoal] = useState("민원 대응 속도와 재원 유지율을 동시에 높이기")
  const [description, setDescription] = useState("")
  const [principalName, setPrincipalName] = useState("원장")
  const [starterTeamPreset, setStarterTeamPreset] = useState("academy-core")
  const [starterProjectName, setStarterProjectName] = useState("운영 시작")
  const [initialInstruction, setInitialInstruction] = useState("오늘 접수된 민원과 이번 주 이탈 위험 학생, 상담/보강 일정까지 한 번에 정리해줘.")
  const [selectedAdapterType, setSelectedAdapterType] = useState<(typeof MODEL_OPTIONS)[number]["value"]>("codex_local")

  const currentStep = STEPS[stepIndex]
  const selectedModel = useMemo(
    () => MODEL_OPTIONS.find((option) => option.value === selectedAdapterType)?.model ?? "gpt-5-codex",
    [selectedAdapterType],
  )

  useEffect(() => {
    setBreadcrumbs([
      { label: "온보딩", href: "#" },
      { label: currentStep.label, href: "#" },
    ])
  }, [currentStep.label, setBreadcrumbs])

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
        initialInstruction,
        selectedAdapterType,
        selectedModel,
      }),
    onSuccess: async (result) => {
      setSelectedOrgId(result.organization.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
      navigate(`/${result.organization.prefix}/dashboard`, { replace: true })
    },
  })

  const canAdvance = () => {
    if (currentStep.id === "institution") {
      return institutionName.trim().length >= 2 && topGoal.trim().length >= 2
    }
    if (currentStep.id === "team") {
      return principalName.trim().length >= 1
    }
    if (currentStep.id === "task") {
      return starterProjectName.trim().length >= 2 && initialInstruction.trim().length >= 2
    }
    return true
  }

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex((value) => value + 1)
  }

  const prev = () => {
    if (stepIndex > 0) setStepIndex((value) => value - 1)
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="rounded-3xl border p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
        <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-tertiary)" }}>
          Setup Wizard
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
        {currentStep.id === "institution" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>기관 기본 정보</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                온보딩 종료 시 기관, 기본 팀, starter project, starter cases가 함께 생성됩니다.
              </p>
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

        {currentStep.id === "team" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>에이전트 팀 설정</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                기본 팀은 `orchestrator / complaint / retention / scheduler`로 고정하고, 모델은 Codex-first로 설정합니다.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>원장 이름</span>
              <input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Starter Team Preset</span>
              <select value={starterTeamPreset} onChange={(e) => setStarterTeamPreset(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }}>
                <option value="academy-core">academy-core</option>
                <option value="academy-ops">academy-ops</option>
              </select>
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
          </div>
        ) : null}

        {currentStep.id === "task" ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>첫 실행 준비</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                bootstrap이 끝나면 바로 first dispatch를 호출합니다.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Starter Project</span>
              <input value={starterProjectName} onChange={(e) => setStarterProjectName(e.target.value)} className="w-full rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
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
                아래 버튼으로 one-shot bootstrap을 실행합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => bootstrapMutation.mutate()}
              disabled={bootstrapMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
              style={{ background: "var(--color-teal-500)", color: "#fff" }}
            >
              {bootstrapMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              기관 부트스트랩 실행
            </button>
            {bootstrapMutation.isError ? (
              <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(239,68,68,0.35)", color: "#fca5a5", background: "rgba(127,29,29,0.12)" }}>
                {(bootstrapMutation.error as Error).message || "온보딩 실행 중 오류가 발생했습니다."}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t pt-5" style={{ borderColor: "var(--border-default)" }}>
          <button type="button" onClick={prev} disabled={stepIndex === 0 || bootstrapMutation.isPending} className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
            이전
          </button>
          {currentStep.id !== "launch" ? (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance()}
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: canAdvance() ? "var(--color-teal-500)" : "var(--bg-tertiary)", color: canAdvance() ? "#fff" : "var(--text-disabled)" }}
            >
              다음
            </button>
          ) : null}
        </div>
      </section>

      <aside className="rounded-3xl border p-5" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
        <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-tertiary)" }}>
          Preview
        </div>
        <div className="mt-4">
          <div className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{institutionName || "새 기관"}</div>
          <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{institutionType} · {institutionSize}</div>
        </div>
        <div className="mt-6 space-y-4 text-sm">
          <div>
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>Starter Team</div>
            <div className="mt-2 space-y-1" style={{ color: "var(--text-secondary)" }}>
              <div>{principalName || "원장"} / orchestrator</div>
              <div>민원담당 / complaint</div>
              <div>이탈방어 / retention</div>
              <div>스케줄러 / scheduler</div>
            </div>
          </div>
          <div>
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>Runtime</div>
            <div className="mt-2" style={{ color: "var(--text-secondary)" }}>{selectedAdapterType} · {selectedModel}</div>
          </div>
          <div>
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>Starter Project</div>
            <div className="mt-2" style={{ color: "var(--text-secondary)" }}>{starterProjectName}</div>
          </div>
          <div>
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>Mounted Skills</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {STARTER_SKILLS.map((skill) => (
                <span key={skill} className="rounded-full px-2 py-1 text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>Initial Dispatch</div>
            <p className="mt-2 leading-6" style={{ color: "var(--text-secondary)" }}>{initialInstruction}</p>
          </div>
        </div>
      </aside>
    </div>
  )
}
