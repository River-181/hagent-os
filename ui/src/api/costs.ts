import { api } from "./client"

export const costsApi = {
  summary: (orgId: string) =>
    api.get<{
      organizationId: string
      totalTokens: number
      totalEstimatedCostKrw: number
      monthlyBudgetKrw: number
      budgetUtilizationPct: number
      models: Array<{
        model: string
        inputTokens: number
        outputTokens: number
        totalTokens: number
        estimatedCostKrw: number
      }>
      agents: Array<{
        agentId: string
        name: string
        agentType: string
        totalRuns: number
        totalTokens: number
        estimatedCostKrw: number
        budgetLimitTokens: number
        budgetUsedTokens: number
      }>
      incidents: Array<Record<string, unknown>>
    }>(`/organizations/${orgId}/costs/summary`),
}
