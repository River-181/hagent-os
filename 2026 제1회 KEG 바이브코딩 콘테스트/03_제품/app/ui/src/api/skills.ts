import { api } from "./client"

export const skillsApi = {
  list: (orgId?: string) => api.get<any[]>(`/skills${orgId ? `?orgId=${orgId}` : ""}`),
  get: (slug: string, orgId?: string) =>
    api.get<any>(`/skills/${slug}${orgId ? `?orgId=${orgId}` : ""}`),
  getFiles: (slug: string) => api.get<{ files: any[] }>(`/skills/${slug}/files`),
  getFileContent: (slug: string, filePath: string) =>
    api.get<{ path: string; content: string; language: string }>(
      `/skills/${slug}/file?path=${encodeURIComponent(filePath)}`,
    ),
  install: (orgId: string, slug: string) =>
    api.post<any>(`/organizations/${orgId}/skills/${slug}/install`, {}),
  uninstall: (orgId: string, slug: string) =>
    api.delete<void>(`/organizations/${orgId}/skills/${slug}/install`),
  updateConfig: (orgId: string, slug: string, config: Record<string, unknown>) =>
    api.put<any>(`/organizations/${orgId}/skills/${slug}/config`, config),
  create: (payload: Record<string, unknown>) => api.post<any>("/skills/create", payload),
  import: (payload: Record<string, unknown>) => api.post<any>("/skills/import", payload),
  fork: (slug: string) => api.post<any>(`/skills/${slug}/fork`, {}),
  exportBundle: (slug: string, target: "codex" | "claude-code" | "cursor") =>
    api.post<any>(`/skills/${slug}/export`, { target }),
  syncCheck: (slug: string) => api.post<any>(`/skills/${slug}/sync-check`, {}),
}
