import { api } from "./client"

export const capabilitiesApi = {
  list: (orgId?: string) => api.get<{ capabilities: any[]; stats: Record<string, number> }>(`/capabilities${orgId ? `?orgId=${orgId}` : ""}`),
  get: (kind: string, slug: string, orgId?: string) =>
    api.get<any>(`/capabilities/${kind}/${slug}${orgId ? `?orgId=${orgId}` : ""}`),
}
