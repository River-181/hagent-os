---
name: churn-signal-detector
description: 출결·결제·상담 기록으로 이탈 위험을 계산합니다.
---

# 이탈 신호 감지기

## Use This Skill When

- 이탈 위험 신호를 빠르게 탐지하고 triage해야 할 때

## Required Inputs

- 출결 변동
- 결제 지연
- 상담 tone
- 최근 운영 이슈

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 최근 변화량과 이력 데이터가 정본입니다.

## Workflow

- 최근 변화량과 기준선을 비교합니다.
- 반복 결석, 미납, 감정 악화 같은 신호를 묶어 봅니다.
- 오탐 가능성을 분리합니다.
- risk score 계산 전 선별 단계로 사용합니다.

## Decision Rules

- 한 번의 결석만으로 고위험 판정을 내리지 않습니다.

## Output Contract

- 탐지 신호
- 위험도
- 근거 데이터
- 추천 조치

## Failure Handling

- 이력 기간이 너무 짧으면 탐지만 하고 결론은 낮게 둡니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 탐지 신호와 오탐 가능성이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `retention`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
