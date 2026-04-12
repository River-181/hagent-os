import { spawn, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import Anthropic from "@anthropic-ai/sdk"

export interface RuntimeResponse {
  content: string
  inputTokens: number
  outputTokens: number
  adapterType: string
  model: string
  degraded?: boolean
}

export interface RuntimeOptions {
  adapterType?: string
  model?: string
  maxTokens?: number
}

let anthropicClient: Anthropic | null = null
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic()
  }
  return anthropicClient
}

function isJsonObjectLine(line: string) {
  const trimmed = line.trim()
  return trimmed.startsWith("{") && trimmed.endsWith("}")
}

function extractCodexContentFromJsonLines(output: string) {
  let latest = ""

  for (const line of output.split(/\r?\n/)) {
    if (!isJsonObjectLine(line)) continue

    try {
      const event = JSON.parse(line) as {
        type?: string
        item?: {
          type?: string
          text?: string
          content?: Array<{ text?: string }>
        }
      }

      if (event.type !== "item.completed" || event.item?.type !== "agent_message") continue

      if (typeof event.item.text === "string" && event.item.text.trim()) {
        latest = event.item.text.trim()
        continue
      }

      if (Array.isArray(event.item.content)) {
        const content = event.item.content
          .map((item) => item.text ?? "")
          .join("\n")
          .trim()
        if (content) latest = content
      }
    } catch {
      // ignore non-codex json lines
    }
  }

  return latest
}

function hasCodexQauthSessionSync() {
  const result = spawnSync("codex", ["login", "status"], {
    encoding: "utf8",
    timeout: 5000,
  })

  if (result.error) return false
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  return /Logged in using ChatGPT|logged in|authenticated/i.test(combined)
}

async function callCodexCli(
  systemPrompt: string,
  userMessage: string,
  options: RuntimeOptions,
): Promise<RuntimeResponse> {
  const connected = hasCodexQauthSessionSync()
  if (!connected) {
    return {
      ...getMockResponse(systemPrompt, userMessage),
      adapterType: options.adapterType ?? "codex_qauth",
      model: options.model ?? "gpt-5-codex",
      degraded: true,
    }
  }

  const instruction = [
    "You are executing a HagentOS runtime request.",
    "Do not modify files, inspect the repository, or take tool actions unless explicitly required.",
    "Respond only with the final answer content that satisfies the request.",
    "",
    "<SYSTEM_PROMPT>",
    systemPrompt,
    "</SYSTEM_PROMPT>",
    "",
    "<USER_MESSAGE>",
    userMessage,
    "</USER_MESSAGE>",
  ].join("\n")

  const args = [
    "exec",
    "--json",
    "-m",
    options.model ?? "gpt-5-codex",
    "-s",
    "workspace-write",
    "-C",
    repoRoot,
    instruction,
  ]

  const { output, exitCode } = await new Promise<{ output: string; exitCode: number }>((resolve) => {
    const child = spawn("codex", args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        TERM: process.env.TERM ?? "dumb",
      },
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("close", (code) => {
      resolve({
        output: `${stdout}\n${stderr}`,
        exitCode: code ?? 0,
      })
    })
    child.on("error", () => {
      resolve({
        output: `${stdout}\n${stderr}`,
        exitCode: 1,
      })
    })
  })

  const content = extractCodexContentFromJsonLines(output)
  if (exitCode !== 0 || !content) {
    return {
      ...getMockResponse(systemPrompt, userMessage),
      adapterType: options.adapterType ?? "codex_qauth",
      model: options.model ?? "gpt-5-codex",
      degraded: true,
    }
  }

  return {
    content,
    inputTokens: 0,
    outputTokens: 0,
    adapterType: options.adapterType ?? "codex_qauth",
    model: options.model ?? "gpt-5-codex",
  }
}

function parseInstruction(userMessage: string) {
  const instructionMatch = userMessage.match(/(?:원장 지시|지시):\s*(.+?)(?:\n|$)/s)
  return instructionMatch?.[1]?.trim() ?? userMessage.slice(0, 200)
}

function extractLabeledValue(userMessage: string, label: string) {
  const match = userMessage.match(new RegExp(`${label}:\\s*(.+?)(?:\\n|$)`, "s"))
  return match?.[1]?.trim() ?? null
}

function mockOrchestratorResponse(userMessage: string): RuntimeResponse {
  const agentIdMatches = [...userMessage.matchAll(/id:\s*([0-9a-f-]{36}),\s*유형:\s*(\w+)/g)]
  const agentMap = new Map<string, string>()
  for (const match of agentIdMatches) {
    agentMap.set(match[2], match[1])
  }

  const instruction = parseInstruction(userMessage)
  const assignments: Array<{ agentId: string; reason: string }> = []

  const isComplaint = /민원|불만|환불|항의|컴플레인|문의/.test(instruction)
  const isRetention = /이탈|결석|출석|지각|재등록|위험/.test(instruction)
  const isSchedule = /일정|스케줄|수업|시간표|보강|대타|상담|캘린더/.test(instruction)

  if (isComplaint && agentMap.get("complaint")) {
    assignments.push({ agentId: agentMap.get("complaint")!, reason: "민원/응대 관련 업무" })
  }
  if (isRetention && agentMap.get("retention")) {
    assignments.push({ agentId: agentMap.get("retention")!, reason: "이탈 위험/재등록 관련 분석" })
  }
  if (isSchedule && agentMap.get("scheduler")) {
    assignments.push({ agentId: agentMap.get("scheduler")!, reason: "일정/보강/상담 스케줄 조정" })
  }
  if (assignments.length === 0) {
    const orchestratorId = agentMap.get("orchestrator") ?? agentMap.values().next().value
    if (orchestratorId) {
      assignments.push({ agentId: orchestratorId, reason: "일반 운영 지시 또는 분류 불명 업무" })
    }
  }

  return {
    content: JSON.stringify({
      plan: `"${instruction}" 요청을 분석해 ${assignments.length}개 실행 단위로 배분합니다.`,
      assignments,
    }),
    inputTokens: 260,
    outputTokens: 92,
    adapterType: "mock_local",
    model: "mock-orchestrator",
    degraded: true,
  }
}

function mockComplaintResponse(userMessage: string): RuntimeResponse {
  const title = extractLabeledValue(userMessage, "민원 제목") ?? "민원"
  const description = extractLabeledValue(userMessage, "민원 내용") ?? ""
  const instruction = `${title} ${description}`.trim()
  const category = /환불|환급|수강료/.test(instruction)
    ? "환불요청"
    : /강사|선생님|교사/.test(instruction)
    ? "강사관련"
    : /시설|환경|위생/.test(instruction)
    ? "환경불만"
    : /성적|점수|효과/.test(instruction)
    ? "성적불만"
    : "기타"
  return {
    content: JSON.stringify({
      category,
      urgency: /즉시|당장|급/.test(instruction) ? "immediate" : "same_day",
      summary: `${title} 이슈를 접수했고, 공감 표현과 후속 조치를 포함한 응대 초안을 준비했습니다.`,
      suggestedReply: `안녕하세요. ${title} 관련 말씀 주신 내용 확인했습니다. 불편을 드려 죄송합니다. 현재 수업 상황과 내부 기준을 바로 확인한 뒤 오늘 안으로 가능한 해결 방안을 안내드리겠습니다.`,
      requiresApproval: true,
      reasoning: "학부모 응대 성격의 업무이므로 공감 표현과 후속 조치를 함께 제시합니다.",
      suggestedActions: ["학부모 답변 초안 검토", "담당 강사 상황 확인", "원장 승인 요청"],
    }),
    inputTokens: 410,
    outputTokens: 210,
    adapterType: "mock_local",
    model: "mock-complaint",
    degraded: true,
  }
}

function mockRetentionResponse(userMessage: string): RuntimeResponse {
  const instruction = parseInstruction(userMessage)
  return {
    content: JSON.stringify({
      riskScore: 0.76,
      riskLevel: "high",
      signals: ["최근 결석 증가", "상담 이력 부족", "학습 몰입도 저하 징후"],
      reasoning: `"${instruction}" 요청에 따라 학생 상태를 분석한 결과, 조기 개입이 필요한 수준으로 판단했습니다.`,
      recommendedActions: ["학부모 상담 예약", "담당 강사 코칭 메모 작성", "1주일 내 재점검"],
    }),
    inputTokens: 380,
    outputTokens: 168,
    adapterType: "mock_local",
    model: "mock-retention",
    degraded: true,
  }
}

function mockSchedulerResponse(userMessage: string): RuntimeResponse {
  const title = extractLabeledValue(userMessage, "케이스 제목") ?? "상담 일정"
  const description = extractLabeledValue(userMessage, "케이스 설명") ?? ""
  const instruction = `${title} ${description}`.trim()
  return {
    content: JSON.stringify({
      summary: `${title} 요청을 기준으로 상담/보강 일정 초안을 제안했습니다.`,
      suggestedSchedule: {
        title: /보강/.test(instruction) ? "보강 수업 일정" : "학부모 상담 일정",
        type: "counseling",
        dayOfWeek: 2,
        startTime: "18:30",
        endTime: "19:00",
        room: "상담실",
      },
      calendarAction: {
        provider: "google-calendar",
        status: "pending_sync",
      },
      requiresApproval: true,
      reasoning: "일정 변경은 운영 영향이 있으므로 승인 후 확정하는 흐름이 적합합니다.",
      suggestedActions: ["상담 일정 승인", "강사/학부모 안내", "캘린더 동기화"],
    }),
    inputTokens: 310,
    outputTokens: 174,
    adapterType: "mock_local",
    model: "mock-scheduler",
    degraded: true,
  }
}

function getMockResponse(systemPrompt: string, userMessage: string): RuntimeResponse {
  if (systemPrompt.includes("오케스트레이터") || systemPrompt.includes("orchestrator")) {
    return mockOrchestratorResponse(userMessage)
  }
  if (systemPrompt.includes("민원") || systemPrompt.includes("complaint")) {
    return mockComplaintResponse(userMessage)
  }
  if (systemPrompt.includes("이탈") || systemPrompt.includes("retention")) {
    return mockRetentionResponse(userMessage)
  }
  if (systemPrompt.includes("스케줄") || systemPrompt.includes("scheduler")) {
    return mockSchedulerResponse(userMessage)
  }

  return {
    content: JSON.stringify({
      result: "작업 완료",
      summary: parseInstruction(userMessage),
      suggestedActions: ["결과 검토", "후속 조치 여부 판단"],
    }),
    inputTokens: 180,
    outputTokens: 120,
    adapterType: "mock_local",
    model: "mock-generic",
    degraded: true,
  }
}

async function callClaude(systemPrompt: string, userMessage: string, options: RuntimeOptions): Promise<RuntimeResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ...getMockResponse(systemPrompt, userMessage),
      adapterType: options.adapterType ?? "claude_local",
      model: options.model ?? "claude-sonnet-4-6",
      degraded: true,
    }
  }

  const response = await getAnthropicClient().messages.create({
    model: options.model ?? "claude-sonnet-4-6-20250514",
    max_tokens: options.maxTokens ?? 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const textBlock = response.content.find((block) => block.type === "text")
  return {
    content: textBlock?.text ?? "",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    adapterType: options.adapterType ?? "claude_local",
    model: options.model ?? "claude-sonnet-4-6",
  }
}

async function callCodex(systemPrompt: string, userMessage: string, options: RuntimeOptions): Promise<RuntimeResponse> {
  if (!process.env.OPENAI_API_KEY) {
    if (hasCodexQauthSessionSync()) {
      return callCodexCli(systemPrompt, userMessage, {
        ...options,
        adapterType: options.adapterType ?? "codex_local",
      })
    }
    return {
      ...getMockResponse(systemPrompt, userMessage),
      adapterType: options.adapterType ?? "codex_local",
      model: options.model ?? "gpt-5-codex",
      degraded: true,
    }
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-5-codex",
      reasoning: { effort: "medium" },
      max_output_tokens: options.maxTokens ?? 2048,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userMessage }],
        },
      ],
    }),
  })

  if (!response.ok) {
    return {
      ...getMockResponse(systemPrompt, userMessage),
      adapterType: options.adapterType ?? "codex_local",
      model: options.model ?? "gpt-5-codex",
      degraded: true,
    }
  }

  const json = (await response.json()) as {
    output?: Array<{ content?: Array<{ text?: string }> }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }

  const content = json.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n").trim() ?? ""
  return {
    content,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    adapterType: options.adapterType ?? "codex_local",
    model: options.model ?? "gpt-5-codex",
  }
}

export async function runWithAdapter(
  systemPrompt: string,
  userMessage: string,
  options: RuntimeOptions = {},
): Promise<RuntimeResponse> {
  const adapterType = options.adapterType ?? "mock_local"
  if (adapterType === "claude_local") {
    return callClaude(systemPrompt, userMessage, options)
  }
  if (adapterType === "codex_qauth") {
    return callCodexCli(systemPrompt, userMessage, options)
  }
  if (adapterType === "codex_local") {
    return callCodex(systemPrompt, userMessage, options)
  }
  return {
    ...getMockResponse(systemPrompt, userMessage),
    adapterType,
    model: options.model ?? "mock-local",
    degraded: true,
  }
}
