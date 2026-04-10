import { api } from "./client"

export const activityApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/activity`),
  get: (id: string) => api.get<any>(`/activity/${id}`),
}
