import { api } from "./client"

export const casesApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/cases`),
  get: (id: string) => api.get<any>(`/cases/${id}`),
  create: (orgId: string, data: unknown) =>
    api.post<any>(`/organizations/${orgId}/cases`, data),
  quickAsk: (
    orgId: string,
    data: {
      question: string
      title?: string
      origin?: string
      scenarioKey?: string
      threadId?: string
      assistantSessionId?: string
      linkedCaseIds?: string[]
    },
  ) => api.post<{ caseId: string; identifier: string; runId?: string | null; agentId?: string | null; threadId?: string; assistantSessionId?: string; appended?: boolean }>(`/organizations/${orgId}/quick-ask`, data),
  listChildCases: (id: string) => api.get<any[]>(`/cases/${id}/child-cases`),
  createChildCase: (id: string, data: unknown) => api.post<any>(`/cases/${id}/child-cases`, data),
  update: (id: string, data: unknown) => api.patch<any>(`/cases/${id}`, data),
  rerun: (id: string) => api.post<{ caseId: string; runId: string; agentId: string; agentType: string }>(`/cases/${id}/rerun`, {}),
  delete: (id: string) => api.delete<void>(`/cases/${id}`),
}
