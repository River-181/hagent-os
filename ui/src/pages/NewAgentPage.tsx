import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { agentsApi } from "@/api/agents"
import { skillsApi } from "@/api/skills"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import { Bot, Info } from "lucide-react"

const ROLE_OPTIONS = [
  { value: "orchestrator", label: "오케스트레이터 (총괄 매니저)" },
  { value: "complaint", label: "민원 처리" },
  { value: "retention", label: "이탈 방지" },
  { value: "scheduler", label: "일정 관리" },
  { value: "intake", label: "신규 상담" },
  { value: "staff", label: "강사 지원" },
  { value: "compliance", label: "법규 준수" },
  { value: "notification", label: "알림 발송" },
]

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (권장)" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (경량·빠름)" },
]

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {description ? (
        <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {children}
        {required ? (
          <span className="ml-0.5" style={{ color: "var(--color-danger)" }}>
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function NewAgentPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [role, setRole] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [reportsTo, setReportsTo] = useState("__none__")
  const [model, setModel] = useState("claude-sonnet-4-6")
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([
      { label: "에이전트 팀", href: `/${orgPrefix}/agents` },
      { label: "새 에이전트" },
    ])
  }, [setBreadcrumbs, orgPrefix])

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
    retry: false,
  })

  const { data: skills = [] } = useQuery({
    queryKey: queryKeys.skills.all,
    queryFn: () => skillsApi.list(selectedOrgId ?? undefined),
    retry: false,
  })

  const agentList = agents as any[]
  const skillList = useMemo(() => {
    const list = Array.isArray(skills) ? (skills as any[]) : []
    const seen = new Set<string>()
    return list.filter((skill, index) => {
      const key = String(skill?.slug ?? skill?.id ?? `skill-${index}`)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [skills])
  const isFirstAgent = agentList.length === 0
  const isValid = name.trim().length > 0 && role.length > 0

  const toggleSkill = (slug: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!isValid || submitted) return
    setSubmitted(true)
    setSubmitError(null)

    const payload = {
      name: name.trim(),
      agentType: role,
      slug: toSlug(name),
      systemPrompt: systemPrompt.trim() || undefined,
      reportsTo: reportsTo === "__none__" ? null : reportsTo,
      title: title.trim() || undefined,
      adapterConfig: {
        model,
      },
      skills: Array.from(selectedSkills).map((slug) => ({ slug, enabled: true })),
    }

    try {
      const created = await agentsApi.create(selectedOrgId!, payload)
      const agentId = created?.id ?? created?.data?.id
      if (agentId && orgPrefix) {
        navigate(`/${orgPrefix}/agents/${agentId}`)
      } else {
        navigate(`/${orgPrefix}/agents`)
      }
    } catch {
      setSubmitError("에이전트 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")
      setSubmitted(false)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgPrefix}/agents`)
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="새 에이전트"
        description="학원 운영을 맡는 AI 에이전트를 등록하고 역할, 모델, 스킬을 연결합니다."
        action={
          <>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              취소
            </Button>
            <Button
              type="submit"
              form="new-agent-form"
              disabled={!isValid || submitted}
              className="gap-2"
              style={{
                backgroundColor: isValid ? "var(--color-primary)" : undefined,
                color: "var(--text-on-primary)",
              }}
            >
              {submitted ? "생성 중…" : "에이전트 생성"}
            </Button>
          </>
        }
      />

      <WorkspacePanel>
        <form id="new-agent-form" className="space-y-8 p-6 md:p-8" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
          {isFirstAgent ? (
            <div
              className="flex items-start gap-3 rounded-lg px-4 py-3"
              style={{ backgroundColor: "var(--bg-subtle)" }}
            >
              <Info size={16} className="mt-0.5 shrink-0" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                이것이 학원의 <strong style={{ color: "var(--text-primary)" }}>원장(CEO)</strong> 에이전트가 됩니다.
                다른 에이전트들의 작업을 조율하고 의사결정을 내리는 최상위 에이전트입니다.
              </p>
            </div>
          ) : null}

          <div className="space-y-6">
            <SectionTitle
              title="기본 정보"
              description="이름과 직함은 목록과 조직도에서 가장 먼저 보이는 정보입니다."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <FieldLabel required>에이전트 이름</FieldLabel>
                <Input
                  placeholder="예: 민원 처리 에이전트"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="h-11 text-base"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel hint="조직도에 표시될 직함 (예: 수석 상담사)">직함</FieldLabel>
                <Input
                  placeholder="예: 수석 상담사"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel required>역할</FieldLabel>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger
                    className="h-11"
                    style={{
                      backgroundColor: "var(--bg-muted)",
                      borderColor: "var(--border-default)",
                      color: role ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}
                  >
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel hint="에이전트가 사용할 Claude 모델">모델</FieldLabel>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger
                    className="h-11"
                    style={{
                      backgroundColor: "var(--bg-muted)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel
                  hint={
                    isFirstAgent
                      ? "첫 번째 에이전트는 최상위(원장)로 자동 설정됩니다"
                      : "이 에이전트가 보고할 상위 에이전트"
                  }
                >
                  보고 대상
                </FieldLabel>
                <Select value={reportsTo} onValueChange={setReportsTo} disabled={isFirstAgent}>
                  <SelectTrigger
                    className="h-11"
                    style={{
                      backgroundColor: "var(--bg-muted)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      opacity: isFirstAgent ? 0.6 : 1,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">없음 (최상위 · 원장)</SelectItem>
                    {agentList.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--border-default)" }}>
            <SectionTitle
              title="행동 설정"
              description="프롬프트와 스킬 연결은 이 에이전트의 실제 동작을 결정합니다."
            />

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <FieldLabel hint="에이전트의 행동 지침. 지식베이스 문서를 참조할 수 있습니다.">
                  시스템 프롬프트
                </FieldLabel>
                <Textarea
                  placeholder="예: 당신은 학원 민원을 처리하는 전문 상담사입니다. 항상 공손하고 명확하게 응답하며..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={8}
                  className="resize-y font-mono text-sm leading-6"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {skillList.length > 0 ? (
                <div className="space-y-2">
                  <FieldLabel hint="이 에이전트에 장착할 k-skill">스킬</FieldLabel>
                  <div className="space-y-2">
                    {skillList.map((skill: any) => {
                      const slug: string = skill.slug ?? skill.id ?? ""
                      const checked = selectedSkills.has(slug)
                      return (
                        <label
                          key={slug}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                          style={{
                            backgroundColor: checked ? "var(--accent-primary-soft)" : "var(--bg-elevated)",
                            borderColor: checked ? "var(--color-primary)" : "var(--border-default)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSkill(slug)}
                            className="mt-0.5 shrink-0"
                            style={{ accentColor: "var(--color-primary)" }}
                          />
                          <div className="min-w-0 space-y-1">
                            <span className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {skill.name ?? slug}
                            </span>
                            {skill.description ? (
                              <span className="block text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
                                {skill.description}
                              </span>
                            ) : null}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </WorkspacePanel>

      {submitError ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {submitError}
        </p>
      ) : null}
    </div>
  )
}
