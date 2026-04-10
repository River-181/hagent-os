import { api } from "./client"

export const casesApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/cases`),
  get: (id: string) => api.get<any>(`/cases/${id}`),
  create: (orgId: string, data: unknown) =>
    api.post<any>(`/organizations/${orgId}/cases`, data),
  update: (id: string, data: unknown) => api.patch<any>(`/cases/${id}`, data),
  delete: (id: string) => api.delete<void>(`/cases/${id}`),
}
