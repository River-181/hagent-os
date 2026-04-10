// v0.2.0
import { api } from "./client"

export const documentsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/documents`),
  get: (id: string) => api.get<any>(`/documents/${id}`),
  create: (orgId: string, data: any) => api.post<any>(`/organizations/${orgId}/documents`, data),
  update: (id: string, data: any) => api.patch<any>(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  importPreview: (files: any[]) => api.post<{ documents: any[] }>(`/documents/import-preview`, { files }),
}
