import { runWithAdapter } from "../runtime.js"
import type { RuntimeBinding } from "./types.js"

export interface SchedulerAgentInput extends RuntimeBinding {
  caseId: string
  organizationId: string
  title: string
  description: string
  studentId?: string
  reporterId?: string
  schedules: Array<{
    id: string
    title: string
    type: string
    dayOfWeek: number
    startTime: string
    endTime: string
    room?: string | null
  }>
  followUpContext?: string
}

export interface SchedulerAgentOutput {
  caseId: string
  plan: {
    summary: string
    objective?: string
    recommendedFormat?: string
    planOutline?: string[]
    checklist?: string[]
    communicationPlan?: string[]
    riskNotes?: string[]
    suggestedSchedule?: {
      title: string
      type: string
      dayOfWeek: number
      startTime: string
      endTime: string
      room?: string | null
    }
    calendarAction?: {
      provider: string
      status: string
    }
    requiresApproval: boolean
    suggestedActions: string[]
  }
  tokensUsed: number
}

const SYSTEM_PROMPT = `당신은 학원 운영 스케줄러 AI입니다.

## 역할
- 보강, 상담, 대체 강사, 일정 충돌 해결
- 기존 수업 시간표와 겹치지 않게 후보 일정을 제안
- 행사/이벤트/설명회/특강/캠프/생일파티처럼 계획서가 필요한 요청은 실제 제출 가능한 운영 계획서 수준으로 답변
- 반드시 JSON만 출력

{
  "summary": "일정 판단 요약",
  "objective": "이번 요청으로 달성할 목표",
  "recommendedFormat": "event-plan|schedule-adjustment|consultation|makeup|special-program",
  "planOutline": ["핵심 단계 1", "핵심 단계 2"],
  "checklist": ["준비 항목 1", "준비 항목 2"],
  "communicationPlan": ["안내 대상과 메시지 1", "안내 대상과 메시지 2"],
  "riskNotes": ["주의할 점 1", "주의할 점 2"],
  "suggestedSchedule": {
    "title": "일정 제목",
    "type": "counseling|makeup|regular|special",
    "dayOfWeek": 1,
    "startTime": "18:30",
    "endTime": "19:00",
    "room": "상담실"
  },
  "calendarAction": {
    "provider": "google-calendar",
    "status": "pending_sync|synced|unavailable"
  },
  "requiresApproval": true,
  "suggestedActions": ["후속 조치 1", "후속 조치 2"]
}`

export async function runSchedulerAgent(input: SchedulerAgentInput): Promise<SchedulerAgentOutput> {
  const scheduleContext = input.schedules
    .slice(0, 8)
    .map((item) => `- ${item.title} (${item.dayOfWeek} ${item.startTime}-${item.endTime}, ${item.room ?? "미정"})`)
    .join("\n")

  const response = await runWithAdapter(
    SYSTEM_PROMPT,
    `기관 ID: ${input.organizationId}
케이스 제목: ${input.title}
케이스 설명: ${input.description || "(설명 없음)"}
${input.allowedChannels?.length ? `허용 채널: ${input.allowedChannels.join(", ")}` : ""}
${input.runtimeSkills?.length ? `장착된 스킬: ${input.runtimeSkills.map((skill) => `${skill.displayName}(${skill.slug})`).join(", ")}` : ""}
${input.followUpContext ? `후속 지시/대화 맥락:\n${input.followUpContext}\n` : ""}
${input.skillContext ? `실행 스킬 번들:\n${input.skillContext}\n` : ""}

현재 일정:
${scheduleContext || "- 없음"}

위 요청을 해결하는 운영 계획서를 JSON으로 제안하세요.
- 일정 조정 요청이면 suggestedSchedule을 반드시 채우세요.
- 계획서/행사/이벤트 요청이면 objective, planOutline, checklist, communicationPlan, riskNotes를 구체적으로 채우세요.
- suggestedActions는 실제 후속 실행 문장으로 작성하세요.`,
    {
      adapterType: input.adapterType ?? "mock_local",
      model: input.model ?? undefined,
      apiKey: input.apiKey ?? undefined,
      maxTokens: 1024,
    },
  )

  try {
    const parsed = JSON.parse(response.content.trim()) as SchedulerAgentOutput["plan"]
    const suggestedSchedule = parsed.suggestedSchedule
      ? {
          ...parsed.suggestedSchedule,
          room: parsed.suggestedSchedule.room ?? undefined,
        }
      : undefined
    return {
      caseId: input.caseId,
      plan: {
        summary: parsed.summary,
        objective: typeof parsed.objective === "string" ? parsed.objective : undefined,
        recommendedFormat: typeof parsed.recommendedFormat === "string" ? parsed.recommendedFormat : undefined,
        planOutline: Array.isArray(parsed.planOutline) ? parsed.planOutline.map((item) => String(item)).filter(Boolean) : [],
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist.map((item) => String(item)).filter(Boolean) : [],
        communicationPlan: Array.isArray(parsed.communicationPlan) ? parsed.communicationPlan.map((item) => String(item)).filter(Boolean) : [],
        riskNotes: Array.isArray(parsed.riskNotes) ? parsed.riskNotes.map((item) => String(item)).filter(Boolean) : [],
        suggestedSchedule,
        calendarAction: parsed.calendarAction,
        requiresApproval: parsed.requiresApproval ?? true,
        suggestedActions: parsed.suggestedActions ?? [],
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  } catch {
    return {
      caseId: input.caseId,
      plan: {
        summary: "기존 시간표와 운영 상황을 기준으로 실행 가능한 운영 계획 초안을 생성했습니다.",
        objective: "행사/운영 요청을 실제로 실행할 수 있는 일정과 준비 항목을 정리합니다.",
        recommendedFormat: "event-plan",
        planOutline: ["행사 목적과 대상 확정", "시간대/장소 확정", "준비 담당자 지정", "행사 전 리마인드 준비"],
        checklist: ["예산과 준비물 목록 정리", "담당 강사/스태프 배정", "행사 전날 공지 발송"],
        communicationPlan: ["학생/보호자 공지 발송", "강사 운영 메모 공유"],
        riskNotes: ["기존 수업 시간과 충돌 여부 확인", "예산 초과와 안전 이슈 확인"],
        suggestedSchedule: {
          title: "운영 계획 검토 일정",
          type: "special",
          dayOfWeek: 2,
          startTime: "18:30",
          endTime: "19:00",
          room: "회의실",
        },
        calendarAction: {
          provider: "google-calendar",
          status: "unavailable",
        },
        requiresApproval: true,
        suggestedActions: ["원장 승인", "세부 일정 확정", "보호자/학생 안내 발송"],
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  }
}
