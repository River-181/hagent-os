import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { orchestratorApi } from "@/api/orchestrator"
import { api } from "@/api/client"
import { skillsApi } from "@/api/skills"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  CheckCircle,
  Building2,
  Bot,
  Rocket,
  Loader2,
  Sparkles,
} from "lucide-react"

const STEPS = [
  { id: "academy", label: "학원 정보", icon: <Building2 size={14} /> },
  { id: "ceo", label: "원장 설정", icon: <Bot size={14} /> },
  { id: "launch", label: "첫 실행", icon: <Rocket size={14} /> },
  { id: "done", label: "완료", icon: <Sparkles size={14} /> },
]

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", desc: "빠르고 정확 — 일반 업무 권장" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "초고속 — 경량 작업 최적화" },
]

const STARTER_AGENT_SKILLS: Record<string, string[]> = {
  orchestrator: ["complaint-classifier", "schedule-manager", "student-data-import"],
  complaint: ["complaint-classifier", "korean-tone-guide"],
  retention: ["churn-risk-calculator", "korean-tone-guide"],
  scheduler: ["google-calendar-mcp", "schedule-manager"],
}

const STARTER_SKILL_COUNT = Array.from(
  new Set(Object.values(STARTER_AGENT_SKILLS).flat()),
).length

type LaunchPhase = "idle" | "dispatching" | "agents-running" | "complete" | "error"

const LAUNCH_MESSAGES = {
  dispatching: "원장 에이전트에게 첫 지시를 전달하고 있습니다...",
  "agents-running": [
    "학원 운영 계획을 수립하고 있습니다...",
    "필요한 직원 채용 계획을 세우는 중...",
    "업무 일정을 정리하고 있습니다...",
    "결과를 정리하고 승인 요청을 준비합니다...",
  ],
  complete: "원장 에이전트가 학원 운영을 시작했습니다!",
}

interface CreatedOrg {
  id: string
  prefix: string
  name: string
}

interface CreatedAgent {
  id: string
  name: string
}

export function OnboardingPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { setSelectedOrgId } = useOrganization()
  const navigate = useNavigate()

  const [activeStep, setActiveStep] = useState("academy")
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  // Step 1: academy info
  const [orgName, setOrgName] = useState("")
  const [orgDesc, setOrgDesc] = useState("")
  const [orgMission, setOrgMission] = useState("")

  // Step 2: CEO agent
  const [agentName, setAgentName] = useState("원장")
  const [agentModel, setAgentModel] = useState("claude-sonnet-4-6")

  // Created entities
  const [createdOrg, setCreatedOrg] = useState<CreatedOrg | null>(null)
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null)

  // Launch state
  const [launchPhase, setLaunchPhase] = useState<LaunchPhase>("idle")
  const [launchMsg, setLaunchMsg] = useState("")
  const [dispatchResult, setDispatchResult] = useState<{ plan: string; runs: string[] } | null>(null)
  const [launchError, setLaunchError] = useState("")

  const stepIndex = STEPS.findIndex((s) => s.id === activeStep)

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]))
  }

  const goNext = () => {
    markComplete(activeStep)
    const next = STEPS[stepIndex + 1]
    if (next) setActiveStep(next.id)
  }

  const goPrev = () => {
    const prev = STEPS[stepIndex - 1]
    if (prev) setActiveStep(prev.id)
  }

  const handleTabClick = (stepId: string) => {
    const targetIndex = STEPS.findIndex((s) => s.id === stepId)
    const canNavigate =
      targetIndex === 0 || completedSteps.has(STEPS[targetIndex - 1].id)
    if (canNavigate) setActiveStep(stepId)
  }

  // Step 1: Create org
  const createOrgMutation = useMutation({
    mutationFn: () =>
      api.post<CreatedOrg>("/organizations", {
        name: orgName.trim(),
        description: [orgDesc.trim(), orgMission.trim()].filter(Boolean).join(" | ") || null,
      }),
    onSuccess: (org) => {
      setCreatedOrg(org)
      setSelectedOrgId(org.id)
      goNext()
    },
  })

  // Step 2: Create starter team (CEO + 3 agents)
  const createAgentMutation = useMutation({
    mutationFn: async () => {
      if (!createdOrg) throw new Error("No org")

      const starterAgents = [
        { name: agentName.trim() || "원장", agentType: "orchestrator", slug: "orchestrator", icon: "brain",
          systemPrompt: `${createdOrg.name}의 원장(CEO)으로서 학원 운영 전반을 조율하는 AI 매니저입니다. 운영 목표: ${orgMission || orgDesc}` },
        { name: "민원담당", agentType: "complaint", slug: "complaint", icon: "shield",
          systemPrompt: `${createdOrg.name}의 학부모 민원을 접수하고 분석하여 응대 초안을 작성합니다.` },
        { name: "이탈방어", agentType: "retention", slug: "retention", icon: "heart",
          systemPrompt: `${createdOrg.name}의 수강생 이탈 위험을 감지하고 상담 권고를 생성합니다.` },
        { name: "스케줄러", agentType: "scheduler", slug: "scheduler", icon: "calendar",
          systemPrompt: `${createdOrg.name}의 수업 일정을 관리하고 강사 대타를 조율합니다.` },
      ]

      let ceoAgent: any = null
      let ceoId: string | null = null

      // 에이전트 4종 순차 생성 (CEO 먼저, 나머지는 reportsTo CEO)
      for (const agentDef of starterAgents) {
        const created = await agentsApi.create(createdOrg.id, {
          ...agentDef,
          adapterConfig: { model: agentModel },
          reportsTo: agentDef.agentType === "orchestrator" ? undefined : ceoId,
          status: "idle",
          skills: [],
        })
        if (agentDef.agentType === "orchestrator") {
          ceoAgent = created
          ceoId = created.id
        }
      }

      // 스킬 설치 (실패해도 무시)
      const uniqueSkills = Array.from(new Set(Object.values(STARTER_AGENT_SKILLS).flat()))
      for (const skillSlug of uniqueSkills) {
        await skillsApi.install(createdOrg.id, skillSlug).catch(() => undefined)
      }

      return {
        id: ceoAgent?.id ?? "",
        name: agentName.trim() || "원장",
      }
    },
    onSuccess: (agent: CreatedAgent) => {
      setCreatedAgent(agent)
      goNext()
    },
  })

  // Step 3: Dispatch first task
  const dispatchMutation = useMutation({
    mutationFn: () => {
      if (!createdOrg) throw new Error("No org")
      return orchestratorApi.dispatch({
        instruction: "학원 운영을 시작합니다. 필요한 직원을 채용하고 업무 계획을 세워주세요.",
        organizationId: createdOrg.id,
      })
    },
    onMutate: () => {
      setLaunchPhase("dispatching")
      setLaunchMsg(LAUNCH_MESSAGES.dispatching)
      setLaunchError("")
    },
    onSuccess: (data) => {
      setDispatchResult(data)
      setLaunchPhase("agents-running")
      const msgs = LAUNCH_MESSAGES["agents-running"]
      let i = 0
      setLaunchMsg(msgs[0])
      const interval = setInterval(() => {
        i++
        if (i < msgs.length) {
          setLaunchMsg(msgs[i])
        } else {
          clearInterval(interval)
          setLaunchPhase("complete")
          setLaunchMsg(LAUNCH_MESSAGES.complete)
          markComplete("launch")
          setActiveStep("done")
        }
      }, 1500)
    },
    onError: () => {
      setLaunchPhase("error")
      setLaunchError("에이전트 실행 중 문제가 발생했습니다. 다시 시도해 주세요.")
    },
  })

  useEffect(() => {
    setBreadcrumbs([{ label: "온보딩" }])
  }, [setBreadcrumbs])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        학원 AI 팀 설정
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        학원 정보를 입력하고 기본 에이전트 팀과 starter skill package를 준비하세요.
      </p>

      <Tabs value={activeStep} onValueChange={() => {}}>
        <TabsList className="w-full mb-6 grid grid-cols-4">
          {STEPS.map((step) => {
            const idx = STEPS.findIndex((s) => s.id === step.id)
            const canClick =
              idx === 0 || completedSteps.has(STEPS[idx - 1].id)
            return (
              <TabsTrigger
                key={step.id}
                value={step.id}
                disabled={!canClick}
                onClick={() => handleTabClick(step.id)}
                className="flex items-center gap-1.5 text-xs"
              >
                {completedSteps.has(step.id) ? (
                  <CheckCircle size={13} className="text-teal-500" />
                ) : (
                  step.icon
                )}
                {step.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Step 1: 학원 정보 */}
        <TabsContent value="academy">
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🏫</span>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                학원 정보를 입력해 주세요
              </h2>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              학원 이름과 운영 목표를 입력하면 AI 팀이 맞춤 설정됩니다.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  학원 이름 *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="예: 탄자니아 영어학원"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  학원 소개
                </label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  rows={2}
                  placeholder="예: 대치동 영어 전문 학원. 수준별 맞춤 교육."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  운영 목표 (미션)
                </label>
                <textarea
                  value={orgMission}
                  onChange={(e) => setOrgMission(e.target.value)}
                  rows={2}
                  placeholder="예: 입시 영어부터 회화까지 책임지는 1등 학원"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {createOrgMutation.isError && (
              <p className="text-xs mt-3" style={{ color: "var(--color-danger)" }}>
                학원 생성에 실패했습니다. 다시 시도해 주세요.
              </p>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => createOrgMutation.mutate()}
                disabled={!orgName.trim() || createOrgMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40 inline-flex items-center gap-1.5"
                style={{ background: "var(--color-teal-500)", color: "#fff" }}
              >
                {createOrgMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                다음 →
              </button>
            </div>
          </div>
        </TabsContent>

        {/* Step 2: 원장(CEO) 에이전트 생성 */}
        <TabsContent value="ceo">
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">👑</span>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                원장 에이전트와 starter skills를 설정합니다
              </h2>
            </div>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
              기본으로 생성된 오케스트레이터를 <strong>{createdOrg?.name ?? orgName}</strong>의 원장(CEO) 역할로 구성합니다.
            </p>
            <p className="text-xs mb-6 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(20,184,166,0.06)", color: "var(--text-secondary)" }}>
              Paperclip의 내장 스킬처럼, 기본 팀에 필요한 starter skill package를 먼저 설치하고 각 에이전트에 장착합니다.
            </p>

            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Starter skill packages
              </p>
              <div className="flex gap-2 flex-wrap">
                {Array.from(new Set(Object.values(STARTER_AGENT_SKILLS).flat())).map((skillSlug) => (
                  <span
                    key={skillSlug}
                    className="text-[10px] px-2 py-1 rounded-full"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    {skillSlug}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  에이전트 이름
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="원장"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  AI 모델
                </label>
                <div className="flex flex-col gap-2">
                  {MODEL_OPTIONS.map((opt) => {
                    const selected = agentModel === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAgentModel(opt.value)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: selected ? "rgba(20,184,166,0.08)" : "var(--bg-secondary)",
                          border: selected ? "1px solid var(--color-teal-500)" : "1px solid var(--border-default)",
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                          style={{
                            border: selected ? "none" : "2px solid var(--border-default)",
                            backgroundColor: selected ? "var(--color-teal-500)" : "transparent",
                          }}
                        >
                          {selected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {opt.label}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {createAgentMutation.isError && (
              <p className="text-xs mt-3" style={{ color: "var(--color-danger)" }}>
                starter team 설정에 실패했습니다. 다시 시도해 주세요.
              </p>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={goPrev}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--bg-secondary)]"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
              >
                ← 이전
              </button>
              <button
                onClick={() => createAgentMutation.mutate()}
                disabled={createAgentMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40 inline-flex items-center gap-1.5"
                style={{ background: "var(--color-teal-500)", color: "#fff" }}
              >
                {createAgentMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                starter team 준비 →
              </button>
            </div>
          </div>
        </TabsContent>

        {/* Step 3: 첫 실행 */}
        <TabsContent value="launch">
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {launchPhase === "idle" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🚀</span>
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    원장 에이전트와 starter team이 학원 운영을 시작합니다
                  </h2>
                </div>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                  아래 버튼을 누르면 <strong>{createdAgent?.name ?? agentName}</strong> 에이전트가 첫 번째 지시를 받고 기본 팀과 스킬이 함께 동작합니다.
                </p>

                <div
                  className="rounded-xl p-4 mb-6 space-y-3"
                  style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} style={{ color: "var(--color-success)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      <strong>{createdOrg?.name ?? orgName}</strong> 학원 생성 완료
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} style={{ color: "var(--color-success)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      원장 에이전트 <strong>"{createdAgent?.name ?? agentName}"</strong> 설정 완료
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} style={{ color: "var(--color-success)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      starter skill package <strong>{STARTER_SKILL_COUNT}개</strong> 설치 및 장착 완료
                    </span>
                  </div>
                  <div
                    className="flex items-start gap-3 mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{ backgroundColor: "rgba(20,184,166,0.06)", color: "var(--text-secondary)" }}
                  >
                    <Bot size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-teal-500)" }} />
                    "학원 운영을 시작합니다. 필요한 직원을 채용하고 업무 계획을 세워주세요."
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={goPrev}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    ← 이전
                  </button>
                  <button
                    onClick={() => dispatchMutation.mutate()}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold gap-2 inline-flex items-center"
                    style={{
                      background: "linear-gradient(135deg, #0ea5b0, #0d9488)",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(14,165,176,0.3)",
                    }}
                  >
                    <Sparkles size={15} />
                    학원 운영 시작하기
                  </button>
                </div>
              </>
            )}

            {(launchPhase === "dispatching" || launchPhase === "agents-running") && (
              <div className="flex flex-col items-center py-8">
                <div className="relative mb-8">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(20,184,166,0.1)", border: "2px solid var(--color-teal-500)" }}
                  >
                    <Bot size={32} style={{ color: "var(--color-teal-500)" }} />
                  </div>
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: "rgba(20,184,166,0.15)" }}
                  />
                </div>

                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {launchPhase === "dispatching" ? "원장 에이전트 가동 중..." : "학원 운영 계획 수립 중..."}
                </h2>

                <p
                  className="text-sm text-center mb-6 transition-opacity duration-500"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {launchMsg}
                </p>

                <div className="flex gap-1.5 mb-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: "var(--color-teal-500)",
                        animationDelay: `${i * 300}ms`,
                      }}
                    />
                  ))}
                </div>

                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "rgba(20,184,166,0.08)",
                    color: "var(--color-teal-500)",
                    border: "1px solid rgba(20,184,166,0.2)",
                  }}
                >
                  <Loader2 size={10} className="animate-spin" />
                  {createdAgent?.name ?? agentName}
                </div>
                <p className="mt-5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  기본 팀과 starter skill package가 준비된 상태에서 첫 실행을 진행합니다.
                </p>
              </div>
            )}

            {launchPhase === "error" && (
              <div className="flex flex-col items-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
                >
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--color-danger)" }}>
                  {launchError}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setLaunchPhase("idle"); setLaunchError("") }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    다시 시도
                  </button>
                  <button
                    onClick={() => navigate(`/${createdOrg?.prefix}/dashboard`)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "var(--color-teal-500)", color: "#fff" }}
                  >
                    대시보드로 이동
                  </button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Step 4: 완료 */}
        <TabsContent value="done">
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="flex flex-col items-center py-8">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "2px solid var(--color-success)" }}
              >
                <CheckCircle size={36} style={{ color: "var(--color-success)" }} />
              </div>

              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                학원 AI 팀이 가동되었습니다!
              </h2>

              <p className="text-sm mb-2 text-center" style={{ color: "var(--text-secondary)" }}>
                <strong>{createdOrg?.name}</strong>의 원장 에이전트가 운영을 시작했습니다.
              </p>

              {dispatchResult?.runs !== undefined && (
                <p className="text-xs mb-2 text-center" style={{ color: "var(--text-tertiary)" }}>
                  {dispatchResult.runs.length}개의 작업이 실행되었습니다.
                </p>
              )}

              {dispatchResult?.plan && (
                <div
                  className="rounded-xl px-4 py-3 text-xs mb-6 max-w-md text-center"
                  style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                >
                  {dispatchResult.plan}
                </div>
              )}

              <button
                onClick={() => navigate(`/${createdOrg?.prefix}/dashboard`)}
                className="px-6 py-2.5 rounded-lg text-sm font-bold inline-flex items-center gap-2"
                style={{ background: "var(--color-teal-500)", color: "#fff" }}
              >
                <Rocket size={15} />
                대시보드로 이동
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
