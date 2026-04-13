// v0.3.0 — external channel webhook receiver
import { Router } from "express"
import { eq, count } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { publishEvent } from "../services/live-events.js"
import { executeAgentRun } from "../services/execution.js"

export function webhookRoutes(db: Db): Router {
  const router = Router()

  /**
   * POST /api/webhook/kakao
   * 카카오톡 채널에서 들어오는 메시지를 케이스로 변환
   *
   * Body: { message: string, senderId?: string, senderName?: string, channelId?: string }
   */
  router.post("/kakao", async (req, res) => {
    try {
      const { message, senderId, senderName, channelId } = req.body as {
        message: string
        senderId?: string
        senderName?: string
        channelId?: string
      }

      if (!message) {
        res.status(400).json({ error: "message is required" })
        return
      }

      // Find the default organization (for MVP, use first org)
      const orgs = await db.select().from(schema.organizations)
      if (orgs.length === 0) {
        res.status(404).json({ error: "No organization found" })
        return
      }
      const org = orgs[0]

      // Generate case identifier
      const [{ total }] = await db
        .select({ total: count() })
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, org.id))

      const identifier = `C-${String(total + 1).padStart(3, "0")}`

      // Classify message type (simple keyword matching)
      let caseType = "inquiry"
      let severity = "normal"
      const lowerMsg = message.toLowerCase()

      if (lowerMsg.includes("환불") || lowerMsg.includes("취소")) {
        caseType = "refund"
        severity = "high"
      } else if (lowerMsg.includes("불만") || lowerMsg.includes("항의") || lowerMsg.includes("화가")) {
        caseType = "complaint"
        severity = "high"
      } else if (lowerMsg.includes("상담") || lowerMsg.includes("면담")) {
        caseType = "inquiry"
      } else if (lowerMsg.includes("보강") || lowerMsg.includes("수업")) {
        caseType = "makeup"
      } else if (lowerMsg.includes("일정") || lowerMsg.includes("시간")) {
        caseType = "schedule"
      }

      // Create case from external message
      const [newCase] = await db
        .insert(schema.cases)
        .values({
          organizationId: org.id,
          identifier,
          title: `[카카오] ${senderName ?? "익명"}: ${message.slice(0, 50)}`,
          description: `채널: 카카오톡\n발신자: ${senderName ?? "익명"} (${senderId ?? "unknown"})\n\n${message}`,
          type: caseType as any,
          severity: severity as any,
          source: "kakao",
        } as any)
        .returning()

      // Create notification
      await db.insert(schema.notifications).values({
        organizationId: org.id,
        type: "case_created",
        title: "카카오톡 문의 접수",
        body: `${senderName ?? "학부모"}님의 문의가 접수되었습니다: ${message.slice(0, 60)}`,
        entityType: "case",
        entityId: newCase.id,
      })

      // Publish SSE event
      publishEvent(org.id, "case.created", {
        caseId: newCase.id,
        identifier,
        source: "kakao",
        type: caseType,
      })

      // Auto-assign complaint agent if complaint type
      if (caseType === "complaint" || caseType === "refund") {
        const agents = await db
          .select()
          .from(schema.agents)
          .where(eq(schema.agents.organizationId, org.id))

        const complaintAgent = agents.find((a) => a.agentType === "complaint")
        if (complaintAgent) {
          try {
            await executeAgentRun(db, {
              organizationId: org.id,
              agentId: complaintAgent.id,
              caseId: newCase.id,
              agentType: "complaint",
              approvalLevel: 1,
            })
          } catch {
            // Agent run failure shouldn't block webhook response
          }
        }
      }

      // Create activity event
      await db.insert(schema.activityEvents).values({
        organizationId: org.id,
        actorType: "system",
        actorId: "webhook",
        action: "case.created_from_channel",
        entityType: "case",
        entityId: newCase.id,
        entityTitle: newCase.title,
        metadata: {
          channel: "kakao",
          senderId,
          senderName,
          caseType,
        },
      })

      res.status(201).json({
        caseId: newCase.id,
        identifier,
        type: caseType,
        message: "케이스가 자동 생성되었습니다.",
      })
    } catch (err) {
      res.status(500).json({ error: "Webhook processing failed" })
    }
  })

  /**
   * POST /api/webhook/sms
   * SMS 수신 웹훅 (Solapi 등)
   */
  router.post("/sms", async (req, res) => {
    try {
      const { message, from, to } = req.body as {
        message: string
        from?: string
        to?: string
      }

      if (!message) {
        res.status(400).json({ error: "message is required" })
        return
      }

      const orgs = await db.select().from(schema.organizations)
      if (orgs.length === 0) {
        res.status(404).json({ error: "No organization found" })
        return
      }
      const org = orgs[0]

      const [{ total }] = await db
        .select({ total: count() })
        .from(schema.cases)
        .where(eq(schema.cases.organizationId, org.id))

      const identifier = `C-${String(total + 1).padStart(3, "0")}`

      const [newCase] = await db
        .insert(schema.cases)
        .values({
          organizationId: org.id,
          identifier,
          title: `[SMS] ${from ?? "발신번호 없음"}: ${message.slice(0, 50)}`,
          description: `채널: SMS\n발신: ${from ?? "unknown"}\n수신: ${to ?? "unknown"}\n\n${message}`,
          type: "inquiry",
          severity: "normal",
          source: "sms",
        } as any)
        .returning()

      await db.insert(schema.notifications).values({
        organizationId: org.id,
        type: "case_created",
        title: "SMS 문의 접수",
        body: `SMS 문의가 접수되었습니다: ${message.slice(0, 60)}`,
        entityType: "case",
        entityId: newCase.id,
      })

      publishEvent(org.id, "case.created", {
        caseId: newCase.id,
        identifier,
        source: "sms",
      })

      res.status(201).json({
        caseId: newCase.id,
        identifier,
        message: "SMS 문의가 케이스로 등록되었습니다.",
      })
    } catch (err) {
      res.status(500).json({ error: "SMS webhook processing failed" })
    }
  })

  return router
}
