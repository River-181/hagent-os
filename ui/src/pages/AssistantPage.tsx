import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { CalendarClock, FileText, Loader2, MessageSquarePlus, Scale, Send, Sparkles, Workflow } from "lucide-react"
import { casesApi } from "@/api/cases"
import { projectsApi } from "@/api/projects"
import { useToast } from "@/components/ToastContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { WorkspaceEmptyState, WorkspaceHeader, WorkspacePanel, WorkspaceSubtle } from "@/components/ui/workspace-surface"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { queryKeys } from "@/lib/queryKeys"

function getSessionMeta(caseItem: any) {
  const metadata =
    caseItem?.metadata && typeof caseItem.metadata === "object" && !Array.isArray(caseItem.metadata)
      ? (caseItem.metadata as Record<string, unknown>)
      : {}
  return {
    assistantSessionId: typeof metadata.assistantSessionId === "string" ? metadata.assistantSessionId : "",
    threadId: typeof metadata.threadId === "string" ? metadata.threadId : "",
    caseKind: typeof metadata.caseKind === "string" ? metadata.caseKind : caseItem?.caseKind ?? caseItem?.type ?? "inquiry",
  }
}

function summarizeText(value: unknown, limit = 140) {
  const normalized = String(value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return ""
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized
}

function formatDate(value: unknown, withTime = false) {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("ko-KR", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" })
}

function buildDraftSeed() {
  return {
    assistantSessionId: crypto.randomUUID(),
    threadId: crypto.randomUUID(),
  }
}

function getSessionKindLabel(caseItem: any) {
  const meta = getSessionMeta(caseItem)
  return meta.caseKind === "legal-inquiry" ? "법률 질문" : "운영 질문"
}

export function AssistantPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { organizations, selectedOrgId } = useOrganization()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [question, setQuestion] = useState("")
  const [newThreadSeed, setNewThreadSeed] = useState<{ assistantSessionId: string; threadId: string } | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: "Assistant" }])
  }, [setBreadcrumbs])

  const activeOrg = useMemo(() => {
    if (!orgPrefix) return organizations.find((item) => item.id === selectedOrgId) ?? null
    return (
      organizations.find((item) => item.prefix === orgPrefix || item.slug === orgPrefix)
      ?? organizations.find((item) => item.id === selectedOrgId)
      ?? null
    )
  }, [orgPrefix, organizations, selectedOrgId])

  const activeOrgId = activeOrg?.id ?? null

  const { data: cases = [], isLoading: sessionsLoading } = useQuery({
    queryKey: queryKeys.cases.list(activeOrgId ?? ""),
    queryFn: () => casesApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const sessions = useMemo(() => {
    return (cases as any[])
      .filter((caseItem: any) => caseItem.type === "inquiry" && caseItem.source === "quick_ask")
      .slice()
      .sort((a: any, b: any) =>
        String(b.updatedAt ?? b.updated_at ?? b.createdAt ?? "").localeCompare(
          String(a.updatedAt ?? a.updated_at ?? a.createdAt ?? ""),
        ),
      )
  }, [cases])

  const selectedCaseParam = searchParams.get("case")
  const isDraftingNewThread = Boolean(newThreadSeed) && !selectedCaseParam
  const selectedCaseId = isDraftingNewThread
    ? null
    : selectedCaseParam && sessions.some((caseItem: any) => caseItem.id === selectedCaseParam)
      ? selectedCaseParam
      : sessions[0]?.id ?? null
  const selectedSession = useMemo(
    () => sessions.find((caseItem: any) => caseItem.id === selectedCaseId) ?? null,
    [selectedCaseId, sessions],
  )

  const { data: selectedCase, isLoading: selectedCaseLoading } = useQuery({
    queryKey: queryKeys.cases.detail(selectedCaseId ?? ""),
    queryFn: () => casesApi.get(selectedCaseId!),
    enabled: !!selectedCaseId,
  })

  const startDraft = (prefill = "") => {
    setNewThreadSeed(buildDraftSeed())
    setSearchParams({})
    setQuestion(prefill)
  }

  const submitMutation = useMutation({
    mutationFn: async (input?: {
      question?: string
      title?: string
      origin?: string
      scenarioKey?: string
      forceNewThread?: boolean
    }) => {
      if (!activeOrgId) throw new Error("선택된 기관이 없습니다.")
      const nextQuestion = String(input?.question ?? question).trim()
      const seed = input?.forceNewThread
        ? buildDraftSeed()
        : newThreadSeed ?? {
            assistantSessionId: selectedSession ? getSessionMeta(selectedSession).assistantSessionId : crypto.randomUUID(),
            threadId: selectedSession ? getSessionMeta(selectedSession).threadId : crypto.randomUUID(),
          }
      return casesApi.quickAsk(activeOrgId, {
        question: nextQuestion,
        title: input?.title ?? (nextQuestion.slice(0, 40) || "Assistant 질문"),
        origin: input?.origin ?? "assistant_page",
        scenarioKey:
          input?.scenarioKey
          ?? (/법|환불|학원법|등록|교습비|정책/.test(nextQuestion) ? "law-question" : "assistant-question"),
        assistantSessionId: seed.assistantSessionId,
        threadId: seed.threadId,
      })
    },
    onSuccess: async (data) => {
      setQuestion("")
      setNewThreadSeed(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(activeOrgId ?? "") }),
      ])
      setSearchParams({ case: data.caseId })
      toast.success(data.appended ? "기존 질문 세션에 후속 질문을 추가했습니다." : "새 질문 세션을 만들었습니다.")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "질문 처리에 실패했습니다.")
    },
  })

  const projectScenarioMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrgId) throw new Error("선택된 기관이 없습니다.")
      return projectsApi.createFromInstruction({
        organizationId: activeOrgId,
        instruction: "상반기 프로모션 준비해볼까? 탄자니아 영어학원 기준으로 컨셉안, 일정표, 학부모 안내문, 카카오/텔레그램 메시지 초안, 랜딩 카피까지 나눠서 준비해줘.",
        origin: "assistant_shortcut",
        scenarioKey: "promotion-demo",
      })
    },
    onSuccess: async (project) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(activeOrgId ?? "") }),
      ])
      toast.success("프로모션 시나리오 프로젝트를 만들었습니다.")
      navigate(`/${orgPrefix}/projects/${project.id}`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "프로모션 프로젝트 생성에 실패했습니다.")
    },
  })

  const pinnedShortcuts = [
    {
      key: "policy-legal",
      title: "정책·법률 질문",
      description: "환불 기준, 학원법, 등록 기준 같은 질문을 초안으로 불러옵니다.",
      icon: Scale,
      onClick: () => startDraft("학원 환불 기준과 학부모 안내 시 꼭 고지해야 할 핵심을 운영자 관점으로 정리해줘."),
    },
    {
      key: "schedule",
      title: "보강·결석 문의",
      description: "보강 가능 시간, 상담 흐름, 학부모 안내 문안을 한 번에 준비합니다.",
      icon: CalendarClock,
      onClick: () => startDraft("결석한 학생의 보강 가능 시간을 제안하고, 학부모에게 보낼 안내 문안도 같이 정리해줘."),
    },
    {
      key: "promotion",
      title: projectScenarioMutation.isPending ? "프로젝트 생성 중" : "프로모션 프로젝트",
      description: "상반기 프로모션 프로젝트와 하위 작업을 바로 만듭니다.",
      icon: Workflow,
      onClick: () => projectScenarioMutation.mutate(),
    },
    {
      key: "inbound",
      title: "카카오·텔레그램 인입",
      description: "민원 접수와 발송 대기 건을 바로 확인합니다.",
      icon: Send,
      onClick: () => navigate(`/${orgPrefix}/inbox`),
    },
  ]

  const latestDocument = selectedCase?.documents?.[0] ?? null
  const latestAnswer = String(latestDocument?.body ?? "").trim()
  const latestAnswerSummary = summarizeText(latestAnswer, 180)
  const legalSummary = summarizeText(
    (selectedCase?.legalBasis as any)?.summary ?? (selectedCase?.legalBasis as any)?.detail ?? "",
    220,
  )
  const usedSkills = selectedCase?.usedSkills ?? []
  const reviewStatus =
    selectedCase?.outboundStatus === "ready_to_send"
      ? "회신 준비"
      : selectedCase?.outboundStatus === "sent"
        ? "회신 완료"
        : selectedCase?.outboundStatus === "failed"
          ? "회신 실패"
          : selectedCase?.status === "in_review"
            ? "검토 중"
            : null

  const sortedComments = useMemo(() => {
    return [...(selectedCase?.comments ?? [])].sort((a: any, b: any) =>
      String(a.createdAt ?? a.created_at ?? "").localeCompare(String(b.createdAt ?? b.created_at ?? "")))
  }, [selectedCase?.comments])

  const followUpSuggestions = useMemo(() => {
    if (selectedCase?.legalBasis) {
      return [
        "이 내용을 학부모 안내문으로 바꿔줘.",
        "환불 기준만 아주 쉽게 다시 설명해줘.",
        "직원이 바로 읽을 수 있는 응대 스크립트로 정리해줘.",
      ]
    }
    return [
      "이 내용을 실행 단계로 다시 정리해줘.",
      "보호자에게 보낼 짧은 답장 초안으로 바꿔줘.",
      "핵심만 3줄로 다시 요약해줘.",
    ]
  }, [selectedCase?.legalBasis])

  const panelTitle = selectedCase?.title ?? selectedSession?.title ?? (isDraftingNewThread ? "새 질문 초안" : "질문을 선택하세요")
  const panelDescription = selectedCaseLoading && selectedSession
    ? "세션 답변을 불러오는 중입니다."
    : selectedCase
      ? latestAnswerSummary || "세부 답변과 질문 흐름을 이 화면에서 이어갈 수 있습니다."
    : isDraftingNewThread
      ? "새 세션을 준비했습니다. 아래 입력창에서 질문을 다듬고 바로 보내면 됩니다."
      : "왼쪽에서 세션을 선택하거나 새 질문 초안을 불러와 바로 이어서 작업하세요."

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 p-6 md:p-8">
      <WorkspaceHeader
        title="Assistant"
        description="질문 세션, 최신 답변, 후속 질문을 한 화면에서 이어서 처리합니다."
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startDraft("")}>
            <MessageSquarePlus size={13} />
            새 질문
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <WorkspacePanel className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b px-5 py-5" style={{ borderColor: "var(--border-default)" }}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                <Sparkles size={15} style={{ color: "var(--accent-primary)" }} />
                새 질문 시작
              </div>
              <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                자주 쓰는 시나리오를 초안으로 불러오거나, 세션을 골라 바로 이어서 작업합니다.
              </p>
            </div>
            <div className="mt-4 grid gap-2">
              {pinnedShortcuts.map((shortcut) => {
                const Icon = shortcut.icon
                return (
                  <button
                    key={shortcut.key}
                    type="button"
                    onClick={shortcut.onClick}
                    className="w-full rounded-xl border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: "var(--bg-elevated)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "var(--accent-primary-soft)", color: "var(--accent-primary)" }}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {shortcut.title}
                        </div>
                        <div className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                          {shortcut.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                최근 세션
              </div>
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {sessions.length}개
              </div>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 px-4 py-4">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
                </div>
              ) : sessions.length === 0 ? (
                <div
                  className="rounded-xl border px-4 py-5 text-sm"
                  style={{
                    borderColor: "var(--border-default)",
                    backgroundColor: "var(--bg-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  아직 Assistant 세션이 없습니다.
                </div>
              ) : (
                sessions.map((session: any) => {
                  const selected = selectedCaseId === session.id && !isDraftingNewThread
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setNewThreadSeed(null)
                        setQuestion("")
                        setSearchParams({ case: session.id })
                      }}
                      className="w-full rounded-xl border px-4 py-3 text-left transition-colors"
                      style={{
                        borderColor: selected ? "var(--accent-primary)" : "var(--border-default)",
                        backgroundColor: selected ? "var(--accent-primary-soft)" : "var(--bg-elevated)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {session.title}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {formatDate(session.updatedAt ?? session.createdAt)}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <Badge className="border-0">{getSessionKindLabel(session)}</Badge>
                        <span>{session.identifier}</span>
                      </div>
                      {session.latestDraftSummary ? (
                        <div className="mt-2 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                          {summarizeText(session.latestDraftSummary, 68)}
                        </div>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </WorkspacePanel>

        <WorkspacePanel className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b px-6 py-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {selectedCase?.identifier ?? selectedSession?.identifier ? <span>{selectedCase?.identifier ?? selectedSession?.identifier}</span> : null}
                  {reviewStatus ? <Badge className="border-0">{reviewStatus}</Badge> : null}
                  {isDraftingNewThread ? <Badge className="border-0">새 세션</Badge> : null}
                </div>
                <h2 className="text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-primary)" }}>
                  {panelTitle}
                </h2>
                <p className="max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  {panelDescription}
                </p>
                {selectedCase ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    <span>연결 문서 {selectedCase.documents?.length ?? 0}건</span>
                    <span>후속 케이스 {selectedCase.childCases?.length ?? 0}건</span>
                    <span>실행 스킬 {usedSkills.length}개</span>
                  </div>
                ) : null}
              </div>
              {selectedCaseId ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/${orgPrefix}/cases/${selectedCaseId}`}>케이스 보기</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-6 py-6">
              {selectedCaseLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
                </div>
              ) : !selectedCase ? (
                <>
                  <WorkspaceEmptyState
                    icon={<MessageSquarePlus size={18} />}
                    title={isDraftingNewThread ? "새 질문 초안을 준비했습니다." : "세션을 선택하면 대화가 열립니다."}
                    description={isDraftingNewThread
                      ? "하단 입력창에서 질문을 조금만 다듬고 보내면 새 세션으로 시작됩니다."
                      : "왼쪽 세션 목록에서 기존 기록을 열거나, 자주 쓰는 시나리오를 불러와 바로 시작하세요."}
                    action={!isDraftingNewThread ? (
                      <Button size="sm" className="gap-1.5 border-0 text-white" style={{ backgroundColor: "var(--accent-primary)" }} onClick={() => startDraft("")}>
                        <MessageSquarePlus size={13} />
                        새 질문 준비
                      </Button>
                    ) : undefined}
                  />

                  {question ? (
                    <WorkspaceSubtle className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        <FileText size={14} style={{ color: "var(--accent-primary)" }} />
                        작성 중인 질문
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        {question}
                      </p>
                    </WorkspaceSubtle>
                  ) : null}
                </>
              ) : (
                <>
                  {latestDocument ? (
                    <article
                      className="rounded-xl border px-5 py-5"
                      style={{
                        borderColor: "var(--border-default)",
                        backgroundColor: "var(--bg-elevated)",
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                            최신 답변
                          </div>
                          <div className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {latestDocument.title}
                          </div>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {formatDate(latestDocument.updatedAt ?? latestDocument.createdAt, true)}
                        </div>
                      </div>
                      <div className="mt-4 whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--text-primary)" }}>
                        {latestAnswer || "아직 생성된 문서가 없습니다."}
                      </div>
                      {legalSummary ? (
                        <div
                          className="mt-4 border-t pt-4 text-sm leading-6"
                          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                        >
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>법령 근거 요약.</span>{" "}
                          {legalSummary}
                        </div>
                      ) : null}
                    </article>
                  ) : (
                    <WorkspaceSubtle className="p-4">
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        최신 답변
                      </div>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        아직 생성된 문서가 없습니다.
                      </p>
                    </WorkspaceSubtle>
                  )}

                  {sortedComments.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        질문 기록
                      </div>
                      {sortedComments.map((comment: any) => {
                        const body = String(comment.content ?? comment.body ?? "").trim()
                        const isAgent = String(comment.authorType ?? "").includes("agent")
                        return (
                          <div
                            key={comment.id}
                            className="rounded-xl border px-4 py-4"
                            style={{
                              borderColor: isAgent ? "var(--accent-primary)" : "var(--border-default)",
                              backgroundColor: isAgent ? "var(--accent-primary-soft)" : "var(--bg-subtle)",
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                              <span>{isAgent ? "AI 팀" : "운영자"}</span>
                              <span>{formatDate(comment.createdAt ?? comment.created_at, true)}</span>
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--text-primary)" }}>
                              {body}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t px-6 py-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  후속 질문
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {selectedSession ? "현재 세션에 이어서 질문합니다." : "새 세션으로 질문합니다."}
                </div>
              </div>
              {selectedCaseId ? (
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  마지막 업데이트 {formatDate(selectedCase?.updatedAt ?? selectedCase?.createdAt, true)}
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {followUpSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs transition-colors"
                  style={{
                    borderColor: "var(--border-default)",
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => {
                    setQuestion((previous) => (previous.trim() ? `${previous}\n${suggestion}` : suggestion))
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              placeholder="예: 위 답변을 학부모 안내 문안으로 바꿔줘"
              className="mt-3 rounded-lg border px-3 py-2 shadow-none focus-visible:ring-0"
              style={{
                borderColor: "var(--border-default)",
                backgroundColor: "var(--bg-elevated)",
              }}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                질문을 보내면 새 문서와 질문 기록이 이 화면에 바로 이어집니다.
              </div>
              <Button
                size="sm"
                className="gap-1.5 border-0 text-white"
                style={{ backgroundColor: "var(--accent-primary)" }}
                disabled={!question.trim() || submitMutation.isPending || !activeOrgId}
                onClick={() => submitMutation.mutate(undefined)}
              >
                {submitMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                보내기
              </Button>
            </div>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  )
}
