import { runWithAdapter } from "../runtime.js"
import type { ComplaintAgentInput, ComplaintAgentOutput } from "./types.js"
import {
  buildComplaintLawQuery,
  lookupKoreanLaw,
} from "../../services/integrations/korean-law.js"

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

const LEGAL_INQUIRY_SYSTEM_PROMPT = `당신은 학원 운영자의 질문을 정리해 주는 학원 운영·법령 보조 AI입니다.

## 역할
- 학원 설립/운영/교습비/환불/상담 정책 관련 질문에 짧고 정확하게 답합니다.
- 운영자가 바로 이해할 수 있게 핵심만 정리합니다.
- 법령 근거가 있으면 요약해서 함께 제시합니다.

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

{
  "category": "법률질문|운영정책|일반문의",
  "urgency": "normal|low",
  "summary": "질문 핵심을 1-2문장으로 요약",
  "suggestedReply": "운영자에게 보여줄 간략한 답변 본문",
  "requiresApproval": false,
  "reasoning": "이 답변을 구성한 이유",
  "suggestedActions": ["후속 조치 1", "후속 조치 2"]
}

## 추가 규칙
- 입력이 너무 짧거나 의미가 불명확하면 추측하지 말고, 학원 관련 문의 내용을 다시 알려 달라고 짧게 안내합니다.
- 학원 운영과 무관하거나 맥락이 어긋난 요청이면 정중히 범위를 안내하고, 수강/상담/일정/결제/환불 중 무엇을 원하는지 다시 묻습니다.
- 답변은 3문장을 넘기지 말고, 과장된 추론이나 장황한 설명을 하지 마세요.`

export async function runComplaintAgent(input: ComplaintAgentInput): Promise<ComplaintAgentOutput> {
  const isInquiry = input.caseType === "inquiry" || input.caseKind === "legal-inquiry" || input.caseKind === "quick-ask"
  const shouldDefaultToApproval =
    input.caseKind === "counseling"
      || input.caseKind === "payment"
      || input.caseKind === "campaign-request"
      || !isInquiry
  const studentInfo = input.studentId
    ? `연관 학생 ID: ${input.studentId}`
    : "연관 학생 정보 없음"

  const reporterInfo = input.reporterId
    ? `민원인 ID: ${input.reporterId}`
    : "민원인 정보 없음"

  const legalQuery = buildComplaintLawQuery(input.title, input.description || "")
  const legalContext = legalQuery ? await lookupKoreanLaw(legalQuery) : null
  const legalContextBlock = legalContext
    ? `
법령 참고:
- source: ${legalContext.source}
- connected: ${legalContext.connected}
- degraded: ${legalContext.degraded}
- query: ${legalContext.query}
- summary: ${legalContext.summary ?? legalContext.error ?? "없음"}`
    : ""

  const userMessage = isInquiry
    ? `다음 질문에 운영자 관점의 답변을 JSON으로 출력해주세요.

질문 제목: ${input.title}
질문 내용: ${input.description || "(내용 없음)"}
${reporterInfo}
${studentInfo}
${input.allowedChannels?.length ? `허용 채널: ${input.allowedChannels.join(", ")}` : ""}
${input.runtimeSkills?.length ? `장착된 스킬: ${input.runtimeSkills.map((skill) => `${skill.displayName}(${skill.slug})`).join(", ")}` : ""}
${input.followUpContext ? `\n후속 지시/대화 맥락:\n${input.followUpContext}\n` : ""}
${input.skillContext ? `\n실행 스킬 번들:\n${input.skillContext}\n` : ""}
${legalContextBlock}

학원 운영자가 바로 읽고 판단할 수 있도록 핵심만 간단히 정리해주세요.`
    : `다음 민원을 분석하고 처리 방안을 JSON으로 출력해주세요.

민원 제목: ${input.title}
민원 내용: ${input.description || "(내용 없음)"}
${reporterInfo}
${studentInfo}
${input.allowedChannels?.length ? `허용 채널: ${input.allowedChannels.join(", ")}` : ""}
${input.runtimeSkills?.length ? `장착된 스킬: ${input.runtimeSkills.map((skill) => `${skill.displayName}(${skill.slug})`).join(", ")}` : ""}
${input.followUpContext ? `\n후속 지시/대화 맥락:\n${input.followUpContext}\n` : ""}
${input.skillContext ? `\n실행 스킬 번들:\n${input.skillContext}\n` : ""}
${legalContextBlock}

위 민원을 분류하고, 학원 방침에 맞는 답변 초안을 작성해주세요.`

  const response = await runWithAdapter(isInquiry ? LEGAL_INQUIRY_SYSTEM_PROMPT : SYSTEM_PROMPT, userMessage, {
    adapterType: input.adapterType ?? undefined,
    model: input.model ?? undefined,
    apiKey: input.apiKey ?? undefined,
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
        requiresApproval: shouldDefaultToApproval || parsed.requiresApproval === true,
        legalBasis: legalContext
          ? {
              source: legalContext.source,
              query: legalContext.query,
              summary: legalContext.summary ?? legalContext.error ?? null,
              connected: legalContext.connected,
              degraded: legalContext.degraded,
            }
          : undefined,
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  } catch {
    // Fallback if JSON parse fails
    return {
      caseId: input.caseId,
      analysis: {
        category: isInquiry ? "법률질문" : "기타",
        urgency: "normal",
        summary: isInquiry ? `${input.title}에 대한 질문을 정리했습니다.` : `${input.title}에 대한 민원이 접수되었습니다.`,
        suggestedReply: isInquiry
          ? "관련 운영 기준과 법령 근거를 확인한 뒤 핵심만 다시 정리해 드리겠습니다."
          : "안녕하세요. 소중한 의견을 주셔서 감사합니다. 담당자가 검토 후 빠른 시일 내에 연락드리겠습니다.",
        requiresApproval: shouldDefaultToApproval,
        legalBasis: legalContext
          ? {
              source: legalContext.source,
              query: legalContext.query,
              summary: legalContext.summary ?? legalContext.error ?? null,
              connected: legalContext.connected,
              degraded: legalContext.degraded,
            }
          : undefined,
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  }
}
