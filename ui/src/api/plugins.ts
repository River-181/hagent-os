import { api } from "./client"

export const pluginsApi = {
  list: () => api.get<any[]>("/plugins"),
}
