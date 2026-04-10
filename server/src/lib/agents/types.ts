export interface AgentRef {
  id: string
  agentType: string
  name: string
}

export interface RuntimeBinding {
  adapterType?: string | null
  model?: string | null
}

export interface OrchestratorInput extends RuntimeBinding {
  organizationId: string
  agents: AgentRef[]
  context?: string
}

export interface AgentAssignment {
  agentId: string
  reason: string
}

export interface UnassignedAgentAssignment {
  agentId: null
  reason: string
}

export interface OrchestratorOutput {
  plan: string
  assignments: AgentAssignment[]
}

export interface ComplaintAgentInput extends RuntimeBinding {
  caseId: string
  organizationId: string
  title: string
  description: string
  reporterId?: string
  studentId?: string
}

export interface ComplaintAnalysis {
  category: string
  urgency: "immediate" | "same_day" | "normal" | "low"
  summary: string
  suggestedReply: string
  requiresApproval: boolean
  legalBasis?: {
    source: string
    query: string
    summary?: string | null
    connected: boolean
    degraded: boolean
  }
}

export interface ComplaintAgentOutput {
  caseId: string
  analysis: ComplaintAnalysis
  tokensUsed: number
}

export interface RetentionAgentInput extends RuntimeBinding {
  organizationId: string
  studentId: string
  studentName: string
  attendanceHistory: Array<{
    date: string
    status: string
  }>
  currentRiskScore: number
}

export interface RetentionRiskAssessment {
  riskScore: number
  riskLevel: "high" | "medium" | "low"
  reasons: string[]
  recommendedActions: string[]
}

export interface RetentionAgentOutput {
  studentId: string
  assessment: RetentionRiskAssessment
  tokensUsed: number
}

export interface WakeupRequest {
  id: string
  organizationId: string
  caseId?: string
  agentId?: string
  status: string
  dedupKey: string
  createdAt: Date
}
