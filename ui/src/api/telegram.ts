import { api } from "./client"

export const telegramApi = {
  getOwnerControl: (orgId: string) => api.get<any>(`/channels/telegram/owner-control/${orgId}`),
  updateOwnerControl: (
    orgId: string,
    data: {
      enabled?: boolean
      password?: string
      sessionTtlMinutes?: number
      allowNaturalLanguage?: boolean
      confirmDangerousMutations?: boolean
    },
  ) => api.patch<any>(`/channels/telegram/owner-control/${orgId}`, data),
  revokeOwnerControlSessions: (orgId: string) => api.post<any>(`/channels/telegram/owner-control/${orgId}/revoke`, {}),
  sendOwnerControlTest: (orgId: string) => api.post<any>(`/channels/telegram/owner-control/${orgId}/test`, {}),
}
