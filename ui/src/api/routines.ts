// v0.2.0
import { api } from "./client"

export const routinesApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/routines`),
  create: (orgId: string, data: any) => api.post<any>(`/organizations/${orgId}/routines`, data),
  update: (id: string, data: any) => api.patch<any>(`/routines/${id}`, data),
  delete: (id: string) => api.delete(`/routines/${id}`),
}
