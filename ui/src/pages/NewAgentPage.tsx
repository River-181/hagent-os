// v0.4.0 — model select, skills, title, reportsTo, proper POST payload
import { useEffect, useState } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Info } from "lucide-react"

// ─── Config ───────────────────────────────────────────────────────────────────

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

// slug from name: lowercase alphanumeric + hyphens
function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
}

// ─── Field label ──────────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-0.5">
      <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {children}
        {required && (
          <span style={{ color: "var(--color-danger)" }} className="ml-0.5">
            *
          </span>
        )}
      </label>
      {hint && (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const skillList = skills as any[]
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
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 44,
              height: 44,
              background: "var(--color-primary-bg)",
              color: "var(--color-teal-500)",
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              새 에이전트
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              학원 운영을 도울 AI 에이전트를 추가합니다
            </p>
          </div>
        </div>

        {/* First agent banner */}
        {isFirstAgent && (
          <div
            className="flex items-start gap-3 rounded-xl p-4 mb-6"
            style={{
              backgroundColor: "var(--color-primary-bg)",
              border: "1px solid rgba(20,184,166,0.3)",
            }}
          >
            <Info
              size={16}
              className="shrink-0 mt-0.5"
              style={{ color: "var(--color-teal-500)" }}
            />
            <p className="text-sm" style={{ color: "var(--color-teal-500)" }}>
              이것이 학원의{" "}
              <strong>원장(CEO)</strong>이 됩니다. 다른 에이전트들의 작업을 조율하고
              의사결정을 내리는 최상위 에이전트입니다.
            </p>
          </div>
        )}

        {/* Form */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* 이름 */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>에이전트 이름</FieldLabel>
            <Input
              placeholder="예: 민원 처리 에이전트"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="text-base"
              style={{
                backgroundColor: "var(--bg-base)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* 직함 */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="조직도에 표시될 직함 (예: 수석 상담사)">직함</FieldLabel>
            <Input
              placeholder="예: 수석 상담사"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                backgroundColor: "var(--bg-base)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* 역할 */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>역할</FieldLabel>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger
                style={{
                  backgroundColor: "var(--bg-base)",
                  borderColor: "var(--border-default)",
                  color: role ? "var(--text-primary)" : "var(--text-tertiary)",
                }}
              >
                <SelectValue placeholder="역할을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 모델 */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="에이전트가 사용할 Claude 모델">모델</FieldLabel>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger
                style={{
                  backgroundColor: "var(--bg-base)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 보고 대상 */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel
              hint={
                isFirstAgent
                  ? "첫 번째 에이전트는 최상위(원장)로 자동 설정됩니다"
                  : "이 에이전트가 보고할 상위 에이전트"
              }
            >
              보고 대상
            </FieldLabel>
            <Select
              value={reportsTo}
              onValueChange={setReportsTo}
              disabled={isFirstAgent}
            >
              <SelectTrigger
                style={{
                  backgroundColor: "var(--bg-base)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                  opacity: isFirstAgent ? 0.5 : 1,
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

          {/* 시스템 프롬프트 */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="에이전트의 행동 지침. 지식베이스 문서를 참조할 수 있습니다.">
              시스템 프롬프트
            </FieldLabel>
            <Textarea
              placeholder="예: 당신은 학원 민원을 처리하는 전문 상담사입니다. 항상 공손하고 명확하게 응답하며..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              style={{
                backgroundColor: "var(--bg-base)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            />
          </div>

          {/* 스킬 */}
          {skillList.length > 0 && (
            <div className="flex flex-col gap-2">
              <FieldLabel hint="이 에이전트에 장착할 k-skill">스킬</FieldLabel>
              <div className="flex flex-col gap-1">
                {skillList.map((skill: any) => {
                  const slug: string = skill.slug ?? skill.id ?? ""
                  const checked = selectedSkills.has(slug)
                  return (
                    <label
                      key={slug}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: checked
                          ? "var(--color-primary-bg)"
                          : "var(--bg-base)",
                        border: `1px solid ${checked ? "rgba(20,184,166,0.4)" : "var(--border-default)"}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSkill(slug)}
                        className="mt-0.5 shrink-0"
                        style={{ accentColor: "var(--color-teal-500)" }}
                      />
                      <div className="flex flex-col">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {skill.name ?? slug}
                        </span>
                        {skill.description && (
                          <span
                            className="text-xs mt-0.5"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {skill.description}
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {submitError && (
          <p className="text-sm mt-3" style={{ color: "var(--color-danger)" }}>
            {submitError}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            style={{ color: "var(--text-secondary)" }}
          >
            취소
          </Button>
          <Button
            disabled={!isValid || submitted}
            onClick={handleSubmit}
            className="border-0 text-white px-6"
            style={{
              backgroundColor: isValid ? "var(--color-teal-500)" : undefined,
            }}
          >
            {submitted ? "생성 중…" : "에이전트 생성"}
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}
