export interface AgentRef {
  id: string
  agentType: string
  name: string
}

export interface OrchestratorInput {
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

export interface ComplaintAgentInput {
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
}

export interface ComplaintAgentOutput {
  caseId: string
  analysis: ComplaintAnalysis
  tokensUsed: number
}

export interface RetentionAgentInput {
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
