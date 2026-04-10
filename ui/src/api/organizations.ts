import { api } from "./client"

export const organizationsApi = {
  list: () => api.get<any[]>("/organizations"),
  get: (id: string) => api.get<any>(`/organizations/${id}`),
  create: (data: unknown) => api.post<any>("/organizations", data),
  update: (id: string, data: unknown) => api.patch<any>(`/organizations/${id}`, data),
  delete: (id: string) => api.delete<void>(`/organizations/${id}`),
}
