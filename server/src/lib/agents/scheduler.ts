import { runWithAdapter } from "../runtime.js"

export interface SchedulerAgentInput {
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
  adapterType?: string
  model?: string
}

export interface SchedulerAgentOutput {
  caseId: string
  plan: {
    summary: string
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
- 반드시 JSON만 출력

{
  "summary": "일정 판단 요약",
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

현재 일정:
${scheduleContext || "- 없음"}

위 요청을 해결할 상담/보강/대체 일정 초안을 JSON으로 제안하세요.`,
    {
      adapterType: input.adapterType ?? "mock_local",
      model: input.model,
      maxTokens: 1024,
    },
  )

  try {
    const parsed = JSON.parse(response.content.trim()) as SchedulerAgentOutput["plan"]
    return {
      caseId: input.caseId,
      plan: {
        summary: parsed.summary,
        suggestedSchedule: parsed.suggestedSchedule,
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
        summary: "기존 시간표를 기준으로 상담/보강 일정 초안을 생성했습니다.",
        suggestedSchedule: {
          title: "학부모 상담 일정",
          type: "counseling",
          dayOfWeek: 2,
          startTime: "18:30",
          endTime: "19:00",
          room: "상담실",
        },
        calendarAction: {
          provider: "google-calendar",
          status: "unavailable",
        },
        requiresApproval: true,
        suggestedActions: ["원장 승인", "일정 확정 후 안내"],
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  }
}
