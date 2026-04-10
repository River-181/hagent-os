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

  const assignments: Array<{ agentId: string; reason: string }> = []

  // Assign complaint agent if exists
  const complaintId = agentMap.get("complaint")
  if (complaintId) {
    assignments.push({ agentId: complaintId, reason: "접수된 민원 케이스 처리" })
  }

  // Assign retention agent if instruction mentions 이탈/위험/결석
  const retentionId = agentMap.get("retention")
  if (retentionId && (userMessage.includes("이탈") || userMessage.includes("위험") || userMessage.includes("결석") || userMessage.includes("전체"))) {
    assignments.push({ agentId: retentionId, reason: "이탈 위험 학생 분석" })
  }

  return {
    content: JSON.stringify({
      plan: "민원 분류 및 응답 초안 작성, 이탈 위험 학생 분석을 병렬로 진행합니다.",
      assignments,
    }),
    inputTokens: 312,
    outputTokens: 88,
  }
}

function mockComplaintResponse(userMessage: string): ClaudeResponse {
  const isClassChange =
    userMessage.includes("반 변경") ||
    userMessage.includes("갈등") ||
    userMessage.includes("서준")

  if (isClassChange) {
    return {
      content: JSON.stringify({
        category: "환경불만",
        severity: "immediate",
        draft:
          "안녕하세요, 김서준 학부모님.\n\n서준이가 반 친구와의 갈등으로 학원 등원에 어려움을 겪고 있다니 마음이 안 좋습니다.\n\n학생 간 관계 문제는 저희가 가장 세심하게 관리하는 부분입니다. 담임 선생님이 우선 두 학생과 개별 면담을 진행하고, 필요하다면 반 변경도 유연하게 진행해 드리겠습니다.\n\n내일 중으로 담임 선생님께서 직접 연락드릴 예정입니다. 혹시 더 급한 사항이 있으시면 010-2673-0713으로 연락 주세요.\n\n감사합니다.\n탄자니아 영어학원 드림",
        reasoning:
          "학생 갈등으로 인한 등원 거부는 즉각 대응 필요. 반 변경은 학원 정책상 유연하게 운영 가능.",
        suggestedActions: [
          "담임 면담 즉시 배정",
          "두 학생 개별 상담",
          "반 변경 옵션 검토",
        ],
      }),
      inputTokens: 428,
      outputTokens: 245,
    }
  }

  // Default: 단어시험 성적 관련
  return {
    content: JSON.stringify({
      category: "성적불만",
      severity: "same_day",
      draft:
        "안녕하세요, 홍길동 학부모님.\n\n이번 주 영어 단어 시험 결과에 대해 걱정이 되셨을 것 같습니다. 홍길동 학생의 학습 상황을 면밀히 검토한 결과, 최근 2주간 새로운 단원 진입으로 인해 일시적으로 점수가 하락한 것으로 파악됩니다.\n\n탄자니아 영어학원에서는 성적 미향상 시 담임 1:1 면담과 무료 보충 수업을 제공하고 있습니다. 이번 주 토요일 보충수업에 참여하시면 복습과 함께 다음 시험 대비가 가능합니다.\n\n추가 상담이 필요하시면 카카오 채널(@탄자니아영어학원)로 편하게 연락 주세요.\n\n감사합니다.\n탄자니아 영어학원 드림",
      reasoning:
        "학부모가 성적 하락에 대한 우려를 표명. 학원 정책상 무료 보충수업 제공 가능. 즉각적이고 따뜻한 응대로 신뢰 유지 필요.",
      suggestedActions: [
        "보충수업 일정 안내",
        "담임 면담 예약",
        "주간 학습 리포트 발송",
      ],
    }),
    inputTokens: 395,
    outputTokens: 312,
  }
}

function mockRetentionResponse(_userMessage: string): ClaudeResponse {
  return {
    content: JSON.stringify({
      riskScore: 0.82,
      riskLevel: "high",
      signals: [
        "이번 달 결석 4회 (평균 대비 3배)",
        "지각 3회 연속 (최근 2주)",
        "영어 단어시험 성적 하락 추세 (85→72→65)",
        "학부모 상담 미응답 2회",
      ],
      reasoning:
        "이수아 학생(중2)은 최근 2주간 출석률이 급격히 하락했으며, 단어시험 성적도 연속 하락 중입니다. 결석과 지각이 동시에 증가하는 패턴은 학원 이탈의 전형적 초기 신호입니다. 학부모와의 소통도 단절되고 있어 즉각적인 개입이 필요합니다.",
      recommendedActions: [
        "학부모 긴급 상담 전화 (010-XXXX-XXXX)",
        "담임 강사 1:1 면담 배정 (이번 주 내)",
        "무료 보충수업 제안으로 학습 동기 부여",
        "출결 알림 카카오 메시지 강화",
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

  return {
    content: JSON.stringify({ result: "처리 완료" }),
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
