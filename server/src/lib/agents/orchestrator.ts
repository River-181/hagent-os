import { callClaude } from "../claude.js"
import type { OrchestratorInput, OrchestratorOutput, AgentAssignment } from "./types.js"

const SYSTEM_PROMPT = `당신은 탄자니아 영어학원의 AI 오케스트레이터입니다.

학원 운영 상황을 파악하고, 원장의 자연어 지시를 분석하여 어떤 AI 에이전트가 어떤 업무를 처리해야 하는지 계획을 수립합니다.

## 사용 가능한 에이전트 유형
- complaint: 학부모/학생 민원 처리, 답변 초안 작성
- retention: 이탈 위험 학생 분석, 개입 조치 추천

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

{
  "plan": "실행 계획 요약 (한국어, 2-3문장)",
  "assignments": [
    {
      "agentId": "에이전트 UUID",
      "reason": "이 에이전트에게 배정하는 이유 (한국어)"
    }
  ]
}

## 규칙
- 지시와 무관한 에이전트는 배정하지 마세요
- 같은 에이전트를 중복 배정하지 마세요
- 민원이 언급되면 complaint 에이전트를 배정하세요
- 이탈/그만두기/결석이 언급되면 retention 에이전트를 배정하세요`

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorOutput> {
  let contextData: {
    instruction?: string
    orgName?: string
    pendingCases?: unknown[]
  } = {}

  try {
    contextData = input.context ? JSON.parse(input.context) : {}
  } catch {
    contextData = {}
  }

  const agentList = input.agents
    .map((a) => `- ${a.name} (id: ${a.id}, 유형: ${a.agentType})`)
    .join("\n")

  const pendingCasesSummary =
    Array.isArray(contextData.pendingCases) && contextData.pendingCases.length > 0
      ? contextData.pendingCases
          .slice(0, 5)
          .map(
            (c: any) =>
              `  • [${c.identifier}] ${c.title} (유형: ${c.type}, 상태: ${c.status}, 심각도: ${c.severity})`,
          )
          .join("\n")
      : "  • 없음"

  const userMessage = `학원명: ${contextData.orgName ?? "탄자니아 영어학원"}

사용 가능한 에이전트:
${agentList}

현재 미처리 케이스:
${pendingCasesSummary}

원장 지시:
"${contextData.instruction ?? input.context ?? ""}"

위 지시를 분석하여 실행 계획과 에이전트 배정을 JSON으로 출력하세요.`

  const response = await callClaude(SYSTEM_PROMPT, userMessage, {
    maxTokens: 1024,
  })

  try {
    const parsed = JSON.parse(response.content.trim()) as {
      plan: string
      assignments: Array<{ agentId: string; reason: string }>
    }

    const assignments: AgentAssignment[] = parsed.assignments
      .filter((a) => input.agents.some((agent) => agent.id === a.agentId))
      .map((a) => ({ agentId: a.agentId, reason: a.reason }))

    return {
      plan: parsed.plan,
      assignments,
    }
  } catch {
    // Fallback: assign all agents if JSON parse fails
    const assignments: AgentAssignment[] = input.agents.map((a) => ({
      agentId: a.id,
      reason: "오케스트레이터 응답 파싱 실패 — 기본 배정",
    }))

    return {
      plan: response.content.slice(0, 200),
      assignments,
    }
  }
}
