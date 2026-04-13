---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-09
up: "[[04_ai-agents/agent-design]]"
aliases:
  - orchestrator
  - 오케스트레이터에이전트
---
# Orchestrator Agent

> 한 줄 지시를 해석하고 전문 에이전트에게 태스크를 명시적으로 배분하는 최상위 에이전트.

---

## 역할 요약

오케스트레이터는 **메타 에이전트**다. 직접 업무를 수행하지 않는다.
원장의 자연어 지시 또는 heartbeat 스케줄을 해석해서, 어떤 에이전트가 무슨 태스크를 해야 하는지 결정하고 assigneeAgentId를 명시해 Task를 생성한다.

| 속성 | 값 |
|------|-----|
| agentId | `orchestrator` |
| role | `orchestrator` |
| 직접 실행 | 없음 (태스크 라우팅 전용) |
| 대시보드 카드 | 브리핑 요약 / 실행 계획 리스트 |

---

## 실행 트리거

| 트리거 유형 | 조건 | 예시 |
|------------|------|------|
| `on_demand` | 원장이 텍스트 지시 입력 | "오늘 민원 처리하고 이탈 위험 알려줘" |
| `cron` (heartbeat) | 매일 오전 7시 자동 실행 | 하루 브리핑 생성 |
| `assignment` | 다른 에이전트가 상위 판단 요청 | Complaint Agent → 복합 건 판단 위임 |

---

## 입력/출력 스펙

### 입력

```typescript
interface OrchestratorInput {
  instruction: string          // 원장 자연어 지시 or "heartbeat"
  orgContext: {
    orgId: string
    orgName: string
    activeAgents: AgentSummary[]  // 현재 기관에 활성화된 에이전트 목록
    pendingApprovals: number      // 승인 대기 건수
    todayDate: string
  }
  scheduledContext?: {
    todaySchedule: ScheduleItem[]
    pendingComplaints: number
    atRiskStudents: number
  }
}
```

### 출력

```typescript
interface OrchestratorOutput {
  plan: string                    // 브리핑 요약 (자연어, 2-3문장)
  tasks: TaskDispatch[]           // 생성할 태스크 목록
}

interface TaskDispatch {
  assigneeAgentId: string         // 어떤 에이전트에게
  title: string
  description: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  triggerType: 'assignment'
}
```

---

## 태스크 라우팅 로직

지시에서 키워드·의도를 추출해 아래 매핑 테이블로 라우팅한다.

| 지시 키워드/의도 | 라우팅 대상 | 생성 태스크 예시 |
|----------------|------------|----------------|
| 민원, 불만, 항의, 요청 | `complaint` | "미처리 민원 전체 분류 및 응답 초안 생성" |
| 이탈, 결석, 위험, 재등록 | `retention` | "이번 주 이탈 위험 학생 감지 및 개입 권고" |
| 공지, 안내, 알림 | `notification` | "오늘 수업 변경 사항 학부모 알림 초안" |
| 리포트, 성적, 보고서 | `analytics` | "이번 달 성적 리포트 초안 생성" |
| 상담, 신규, 문의 | `intake` | "신규 문의 접수 현황 정리" |
| heartbeat (자동) | 복수 병렬 | 아래 오전 브리핑 패턴 참조 |

**복합 지시** 처리: "민원 처리하고 이탈 위험도 알려줘" → 두 개의 TaskDispatch를 동시 생성, `complaint`와 `retention`에 각각 할당.

**알 수 없는 지시**: 라우팅 불가 시 plan에 "어떤 업무를 원하시는지 명확히 알려주세요" 포함, tasks = [].

---

## 병렬 실행 패턴 — 오전 브리핑 예시

매일 07:00 heartbeat 발동 시 아래 3개 태스크를 **동시에** 생성한다.

```
heartbeat (07:00)
  ↓
OrchestratorAgent 실행
  ├─ Task 1 → ComplaintAgent: "어제 접수된 미처리 민원 분류 및 응답 초안 생성"
  ├─ Task 2 → RetentionAgent: "최근 3일 결석 2회 이상 학생 이탈 위험 스캔"
  └─ Task 3 → NotificationAgent: "오늘 강사 스케줄 변경·휴강 공지 초안"
  ↓
각 에이전트 독립 실행 (병렬)
  ↓
결과 카드 3개 → 승인 대시보드 표시
  ↓
원장 원클릭 승인 (pending_approval 해제)
```

---

## 제로휴먼 레벨

오케스트레이터 자체는 **태스크 라우팅만** 하므로 제로휴먼 레벨 개념 불적용.
단, 라우팅 결과(어떤 에이전트에게 무슨 태스크를 줬는지)는 대시보드 브리핑 카드에 표시되어 원장이 확인·수정할 수 있다.

---

## 장착 k-skill

| 스킬 | 용도 |
|------|------|
| `intent-classifier` | 자연어 지시 → 라우팅 의도 추출 |
| `agent-registry-lookup` | 현재 기관에 활성화된 에이전트 목록 조회 |
| `task-priority-scorer` | 긴급도 자동 산정 (민원 > 이탈 > 공지) |

---

## System Prompt 초안

```
당신은 HagentOS의 오케스트레이터 에이전트입니다.
역할: 학원 원장의 지시를 분석해 적절한 전문 에이전트에게 태스크를 배분합니다.
당신은 직접 업무를 수행하지 않습니다. 오직 계획을 세우고 위임합니다.

[기관 정보]
- 기관명: {orgName}
- 오늘 날짜: {todayDate}
- 활성 에이전트: {activeAgents}
- 미처리 승인 건수: {pendingApprovals}건

[원장 지시 or 트리거]
{instruction}

[오늘 컨텍스트]
- 미처리 민원: {pendingComplaints}건
- 이탈 위험 학생: {atRiskStudents}명
- 오늘 스케줄: {todaySchedule}

---

지시를 분석해 다음 JSON 형식으로 응답하세요:

{
  "plan": "2-3문장으로 오늘의 실행 계획 요약 (원장이 읽는 브리핑)",
  "tasks": [
    {
      "assigneeAgentId": "에이전트 ID",
      "title": "태스크 제목 (20자 이내)",
      "description": "구체적 지시 (무엇을, 어떤 기준으로, 어떤 형식으로)",
      "priority": "urgent|high|normal|low"
    }
  ]
}

규칙:
1. 병렬 실행 가능한 태스크는 항상 병렬로 분배하라
2. 태스크 description은 받는 에이전트가 즉시 실행 가능한 수준으로 구체적으로 작성
3. 등록된 에이전트 목록에 없는 에이전트에게는 절대 라우팅하지 않는다
4. 라우팅이 불가능하면 tasks를 빈 배열로 반환하고 plan에 이유를 설명
```

---

## 실패 처리

| 실패 시나리오 | 처리 방법 |
|-------------|----------|
| 전문 에이전트 응답 없음 (timeout) | 30분 후 재시도 1회 → 이후 원장에게 알림 "Complaint Agent 실행 실패, 수동 처리 필요" |
| 태스크 생성 후 `pending_approval` 5일 이상 방치 | "오래된 미승인 항목이 {n}건 있습니다" 리마인더 알림 발송 |
| 의도 분류 신뢰도 낮음 (< 0.6) | 브리핑 카드에 "이 태스크 분배가 맞나요? 수정하려면 편집을 눌러주세요" 표시 |
| heartbeat 에이전트 전체 실패 | 원장에게 즉시 알림 + 에러 로그 `audit_log` 기록 |
