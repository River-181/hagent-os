// v0.3.0
import { api } from "./client"

export const projectsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/projects`),
  get: (id: string) => api.get<any>(`/projects/${id}`),
  create: (orgId: string, data: any) => api.post<any>(`/organizations/${orgId}/projects`, data),
  createFromInstruction: (data: any) => api.post<any>(`/projects/from-instruction`, data),
  archive: (id: string) => api.post<void>(`/projects/${id}/archive`, {}),
  delete: (id: string) => api.delete<void>(`/projects/${id}`),
}
