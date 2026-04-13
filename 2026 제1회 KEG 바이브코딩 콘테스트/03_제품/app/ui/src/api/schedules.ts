// v0.4.0
import { api } from "./client"

export const schedulesApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/schedules`),
  update: (orgId: string, id: string, data: Record<string, unknown>) =>
    api.patch<any>(`/organizations/${orgId}/schedules/${id}`, data),
  remove: (orgId: string, id: string) =>
    api.delete<void>(`/organizations/${orgId}/schedules/${id}`),
}
