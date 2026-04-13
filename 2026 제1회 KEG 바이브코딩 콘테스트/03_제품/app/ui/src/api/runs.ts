import { api } from "./client"

export const runsApi = {
  get: (id: string) => api.get<any>(`/runs/${id}`),
}
