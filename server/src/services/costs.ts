import { and, desc, eq } from "drizzle-orm"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"

type ModelPricing = {
  inputPer1kKrw: number
  outputPer1kKrw: number
}

const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-5-codex": { inputPer1kKrw: 6, outputPer1kKrw: 18 },
  "gpt-5": { inputPer1kKrw: 6, outputPer1kKrw: 18 },
  "claude-sonnet-4-6": { inputPer1kKrw: 5, outputPer1kKrw: 15 },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function getOrganizationPricingConfig(organization: typeof schema.organizations.$inferSelect | null | undefined) {
  const config = isRecord(organization?.agentTeamConfig) ? organization.agentTeamConfig : {}
  const aiPolicy = isRecord(config.aiPolicy) ? config.aiPolicy : {}
  const modelPricing = isRecord(aiPolicy.modelPricing) ? aiPolicy.modelPricing : {}
  const monthlyBudgetKrw =
    typeof aiPolicy.monthlyBudgetKrw === "number"
      ? aiPolicy.monthlyBudgetKrw
      : Number(aiPolicy.monthlyBudgetKrw ?? 0) || 0

  return {
    modelPricing,
    monthlyBudgetKrw,
  }
}

export function resolveModelPricing(
  organization: typeof schema.organizations.$inferSelect | null | undefined,
  model: string | null | undefined,
): ModelPricing {
  const normalizedModel = model ?? "gpt-5-codex"
  const { modelPricing } = getOrganizationPricingConfig(organization)
  const custom = modelPricing[normalizedModel]

  if (isRecord(custom)) {
    return {
      inputPer1kKrw: Number(custom.inputPer1kKrw ?? custom.input ?? 0) || 0,
      outputPer1kKrw: Number(custom.outputPer1kKrw ?? custom.output ?? 0) || 0,
    }
  }

  return DEFAULT_MODEL_PRICING[normalizedModel] ?? DEFAULT_MODEL_PRICING["gpt-5-codex"]
}

export function estimateRunCostKrw(inputTokens: number, outputTokens: number, pricing: ModelPricing) {
  return Math.round(
    (inputTokens / 1000) * pricing.inputPer1kKrw +
      (outputTokens / 1000) * pricing.outputPer1kKrw,
  )
}

export async function recordRunUsage(
  db: Db,
  input: {
    organizationId: string
    agentId: string
    runId: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
  },
) {
  await db.insert(schema.tokenUsageEvents).values({
    organizationId: input.organizationId,
    agentId: input.agentId,
    agentRunId: input.runId,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  })

  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.id, input.agentId))
  if (agent) {
    await db
      .update(schema.agents)
      .set({
        budgetUsed: (agent.budgetUsed ?? 0) + input.totalTokens,
        updatedAt: new Date(),
      })
      .where(eq(schema.agents.id, input.agentId))
  }
}

export async function buildOrganizationCostSummary(db: Db, organizationId: string) {
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId))

  const runs = await db
    .select()
    .from(schema.agentRuns)
    .where(eq(schema.agentRuns.organizationId, organizationId))
    .orderBy(desc(schema.agentRuns.createdAt))

  const usageEvents = await db
    .select()
    .from(schema.tokenUsageEvents)
    .where(eq(schema.tokenUsageEvents.organizationId, organizationId))
    .orderBy(desc(schema.tokenUsageEvents.createdAt))

  const agents = await db
    .select()
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))

  const usageByRunId = new Map(usageEvents.map((event) => [event.agentRunId, event]))
  const totalTokens = runs.reduce((sum, run) => sum + (run.tokensUsed ?? 0), 0)

  const modelBreakdown = new Map<
    string,
    { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostKrw: number }
  >()

  const agentBreakdown = agents.map((agent) => {
    const agentRuns = runs.filter((run) => run.agentId === agent.id)
    const agentTokens = agentRuns.reduce((sum, run) => sum + (run.tokensUsed ?? 0), 0)
    const model =
      (isRecord(agent.adapterConfig) ? (agent.adapterConfig.model as string | undefined) : undefined) ??
      "gpt-5-codex"

    let estimatedCostKrw = 0
    for (const run of agentRuns) {
      const usage = usageByRunId.get(run.id)
      const inputTokens = usage?.inputTokens ?? run.inputTokens ?? 0
      const outputTokens = usage?.outputTokens ?? run.outputTokens ?? 0
      const pricing = resolveModelPricing(organization, usage?.model ?? model)
      const runCost = estimateRunCostKrw(inputTokens, outputTokens, pricing)
      estimatedCostKrw += runCost

      const modelKey = usage?.model ?? model
      const existing = modelBreakdown.get(modelKey) ?? {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostKrw: 0,
      }
      existing.inputTokens += inputTokens
      existing.outputTokens += outputTokens
      existing.totalTokens += run.tokensUsed ?? inputTokens + outputTokens
      existing.estimatedCostKrw += runCost
      modelBreakdown.set(modelKey, existing)
    }

    return {
      agentId: agent.id,
      name: agent.name,
      agentType: agent.agentType,
      totalRuns: agentRuns.length,
      totalTokens: agentTokens,
      estimatedCostKrw,
      budgetLimitTokens: agent.budgetLimit ?? 0,
      budgetUsedTokens: agent.budgetUsed ?? agentTokens,
    }
  })

  const monthlyBudgetKrw = getOrganizationPricingConfig(organization).monthlyBudgetKrw
  const totalEstimatedCostKrw = agentBreakdown.reduce((sum, item) => sum + item.estimatedCostKrw, 0)

  return {
    organizationId,
    totalTokens,
    totalEstimatedCostKrw,
    monthlyBudgetKrw,
    budgetUtilizationPct: monthlyBudgetKrw > 0 ? Math.round((totalEstimatedCostKrw / monthlyBudgetKrw) * 100) : 0,
    models: Array.from(modelBreakdown.entries()).map(([model, value]) => ({
      model,
      ...value,
    })),
    agents: agentBreakdown,
    incidents: agentBreakdown
      .filter((item) => item.budgetLimitTokens > 0 && item.budgetUsedTokens >= item.budgetLimitTokens)
      .map((item) => ({
        type: "agent_over_limit",
        agentId: item.agentId,
        name: item.name,
        budgetLimitTokens: item.budgetLimitTokens,
        budgetUsedTokens: item.budgetUsedTokens,
      })),
  }
}

export async function buildRunUsageSummary(
  db: Db,
  input: {
    organizationId: string
    runId: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    model: string | null | undefined
  },
) {
  const [organization] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))

  const pricing = resolveModelPricing(organization, input.model)
  return {
    totalTokens: input.totalTokens,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    estimatedCostKrw: estimateRunCostKrw(input.inputTokens, input.outputTokens, pricing),
    model: input.model ?? "gpt-5-codex",
  }
}
