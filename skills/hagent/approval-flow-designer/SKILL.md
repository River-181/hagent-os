---
name: approval-flow-designer
description: 민감한 발송, 환불, 정책 변경, 문서 승인 같은 업무의 승인 경로를 설계합니다.
---

# 승인 흐름 설계기

## Use This Skill When

- 발송, 환불, 정책 변경, 문서 승인 같은 민감 작업의 승인 경로를 설계해야 할 때

## Required Inputs

- 작업 종류
- 예상 side effect
- 승인 가능한 역할 목록
- 반려 시 되돌릴 단계

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 실제 side effect와 승인 권한 구조가 정본입니다.

## Workflow

- 외부 영향, 비용 영향, 일정 변경 영향을 먼저 분해합니다.
- 자동 진행 단계와 사람 승인 단계를 구분합니다.
- 승인 주체, 시점, side effect를 표로 정리합니다.
- 반려 또는 수정 요청 시 되돌림 경로까지 명시합니다.

## Decision Rules

- 불필요한 승인 단계를 늘리지 않습니다.
- 사람 검토가 필요한 단계를 자동 실행처럼 쓰지 않습니다.

## Output Contract

- 승인 단계 목록
- 단계별 승인 주체
- 승인 후 side effect
- 반려 시 되돌림 경로

## Failure Handling

- 승인 주체가 불명확하면 임시 승인 흐름으로 확정하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 단계별 승인 주체와 반려 경로가 명확합니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `complaint`, `finance`
- Common entrypoints: `case`, `project`, `onboarding`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
