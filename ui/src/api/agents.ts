// v0.3.0
import { api } from "./client"

export const agentsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/agents`),
  get: (id: string) => api.get<any>(`/agents/${id}`),
  create: (orgId: string, data: unknown) =>
    api.post<any>(`/organizations/${orgId}/agents`, data),
  update: (id: string, data: unknown) => api.patch<any>(`/agents/${id}`, data),
  delete: (id: string) => api.delete<void>(`/agents/${id}`),
  wakeup: (id: string, body?: { reason?: string; caseId?: string }) =>
    api.post<any>(`/agents/${id}/wakeup`, body ?? {}),
  stop: (id: string) => api.post<any>(`/agents/${id}/stop`, {}),
  getMemory: (id: string) => api.get<any>(`/agents/${id}/memory`),
  updateMemory: (id: string, data: any) => api.patch<any>(`/agents/${id}/memory`, data),
  listSkills: (id: string) => api.get<any[]>(`/agents/${id}/skills`),
  updateSkills: (id: string, skills: Array<{ slug: string; enabled?: boolean; mountOrder?: number }>) =>
    api.put<any>(`/agents/${id}/skills`, { skills }),
}
