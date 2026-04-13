---
name: student-360-view
description: 학생의 수강·상담·결제 맥락을 한 번에 정리합니다.
---

# 학생 360 뷰

## Use This Skill When

- 학생의 수강, 상담, 결제, 민원 맥락을 한 번에 요약해야 할 때

## Required Inputs

- 학생 식별 정보
- 출결
- 결제 상태
- 상담 이력
- 민원/일정 관련 케이스

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 학생 관련 최신 운영 데이터가 정본입니다.

## Workflow

- 핵심 상태를 먼저 요약합니다.
- 위험 신호와 강점 정보를 분리합니다.
- 원시 데이터 나열보다 운영 결정에 필요한 포인트를 앞에 둡니다.
- 다음 액션을 1~3개로 제한합니다.

## Decision Rules

- 근거 없는 심리 추정은 하지 않습니다.

## Output Contract

- 핵심 요약
- 위험 신호
- 추천 액션
- 출처/가정

## Failure Handling

- 데이터 연결이 불완전하면 누락 범위를 명시합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 핵심 요약과 추천 액션이 1~3개로 제한됩니다.

## Runtime Fit

- Recommended agents: `retention`, `complaint`, `orchestrator`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
