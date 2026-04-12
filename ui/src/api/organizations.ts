import { api } from "./client"

export const organizationsApi = {
  list: () => api.get<any[]>("/organizations"),
  get: (id: string) => api.get<any>(`/organizations/${id}`),
  create: (data: unknown) => api.post<any>("/organizations", data),
  bootstrap: (data: unknown) => api.post<any>("/organizations/bootstrap", data),
  update: (id: string, data: unknown) => api.patch<any>(`/organizations/${id}`, data),
  getChannels: (id: string) => api.get<Record<string, any>>(`/organizations/${id}/channels`),
  updateChannel: (id: string, channelKey: string, data: unknown) =>
    api.put<Record<string, any>>(`/organizations/${id}/channels/${channelKey}`, data),
  delete: (id: string) => api.delete<void>(`/organizations/${id}`),
  exportData: (id: string) => `/api/organizations/${id}/export`,
}
