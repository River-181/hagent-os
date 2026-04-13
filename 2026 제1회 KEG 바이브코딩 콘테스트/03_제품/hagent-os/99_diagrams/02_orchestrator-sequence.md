---
tags: [area/product, type/diagram, status/active]
date: 2026-04-09
up: "[[hagent-os/INDEX]]"
aliases: [orchestrator-sequence, 에이전트-시퀀스]
---
# Orchestrator Sequence — 에이전트 실행 파이프라인

> Trigger → WakeupRequest dedup → Orchestrator plan → Dispatch → k-skill 주입 → LLM Call → Level 분기 → 완결
> 기준 문서: [[04_ai-agents/agent-design]], [[04_ai-agents/agent-roles/orchestrator]]

```mermaid
sequenceDiagram
    autonumber
    actor 원장 as 원장 (Board)
    participant API as API Router
    participant ORC as Orchestrator Agent
    participant DB as PostgreSQL
    participant CA as Complaint Agent
    participant AQ as Approval Queue
    participant Claude as Claude API

    원장->>API: POST /cases (민원 접수)
    API->>DB: INSERT Case {status: open}
    API->>DB: INSERT WakeupRequest {agentId: orchestrator, coalescedCount++}
    Note over DB: 중복 WakeupRequest dedup — 같은 트리거 병합

    DB-->>ORC: Cron poll / 이벤트 구독
    ORC->>DB: Claim WakeupRequest (원자적 체크아웃)
    ORC->>DB: READ Case + Organization.skills + Agent.skills
    Note over ORC: k-skill 컨텍스트 병합<br/>(korean-law-mcp, solapi-mcp 등)

    ORC->>Claude: plan(Case, skills, agentRoster)
    Claude-->>ORC: {assigneeAgentId: "complaint-agent", approvalLevel: 1, plan: "..."}

    ORC->>DB: INSERT AgentRun {agentId: complaint-agent, status: running, approvalLevel: 1}
    ORC->>CA: dispatch(caseId, plan, skills)

    CA->>Claude: generate_draft(case, history, k-skills)
    Claude-->>CA: {draft: "안녕하세요, 홍길동 어머니...", tokensUsed: 842}

    CA->>DB: UPDATE Case {agentDraft: draft, status: draft_ready}
    CA->>DB: UPDATE AgentRun {status: pending_approval, output: draft}

    alt approvalLevel == 0 (자동 완결)
        CA->>DB: UPDATE Case {status: resolved}
        CA->>DB: UPDATE AgentRun {status: completed}
        CA-->>원장: 알림 (처리 완료)
    else approvalLevel == 1 (원클릭 승인)
        CA->>AQ: INSERT Approval {level: 1, status: pending}
        AQ-->>원장: 알림 (승인 대기)
        원장->>API: POST /approvals/:id/approve
        API->>DB: UPDATE Approval {status: approved}
        API->>DB: UPDATE Case {status: resolved, approvedBy: userId}
        API->>DB: INSERT ActivityEvent {action: approved}
    else approvalLevel == 2 (편집 후 승인)
        CA->>AQ: INSERT Approval {level: 2, status: pending}
        AQ-->>원장: 알림 (편집 후 승인 필요)
        원장->>API: POST /approvals/:id/edit-and-approve
        API->>DB: UPDATE Approval {status: approved}
        API->>DB: UPDATE Case {status: resolved, approvedBy: userId}
        API->>DB: INSERT ActivityEvent {action: approved}
    else approvalLevel in {3,4} (사람 결정/정보 제공)
        CA->>AQ: INSERT Approval {level: 3|4, status: pending}
        AQ-->>원장: 알림 (상담 결정 또는 참고자료 확인)
        원장->>API: POST /approvals/:id/decide
        API->>DB: UPDATE Approval {status: approved}
        API->>DB: UPDATE Case {status: escalated|resolved}
        API->>DB: INSERT ActivityEvent {action: approved}
    end

    DB->>DB: INSERT TokenUsageEvent {costCents, model}
    DB->>DB: UPDATE TokenBudget {spentMonthlyCents += costCents}
```

---

## 트리거 유형 4종

| 트리거 | 예시 | invocationSource |
|--------|------|-----------------|
| 수동 등록 | 원장이 직접 케이스 생성 | `on_demand` |
| 자동 감지 | Retention Agent가 이탈 위험 감지 | `automation` |
| 크론 스케줄 | 매일 오전 8시 Heartbeat | `timer` |
| 과제 배정 | 원장이 에이전트에게 케이스 배정 | `assignment` |

## 승인 레벨 분기 요약

| Level | 행동 | 흐름 |
|-------|------|------|
| 0 | 분류·기록·집계 | AgentRun → completed (즉시) |
| 1 | 초안 발송 | Approval Queue → 원장 원클릭 |
| 2 | 편집 후 발송 | Approval Queue → 편집 후 승인 |
| 3 | 상담·개입 결정 | Approval Queue → 원장 액션 선택 |
| 4 | 정보 제공만 | Approval Queue → 참고자료 확인 후 수동 처리 |
