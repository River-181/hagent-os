import { spawnSync } from "node:child_process"
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
  key: "codex_qauth" | "codex_local" | "claude_local" | "mock_local"
  label: string
  installed: boolean
  connected: boolean
  inactive: boolean
  defaultModel: string
  availableModels: string[]
  description: string
  missingEnv: string[]
  statusSummary: string
  statusDetail: string
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

function hasCodexQauthSession() {
  const result = spawnSync("codex", ["login", "status"], {
    encoding: "utf8",
    timeout: 5000,
  })

  if (result.error) return false
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  return /Logged in using ChatGPT|logged in|authenticated/i.test(combined)
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  const lawEnv = customEnvStatus(["LAW_OC", "KOREAN_LAW_API_KEY"], "LAW_OC")
  const calendarEnv = envStatus(["GOOGLE_CALENDAR_ACCESS_TOKEN"])
  const kakaoEnv = customEnvStatus(["KAKAO_REST_API_KEY", "KAKAO_ADMIN_KEY"], "KAKAO_REST_API_KEY")
  const kakaoOutboundEnv = envStatus(["KAKAO_OUTBOUND_PROVIDER_URL"])
  const telegramOutboundEnv = customEnvStatus(["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_API_TOKEN"], "TELEGRAM_BOT_TOKEN")
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
      key: "kakao-outbound",
      label: "Kakao Outbound",
      category: "messaging",
      installed: true,
      connected: kakaoOutboundEnv.connected,
      inactive: !kakaoOutboundEnv.connected,
      missingEnv: kakaoOutboundEnv.missingEnv,
      command: null,
      description: "승인 후 카카오 자동 회신 provider",
    },
    {
      key: "telegram-outbound",
      label: "Telegram Outbound",
      category: "messaging",
      installed: true,
      connected: telegramOutboundEnv.connected,
      inactive: !telegramOutboundEnv.connected,
      missingEnv: telegramOutboundEnv.missingEnv,
      command: null,
      description: "승인 후 텔레그램 자동 회신 또는 운영자 브리지",
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
  const codexQauthConnected = hasCodexQauthSession()

  return [
    {
      key: "codex_qauth",
      label: "Codex QAuth",
      installed: Boolean(which("codex")),
      connected: codexQauthConnected,
      inactive: false,
      defaultModel: "gpt-5-codex",
      availableModels: ["gpt-5-codex", "gpt-5.4", "gpt-5.4-mini"],
      description: "ChatGPT 로그인 기반 Codex 실행",
      missingEnv: codexQauthConnected ? [] : ["Codex qauth login"],
      statusSummary: codexQauthConnected ? "qauth logged in" : "qauth login required",
      statusDetail: codexQauthConnected
        ? "codex exec can run with the current ChatGPT session"
        : "run `codex login` and authenticate with ChatGPT before using this adapter",
    },
    {
      key: "codex_local",
      label: "Codex Local",
      installed: true,
      connected: openaiEnv.connected || codexQauthConnected,
      inactive: false,
      defaultModel: "gpt-5-codex",
      availableModels: ["gpt-5-codex", "gpt-5.4", "gpt-5.4-mini"],
      description: "API key 또는 qauth를 사용하는 Codex 실행",
      missingEnv: openaiEnv.connected || codexQauthConnected ? [] : ["OPENAI_API_KEY 또는 Codex qauth login"],
      statusSummary: openaiEnv.connected
        ? "openai api key connected"
        : codexQauthConnected
          ? "falling back to codex qauth"
          : "no codex auth configured",
      statusDetail: openaiEnv.connected
        ? "backend can call the OpenAI Responses API directly"
        : codexQauthConnected
          ? "backend will use the active ChatGPT session through `codex exec`"
          : "set OPENAI_API_KEY or log in with Codex qauth",
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
      statusSummary: anthropicEnv.connected ? "anthropic api key connected" : "anthropic key missing",
      statusDetail: anthropicEnv.connected
        ? "backend can call Anthropic directly"
        : "set ANTHROPIC_API_KEY to enable Claude fallback",
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
      statusSummary: "degraded fallback",
      statusDetail: "used only when live adapters are unavailable",
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
