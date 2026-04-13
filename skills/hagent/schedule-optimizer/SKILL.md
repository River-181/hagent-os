---
name: schedule-optimizer
description: 보강·대체·시험 일정을 조율하기 위한 제안을 생성합니다.
---

# 일정 최적화기

## Use This Skill When

- 보강, 대체, 시험 일정을 더 나은 안으로 조정해야 할 때

## Required Inputs

- 현재 일정표
- 제약조건
- 우선순위
- 강사/학생 가용 시간

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `google-calendar-mcp`

## Source of Truth

- 현재 일정표와 제약조건이 정본입니다.

## Workflow

- 충돌이 큰 구간부터 해결합니다.
- 가능한 안을 2개 이하로 압축합니다.
- 운영 비용과 만족도 tradeoff를 같이 씁니다.
- 확정 전 승인 또는 확인이 필요한 사람을 표시합니다.

## Decision Rules

- 최적화 결과를 유일한 정답처럼 말하지 않습니다.

## Output Contract

- 제안안
- 대안 비교
- 제약조건
- 예상 영향

## Failure Handling

- 가용 시간 데이터가 부족하면 탐색 범위를 좁혀 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 대안 비교와 예상 영향이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `scheduler`, `staff`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
