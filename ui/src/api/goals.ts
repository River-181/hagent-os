// v0.2.0
import { api } from "./client"

export const goalsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/goals`),
  create: (orgId: string, data: any) => api.post<any>(`/organizations/${orgId}/goals`, data),
  update: (id: string, data: any) => api.patch<any>(`/goals/${id}`, data),
}
