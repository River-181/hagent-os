import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { getAdapterStatuses, getIntegrationStatuses } from "../services/control-plane-registry.js"
import { runWithAdapter } from "../lib/runtime.js"
import { lookupKoreanLaw } from "../services/integrations/korean-law.js"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function resolveOrgScopedIntegrationStatuses(
  integrations: ReturnType<typeof getIntegrationStatuses>,
  config: unknown,
) {
  if (!isPlainObject(config)) {
    return integrations.map((integration) => ({
      ...integration,
      statusSource: "process-env",
    }))
  }

  const nestedIntegrations = isPlainObject(config.integrations) ? config.integrations : {}
  const channels = isPlainObject(nestedIntegrations.channels) ? nestedIntegrations.channels : {}
  const telegram = isPlainObject(channels.telegram) ? channels.telegram : {}
  const telegramBotToken = typeof telegram.botToken === "string" ? telegram.botToken.trim() : ""

  if (!telegramBotToken) {
    return integrations.map((integration) => ({
      ...integration,
      statusSource: "process-env",
    }))
  }

  return integrations.map((integration) =>
    integration.key === "telegram-outbound"
      ? {
          ...integration,
          connected: true,
          inactive: false,
          missingEnv: [],
          statusSource: "org-configured",
        }
      : {
          ...integration,
          statusSource: "process-env",
        },
  )
}

export function adapterRoutes(db: Db): Router {
  const router = Router()

  router.get("/", async (req, res) => {
    const orgId = typeof req.query.orgId === "string" ? req.query.orgId : ""
    let integrations = getIntegrationStatuses()

    if (orgId) {
      const [organization] = await db
        .select({ agentTeamConfig: schema.organizations.agentTeamConfig })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
      integrations = resolveOrgScopedIntegrationStatuses(integrations, organization?.agentTeamConfig)
    }

    res.json({
      adapters: getAdapterStatuses(),
      integrations,
    })
  })

  router.post("/test", async (req, res) => {
    try {
      const key = String(req.body?.key ?? "")
      const byoApiKey = typeof req.body?.apiKey === "string" && req.body.apiKey.trim().length > 0
        ? req.body.apiKey.trim()
        : undefined
      const testedAt = new Date().toISOString()

      if (key === "codex_local" || key === "codex_qauth" || key === "claude_local") {
        const defaultModel = key === "claude_local" ? "claude-sonnet-4-6" : "gpt-5-codex"
        const result = await runWithAdapter(
          "당신은 학원 운영 보조 AI입니다. 한 문장으로만 답하세요.",
          "환불 문의를 받았을 때 운영자가 먼저 확인해야 할 항목 1가지만 말해줘.",
          {
            adapterType: key,
            model: typeof req.body?.model === "string" ? req.body.model : defaultModel,
            apiKey: byoApiKey,
            maxTokens: 120,
          },
        )

        res.json({
          key,
          ok: true,
          testedAt,
          connected: !result.degraded,
          degraded: Boolean(result.degraded),
          adapterType: result.adapterType,
          model: result.model,
          preview: result.content.slice(0, 240),
          lastResult: result.degraded ? "degraded" : "connected",
          statusSummary: result.degraded
            ? key === "codex_qauth"
              ? "Codex qauth session is not authenticated"
              : key === "codex_local"
                ? "Codex is falling back or missing auth"
                : "adapter test degraded"
            : key === "codex_qauth"
              ? "Codex qauth session is authenticated"
              : key === "codex_local"
                ? "Codex runtime is available"
                : "adapter test connected",
          statusDetail:
            key === "codex_qauth"
              ? result.degraded
                ? "Run `codex login` and authenticate with ChatGPT to enable this adapter."
                : "The active ChatGPT session can run Codex jobs."
              : key === "codex_local"
                ? result.degraded
                  ? "Set OPENAI_API_KEY or log in with Codex qauth to enable direct Codex execution."
                  : "Codex execution is available through OpenAI API or qauth fallback."
                : null,
        })
        return
      }

      if (key === "korean-law-mcp") {
        const testQuery = typeof req.body?.query === "string" && req.body.query.trim().length > 0
          ? req.body.query.trim()
          : "학원 수강료 환불 기준과 학원법 관련 규정"
        const result = await lookupKoreanLaw(testQuery)
        res.json({
          key,
          ok: true,
          testedAt,
          connected: result.connected,
          degraded: result.degraded,
          installed: result.installed,
          missingEnv: result.missingEnv,
          preview: result.summary ?? result.detail ?? result.error ?? null,
          lastResult: result.degraded ? "degraded" : "connected",
          source: result.source,
          statusSummary: result.source === "cached-excerpt"
            ? result.missingEnv.length > 0
              ? "cached fallback (LAW_GO_KR_OC 미설정, 내장 발췌본 제공)"
              : "cached fallback (law.go.kr 연결 불안정 시 내장 발췌본 제공)"
            : result.connected && !result.degraded
              ? "law.go.kr 실시간 연결"
              : result.connected
                ? "law.go.kr 연결 불안정"
                : "LAW_GO_KR_OC 미설정",
        })
        return
      }

      if (key === "kakao-outbound") {
        const { getKakaoOutboundReadiness } = await import("../services/integrations/kakao-outbound.js")
        const result = getKakaoOutboundReadiness()

        res.json({
          key,
          ok: true,
          testedAt,
          connected: result.connected,
          degraded: !result.connected,
          missingEnv: result.missingEnv,
          preview: result.connected
            ? "자동 발송 provider 사용 가능"
            : "자동 발송 provider 미설정, operator bridge fallback 사용",
          lastResult: result.connected ? "connected" : "degraded",
          statusSummary: result.connected ? "provider connected" : "provider missing",
          statusDetail: result.connected
            ? "Kakao outbound provider is ready for automatic send."
            : "Use the operator bridge until KAKAO_OUTBOUND_PROVIDER_URL is configured.",
        })
        return
      }

      if (key === "telegram-outbound") {
        const { getTelegramOutboundReadiness } = await import("../services/integrations/telegram-outbound.js")
        const orgId = typeof req.body?.orgId === "string" ? req.body.orgId : ""
        let botToken: string | undefined

        if (orgId) {
          const [organization] = await db
            .select()
            .from(schema.organizations)
            .where(eq(schema.organizations.id, orgId))
          const config = isPlainObject(organization?.agentTeamConfig) ? organization.agentTeamConfig : {}
          const integrations = isPlainObject(config.integrations) ? config.integrations : {}
          const channels = isPlainObject(integrations.channels) ? integrations.channels : {}
          const telegram = isPlainObject(channels.telegram) ? channels.telegram : {}
          if (typeof telegram.botToken === "string" && telegram.botToken) {
            botToken = telegram.botToken
          }
        }

        const result = getTelegramOutboundReadiness(botToken)

        res.json({
          key,
          ok: true,
          testedAt,
          connected: result.connected,
          degraded: !result.connected,
          missingEnv: result.missingEnv,
          preview: result.connected
            ? "텔레그램 봇 토큰이 준비되어 자동 회신 가능합니다."
            : "텔레그램 봇 토큰이 없어 운영자 브리지로만 처리됩니다.",
          lastResult: result.connected ? "connected" : "degraded",
        })
        return
      }

      res.status(400).json({ error: "Unsupported adapter test target" })
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Adapter test failed" })
    }
  })

  return router
}
