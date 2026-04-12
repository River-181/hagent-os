import { useContext, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { ToastContext } from "@/components/ToastContext"
import { activityApi } from "@/api/activity"
import { casesApi } from "@/api/cases"
import { notificationsApi } from "@/api/notifications"
import { organizationsApi } from "@/api/organizations"
import { projectsApi } from "@/api/projects"
import { approvalsApi } from "@/api/approvals"
import { api } from "@/api/client"
import { queryKeys } from "@/lib/queryKeys"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, timeAgo } from "@/lib/utils"
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  Megaphone,
  MoveRight,
  Send,
  Sparkles,
} from "lucide-react"

type FeedFilter = "all" | "pending_approvals" | "case_updates" | "agent_completed" | "inquiry"

type NotificationType =
  | "approval_needed"
  | "case_update"
  | "case_created"
  | "agent_completed"
  | "reminder"
  | string

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  entityType?: string | null
  entityId?: string | null
  read?: boolean
  createdAt: string
}

interface ApprovalItem {
  id: string
  status: "pending" | "approved" | "rejected" | "revision_requested"
  payload?: Record<string, unknown> | null
  decision?: Record<string, unknown> | null
  caseId?: string | null
  caseTitle?: string | null
  caseStatus?: string | null
  case?: { status?: string | null } | null
  createdAt?: string
  created_at?: string
}

interface ActivityItem {
  id: string
  action: string
  entityType?: string | null
  entityId?: string | null
  entityTitle?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

type FeedItem =
  | {
      id: string
      kind: "approval"
      category: "pending_approvals"
      title: string
      body: string
      createdAt: string
      read: boolean
      approvalId: string
      caseId?: string | null
    }
  | {
      id: string
      kind: "notification"
      category: Exclude<FeedFilter, "all" | "pending_approvals">
      title: string
      body: string
      createdAt: string
      read: boolean
      entityType?: string | null
      entityId?: string | null
    }

type ReplayHistoryItem = {
  id: string
  kind: "kakao" | "telegram" | "project" | "policy" | "law" | "ask"
  title: string
  summary: string
  createdAt: string
  href: string
}

type FeedCandidate = {
  item: FeedItem
  priority: number
  contentKey: string
}

const DEMO_SCENARIOS = {
  kakao: {
    title: "Kakao 민원 재현",
    summary: "이수아 보호자 상담 요청을 케이스로 생성하고 민원담당을 바로 깨웁니다.",
  },
  telegram: {
    title: "Telegram 운영 지시 재현",
    summary: "운영 코디네이터 지시를 상담/출결 정리 케이스로 생성합니다.",
  },
  project: {
    title: "프로모션 프로젝트",
    summary: "상반기 프로모션 준비 프로젝트와 하위 케이스 묶음을 바로 재현합니다.",
  },
  policy: {
    title: "운영 정책 시나리오",
    summary: "환불·상담·보강 정책을 직원용 플레이북과 학부모 FAQ로 정리합니다.",
  },
  law: {
    title: "운영/법령 질문",
    summary: "학원 영업·설립·교습비·환불 핵심을 질문형 inquiry case로 만들고 결과 문서를 남깁니다.",
  },
} as const

type ReplayInboundResponse = {
  caseId: string
  identifier: string
  type: string
}

type SampleProjectResponse = {
  id: string
  name: string
  cases?: Array<unknown>
}

type SampleProjectScenario = "project" | "policy"

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending_approvals", label: "승인대기" },
  { key: "case_updates", label: "케이스 업데이트" },
  { key: "inquiry", label: "질문 작업" },
  { key: "agent_completed", label: "에이전트 완료" },
]

const JUDGING_SCENARIOS = [
  {
    key: "kakao",
    eyebrow: "Scenario 1",
    title: "카카오 민원 접수",
    summary: "보호자 민원을 케이스로 만들고 승인 후 운영자 발송 브리지까지 이어갑니다.",
    icon: MessageSquare,
  },
  {
    key: "telegram",
    eyebrow: "Scenario 2",
    title: "보강·결석 문의",
    summary: "텔레그램 문의를 일정 제안과 학부모 안내 초안으로 연결합니다.",
    icon: Send,
  },
  {
    key: "project",
    eyebrow: "Scenario 3",
    title: "상반기 프로모션",
    summary: "프로젝트 생성, 하위 케이스 분해, 산출물 묶음을 한 번에 보여줍니다.",
    icon: Megaphone,
  },
  {
    key: "law",
    eyebrow: "Scenario 4",
    title: "운영 정책·법률 질문",
    summary: "Assistant 질문을 inquiry 케이스와 브리프로 남깁니다.",
    icon: FileText,
  },
] as const

function getNotificationCategory(item: NotificationItem): FeedItem["category"] | null {
  if (item.type === "agent_completed" || item.entityType === "agent_run") {
    return "agent_completed"
  }

  if (
    item.type === "case_update" ||
    item.type === "case_created" ||
    item.entityType === "case"
  ) {
    return "case_updates"
  }

  return null
}

function feedIcon(item: FeedItem) {
  if (item.kind === "approval") {
    return <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
  }

  switch (item.category) {
    case "agent_completed":
      return <Bot size={18} style={{ color: "var(--color-teal-500)" }} />
    case "case_updates":
      return <FileText size={18} style={{ color: "var(--text-secondary)" }} />
    default:
      return <Bell size={18} style={{ color: "var(--text-secondary)" }} />
  }
}

function buildApprovalBody(approval: ApprovalItem) {
  const draft = typeof approval.payload?.draft === "string" ? approval.payload.draft : null
  if (draft) {
    return draft.length > 80 ? `${draft.slice(0, 80)}...` : draft
  }
  return approval.caseTitle ? `${approval.caseTitle} 관련 승인이 필요합니다.` : "검토가 필요한 승인 요청입니다."
}

function normalizeFeedText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function getFeedContentKey(item: FeedItem) {
  const anchor =
    item.kind === "approval"
      ? `case:${item.caseId ?? item.approvalId}`
      : item.entityType && item.entityId
        ? `${item.entityType}:${item.entityId}`
        : item.entityId
          ? `entity:${item.entityId}`
          : item.kind

  return [
    anchor,
    normalizeFeedText(item.title),
    normalizeFeedText(item.body),
  ].join("|")
}

function getFeedPriority(item: FeedItem) {
  if (item.kind === "approval") return 0
  if (item.kind === "notification" && item.category === "inquiry") return 1
  return 2
}

function dedupeFeedItems(items: FeedItem[]) {
  const orderedCandidates: FeedCandidate[] = items.map((item) => ({
    item,
    priority: getFeedPriority(item),
    contentKey: getFeedContentKey(item),
  }))

  orderedCandidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return b.item.createdAt.localeCompare(a.item.createdAt)
  })

  const seenContentKeys = new Set<string>()
  const deduped = orderedCandidates.flatMap(({ item, contentKey }) => {
    if (seenContentKeys.has(contentKey)) return []
    seenContentKeys.add(contentKey)
    return [item]
  })

  return deduped.sort((a, b) => {
    const byCreatedAt = b.createdAt.localeCompare(a.createdAt)
    if (byCreatedAt !== 0) return byCreatedAt
    return getFeedPriority(a) - getFeedPriority(b)
  })
}

function dedupeLatestByKey<T extends { createdAt: string }>(items: T[], getKey: (item: T) => string) {
  const seenKeys = new Set<string>()
  return [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((item) => {
      const key = getKey(item)
      if (seenKeys.has(key)) return []
      seenKeys.add(key)
      return [item]
    })
}

function isDoneCaseApproval(approval: ApprovalItem) {
  const normalized =
    approval.case?.status ??
    approval.caseStatus ??
    null
  return normalized === "done" || normalized === "closed" || normalized === "resolved"
}

export function InboxPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId, organizations } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)

  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all")
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setBreadcrumbs([{ label: "알림함" }])
  }, [setBreadcrumbs])

  const activeOrgId = useMemo(() => {
    if (!orgPrefix) return selectedOrgId
    const matchedOrganization = organizations.find(
      (organization) => organization.prefix === orgPrefix || organization.slug === orgPrefix,
    )
    return matchedOrganization?.id ?? selectedOrgId
  }, [orgPrefix, organizations, selectedOrgId])

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<NotificationItem[]>({
    queryKey: queryKeys.notifications.list(activeOrgId ?? ""),
    queryFn: () => notificationsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery<ApprovalItem[]>({
    queryKey: [...queryKeys.approvals.list(activeOrgId ?? ""), "pending"],
    queryFn: () => api.get<ApprovalItem[]>(`/organizations/${activeOrgId}/approvals?status=pending`),
    enabled: !!activeOrgId,
  })
  const { data: allApprovals = [] } = useQuery<ApprovalItem[]>({
    queryKey: [...queryKeys.approvals.list(activeOrgId ?? ""), "all-inbox"],
    queryFn: () => approvalsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })
  const doneCaseApprovalIds = useMemo(
    () =>
      new Set(
        (allApprovals as ApprovalItem[])
          .filter((approval) => isDoneCaseApproval(approval))
          .map((approval) => approval.id),
      ),
    [allApprovals],
  )
  const visiblePendingApprovals = useMemo(
    () =>
      (approvals as ApprovalItem[]).filter(
        (approval) => !isDoneCaseApproval(approval) && !doneCaseApprovalIds.has(approval.id),
      ),
    [approvals, doneCaseApprovalIds],
  )
  const { data: channels = {} } = useQuery<Record<string, any>>({
    queryKey: [...queryKeys.organizations.detail(activeOrgId ?? ""), "channels"],
    queryFn: () => organizationsApi.getChannels(activeOrgId!),
    enabled: !!activeOrgId,
  })
  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: queryKeys.activity.list(activeOrgId ?? ""),
    queryFn: () => activityApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })
  const replayHistory = useMemo<ReplayHistoryItem[]>(() => {
    if (!orgPrefix) return []

    return dedupeLatestByKey(
      activity
      .flatMap<ReplayHistoryItem>((event) => {
        const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? event.metadata
          : {}

        const origin = typeof metadata.origin === "string" ? metadata.origin : ""
        const quickAskOrigin =
          origin === "demo_replay" ||
          origin === "inbox_quick_ask" ||
          origin === "dashboard" ||
          origin === "manual_check"

        if (event.action === "case.created_from_channel" && event.entityId) {
          const scenarioKey = metadata.scenarioKey === "telegram" ? "telegram" : "kakao"
          const title = scenarioKey === "telegram" ? DEMO_SCENARIOS.telegram.title : DEMO_SCENARIOS.kakao.title
          const channelKey = metadata.channelKey === "telegram" ? "telegram" : "kakao"
          const senderName = typeof metadata.senderName === "string" ? metadata.senderName : "외부 발신자"
          const caseKind = typeof metadata.caseKind === "string" ? metadata.caseKind : "inquiry"
          return [{
            id: `activity:${event.id}`,
            kind: channelKey as "kakao" | "telegram",
            title,
            summary: `${senderName} · ${caseKind}`,
            createdAt: event.createdAt,
            href: `/${orgPrefix}/cases/${event.entityId}`,
          }]
        }

        if (
          event.action === "case.created" &&
          event.entityId &&
          quickAskOrigin &&
          (metadata.scenarioKey === "law-question" ||
            metadata.generatedBy === "quick-ask" ||
            metadata.caseKind === "legal-inquiry" ||
            metadata.caseKind === "quick-ask")
        ) {
          const inquiryKind =
            metadata.caseKind === "legal-inquiry" || metadata.scenarioKey === "law-question" ? "law" : "ask"
          return [{
            id: `activity:${event.id}`,
            kind: inquiryKind,
            title:
              inquiryKind === "law"
                ? DEMO_SCENARIOS.law.title
                : "운영 질문",
            summary: `${event.entityTitle ?? "질문 케이스"} · inquiry`,
            createdAt: event.createdAt,
            href: `/${orgPrefix}/cases/${event.entityId}`,
          }]
        }

        if (event.action === "project.created_from_instruction" && event.entityId && origin === "demo_replay") {
          const caseCount = typeof metadata.caseCount === "number" ? metadata.caseCount : Number(metadata.caseCount ?? 0)
          const scenarioKey = metadata.scenarioKey === "policy" ? "policy" : "project"
          return [{
            id: `activity:${event.id}`,
            kind: scenarioKey,
            title: scenarioKey === "policy" ? DEMO_SCENARIOS.policy.title : DEMO_SCENARIOS.project.title,
            summary: `${event.entityTitle ?? "프로모션 프로젝트"} · ${Number.isFinite(caseCount) ? caseCount : 0} cases`,
            createdAt: event.createdAt,
            href: `/${orgPrefix}/projects/${event.entityId}`,
          }]
        }

        return []
      })
      ,
      (item) => `${item.kind}|${item.title}|${item.summary}|${item.href}`,
    ).slice(0, 6)
  }, [activity, orgPrefix])

  const recentInbound = useMemo(
    () =>
      dedupeLatestByKey(
        (activity as ActivityItem[])
          .filter((event) => event.action === "case.created_from_channel" || event.action === "case.appended_from_channel"),
        (event) => {
          const metadata =
            event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
              ? (event.metadata as Record<string, unknown>)
              : {}
          const senderName = typeof metadata.senderName === "string" ? metadata.senderName : "외부 발신자"
          const channelKey = metadata.channelKey === "telegram" ? "telegram" : "kakao"
          return `${event.entityId ?? "unknown"}|${event.entityTitle ?? event.action}|${senderName}|${channelKey}`
        },
      ).slice(0, 5),
    [activity],
  )

  const channelHealth = useMemo(
    () =>
      [
        {
          key: "kakao",
          label: "Kakao",
          enabled: Boolean(channels.kakao?.enabled),
          readiness: channels.kakao?.connected ? "connected" : channels.kakao?.enabled ? "configured" : "inactive",
          detail: channels.kakao?.channelId ?? "channel not set",
        },
        {
          key: "telegram",
          label: "Telegram",
          enabled: Boolean(channels.telegram?.enabled),
          readiness: channels.telegram?.connected ? "connected" : channels.telegram?.enabled ? "configured" : "inactive",
          detail: channels.telegram?.botUsername ?? "bot not set",
        },
      ],
    [channels],
  )

  const lastReplayTarget = replayHistory[0] ?? null

  const pendingOutbound = useMemo(() => {
    return allApprovals.flatMap((approval) => {
      const decision =
        approval.decision && typeof approval.decision === "object" && !Array.isArray(approval.decision)
          ? (approval.decision as Record<string, any>)
          : {}
      const sideEffects =
        decision.sideEffects && typeof decision.sideEffects === "object" && !Array.isArray(decision.sideEffects)
          ? (decision.sideEffects as Record<string, any>)
          : {}
      const kakaoMessage =
        sideEffects.kakaoMessage && typeof sideEffects.kakaoMessage === "object" && !Array.isArray(sideEffects.kakaoMessage)
          ? (sideEffects.kakaoMessage as Record<string, any>)
          : null

      if (!kakaoMessage) return []
      if (!["ready_to_send", "failed"].includes(String(kakaoMessage.status ?? ""))) return []

      return [{
        approvalId: approval.id,
        caseId: approval.caseId ?? null,
        caseTitle: approval.caseTitle ?? "카카오 회신 승인",
        status: String(kakaoMessage.status ?? "ready_to_send"),
        draft: typeof kakaoMessage.draft === "string" ? kakaoMessage.draft : "",
        chatUrl:
          typeof kakaoMessage.bridge?.chatUrl === "string"
            ? kakaoMessage.bridge.chatUrl
            : typeof kakaoMessage.bridge?.channelUrl === "string"
              ? kakaoMessage.bridge.channelUrl
              : "",
        createdAt: approval.createdAt ?? approval.created_at ?? new Date().toISOString(),
      }]
    })
  }, [allApprovals])
  const pendingReadyCount = pendingOutbound.filter((item) => item.status !== "failed").length
  const pendingFailedCount = pendingOutbound.filter((item) => item.status === "failed").length

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      approvalsApi.decide(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.approvals.list(activeOrgId ?? ""), "all-inbox"] })
    },
  })

  const outboundMutation = useMutation({
    mutationFn: ({
      id,
      mode,
    }: {
      id: string
      mode: "auto" | "confirm_bridge"
    }) => approvalsApi.send(id, { mode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.approvals.list(activeOrgId ?? ""), "all-inbox"] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
      toast?.success("카카오 회신 상태를 갱신했습니다.")
    },
    onError: () => toast?.error("카카오 회신 처리에 실패했습니다."),
  })

  const replayInboundMutation = useMutation<ReplayInboundResponse, Error, "kakao" | "telegram">({
    mutationFn: async (channelKey: "kakao" | "telegram") => {
      if (channelKey === "kakao") {
        return api.post("/channels/kakao/inbound", {
          channelId: channels.kakao?.channelId ?? "tanzania-channel",
          senderId: "01026732003",
          senderName: "이수아 보호자",
          threadId: `kakao-replay-${Date.now()}`,
          message: "수아가 최근 학원 가기 싫어하는데 상담 예약 가능할까요?",
          origin: "demo_replay",
          scenarioKey: "kakao",
        })
      }
      return api.post("/channels/telegram/inbound", {
        botToken: channels.telegram?.botToken ?? "telegram-demo-token",
        botUsername: channels.telegram?.botUsername ?? "tanzania_ops_bot",
        senderId: "telegram-ops",
        senderName: "운영 코디네이터",
        threadId: `telegram-replay-${Date.now()}`,
        message: "이번 주 출결 이상 학생과 상담 필요 학생을 정리해줘.",
        origin: "demo_replay",
        scenarioKey: "telegram",
      })
    },
    onSuccess: (data, channelKey) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
      if (orgPrefix && data?.caseId) {
        const title = channelKey === "kakao" ? DEMO_SCENARIOS.kakao.title : DEMO_SCENARIOS.telegram.title
        const href = `/${orgPrefix}/cases/${data.caseId}`
        toast?.success(`${title} 완료`)
        navigate(href)
      }
    },
    onError: () => toast?.error("인바운드 replay에 실패했습니다."),
  })

  const sampleProjectMutation = useMutation<SampleProjectResponse, Error, SampleProjectScenario>({
    mutationFn: async (scenario) =>
      projectsApi.createFromInstruction({
        organizationId: activeOrgId,
        instruction:
          scenario === "policy"
            ? "우리 학원 환불·상담·보강 운영 정책을 정리해서 직원용 플레이북과 학부모 안내문으로 만들어줘."
            : "상반기 프로모션 준비해볼까?",
        origin: "demo_replay",
        scenarioKey: scenario,
      }),
    onSuccess: (data, scenario) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
      if (orgPrefix && data?.id) {
        const href = `/${orgPrefix}/projects/${data.id}`
        toast?.success(
          scenario === "policy" ? "운영 정책 프로젝트를 생성했습니다." : "Sample project를 생성했습니다.",
        )
        navigate(href)
      }
    },
    onError: () => toast?.error("시나리오 프로젝트 생성에 실패했습니다."),
  })

  const legalQuestionMutation = useMutation({
    mutationFn: async () =>
      casesApi.quickAsk(activeOrgId!, {
        title: "운영/법령 질문",
        question: "우리나라 학원 영업 법정 현황, 설립/운영 등록, 교습비 게시, 환불 핵심만 운영자 관점으로 정리해줘.",
        origin: "demo_replay",
        scenarioKey: "law-question",
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(activeOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(activeOrgId ?? "") })
      toast?.success("운영/법령 질문 케이스를 생성하고 에이전트를 실행했습니다.")
      if (orgPrefix && data.caseId) {
        navigate(`/${orgPrefix}/cases/${data.caseId}`)
      }
    },
    onError: () => toast?.error("운영/법령 질문 시나리오 생성에 실패했습니다."),
  })

  const feedItems = useMemo<FeedItem[]>(() => {
    const approvalItems: FeedItem[] = visiblePendingApprovals.map((approval) => ({
      id: `approval:${approval.id}`,
      kind: "approval",
      category: "pending_approvals",
      title: approval.caseTitle ?? "승인 요청",
      body: buildApprovalBody(approval),
      createdAt: approval.createdAt ?? approval.created_at ?? new Date().toISOString(),
      read: false,
      approvalId: approval.id,
      caseId: approval.caseId,
    }))

    const notificationItems: FeedItem[] = notifications
      .flatMap((notification) => {
        const category = getNotificationCategory(notification)
        if (!category || category === "pending_approvals") return []

        const item: FeedItem = {
          id: `notification:${notification.id}`,
          kind: "notification",
          category: category as Exclude<FeedFilter, "all" | "pending_approvals">,
          title: notification.title,
          body: notification.body,
          createdAt: notification.createdAt,
          read: notification.read ?? false,
          entityType: notification.entityType,
          entityId: notification.entityId,
        }
        return [item]
      })

    const inquiryItems: FeedItem[] = activity
      .flatMap((event) => {
        const metadata =
          event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : {}

        if (event.action !== "case.created" || event.entityType !== "case" || !event.entityId) return []
        if (metadata.generatedBy !== "quick-ask") return []

        return [{
          id: `activity:${event.id}`,
          kind: "notification" as const,
          category: "inquiry" as const,
          title: event.entityTitle ?? "운영 질문",
          body:
            typeof metadata.caseKind === "string" && metadata.caseKind === "legal-inquiry"
              ? "질문형 케이스가 생성되었고 답변 문서를 준비합니다."
              : "질문형 케이스가 생성되었고 운영자 답변 문서를 준비합니다.",
          createdAt: event.createdAt,
          read: false,
          entityType: "case",
          entityId: event.entityId,
        }]
      })

    return dedupeFeedItems([...approvalItems, ...notificationItems, ...inquiryItems])
  }, [activity, notifications, visiblePendingApprovals])

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return feedItems
    return feedItems.filter((item) => item.category === activeFilter)
  }, [activeFilter, feedItems])

  const unreadCount = filteredItems.filter((item) => !item.read && !readIds.has(item.id)).length
  const totalUnreadCount = feedItems.filter((item) => !item.read && !readIds.has(item.id)).length

  const markAsRead = (itemId: string) => {
    setReadIds((current) => {
      const next = new Set(current)
      next.add(itemId)
      return next
    })
  }

  const markAllRead = () => {
    setReadIds(new Set(feedItems.map((item) => item.id)))
  }

  const handleItemClick = (item: FeedItem) => {
    markAsRead(item.id)

    if (!orgPrefix) return

    if (item.kind === "approval") {
      if (item.caseId) {
        navigate(`/${orgPrefix}/cases/${item.caseId}`)
        return
      }
      navigate(`/${orgPrefix}/approvals`)
      return
    }

    if (item.entityType === "case" && item.entityId) {
      navigate(`/${orgPrefix}/cases/${item.entityId}`)
      return
    }

    if (item.entityType === "agent_run" || item.category === "agent_completed") {
      navigate(`/${orgPrefix}/agents`)
    }
  }

  const isLoading = notificationsLoading || approvalsLoading

  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  알림함
                </h1>
                {totalUnreadCount > 0 && (
                  <Badge
                    className="text-xs font-bold px-2 py-0.5 border-0"
                    style={{ background: "var(--color-teal-500)", color: "#fff" }}
                  >
                    {totalUnreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                승인 요청과 운영 알림을 한 곳에서 확인합니다.
              </p>
            </div>
            {totalUnreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="text-xs"
              >
                모두 읽음
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const count =
                filter.key === "all"
                  ? feedItems.length
                  : feedItems.filter((item) => item.category === filter.key).length

              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      activeFilter === filter.key ? "var(--color-teal-500)" : "var(--bg-tertiary)",
                    color: activeFilter === filter.key ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {filter.label} {count > 0 ? `(${count})` : ""}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {unreadCount > 0 ? `선택한 탭에 읽지 않은 항목 ${unreadCount}개` : "읽지 않은 항목이 없습니다"}
            </p>
            {orgPrefix ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/${orgPrefix}/assistant`)}>
                <Sparkles size={13} />
                Assistant 열기
              </Button>
            ) : null}
          </div>

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium" style={{ color: "var(--text-primary)" }}>심사 리허설 4개</div>
                <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  채널 인입, 운영 질문, 프로젝트 산출물, 운영자 발송 브리지를 한 화면에서 시작합니다.
                </div>
              </div>
              <Badge className="border-0" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                심사 시작점
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2" disabled={!activeOrgId || replayInboundMutation.isPending} onClick={() => replayInboundMutation.mutate("kakao")}>
                {replayInboundMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Replay Kakao 민원
              </Button>
              <Button size="sm" variant="outline" className="gap-2" disabled={!activeOrgId || replayInboundMutation.isPending} onClick={() => replayInboundMutation.mutate("telegram")}>
                {replayInboundMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Replay Telegram 상담
              </Button>
              <Button size="sm" className="gap-2 text-white" style={{ backgroundColor: "var(--color-teal-500)" }} disabled={!activeOrgId || sampleProjectMutation.isPending} onClick={() => sampleProjectMutation.mutate("project")}>
                {sampleProjectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                상반기 프로모션 생성
              </Button>
              <Button size="sm" variant="outline" className="gap-2" disabled={!activeOrgId || sampleProjectMutation.isPending} onClick={() => sampleProjectMutation.mutate("policy")}>
                {sampleProjectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                운영 정책 프로젝트
              </Button>
              <Button size="sm" variant="outline" className="gap-2" disabled={!activeOrgId || legalQuestionMutation.isPending} onClick={() => legalQuestionMutation.mutate()}>
                {legalQuestionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                운영/법령 질문 예시
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {JUDGING_SCENARIOS.map((scenario) => {
                const Icon = scenario.icon
                return (
                  <div key={scenario.key} className="rounded-lg border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                      {scenario.eyebrow}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      <Icon size={14} />
                      {scenario.title}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {scenario.summary}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  채널 상태
                </div>
                <div className="mt-3 space-y-2">
                  {channelHealth.map((channel) => (
                    <div key={channel.key} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-elevated)" }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{channel.label}</div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{channel.detail}</div>
                      </div>
                      <Badge className="border-0" style={{ backgroundColor: channel.enabled ? "var(--color-primary-bg)" : "var(--bg-tertiary)", color: channel.enabled ? "var(--color-teal-500)" : "var(--text-secondary)" }}>
                        {channel.readiness}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    마지막 생성 항목
                  </div>
                  {lastReplayTarget ? (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(lastReplayTarget.href)}>
                      바로 열기
                    </Button>
                  ) : null}
                </div>
                {lastReplayTarget ? (
                  <div className="mt-3 rounded-lg px-3 py-3" style={{ backgroundColor: "var(--bg-elevated)" }}>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{lastReplayTarget.title}</div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {lastReplayTarget.summary} · {timeAgo(lastReplayTarget.createdAt)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg px-3 py-3 text-sm" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    아직 방금 생성한 질문·시나리오 항목이 없습니다.
                  </div>
                )}
              </div>
            </div>
            {replayHistory.length > 0 && (
              <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  최근 생성 결과
                </div>
                <div className="mt-3 space-y-2">
                  {replayHistory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
                      style={{ backgroundColor: "var(--bg-elevated)" }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {item.title}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {item.summary} · {timeAgo(item.createdAt)}
                        </div>
                      </div>
                      <MoveRight size={14} style={{ color: "var(--text-tertiary)" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Live inbound queue
              </div>
              {recentInbound.length === 0 ? (
                <div className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  최근 채널 유입이 없습니다.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {recentInbound.map((event) => {
                    const metadata = event.metadata ?? {}
                    const channelKey = metadata.channelKey === "telegram" ? "Telegram" : "Kakao"
                    const senderName = typeof metadata.senderName === "string" ? metadata.senderName : "외부 발신자"
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => event.entityId && orgPrefix && navigate(`/${orgPrefix}/cases/${event.entityId}`)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
                        style={{ backgroundColor: "var(--bg-elevated)" }}
                      >
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {channelKey} · {senderName}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {event.entityTitle ?? event.action} · {timeAgo(event.createdAt)}
                          </div>
                        </div>
                        <MoveRight size={14} style={{ color: "var(--text-tertiary)" }} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    운영자 발송 브리지
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    승인 후 실제 회신 직전 상태입니다. 문안 확인과 채널 전송이 여기서 마감됩니다.
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/${orgPrefix}/approvals`)}>
                  승인 큐 열기
                </Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border px-3 py-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>발송 준비</div>
                  <div className="mt-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{pendingReadyCount}건</div>
                </div>
                <div className="rounded-lg border px-3 py-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>자동 발송 실패</div>
                  <div className="mt-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{pendingFailedCount}건</div>
                </div>
                <div className="rounded-lg border px-3 py-3" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>운영 조치</div>
                  <div className="mt-1 flex items-center gap-1 text-sm font-medium" style={{ color: "#d97706" }}>
                    <AlertTriangle size={13} />
                    문안 복사 후 전송
                  </div>
                </div>
              </div>
              {pendingOutbound.length === 0 ? (
                <div className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  발송 대기 중인 카카오 회신이 없습니다.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {pendingOutbound.map((item) => (
                    <div
                      key={item.approvalId}
                      className="rounded-lg px-3 py-3"
                      style={{ backgroundColor: "var(--bg-elevated)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {item.caseTitle}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {item.status === "failed" ? "자동 발송 실패" : "운영자 발송 대기"} · {timeAgo(item.createdAt)}
                          </div>
                        </div>
                        <Badge
                          className="border-0"
                          style={{
                            backgroundColor: item.status === "failed" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                            color: item.status === "failed" ? "var(--color-danger)" : "#d97706",
                          }}
                        >
                          {item.status === "failed" ? "실패" : "발송 준비"}
                        </Badge>
                      </div>
                      {item.draft ? (
                        <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {item.draft.length > 120 ? `${item.draft.slice(0, 120)}...` : item.draft}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.caseId && orgPrefix ? (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/${orgPrefix}/cases/${item.caseId}`)}>
                            케이스 열기
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => navigate(`/${orgPrefix}/approvals`)}>
                          승인 큐
                        </Button>
                        {item.chatUrl ? (
                          <Button size="sm" variant="outline" onClick={() => window.open(item.chatUrl, "_blank", "noopener,noreferrer")}>
                            채널 열기
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={outboundMutation.isPending}
                          onClick={() => outboundMutation.mutate({ id: item.approvalId, mode: "auto" })}
                        >
                          {outboundMutation.isPending && outboundMutation.variables?.id === item.approvalId && outboundMutation.variables?.mode === "auto"
                            ? <Loader2 size={13} className="animate-spin" />
                            : "자동 발송"}
                        </Button>
                        <Button
                          size="sm"
                          className="text-white"
                          style={{ backgroundColor: "var(--color-teal-500)" }}
                          disabled={outboundMutation.isPending}
                          onClick={() => outboundMutation.mutate({ id: item.approvalId, mode: "confirm_bridge" })}
                        >
                          {outboundMutation.isPending && outboundMutation.variables?.id === item.approvalId && outboundMutation.variables?.mode === "confirm_bridge"
                            ? <Loader2 size={13} className="animate-spin" />
                            : "전송 완료 처리"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="rounded-xl p-10 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Bell size={40} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                선택한 필터에 해당하는 알림이 없습니다.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {filteredItems.map((item, index) => {
                const isUnread = !item.read && !readIds.has(item.id)
                const isCurrentApprovalPending =
                  decisionMutation.isPending &&
                  decisionMutation.variables?.id === (item.kind === "approval" ? item.approvalId : undefined)

                return (
                  <div
                    key={item.id}
                    className={cn("px-4 py-4", index > 0 && "border-t")}
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: isUnread ? "var(--bg-secondary)" : "var(--bg-elevated)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className="flex flex-1 items-start gap-3 text-left"
                      >
                        <div className="mt-0.5 shrink-0">{feedIcon(item)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn("text-sm", isUnread && "font-semibold")}
                              style={{ color: "var(--text-primary)" }}
                            >
                              {item.title}
                            </span>
                            {isUnread && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: "var(--color-teal-500)" }}
                              />
                            )}
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                            {item.body}
                          </p>
                        </div>
                      </button>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {timeAgo(item.createdAt)}
                        </span>

                        {item.kind === "approval" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              style={{ color: "#dc2626", borderColor: "rgba(220,38,38,0.25)" }}
                              disabled={isCurrentApprovalPending}
                              onClick={() => {
                                markAsRead(item.id)
                                decisionMutation.mutate({ id: item.approvalId, status: "rejected" })
                              }}
                            >
                              {isCurrentApprovalPending && decisionMutation.variables?.status === "rejected" ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                "거절"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs text-white"
                              style={{ backgroundColor: "#16a34a" }}
                              disabled={isCurrentApprovalPending}
                              onClick={() => {
                                markAsRead(item.id)
                                decisionMutation.mutate({ id: item.approvalId, status: "approved" })
                              }}
                            >
                              {isCurrentApprovalPending && decisionMutation.variables?.status === "approved" ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                "승인"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--color-teal-500)" }}
                          >
                            보기
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
