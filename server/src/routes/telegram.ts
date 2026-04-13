import { Router } from "express"
import { eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { classifyInboundMessage } from "../lib/channel-message-heuristics.js"
import { processChannelInbound } from "./webhook.js"
import { normalizeTelegramUpdate, syncTelegramInbound } from "../services/telegram-inbound-sync.js"
import { sendTelegramMessage } from "../services/integrations/telegram-outbound.js"
import { getTelegramCustomerBinding, getTelegramOpsBinding } from "../services/telegram-bindings.js"
import {
  getTelegramOwnerControlState,
  handleTelegramOwnerControlUpdate,
  revokeTelegramOwnerControlSessions,
  saveTelegramOwnerControlConfig,
  sendTelegramOwnerControlTest,
} from "../services/telegram-owner-control.js"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function mergeJsonConfig(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeJsonConfig(next[key] as Record<string, unknown>, value)
      continue
    }
    next[key] = value
  }
  return next
}

function getOrganizationConfig(organization: typeof schema.organizations.$inferSelect) {
  return isPlainObject(organization.agentTeamConfig) ? organization.agentTeamConfig : {}
}

type TelegramBindingRole = "customer" | "ops"

function bindingMatchesSecret(
  binding: { enabled?: boolean; botToken?: string; webhookSecret?: string } | null | undefined,
  secretHeader: string | undefined,
) {
  if (!binding?.enabled || !binding.botToken) return false
  if (binding.webhookSecret) return binding.webhookSecret === secretHeader
  return !secretHeader
}

function resolveRequestedBinding(
  organization: typeof schema.organizations.$inferSelect,
  role: TelegramBindingRole,
) {
  return role === "ops" ? getTelegramOpsBinding(organization) : getTelegramCustomerBinding(organization)
}

function resolveWebhookBinding(
  organization: typeof schema.organizations.$inferSelect,
  secretHeader: string | undefined,
): { role: TelegramBindingRole; binding: NonNullable<ReturnType<typeof getTelegramCustomerBinding>> } | null {
  const opsBinding = getTelegramOpsBinding(organization)
  const customerBinding = getTelegramCustomerBinding(organization)

  if (bindingMatchesSecret(opsBinding, secretHeader)) {
    return { role: "ops", binding: opsBinding! }
  }
  if (bindingMatchesSecret(customerBinding, secretHeader)) {
    return { role: "customer", binding: customerBinding! }
  }

  return null
}

function buildImmediateTelegramCustomerReply(message: string) {
  const normalized = message.trim()
  if (!normalized) return null

  if (/등록|입학|상담 가능|상담가능|체험|레벨테스트/.test(normalized)) {
    return [
      '문의 감사합니다. 등록/상담 가능합니다.',
      '학생 이름, 학년, 희망 과목, 가능한 시간대를 보내주시면 담당자가 확인 후 상담 일정을 안내드리겠습니다.',
    ].join(' ')
  }

  if (/일정|보강|시간표|변경|예약/.test(normalized)) {
    return '일정 조율 요청을 접수했습니다. 학생 이름과 가능한 시간대를 보내주시면 담당자가 확인 후 안내드리겠습니다.'
  }

  if (/환불|교습비|수강료|정책|법령/.test(normalized)) {
    return '정책/환불 관련 문의를 접수했습니다. 정확한 안내를 위해 담당자가 확인 후 답변드리겠습니다.'
  }

  if (/운영시간|영업시간|위치|주소|연락처/.test(normalized)) {
    return '문의 감사합니다. 필요한 기본 정보를 확인해 안내드리겠습니다. 조금만 기다려 주세요.'
  }

  return '문의 감사합니다. 내용을 접수했고 담당자가 확인 후 안내드리겠습니다.'
}

async function getTelegramApiJson(botToken: string, method: string, init?: RequestInit) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, init)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || payload.ok === false) {
    throw new Error(typeof payload.description === "string" ? payload.description : `Telegram ${method} failed (${response.status})`)
  }
  return payload
}

export function telegramRoutes(db: Db): Router {
  const router = Router()

  router.post("/channels/telegram/sync", async (req, res) => {
    try {
      const organizationId = typeof req.body?.organizationId === "string" ? req.body.organizationId : undefined
      const results = await syncTelegramInbound(db, { organizationId })
      res.json({ results })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to sync Telegram inbound" })
    }
  })

  router.post("/channels/telegram/webhook/:orgId", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const secretHeader = req.header("x-telegram-bot-api-secret-token") ?? undefined
      const resolved = resolveWebhookBinding(organization, secretHeader)
      if (!resolved?.binding?.enabled || !resolved.binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }
      const { role, binding } = resolved

      const update = isPlainObject(req.body) ? req.body : {}
      if (role === "ops") {
        const ownerControlResult = await handleTelegramOwnerControlUpdate(db, organization, update)
        if (ownerControlResult.handled) {
          res.json({ ok: true, ownerControl: true })
          return
        }
        res.json({ ok: true, ignored: true, reason: "owner_control_unhandled" })
        return
      }

      const normalized = normalizeTelegramUpdate(update)
      if (!normalized) {
        res.json({ ok: true, ignored: true })
        return
      }
      const inboundClass = classifyInboundMessage(normalized.message)
      if (inboundClass.kind === "ignore") {
        res.json({ ok: true, ignored: true, reason: inboundClass.reason })
        return
      }

      const result = await processChannelInbound(db, "telegram", {
        message: normalized.message,
        senderId: normalized.senderId,
        senderName: normalized.senderName,
        threadId: normalized.threadId,
        origin: "telegram-webhook",
        scenarioKey: "telegram-live-webhook",
        botToken: binding.botToken,
        botUsername: binding.botUsername,
      }, {
        awaitRouting: true,
        organization,
      })

      // 자동 응답 정책 확인 (기본 OFF — 승인 게이트 통과 후 발송)
      // 조직 설정에서 telegram.autoReply=true 인 경우에만 즉시 발송 (경고 표시 옵션)
      const orgConfig = getOrganizationConfig(organization)
      const integrations = isPlainObject(orgConfig.integrations) ? orgConfig.integrations : {}
      const channels = isPlainObject(integrations.channels) ? integrations.channels : {}
      const telegramConfig = isPlainObject(channels.telegram) ? channels.telegram : {}
      const autoReplyEnabled = telegramConfig.autoReply === true

      void (async () => {
        try {
          const [updatedCase] = await db
            .select()
            .from(schema.cases)
            .where(eq(schema.cases.id, result.caseId))
          if (!updatedCase) return

          const immediateReply = buildImmediateTelegramCustomerReply(normalized.message)
          const draft = updatedCase.agentDraft

          if (autoReplyEnabled && draft) {
            await sendTelegramMessage(db, {
              organizationId: result.organizationId,
              caseRecord: updatedCase,
              approvalId: `telegram-auto-${result.caseId}`,
              draft,
              mode: "auto",
            })
            return
          }

          const chatId = normalized.threadId || normalized.senderId
          if (binding.botToken && chatId && immediateReply) {
            await getTelegramApiJson(binding.botToken, 'sendMessage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: immediateReply,
                disable_web_page_preview: true,
              }),
            })
          }
        } catch {
          // 발송 실패해도 케이스 접수는 성공으로 처리
        }
      })()
      // autoReply === false 면 승인 대기 — approvals.ts 에서 decision="approved" 될 때 발송됨

      res.json({ ok: true, result })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Telegram webhook processing failed" })
    }
  })

  router.get("/channels/telegram/webhook/:orgId/status", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const role = req.query.role === "ops" ? "ops" : "customer"
      const binding = resolveRequestedBinding(organization, role)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const payload = await getTelegramApiJson(binding.botToken, "getWebhookInfo")
      res.json({
        role,
        transportMode: binding.transportMode ?? "poll",
        webhookInfo: payload.result ?? null,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fetch Telegram webhook status" })
    }
  })

  router.post("/channels/telegram/webhook/:orgId/register", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const role = req.body?.role === "ops" ? "ops" : "customer"
      const binding = resolveRequestedBinding(organization, role)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const webhookUrl = typeof req.body?.webhookUrl === "string" ? req.body.webhookUrl.trim() : ""
      const secretToken = typeof req.body?.secretToken === "string" ? req.body.secretToken.trim() : ""
      if (!webhookUrl) {
        res.status(400).json({ error: "webhookUrl is required" })
        return
      }

      const payload = await getTelegramApiJson(binding.botToken, "setWebhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          ...(secretToken ? { secret_token: secretToken } : {}),
          allowed_updates: ["message", "edited_message", "callback_query"],
        }),
      })

      const nextConfig = mergeJsonConfig(getOrganizationConfig(organization), {
        integrations: {
          channels: {
            telegram: {
              [role]: {
                transportMode: "webhook",
                webhookSecret: secretToken || binding.webhookSecret || null,
                webhookUrl,
              },
            },
          },
        },
      })

      await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: nextConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organization.id))

      res.json({
        ok: true,
        role,
        transportMode: "webhook",
        webhookUrl,
        telegram: payload.result ?? true,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to register Telegram webhook" })
    }
  })

  router.post("/channels/telegram/webhook/:orgId/unregister", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      const role = req.body?.role === "ops" ? "ops" : "customer"
      const binding = resolveRequestedBinding(organization, role)
      if (!binding?.enabled || !binding.botToken) {
        res.status(400).json({ error: "Telegram is not configured for this organization" })
        return
      }

      const payload = await getTelegramApiJson(binding.botToken, "deleteWebhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          drop_pending_updates: false,
        }),
      })

      const nextConfig = mergeJsonConfig(getOrganizationConfig(organization), {
        integrations: {
          channels: {
            telegram: {
              [role]: {
                transportMode: "poll",
              },
            },
          },
        },
      })

      await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: nextConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, organization.id))

      res.json({
        ok: true,
        role,
        transportMode: "poll",
        telegram: payload.result ?? true,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to unregister Telegram webhook" })
    }
  })

  router.get("/channels/telegram/owner-control/:orgId", async (req, res) => {
    try {
      const [organization] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, req.params.orgId))

      if (!organization) {
        res.status(404).json({ error: "Organization not found" })
        return
      }

      res.json(getTelegramOwnerControlState(organization))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to fetch Telegram owner control config" })
    }
  })

  router.patch("/channels/telegram/owner-control/:orgId", async (req, res) => {
    try {
      const result = await saveTelegramOwnerControlConfig(db, req.params.orgId, {
        enabled: typeof req.body?.enabled === "boolean" ? req.body.enabled : undefined,
        password: typeof req.body?.password === "string" ? req.body.password : undefined,
        sessionTtlMinutes: typeof req.body?.sessionTtlMinutes === "number" ? req.body.sessionTtlMinutes : undefined,
        allowNaturalLanguage: typeof req.body?.allowNaturalLanguage === "boolean" ? req.body.allowNaturalLanguage : undefined,
        confirmDangerousMutations: typeof req.body?.confirmDangerousMutations === "boolean" ? req.body.confirmDangerousMutations : undefined,
      })
      res.json(result)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update Telegram owner control config" })
    }
  })

  router.post("/channels/telegram/owner-control/:orgId/revoke", async (req, res) => {
    try {
      const result = await revokeTelegramOwnerControlSessions(db, req.params.orgId)
      res.json(result)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to revoke Telegram owner control sessions" })
    }
  })

  router.post("/channels/telegram/owner-control/:orgId/test", async (req, res) => {
    try {
      const result = await sendTelegramOwnerControlTest(db, req.params.orgId)
      res.json(result)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to send Telegram owner control test" })
    }
  })

  return router
}
