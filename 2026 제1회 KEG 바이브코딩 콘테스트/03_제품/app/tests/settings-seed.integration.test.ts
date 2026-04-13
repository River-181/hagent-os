import test from "node:test"
import assert from "node:assert/strict"

import {
  autoSeedDemoOrganization,
  count,
  createAppHarness,
  createIsolatedDatabase,
  eq,
  insertAgent,
  insertOrganization,
  schema,
} from "./live-repo-test-helpers.ts"

test("auto-seed backfills routines and skill installs without duplicating the demo org", async (t) => {
  const database = await createIsolatedDatabase()
  t.after(async () => {
    delete process.env.AUTO_SEED_DEMO
    delete process.env.SKIP_AUTO_SEED
    await database.close()
  })

  process.env.AUTO_SEED_DEMO = "true"
  delete process.env.SKIP_AUTO_SEED

  await autoSeedDemoOrganization(database.db)

  const [seededOrg] = await database.db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.prefix, "tanzania-english-academy"))
  assert.ok(seededOrg, "Expected the live demo org to be auto-seeded")

  const initialRoutines = await database.db
    .select({ total: count() })
    .from(schema.routines)
    .where(eq(schema.routines.organizationId, seededOrg!.id))
  const initialSkillInstalls = await database.db
    .select({ total: count() })
    .from(schema.organizationSkills)
    .where(eq(schema.organizationSkills.organizationId, seededOrg!.id))

  assert.ok(Number(initialRoutines[0]!.total) > 0, "Expected demo routines to exist after the first seed")

  await database.db.delete(schema.routines).where(eq(schema.routines.organizationId, seededOrg!.id))
  if (initialSkillInstalls[0]!.total > 0) {
    await database.db.delete(schema.organizationSkills).where(eq(schema.organizationSkills.organizationId, seededOrg!.id))
  }

  await autoSeedDemoOrganization(database.db)

  const organizations = await database.db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.prefix, "tanzania-english-academy"))
  assert.equal(organizations.length, 1, "Backfill must not create a duplicate demo organization")

  const backfilledRoutines = await database.db
    .select({ total: count() })
    .from(schema.routines)
    .where(eq(schema.routines.organizationId, seededOrg!.id))
  assert.equal(
    Number(backfilledRoutines[0]!.total),
    Number(initialRoutines[0]!.total),
    "Expected missing routines to be restored for the existing demo org",
  )

  if (Number(initialSkillInstalls[0]!.total) > 0) {
    const backfilledSkillInstalls = await database.db
      .select({ total: count() })
      .from(schema.organizationSkills)
      .where(eq(schema.organizationSkills.organizationId, seededOrg!.id))
    assert.equal(
      Number(backfilledSkillInstalls[0]!.total),
      Number(initialSkillInstalls[0]!.total),
      "Expected missing installed skills to be restored for the existing demo org",
    )
  }
})

test("organization settings save propagates the selected model to existing agents", async (t) => {
  const harness = await createAppHarness()
  t.after(async () => {
    await harness.close()
  })

  const organization = await insertOrganization(harness.db, {
    agentTeamConfig: {
      aiPolicy: {
        primaryAdapterType: "mock_local",
        primaryModel: "gpt-4o-mini",
        autoRun: true,
      },
    },
  })
  const complaintAgent = await insertAgent(harness.db, organization.id, {
    name: "Settings Complaint Agent",
    slug: "settings-complaint",
    adapterType: "mock_local",
    adapterConfig: {
      model: "gpt-4o-mini",
      autoRun: true,
      temperature: 0.2,
    },
  })
  const schedulerAgent = await insertAgent(harness.db, organization.id, {
    name: "Settings Scheduler Agent",
    slug: "settings-scheduler",
    agentType: "scheduler",
    adapterType: "mock_local",
    adapterConfig: {
      model: "gpt-4o-mini",
      autoRun: true,
    },
  })

  const updated = await harness.json<{
    id: string
    agentTeamConfig?: {
      aiPolicy?: {
        primaryAdapterType?: string
        primaryModel?: string
        autoRun?: boolean
      }
    }
  }>(`/api/organizations/${organization.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      settings: {
        aiPolicy: {
          primaryAdapterType: "codex_local",
          primaryModel: "gpt-4.1-mini",
          autoRun: false,
          applyToExistingAgents: true,
        },
      },
    }),
  })

  assert.equal(updated.response.status, 200)
  assert.equal(updated.body?.agentTeamConfig?.aiPolicy?.primaryAdapterType, "codex_local")
  assert.equal(updated.body?.agentTeamConfig?.aiPolicy?.primaryModel, "gpt-4.1-mini")
  assert.equal(updated.body?.agentTeamConfig?.aiPolicy?.autoRun, false)

  const patchedAgents = await harness.db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organization.id))

  const byId = new Map(patchedAgents.map((agent) => [agent.id, agent]))
  const patchedComplaint = byId.get(complaintAgent.id)
  const patchedScheduler = byId.get(schedulerAgent.id)

  assert.equal(patchedComplaint?.adapterType, "codex_local")
  assert.equal((patchedComplaint?.adapterConfig as { model?: string }).model, "gpt-4.1-mini")
  assert.equal((patchedComplaint?.adapterConfig as { autoRun?: boolean }).autoRun, false)
  assert.equal((patchedScheduler?.adapterConfig as { model?: string }).model, "gpt-4.1-mini")
  assert.equal((patchedScheduler?.adapterConfig as { autoRun?: boolean }).autoRun, false)

  const activityEvents = await harness.db
    .select()
    .from(schema.activityEvents)
    .where(eq(schema.activityEvents.organizationId, organization.id))

  assert.ok(
    activityEvents.some((event) => event.action === "organization.updated"),
    "Expected settings save to emit an organization.updated activity event",
  )
})
