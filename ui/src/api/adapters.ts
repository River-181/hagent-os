import { api } from "./client"

export const adaptersApi = {
  list: () => api.get<{ adapters: any[]; integrations: any[] }>("/adapters"),
  test: (key: string, orgId?: string) => api.post<any>("/adapters/test", { key, orgId }),
}
