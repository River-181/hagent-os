import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Bot, ExternalLink, Loader2, MessageSquarePlus } from "lucide-react"
import { useOrganization } from "@/context/OrganizationContext"
import { useAssistant } from "@/context/AssistantContext"
import { useToast } from "@/components/ToastContext"
import { casesApi } from "@/api/cases"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

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

export function AssistantLauncher() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const { organizations, selectedOrgId } = useOrganization()
  const { open, setOpen } = useAssistant()
  const [question, setQuestion] = useState("")

  const activeOrg = useMemo(() => {
    if (!orgPrefix) return organizations.find((item) => item.id === selectedOrgId) ?? null
    return (
      organizations.find((item) => item.prefix === orgPrefix || item.slug === orgPrefix)
      ?? organizations.find((item) => item.id === selectedOrgId)
      ?? null
    )
  }, [orgPrefix, organizations, selectedOrgId])

  const activeOrgId = activeOrg?.id ?? null
  const assistantHref = orgPrefix ? `/${orgPrefix}/assistant` : null

  const { data: cases = [] } = useQuery({
    queryKey: queryKeys.cases.list(activeOrgId ?? ""),
    queryFn: () => casesApi.list(activeOrgId!),
    enabled: !!activeOrgId && open,
  })

  const assistantSessions = useMemo(() => {
    return (cases as any[])
      .filter((caseItem: any) => {
        const meta = getSessionMeta(caseItem)
        return caseItem.type === "inquiry" && caseItem.source === "quick_ask" && Boolean(meta.assistantSessionId)
      })
      .slice()
      .sort((a: any, b: any) =>
        String(b.updatedAt ?? b.updated_at ?? b.createdAt ?? "").localeCompare(
          String(a.updatedAt ?? a.updated_at ?? a.createdAt ?? ""),
        ),
      )
      .slice(0, 5)
  }, [cases])

  const quickAskMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrgId) throw new Error("선택된 기관이 없습니다.")
      return casesApi.quickAsk(activeOrgId, {
        question: question.trim(),
        title: question.trim().slice(0, 40) || "빠른 질문",
        origin: "assistant_launcher",
        assistantSessionId: crypto.randomUUID(),
        threadId: crypto.randomUUID(),
      })
    },
    onSuccess: async (data) => {
      setQuestion("")
      setOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") }),
      ])
      toast.success("질문을 접수하고 AI 팀을 실행했습니다.")
      if (assistantHref) {
        navigate(`${assistantHref}?case=${data.caseId}`)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "질문 처리에 실패했습니다.")
    },
  })

  if (!assistantHref) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full border-l p-0 sm:max-w-lg"
          style={{ backgroundColor: "var(--bg-base)", borderColor: "var(--border-default)" }}
        >
          <SheetHeader className="space-y-2 border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Bot size={16} style={{ color: "var(--color-teal-500)" }} />
                  Assistant
                </SheetTitle>
                <SheetDescription>
                  질문이나 운영 지시를 케이스로 남기고, 문서 결과와 후속 질문까지 이어갑니다.
                </SheetDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link to={assistantHref} onClick={() => setOpen(false)}>
                  전체 보기
                  <ExternalLink size={13} />
                </Link>
              </Button>
            </div>
          </SheetHeader>

          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-default)" }}>
              <div className="rounded-3xl border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                <div className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  새 질문 시작
                </div>
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={4}
                  placeholder="예: 우리 학원 환불 규정 핵심을 원장 관점으로 정리해줘"
                  className="border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    현재 기관: {activeOrg?.name ?? "미선택"}
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 border-0 text-white"
                    style={{ backgroundColor: "var(--color-teal-500)" }}
                    disabled={!question.trim() || quickAskMutation.isPending || !activeOrgId}
                    onClick={() => quickAskMutation.mutate()}
                  >
                    {quickAskMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <MessageSquarePlus size={13} />}
                    질문 보내기
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  최근 질문 세션
                </div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {assistantSessions.length}개
                </div>
              </div>
              <div className="space-y-2">
                {assistantSessions.length === 0 ? (
                  <div
                    className="rounded-2xl border px-4 py-5 text-sm"
                    style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    아직 Assistant 질문 이력이 없습니다.
                  </div>
                ) : (
                  assistantSessions.map((session: any) => {
                    const meta = getSessionMeta(session)
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          navigate(`${assistantHref}?case=${session.id}`)
                        }}
                        className="w-full rounded-2xl border px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="text-sm font-medium leading-5 [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}>
                            {session.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            <span>{meta.caseKind === "legal-inquiry" ? "법률 질문" : "운영 질문"}</span>
                            <span>{session.identifier}</span>
                            <span className="ml-auto">{new Date(session.updatedAt ?? session.createdAt).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
      </SheetContent>
    </Sheet>
  )
}
