---
name: re-enrollment-playbook
description: 이탈 징후가 보이는 학생에 대해 재등록 방어 시나리오와 후속 액션을 제안합니다.
---

# 재등록 방어 플레이북

## Use This Skill When

- 이탈 징후 학생의 재등록 방어 시나리오와 후속 액션이 필요할 때

## Required Inputs

- 학생 상황 요약
- 이탈 징후 근거
- 최근 상담/민원 이력
- 가능한 인센티브 또는 조정안

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 학생 이탈 징후 근거와 최근 상담 정보가 정본입니다.

## Workflow

- 이탈 원인을 비용, 일정, 만족도, 관계 이슈로 나눕니다.
- 즉시 연락, 상담, 보강, 조건 조정 중 적합한 액션을 고릅니다.
- 하나의 제안안과 fallback 안을 만듭니다.
- 다음 follow-up 시점까지 포함합니다.

## Decision Rules

- 과도한 할인이나 약속은 승인 없이 제안하지 않습니다.

## Output Contract

- 단계별 절차
- 예외 처리
- 필수 기록
- 승인 지점

## Failure Handling

- 원인 정보가 부족하면 일반 재등록 제안 대신 확인 질문을 먼저 둡니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 1안과 fallback이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `retention`, `counseling`
- Common entrypoints: `case`, `project`, `agent`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
