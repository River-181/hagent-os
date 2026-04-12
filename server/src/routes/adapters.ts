import { Router } from "express"
import { getAdapterStatuses, getIntegrationStatuses } from "../services/control-plane-registry.js"
import { runWithAdapter } from "../lib/runtime.js"
import { lookupKoreanLaw } from "../services/integrations/korean-law.js"

export function adapterRoutes(): Router {
  const router = Router()

  router.get("/", (_req, res) => {
    res.json({
      adapters: getAdapterStatuses(),
      integrations: getIntegrationStatuses(),
    })
  })

  router.post("/test", async (req, res) => {
    try {
      const key = String(req.body?.key ?? "")
      const testedAt = new Date().toISOString()

      if (key === "codex_local") {
        const result = await runWithAdapter(
          "당신은 학원 운영 보조 AI입니다. 한 문장으로만 답하세요.",
          "환불 문의를 받았을 때 운영자가 먼저 확인해야 할 항목 1가지만 말해줘.",
          {
            adapterType: "codex_local",
            model: "gpt-5-codex",
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
        })
        return
      }

      if (key === "korean-law-mcp") {
        const result = await lookupKoreanLaw("학원 수강료 환불 기준과 학원법 관련 규정")
        res.json({
          key,
          ok: true,
          testedAt,
          connected: result.connected,
          degraded: result.degraded,
          installed: result.installed,
          missingEnv: result.missingEnv,
          preview: result.summary ?? result.error ?? null,
          lastResult: result.connected && !result.degraded ? "connected" : "degraded",
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
