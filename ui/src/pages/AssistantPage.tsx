import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom"
import { Bot, CalendarClock, FileText, GitBranchPlus, Loader2, MessageSquarePlus, RefreshCcw, Scale, Send, Sparkles, Workflow } from "lucide-react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/components/ToastContext"
import { casesApi } from "@/api/cases"
import { projectsApi } from "@/api/projects"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

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

  const selectedCaseId = searchParams.get("case") ?? sessions[0]?.id ?? null
  const selectedSession = useMemo(
    () => sessions.find((caseItem: any) => caseItem.id === selectedCaseId) ?? null,
    [selectedCaseId, sessions],
  )

  const { data: selectedCase, isLoading: selectedCaseLoading } = useQuery({
    queryKey: queryKeys.cases.detail(selectedCaseId ?? ""),
    queryFn: () => casesApi.get(selectedCaseId!),
    enabled: !!selectedCaseId,
  })

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
        ? {
            assistantSessionId: crypto.randomUUID(),
            threadId: crypto.randomUUID(),
          }
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
      description: "운영 정책이나 환불·교습비 기준을 바로 브리프로 남깁니다.",
      icon: Scale,
      onClick: () =>
        submitMutation.mutate({
          question: "학원 환불 기준과 학부모 안내 시 꼭 고지해야 할 핵심을 운영자 관점으로 정리해줘.",
          title: "정책·법률 질문 · 환불 기준",
          origin: "assistant_shortcut",
          scenarioKey: "law-question",
          forceNewThread: true,
        }),
    },
    {
      key: "schedule",
      title: "보강·결석 문의",
      description: "보강 가능 시간, 상담 흐름, 학부모 안내 문안을 같이 정리합니다.",
      icon: CalendarClock,
      onClick: () =>
        submitMutation.mutate({
          question: "결석한 학생의 보강 가능 시간을 제안하고, 학부모에게 보낼 안내 문안도 같이 정리해줘.",
          title: "운영 질문 · 보강/결석",
          origin: "assistant_shortcut",
          scenarioKey: "schedule-question",
          forceNewThread: true,
        }),
    },
    {
      key: "promotion",
      title: "프로모션 프로젝트",
      description: "상반기 프로모션을 프로젝트와 하위 케이스로 바로 생성합니다.",
      icon: Workflow,
      onClick: () => projectScenarioMutation.mutate(),
    },
    {
      key: "inbound",
      title: "카카오·텔레그램 인입",
      description: "민원 접수, 상담 문의, 발송 대기 건을 알림함에서 바로 확인합니다.",
      icon: Send,
      onClick: () =>
        navigate(`/${orgPrefix}/inbox`),
    },
  ]

  const latestDocument = selectedCase?.documents?.[0] ?? null
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

  return (
    <div className="h-full overflow-hidden px-6 py-6">
      <div className="grid h-full gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          className="flex min-h-0 flex-col rounded-3xl border"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="border-b px-5 py-5" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  <Sparkles size={16} style={{ color: "var(--color-teal-500)" }} />
                  Assistant
                </div>
                <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  질문을 케이스와 문서로 남기고, 심사 시나리오를 여기서 바로 시작합니다.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  const seed = {
                    assistantSessionId: crypto.randomUUID(),
                    threadId: crypto.randomUUID(),
                  }
                  setNewThreadSeed(seed)
                  setQuestion("")
                  setSearchParams({})
                }}
              >
                <MessageSquarePlus size={13} />
                새 대화
              </Button>
            </div>
          </div>

          <div className="border-b px-4 py-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
              심사 시작 바로가기
            </div>
            <div className="space-y-2">
              {pinnedShortcuts.map((shortcut) => {
                const Icon = shortcut.icon
                return (
                  <button
                    key={shortcut.key}
                    type="button"
                    onClick={shortcut.onClick}
                    className="w-full rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "rgba(20,184,166,0.08)", color: "var(--color-teal-500)" }}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {shortcut.title}
                        </div>
                        <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {shortcut.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 px-4 py-4">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
                </div>
              ) : sessions.length === 0 ? (
                <div
                  className="rounded-2xl border px-4 py-5 text-sm"
                  style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                >
                  아직 Assistant 세션이 없습니다.
                </div>
              ) : (
                sessions.map((session: any) => {
                  const meta = getSessionMeta(session)
                  const selected = selectedCaseId === session.id
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setNewThreadSeed(null)
                        setSearchParams({ case: session.id })
                      }}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition-colors"
                      style={{
                        borderColor: selected ? "rgba(20,184,166,0.26)" : "var(--border-default)",
                        backgroundColor: selected ? "rgba(20,184,166,0.08)" : "var(--bg-base)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {session.title}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {meta.caseKind === "legal-inquiry" ? "법률 질문" : "운영 질문"} · {session.identifier}
                          </div>
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(session.updatedAt ?? session.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        <section
          className="flex min-h-0 flex-col rounded-3xl border"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="border-b px-6 py-5" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {selectedCase?.title ?? (newThreadSeed ? "새 질문 세션" : "질문을 선택하세요")}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {selectedCase?.identifier ? <span>{selectedCase.identifier}</span> : null}
                  {selectedCase?.caseKind === "legal-inquiry" ? <Badge className="border-0">법률 질문</Badge> : null}
                  {reviewStatus ? <Badge className="border-0">{reviewStatus}</Badge> : null}
                </div>
              </div>
              {selectedCaseId ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/${orgPrefix}/cases/${selectedCaseId}`}>케이스 보기</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ScrollArea className="min-h-0">
              <div className="space-y-4 px-6 py-5">
                {selectedCaseLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
                  </div>
                ) : !selectedCase ? (
                  <div
                    className="rounded-2xl border px-5 py-8 text-sm"
                    style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    오른쪽 아래 Assistant로 질문을 시작하거나, 왼쪽 세션 목록에서 기존 질문을 선택하세요.
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border px-5 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                      <div className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        최신 문서 결과물
                      </div>
                      {latestDocument ? (
                        <>
                          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {latestDocument.title}
                          </div>
                          <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "inherit" }}>
                            {latestDocument.body}
                          </pre>
                        </>
                      ) : (
                        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          아직 생성된 문서가 없습니다.
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border px-5 py-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                      <div className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        질문 로그
                      </div>
                      <div className="space-y-3">
                        {(selectedCase.comments ?? []).map((comment: any) => {
                          const body = String(comment.content ?? comment.body ?? "")
                          const isAgent = String(comment.authorType ?? "").includes("agent")
                          return (
                            <div
                              key={comment.id}
                              className="rounded-2xl px-4 py-3"
                              style={{
                                backgroundColor: isAgent ? "rgba(20,184,166,0.08)" : "var(--bg-base)",
                                border: `1px solid ${isAgent ? "rgba(20,184,166,0.2)" : "var(--border-default)"}`,
                              }}
                            >
                              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                {isAgent ? "AI 팀" : "운영자"} · {new Date(comment.createdAt ?? comment.created_at).toLocaleString("ko-KR")}
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                {body}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="border-l px-5 py-5" style={{ borderColor: "var(--border-default)" }}>
              <div className="space-y-4">
                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                  <div className="mb-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    후속 질문
                  </div>
                  <Textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={8}
                    placeholder="예: 위 내용 중 환불 기준만 다시 쉽게 설명해줘"
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {selectedSession ? "현재 세션에 이어서 질문합니다." : "새 세션으로 질문합니다."}
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 border-0 text-white"
                      style={{ backgroundColor: "var(--color-teal-500)" }}
                      disabled={!question.trim() || submitMutation.isPending || !activeOrgId}
                      onClick={() => submitMutation.mutate(undefined)}
                    >
                      {submitMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
                      보내기
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                  <div className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    실행 컨텍스트
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <span>사용 스킬</span>
                      <span style={{ color: "var(--text-primary)" }}>{usedSkills.length}개</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {usedSkills.length === 0 ? (
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>스킬 정보 없음</span>
                      ) : (
                        usedSkills.map((skill: any) => (
                          <Badge key={skill.slug ?? skill.name} className="border-0">
                            {skill.displayName ?? skill.name ?? skill.slug}
                          </Badge>
                        ))
                      )}
                    </div>
                    {selectedCase?.legalBasis ? (
                      <div className="rounded-2xl border px-3 py-3 text-sm" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)" }}>
                        <div className="mb-1 flex items-center gap-2 font-medium" style={{ color: "var(--text-primary)" }}>
                          <Scale size={14} style={{ color: "var(--color-teal-500)" }} />
                          법령 근거 상태
                        </div>
                        <div style={{ color: "var(--text-secondary)" }}>
                          {String((selectedCase.legalBasis as any).summary ?? "근거 요약 없음")}
                        </div>
                      </div>
                    ) : null}
                    {selectedCase?.skillContext ? (
                      <div className="rounded-2xl border px-3 py-3 text-sm" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-base)" }}>
                        <div className="mb-1 flex items-center gap-2 font-medium" style={{ color: "var(--text-primary)" }}>
                          <Bot size={14} style={{ color: "var(--color-teal-500)" }} />
                          Skill Context
                        </div>
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "inherit" }}>
                          {String(selectedCase.skillContext).slice(0, 1000)}
                        </pre>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-3">
                      <span>연결 문서</span>
                      <span style={{ color: "var(--text-primary)" }}>{selectedCase?.documents?.length ?? 0}건</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>후속 서브 케이스</span>
                      <span style={{ color: "var(--text-primary)" }}>{selectedCase?.childCases?.length ?? 0}건</span>
                    </div>
                    {selectedCaseId ? (
                      <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5" asChild>
                        <Link to={`/${orgPrefix}/cases/${selectedCaseId}`}>
                          <GitBranchPlus size={13} />
                          케이스 상세로 이동
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
