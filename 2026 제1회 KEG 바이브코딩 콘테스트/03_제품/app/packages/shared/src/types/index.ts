export type CaseType =
  | "complaint"
  | "refund"
  | "makeup"
  | "inquiry"
  | "churn"
  | "schedule"

export type CaseSeverity = "immediate" | "same_day" | "normal" | "low"

export type CaseStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "done"

export type AgentType =
  | "orchestrator"
  | "complaint"
  | "retention"
  | "scheduler"
  | "intake"
  | "staff"
  | "finance"
  | "compliance"
  | "notification"
  | "analytics"

export type AgentStatus = "idle" | "running" | "paused" | "error" | "terminated"

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revision_requested"

export type ApprovalLevel = 0 | 1 | 2 | 3 | 4

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "pending_approval"
  | "failed"

export type AttendanceStatus = "present" | "absent" | "late" | "excused"

export type SkillPackageType = "builtin" | "imported" | "wrapper" | "composite"

export type SkillSourceKind = "local" | "github_repo" | "github_subdir" | "registry_url" | "manual"

export interface SkillSourceMetadata {
  kind: SkillSourceKind
  repo?: string
  url?: string
  path?: string
  commit?: string
  license?: string
  importedAt?: string
}

export interface SkillCompatibility {
  agentTypes: AgentType[]
  adapters: string[]
  locales: string[]
}

export interface SkillRuntimeContract {
  injectionMode: "system" | "instructions" | "policy" | "tool" | "composite"
  requiredIntegrations: string[]
  requiredSecrets: string[]
  requiredEnv: string[]
  requiredFiles: string[]
}

export interface SkillDistribution {
  exportTargets: Array<"codex" | "claude-code" | "cursor">
  editable: boolean
  publishable: boolean
}

export interface SkillPackageManifest {
  id: string
  slug: string
  namespace: string
  displayName: string
  version: string
  summary: string
  packageType: SkillPackageType
  source: SkillSourceMetadata
  compatibility: SkillCompatibility
  runtime: SkillRuntimeContract
  distribution: SkillDistribution
}
