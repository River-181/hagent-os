import { callClaude } from "../claude.js"
import type { RetentionAgentInput, RetentionAgentOutput } from "./types.js"

const SYSTEM_PROMPT = `당신은 탄자니아 영어학원의 학생 이탈 방지 전담 AI입니다.

## 역할
학생 데이터를 분석하여 이탈 위험도를 평가하고, 효과적인 개입 방안을 제안합니다.

## 이탈 위험 신호 (가중치 순)
1. 결석률 상승 (최근 4주 내 3회 이상 결석 → 높은 위험)
2. 최근 민원 접수 이력
3. 성적 하락 추세
4. 연속 결석 (2주 이상)
5. 납부 지연 또는 결제 이슈

## 이탈 위험 등급
- high (0.7~1.0): 즉각적 개입 필요, 원장/담당 교사 직접 연락
- medium (0.4~0.69): 1주 내 연락, 학습 지원 강화
- low (0.0~0.39): 정기 모니터링, 긍정적 강화

## 출력 형식
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

{
  "riskScore": 0.0~1.0 사이 숫자,
  "riskLevel": "high|medium|low",
  "signals": ["감지된 위험 신호 목록"],
  "reasoning": "위험도 평가 근거 (2-3문장)",
  "recommendedActions": ["권장 개입 조치 1", "권장 개입 조치 2", "권장 개입 조치 3"]
}`

export async function runRetentionAgent(input: RetentionAgentInput): Promise<RetentionAgentOutput> {
  const totalSessions = input.attendanceHistory.length
  const absentCount = input.attendanceHistory.filter((r) => r.status === "absent").length
  const lateCount = input.attendanceHistory.filter((r) => r.status === "late").length

  // Recent 4 weeks attendance
  const recent = input.attendanceHistory.slice(0, 8)
  const recentAbsent = recent.filter((r) => r.status === "absent").length

  const attendanceSummary = input.attendanceHistory
    .slice(0, 10)
    .map((r) => `  ${r.date}: ${r.status}`)
    .join("\n")

  const userMessage = `다음 학생의 이탈 위험도를 분석해주세요.

학생 이름: ${input.studentName}
현재 위험도 점수: ${input.currentRiskScore.toFixed(2)}

출석 현황 (최근 ${Math.min(totalSessions, 10)}회):
${attendanceSummary || "  데이터 없음"}

통계:
- 전체 수업 수: ${totalSessions}
- 결석 횟수: ${absentCount}회
- 지각 횟수: ${lateCount}회
- 최근 8회 결석: ${recentAbsent}회

위 데이터를 바탕으로 이탈 위험도와 개입 방안을 JSON으로 출력해주세요.`

  const response = await callClaude(SYSTEM_PROMPT, userMessage, {
    maxTokens: 1024,
  })

  try {
    const parsed = JSON.parse(response.content.trim()) as {
      riskScore: number
      riskLevel: "high" | "medium" | "low"
      signals: string[]
      reasoning: string
      recommendedActions: string[]
    }

    return {
      studentId: input.studentId,
      assessment: {
        riskScore: Math.max(0, Math.min(1, parsed.riskScore)),
        riskLevel: parsed.riskLevel,
        reasons: parsed.signals ?? [],
        recommendedActions: parsed.recommendedActions ?? [],
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  } catch {
    // Fallback to heuristic if JSON parse fails
    const riskScore = input.currentRiskScore > 0
      ? input.currentRiskScore
      : Math.min(absentCount * 0.15, 1.0)

    const riskLevel: "high" | "medium" | "low" =
      riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low"

    return {
      studentId: input.studentId,
      assessment: {
        riskScore,
        riskLevel,
        reasons: absentCount >= 3 ? [`최근 결석 ${absentCount}회 감지됨`] : ["수강 패턴 정상"],
        recommendedActions:
          riskLevel === "high"
            ? ["학부모 상담 진행", "보강 수업 제안", "할인 혜택 안내"]
            : riskLevel === "medium"
              ? ["학부모 안부 연락", "수업 만족도 확인"]
              : ["정기 모니터링 유지"],
      },
      tokensUsed: response.inputTokens + response.outputTokens,
    }
  }
}
