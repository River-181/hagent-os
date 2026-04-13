export const queryKeys = {
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
  },
  cases: {
    list: (orgId: string) => ["cases", "list", orgId] as const,
    detail: (id: string) => ["cases", id] as const,
  },
  agents: {
    list: (orgId: string) => ["agents", "list", orgId] as const,
    detail: (id: string) => ["agents", id] as const,
  },
  approvals: {
    list: (orgId: string) => ["approvals", "list", orgId] as const,
  },
  activity: {
    list: (orgId: string) => ["activity", "list", orgId] as const,
  },
  skills: {
    all: ["skills"] as const,
    detail: (slug: string) => ["skills", slug] as const,
  },
  runs: {
    detail: (id: string) => ["runs", id] as const,
  },
  documents: {
    list: (orgId: string) => ["documents", "list", orgId] as const,
    detail: (id: string) => ["documents", id] as const,
  },
  routines: {
    list: (orgId: string) => ["routines", "list", orgId] as const,
  },
  goals: {
    list: (orgId: string) => ["goals", "list", orgId] as const,
  },
  notifications: {
    list: (orgId: string) => ["notifications", "list", orgId] as const,
  },
  projects: {
    list: (orgId: string) => ["projects", "list", orgId] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  students: {
    list: (orgId: string) => ["students", "list", orgId] as const,
    detail: (id: string) => ["students", id] as const,
  },
  instructors: {
    list: (orgId: string) => ["instructors", "list", orgId] as const,
  },
  schedules: {
    list: (orgId: string) => ["schedules", "list", orgId] as const,
  },
}
