import { api } from "./client"

export const adaptersApi = {
  list: (orgId?: string) =>
    api.get<{ adapters: any[]; integrations: any[] }>(
      orgId ? `/adapters?orgId=${encodeURIComponent(orgId)}` : "/adapters",
    ),
  test: (key: string, orgId?: string) => api.post<any>("/adapters/test", { key, orgId }),
}
