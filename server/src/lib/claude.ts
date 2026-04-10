import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic()
  }
  return client
}

export interface ClaudeResponse {
  content: string
  inputTokens: number
  outputTokens: number
}

// ─── Mock responses ───────────────────────────────────────────────────────────

function mockOrchestratorResponse(userMessage: string): ClaudeResponse {
  // Parse agent list from user message to get real agent IDs
  const agentIdMatches = [...userMessage.matchAll(/id:\s*([0-9a-f-]{36}),\s*유형:\s*(\w+)/g)]
  const agentMap = new Map<string, string>() // agentType → agentId
  for (const m of agentIdMatches) {
    agentMap.set(m[2], m[1])
  }

  // Extract the actual user instruction (after "지시:" marker or full text)
  const instructionMatch = userMessage.match(/지시:\s*(.+?)(?:\n|$)/s)
  const instruction = instructionMatch?.[1]?.trim() ?? userMessage.slice(0, 200)

  const assignments: Array<{ agentId: string; reason: string }> = []

  // Smart routing based on instruction content
  const lowerMsg = instruction.toLowerCase()

  const isComplaint = /민원|불만|환불|항의|컴플레인/.test(lowerMsg)
  const isRetention = /이탈|위험|결석|출석|지각/.test(lowerMsg)
  const isSchedule = /일정|스케줄|수업|시간표|보강|대타|강사/.test(lowerMsg)
  const isGeneral = !isComplaint && !isRetention && !isSchedule

  if (isComplaint) {
    const complaintId = agentMap.get("complaint")
    if (complaintId) assignments.push({ agentId: complaintId, reason: instruction })
  }

  if (isRetention) {
    const retentionId = agentMap.get("retention")
    if (retentionId) assignments.push({ agentId: retentionId, reason: instruction })
  }

  if (isSchedule) {
    const schedulerId = agentMap.get("scheduler")
    if (schedulerId) assignments.push({ agentId: schedulerId, reason: instruction })
  }

  // General/unknown → orchestrator handles it directly, or assign to first available agent
  if (isGeneral || assignments.length === 0) {
    const orchestratorId = agentMap.get("orchestrator")
    if (orchestratorId) {
      assignments.push({ agentId: orchestratorId, reason: instruction })
    } else {
      // Fallback: assign to any available agent
      const firstId = agentMap.values().next().value
      if (firstId) assignments.push({ agentId: firstId, reason: instruction })
    }
  }

  return {
    content: JSON.stringify({
      plan: `"${instruction}" — ${assignments.length}개 에이전트에게 작업을 배정합니다.`,
      assignments,
    }),
    inputTokens: 312,
    outputTokens: 88,
  }
}

function mockComplaintResponse(userMessage: string): ClaudeResponse {
  // Extract instruction context
  const instructionMatch = userMessage.match(/지시:\s*(.+?)(?:\n|$)/s)
  const instruction = instructionMatch?.[1]?.trim() ?? userMessage.slice(0, 100)

  return {
    content: JSON.stringify({
      category: "민원접수",
      severity: "same_day",
      draft: `[민원 처리 결과]\n\n요청 사항: ${instruction}\n\n처리 내용:\n해당 민원을 접수하여 분석하였습니다. 담당 강사에게 상황을 전달하고, 학부모님께 24시간 이내 회신 예정입니다.\n\n필요한 후속 조치를 진행하겠습니다.`,
      reasoning: `"${instruction}" 관련 민원이 접수되었습니다. 학원 정책에 따라 처리합니다.`,
      suggestedActions: [
        "담당 강사에게 상황 전달",
        "학부모 회신 준비",
        "관련 기록 업데이트",
      ],
    }),
    inputTokens: 428,
    outputTokens: 245,
  }
}

function mockRetentionResponse(userMessage: string): ClaudeResponse {
  const instructionMatch = userMessage.match(/지시:\s*(.+?)(?:\n|$)/s)
  const instruction = instructionMatch?.[1]?.trim() ?? "이탈 위험 학생 분석"

  return {
    content: JSON.stringify({
      riskScore: 0.72,
      riskLevel: "medium",
      signals: [
        "최근 2주 출석률 하락 감지",
        "과제 미제출 빈도 증가",
        "학부모 연락 응답률 감소",
      ],
      reasoning: `"${instruction}" 요청에 따라 학생 이탈 위험을 분석했습니다. 현재 위험 수준은 보통이며, 조기 개입이 필요합니다.`,
      recommendedActions: [
        "학부모 상담 전화 배정",
        "담임 강사 1:1 면담",
        "출결 알림 강화",
      ],
    }),
    inputTokens: 502,
    outputTokens: 278,
  }
}

async function getMockResponse(
  systemPrompt: string,
  userMessage: string,
): Promise<ClaudeResponse> {
  // Simulate real API latency
  await new Promise((r) => setTimeout(r, 1500))

  if (
    systemPrompt.includes("오케스트레이터") ||
    systemPrompt.includes("orchestrator")
  ) {
    return mockOrchestratorResponse(userMessage)
  }
  if (
    systemPrompt.includes("민원") ||
    systemPrompt.includes("complaint")
  ) {
    return mockComplaintResponse(userMessage)
  }
  if (
    systemPrompt.includes("이탈") ||
    systemPrompt.includes("retention")
  ) {
    return mockRetentionResponse(userMessage)
  }

  // General agent (orchestrator, scheduler, or unknown type)
  const instructionMatch = userMessage.match(/지시:\s*(.+?)(?:\n|$)/s)
  const instruction = instructionMatch?.[1]?.trim() ?? userMessage.slice(0, 200)

  return {
    content: JSON.stringify({
      result: "작업 완료",
      instruction,
      draft: `[작업 결과]\n\n요청: ${instruction}\n\n에이전트가 요청된 작업을 처리했습니다. 결과물을 검토해 주세요.`,
      reasoning: `"${instruction}" 요청을 분석하고 처리했습니다.`,
      suggestedActions: [
        "결과물 검토",
        "후속 작업 확인",
        "관련 문서 업데이트",
      ],
    }),
    inputTokens: 150,
    outputTokens: 200,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { model?: string; maxTokens?: number },
): Promise<ClaudeResponse> {
  // If no API key, use mock responses
  if (!process.env.ANTHROPIC_API_KEY) {
    return getMockResponse(systemPrompt, userMessage)
  }

  const response = await getClient().messages.create({
    model: options?.model ?? "claude-sonnet-4-6-20250514",
    max_tokens: options?.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const textBlock = response.content.find((b) => b.type === "text")

  return {
    content: textBlock?.text ?? "",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
