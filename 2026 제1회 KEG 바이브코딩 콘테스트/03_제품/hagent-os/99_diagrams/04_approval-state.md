---
tags: [area/product, type/diagram, status/active]
date: 2026-04-09
up: "[[hagent-os/INDEX]]"
aliases: [approval-state, 승인-상태머신]
---
# Approval State — 승인 상태 머신

> Case 상태와 AgentRun 승인 레벨 흐름을 통합한 상태 다이어그램.
> 기준 문서: [[08_data/domain-model]], [[04_ai-agents/agent-roles/complaint]], [[04_ai-agents/agent-roles/retention]]

## Case 상태 머신

```mermaid
stateDiagram-v2
    [*] --> open : 케이스 생성

    open --> in_progress : Orchestrator가 에이전트 배정
    in_progress --> draft_ready : 에이전트 초안 생성 완료 (Level 1)
    in_progress --> resolved : Level 0 자동 완결
    in_progress --> escalated : Level 2 복잡/환불/법적

    draft_ready --> pending_approval : Approval Queue 진입
    pending_approval --> resolved : 원장 승인 ✓
    pending_approval --> in_progress : 원장 반려 → 에이전트 재작업

    escalated --> resolved : 원장 직접 처리
    escalated --> in_progress : 원장이 에이전트에 재배정

    open --> blocked : 선행 케이스 미완료 (blockedBy)
    blocked --> open : 선행 케이스 완결

    resolved --> [*]
```

---

## AgentRun 승인 레벨별 흐름

```mermaid
stateDiagram-v2
    direction LR

    [*] --> running : AgentRun 시작

    running --> level0 : approvalLevel = 0
    running --> level1 : approvalLevel = 1
    running --> level2 : approvalLevel = 2
    running --> level3_4 : approvalLevel = 3 또는 4

    state level0 {
        [*] --> auto_complete
        auto_complete --> [*] : Case.status = resolved
        note right of auto_complete
            분류·기록·집계·감지
            인간 개입 없음
        end note
    }

    state level1 {
        [*] --> draft_created
        draft_created --> awaiting_approval : Approval Queue 등록
        awaiting_approval --> approved : 원장 ✓ 승인
        awaiting_approval --> rejected : 원장 ✗ 반려
        approved --> [*] : Case 완결
        rejected --> [*] : AgentRun 재시작
    }

    state level2 {
        [*] --> draft_edit_required
        draft_edit_required --> human_editing : 원장 편집기 진입
        human_editing --> approved_after_edit : 편집 후 승인/발송
        human_editing --> rejected_after_edit : 반려 또는 저장
        approved_after_edit --> [*] : Case 완결
        rejected_after_edit --> [*] : AgentRun 재시작 또는 보류
        note right of draft_edit_required
            복잡 민원·환불 안내문
            초안은 주되 편집 후 발송
        end note
    }

    state level3 {
        [*] --> analysis_ready
        analysis_ready --> decision_required : 원장 액션 선택
        decision_required --> action_chosen : 상담 생성 / 보류 / 재배정
        action_chosen --> [*] : 후속 액션 기록
        note right of decision_required
            L3: 분석 + 사람 결정
            예: 상담 여부, 개입 강도
        end note
    }

    state level4 {
        [*] --> info_only
        info_only --> human_reference : 참고자료 열람
        human_reference --> [*] : 사람 수동 처리
        note right of info_only
            L4: 정보 제공만
            법적/감정적 판단은 인간 책임
        end note
    }
```

---

## 레벨 × 에이전트 대응표

| 에이전트 | 행동 | Level | 결과 |
|----------|------|:-----:|------|
| Complaint | 민원 분류 + 로그 | **0** | 자동 완결 |
| Complaint | 일반 응답 초안 | **1** | 원클릭 승인 |
| Complaint | 복잡한 응답/환불 안내 | **2** | 편집 후 승인 |
| Retention | 위험 점수 + 대시보드 | **0** | 자동 완결 |
| Retention | 학부모 안내 메시지 | **1** | 원클릭 승인 |
| Retention | 상담/개입 결정 | **3** | 원장 결정 |
| Complaint / Compliance | 법적/감정적 분쟁 참고자료 | **4** | 정보 제공만 |
| Scheduler | 일정 자동 업데이트 | **0** | 자동 완결 |
| Scheduler | 강사 대체 제안 | **1** | 원클릭 승인 |
