import { api } from "./client"

export const heartbeatApi = {
  trigger: (organizationId: string) =>
    api.post<any>("/heartbeat/trigger", { organizationId }),
}
