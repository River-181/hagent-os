import fs from "node:fs"
import { fileURLToPath } from "node:url"

export interface IntegrationStatus {
  key: string
  label: string
  category: "law" | "calendar" | "messaging" | "runtime"
  installed: boolean
  connected: boolean
  inactive: boolean
  missingEnv: string[]
  command?: string | null
  description: string
}

export interface AdapterStatus {
  key: "codex_local" | "claude_local" | "mock_local"
  label: string
  installed: boolean
  connected: boolean
  inactive: boolean
  defaultModel: string
  availableModels: string[]
  description: string
  missingEnv: string[]
}

export interface PluginStatus {
  key: string
  label: string
  installed: boolean
  connected: boolean
  inactive: boolean
  category: string
  description: string
}

function envStatus(keys: string[]) {
  const missingEnv = keys.filter((key) => !process.env[key])
  return {
    connected: missingEnv.length === 0,
    missingEnv,
  }
}

function customEnvStatus(presentKeys: string[], requiredLabel: string) {
  const connected = presentKeys.some((key) => Boolean(process.env[key]))
  return {
    connected,
    missingEnv: connected ? [] : [requiredLabel],
  }
}

function which(command: string) {
  const pathValue = process.env.PATH ?? ""
  for (const directory of pathValue.split(":")) {
    const resolved = `${directory}/${command}`
    if (fs.existsSync(resolved)) return resolved
  }
  return null
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  const lawEnv = customEnvStatus(["LAW_OC", "KOREAN_LAW_API_KEY"], "LAW_OC")
  const calendarEnv = envStatus(["GOOGLE_CALENDAR_ACCESS_TOKEN"])
  const kakaoEnv = envStatus(["KAKAO_CHANNEL_ID", "KAKAO_CHANNEL_SECRET"])
  const smsEnv = envStatus(["ALIGO_API_KEY", "ALIGO_USER_ID"])
  const lawCliPath = fileURLToPath(
    new URL("../../../integrations/korean-law-mcp/build/cli.js", import.meta.url),
  )

  return [
    {
      key: "korean-law-mcp",
      label: "Korean Law MCP",
      category: "law",
      installed: fs.existsSync(lawCliPath),
      connected: lawEnv.connected,
      inactive: !lawEnv.connected,
      missingEnv: lawEnv.missingEnv,
      command: fs.existsSync(lawCliPath) ? lawCliPath : null,
      description: "학원법/환불/근로 관련 법령 조회",
    },
    {
      key: "google-calendar-mcp",
      label: "Google Calendar",
      category: "calendar",
      installed: Boolean(which("node")),
      connected: calendarEnv.connected,
      inactive: !calendarEnv.connected,
      missingEnv: calendarEnv.missingEnv,
      command: which("node"),
      description: "상담/보강/대체 수업 캘린더 동기화",
    },
    {
      key: "kakao-channel",
      label: "Kakao Channel",
      category: "messaging",
      installed: true,
      connected: kakaoEnv.connected,
      inactive: !kakaoEnv.connected,
      missingEnv: kakaoEnv.missingEnv,
      command: null,
      description: "학부모 카카오 응대/알림 전송",
    },
    {
      key: "aligo-sms",
      label: "Aligo SMS",
      category: "messaging",
      installed: true,
      connected: smsEnv.connected,
      inactive: !smsEnv.connected,
      missingEnv: smsEnv.missingEnv,
      command: null,
      description: "문자 발송 및 승인 알림",
    },
  ]
}

export function getAdapterStatuses(): AdapterStatus[] {
  const openaiEnv = envStatus(["OPENAI_API_KEY"])
  const anthropicEnv = envStatus(["ANTHROPIC_API_KEY"])

  return [
    {
      key: "codex_local",
      label: "Codex Local",
      installed: true,
      connected: openaiEnv.connected,
      inactive: false,
      defaultModel: "gpt-5-codex",
      availableModels: ["gpt-5-codex", "gpt-5.4", "gpt-5.4-mini"],
      description: "기본 실사용 테스트 어댑터",
      missingEnv: openaiEnv.missingEnv,
    },
    {
      key: "claude_local",
      label: "Claude Local",
      installed: true,
      connected: anthropicEnv.connected,
      inactive: false,
      defaultModel: "claude-sonnet-4-6",
      availableModels: ["claude-sonnet-4-6", "claude-haiku-4-5"],
      description: "fallback 어댑터",
      missingEnv: anthropicEnv.missingEnv,
    },
    {
      key: "mock_local",
      label: "Mock Local",
      installed: true,
      connected: true,
      inactive: false,
      defaultModel: "mock-local",
      availableModels: ["mock-local"],
      description: "실연동 미설정 시 degraded mode",
      missingEnv: [],
    },
  ]
}

export function getPluginStatuses(): PluginStatus[] {
  const integrations = getIntegrationStatuses()
  return [
    {
      key: "company-bootstrap",
      label: "Bootstrap Manager",
      installed: true,
      connected: true,
      inactive: false,
      category: "core",
      description: "기관 온보딩과 starter team 생성을 담당",
    },
    {
      key: "skills-registry",
      label: "Skills Registry",
      installed: true,
      connected: true,
      inactive: false,
      category: "core",
      description: "k-skill 카탈로그와 agent mount 관리",
    },
    {
      key: "activity-audit",
      label: "Activity Audit",
      installed: true,
      connected: true,
      inactive: false,
      category: "core",
      description: "run/approval/skill 이벤트 기록",
    },
    {
      key: "integration-manager",
      label: "Integration Manager",
      installed: true,
      connected: integrations.some((item) => item.connected),
      inactive: false,
      category: "integration",
      description: "외부 MCP/메시징/캘린더 readiness를 관리",
    },
  ]
}
