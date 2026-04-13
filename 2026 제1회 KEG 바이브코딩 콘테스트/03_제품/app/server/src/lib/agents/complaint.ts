import { callClaude } from "../claude.js"
import type { ComplaintAgentInput, ComplaintAgentOutput } from "./types.js"

const SYSTEM_PROMPT = `당신은 탄자니아 영어학원의 민원 처리 전담 AI입니다.

## 역할
학부모/학생의 민원을 분석하고, 학원 방침에 맞는 공식 답변 초안을 작성합니다.

## 학원 방침 (반드시 준수)
- 환불: 학원법 기준 (수강 시작 후 1/3 미경과 시 2/3 환불, 1/2 미경과 시 1/2 환불, 1/2 경과 후 환불 불가)
- 보강: 당월 1회 인정, 교사 사정으로 인한 결강 시 100% 보강 제공
- 응대 톤: 따뜻하고 전문적, 학부모의 감정에 먼저 공감 후 해결책 제시

## 민원 유형 분류
- 성적불만: 성적 하락, 수업 효과 불만
- 환경불만: 시설, 위생, 교실 환경 관련
- 환불요청: 수강료 환불 요청
- 강사관련: 강사 교체, 강사 태도, 교수법 불만
- 기타: 위 분류에 해당하지 않는 민원

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

{
  "category": "성적불만|환경불만|환불요청|강사관련|기타",
  "urgency": "immediate|same_day|normal|low",
  "summary": "민원 핵심 내용 요약 (2-3문장)",
  "suggestedReply": "학부모에게 보낼 답변 초안 (완성된 문장, 200자 내외)",
  "requiresApproval": true,
  "reasoning": "이 분류와 답변을 선택한 이유",
  "suggestedActions": ["후속 조치 1", "후속 조치 2"]
}

## 긴급도 기준
- immediate: 환불/법적 위협, 즉각 조치 필요
- same_day: 당일 처리 필요한 불만
- normal: 2-3일 내 처리
- low: 일반 문의`

export async function runComplaintAgent(input: ComplaintAgentInput): Promise<ComplaintAgentOutput> {
  const studentInfo = input.studentId
    ? `연관 학생 ID: ${input.studentId}`
    : "연관 학생 정보 없음"

  const reporterInfo = input.reporterId
    ? `민원인 ID: ${input.reporterId}`
    : "민원인 정보 없음"

  const userMessage = `다음 민원을 분석하고 처리 방안을 JSON으로 출력해주세요.

민원 제목: ${input.title}
민원 내용: ${input.description || "(내용 없음)"}
${reporterInfo}
${studentInfo}

위 민원을 분류하고, 학원 방침에 맞는 답변 초안을 작성해주세요.`

  const response = await callClaude(SYSTEM_PROMPT, userMessage, {
    maxTokens: 2048,
  })

  try {
    const parsed = JSON.parse(response.content.trim()) as {
      category: string
      urgency: "immediate" | "same_day" | "normal" | "low"
      summary: string
      suggestedReply: string
      requiresApproval: boolean
      reasoning: string
      suggestedActions: string[]
    }

    return {
      caseId: input.caseId,
      analysis: {
        category: parsed.category,
        urgency: parsed.urgency,
        summary: parsed.summary,
        suggestedReply: parsed.suggestedReply,
        requiresApproval: parsed.requiresApproval ?? true,
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  } catch {
    // Fallback if JSON parse fails
    return {
      caseId: input.caseId,
      analysis: {
        category: "기타",
        urgency: "normal",
        summary: `${input.title}에 대한 민원이 접수되었습니다.`,
        suggestedReply:
          "안녕하세요. 소중한 의견을 주셔서 감사합니다. 담당자가 검토 후 빠른 시일 내에 연락드리겠습니다.",
        requiresApproval: true,
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  }
}
