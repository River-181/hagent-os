import { api } from "./client"

export const adaptersApi = {
  list: () => api.get<{ adapters: any[]; integrations: any[] }>("/adapters"),
}
