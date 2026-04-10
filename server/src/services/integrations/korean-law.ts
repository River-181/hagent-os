import fs from "node:fs"
import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import path from "node:path"

const execFile = promisify(execFileCallback)

const integrationRoot = fileURLToPath(
  new URL("../../../../integrations/korean-law-mcp", import.meta.url),
)
const cliPath = path.join(integrationRoot, "build/cli.js")

export interface KoreanLawLookupResult {
  source: "korean-law-mcp"
  query: string
  installed: boolean
  connected: boolean
  degraded: boolean
  missingEnv: string[]
  routeTool?: string | null
  summary?: string | null
  detail?: string | null
  error?: string | null
}

function truncate(text: string, max = 700) {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text
}

export function getKoreanLawEnvStatus() {
  const apiKey = process.env.LAW_OC || process.env.KOREAN_LAW_API_KEY || ""
  return {
    installed: fs.existsSync(cliPath),
    connected: Boolean(apiKey),
    apiKey,
    missingEnv: apiKey ? [] : ["LAW_OC"],
  }
}

export function buildComplaintLawQuery(title: string, description: string) {
  const source = `${title}\n${description}`.trim()
  if (!source) return null

  if (/환불|환급|해지|수강료/.test(source)) {
    return "학원 수강료 환불 기준과 학원법 관련 규정"
  }
  if (/강사|근로|급여|해고|휴게|근무/.test(source)) {
    return "학원 강사 근로기준법 및 근로조건 관련 규정"
  }
  if (/학원법|법적|규정|위법|소송/.test(source)) {
    return `${title} ${description}`.trim()
  }
  return null
}

export async function lookupKoreanLaw(query: string): Promise<KoreanLawLookupResult> {
  const env = getKoreanLawEnvStatus()

  if (!env.installed) {
    return {
      source: "korean-law-mcp",
      query,
      installed: false,
      connected: env.connected,
      degraded: true,
      missingEnv: env.missingEnv,
      error: "korean-law-mcp is not built",
    }
  }

  if (!env.connected) {
    return {
      source: "korean-law-mcp",
      query,
      installed: true,
      connected: false,
      degraded: true,
      missingEnv: env.missingEnv,
      error: "LAW_OC is not configured",
    }
  }

  try {
    const { stdout } = await execFile(
      "node",
      [cliPath, "query", query, "--json"],
      {
        cwd: integrationRoot,
        env: {
          ...process.env,
          LAW_OC: env.apiKey,
        },
        timeout: 20_000,
        maxBuffer: 2_000_000,
      },
    )

    const parsed = JSON.parse(stdout) as {
      route?: { tool?: string; reason?: string }
      result?: string
      pipelineResult?: string
      error?: string
    }

    const detail = parsed.pipelineResult || parsed.result || parsed.error || ""
    const summary = parsed.route?.reason
      ? `${parsed.route.reason}${detail ? `\n${truncate(detail, 420)}` : ""}`
      : truncate(detail, 420)

    return {
      source: "korean-law-mcp",
      query,
      installed: true,
      connected: true,
      degraded: false,
      missingEnv: [],
      routeTool: parsed.route?.tool ?? null,
      summary: summary || null,
      detail: detail ? truncate(detail, 1_200) : null,
      error: parsed.error ?? null,
    }
  } catch (error) {
    return {
      source: "korean-law-mcp",
      query,
      installed: true,
      connected: true,
      degraded: true,
      missingEnv: [],
      error: error instanceof Error ? error.message : "Failed to execute korean-law-mcp",
    }
  }
}
