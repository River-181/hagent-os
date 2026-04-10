// v0.3.1
import { api } from "./client"

export const studentsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/students`),
  get: (id: string) => api.get<any>(`/students/${id}`),
}

export const instructorsApi = {
  list: (orgId: string) => api.get<any[]>(`/organizations/${orgId}/instructors`),
  create: (orgId: string, data: {
    name: string
    subject: string
    phone?: string
    email?: string
    status?: string
  }) => api.post<any>(`/organizations/${orgId}/instructors`, data),
  update: (id: string, data: {
    name?: string
    subject?: string
    phone?: string
    email?: string
    status?: string
  }) => api.patch<any>(`/instructors/${id}`, data),
  delete: (id: string) => api.delete<void>(`/instructors/${id}`),
}
