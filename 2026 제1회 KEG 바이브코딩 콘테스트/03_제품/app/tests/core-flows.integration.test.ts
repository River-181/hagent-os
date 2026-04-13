import test from "node:test"
import assert from "node:assert/strict"

import {
  count,
  createAppHarness,
  eq,
  insertAgent,
  insertOrganization,
  insertProject,
  schema,
} from "./live-repo-test-helpers.ts"

test("case lifecycle keeps assignment, priority, and project move in sync", async (t) => {
  const harness = await createAppHarness()
  t.after(async () => {
    await harness.close()
  })

  const organization = await insertOrganization(harness.db)
  const complaintAgent = await insertAgent(harness.db, organization.id, {
    name: "Manual Complaint Agent",
    slug: "manual-complaint",
    adapterConfig: {
      model: "gpt-4o-mini",
      autoRun: false,
    },
  })
  const backlogProject = await insertProject(harness.db, organization.id, "Backlog")
  const urgentProject = await insertProject(harness.db, organization.id, "Urgent")

  const created = await harness.json<{
    id: string
    runId: string | null
    autoRunAgentId: string | null
    opsGroupId: string | null
    priority: number
  }>(`/api/organizations/${organization.id}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Parent wants an urgent class reassignment",
      description: "Please move this student to a new class this week.",
      type: "inquiry",
      severity: "same_day",
      opsGroupId: backlogProject.id,
      priority: 3,
    }),
  })

  assert.equal(created.response.status, 201)
  assert.equal(created.body?.runId, null)
  assert.equal(created.body?.autoRunAgentId, null)
  assert.equal(created.body?.opsGroupId, backlogProject.id)

  const updated = await harness.json<{
    id: string
    assigneeAgentId: string | null
    opsGroupId: string | null
    priority: number
    status: string
  }>(`/api/cases/${created.body?.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assigneeAgentId: complaintAgent.id,
      priority: 1,
      opsGroupId: urgentProject.id,
      status: "in_progress",
    }),
  })

  assert.equal(updated.response.status, 200)
  assert.equal(updated.body?.assigneeAgentId, complaintAgent.id)
  assert.equal(updated.body?.priority, 1)
  assert.equal(updated.body?.opsGroupId, urgentProject.id)
  assert.equal(updated.body?.status, "in_progress")

  const projectDetail = await harness.json<{
    id: string
    cases: Array<{ id: string }>
  }>(`/api/projects/${urgentProject.id}`)

  assert.equal(projectDetail.response.status, 200)
  assert.deepEqual(projectDetail.body?.cases.map((item) => item.id), [created.body?.id])

  const projects = await harness.json<Array<{ id: string; caseCount: number; activeCases: number }>>(
    `/api/organizations/${organization.id}/projects`,
  )

  assert.equal(projects.response.status, 200)
  const backlogStats = projects.body?.find((item) => item.id === backlogProject.id)
  const urgentStats = projects.body?.find((item) => item.id === urgentProject.id)
  assert.equal(backlogStats?.caseCount, 0)
  assert.equal(urgentStats?.caseCount, 1)
  assert.equal(urgentStats?.activeCases, 1)

  const activityEvents = await harness.db
    .select()
    .from(schema.activityEvents)
    .where(eq(schema.activityEvents.entityId, created.body!.id))

  assert.ok(
    activityEvents.some((event) => event.action === "case.status_changed"),
    "Expected a case.status_changed activity event after the status update",
  )
})

test("complaint inbound flow can reach approval and operator-confirmed send", async (t) => {
  const harness = await createAppHarness()
  t.after(async () => {
    await harness.close()
  })

  const organization = await insertOrganization(harness.db)
  await insertAgent(harness.db, organization.id, {
    name: "Inbound Complaint Agent",
    slug: "inbound-complaint",
  })

  const inbound = await harness.json<{
    caseId: string
    identifier: string
    created: boolean
    matchMode: string
    approvalId?: string | null
  }>("/api/webhook/kakao/inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelId: "flow-test-channel",
      senderId: "parent-01012345678",
      senderName: "Kim Parent",
      message: "환불이 가능한지 바로 답변 주세요. 너무 화가 납니다.",
    }),
  })

  assert.equal(inbound.response.status, 201)
  assert.equal(inbound.body?.created, true)
  assert.equal(inbound.body?.matchMode, "new_case")

  const [caseRecord] = await harness.db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.id, inbound.body!.caseId))
  assert.equal(caseRecord?.source, "kakao")
  assert.equal(caseRecord?.status, "in_review")

  const [approval] = await harness.db
    .select()
    .from(schema.approvals)
    .where(eq(schema.approvals.caseId, inbound.body!.caseId))
  assert.ok(approval, "Expected a pending approval for the inbound complaint case")
  assert.equal(approval?.status, "pending")

  const [run] = await harness.db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.caseId, inbound.body!.caseId))
  assert.equal(run?.status, "pending_approval")

  const approve = await harness.json<{
    status: string
    decision?: {
      sideEffects?: {
        kakaoMessage?: { status?: string }
      }
    }
  }>(`/api/approvals/${approval!.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment: "Looks good." }),
  })

  assert.equal(approve.response.status, 200)
  assert.equal(approve.body?.status, "approved")
  assert.equal(approve.body?.decision?.sideEffects?.kakaoMessage?.status, "ready_to_send")

  const outboundNotifications = await harness.db
    .select({ total: count() })
    .from(schema.notifications)
    .where(
      eq(schema.notifications.entityId, approval!.id),
    )
  assert.ok(Number(outboundNotifications[0]?.total ?? 0) >= 1)

  const send = await harness.json<{
    deliveryStatus: string | null
    approval?: {
      decision?: {
        sideEffects?: {
          kakaoMessage?: { status?: string; provider?: string }
        }
      }
    }
  }>(`/api/approvals/${approval!.id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "confirm_bridge" }),
  })

  assert.equal(send.response.status, 200)
  assert.equal(send.body?.deliveryStatus, "sent")
  assert.equal(send.body?.approval?.decision?.sideEffects?.kakaoMessage?.status, "sent")

  const [completedCase] = await harness.db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.id, inbound.body!.caseId))
  assert.equal(completedCase?.status, "done")

  const comments = await harness.db
    .select()
    .from(schema.caseComments)
    .where(eq(schema.caseComments.caseId, inbound.body!.caseId))
  assert.ok(
    comments.some((comment) => comment.content.includes("[카카오 회신] 실제 발송 완료")),
    "Expected a case comment recording the final outbound send",
  )
})
