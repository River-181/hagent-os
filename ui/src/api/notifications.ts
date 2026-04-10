// v0.3.0
import { api } from "./client"

export const notificationsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/notifications`),
  markRead: (id: string) => api.patch<any>(`/notifications/${id}/read`, {}),
}
