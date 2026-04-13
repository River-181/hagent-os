import { api } from "./client"

export const orchestratorApi = {
  dispatch: (data: { instruction: string; organizationId: string }) =>
    api.post<{ plan: string; runs: string[]; caseId?: string }>(
      "/orchestrator/dispatch",
      data,
    ),
}
