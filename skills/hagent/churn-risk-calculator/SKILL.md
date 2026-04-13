---
name: churn-risk-calculator
description: 출결, 수납, 상담 기록을 바탕으로 학생 이탈 위험도를 계산하는 초기 규칙을 제공합니다.
---

# 이탈 위험 계산기

## Use This Skill When

- 학생 이탈 위험도를 규칙 기반으로 계산해야 할 때

## Required Inputs

- 최근 출결
- 결제 상태
- 상담 기록
- 민원 이력
- 체류 기간 또는 반 정보

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 출결, 결제, 상담 기록이 정본입니다.

## Workflow

- 출결, 결제, 상담 신호를 별도로 점수화합니다.
- 강한 단일 신호보다 누적 패턴을 우선합니다.
- 총점과 세부 신호를 함께 제시합니다.
- 즉시 개입 대상인지 관찰 대상인지 나눕니다.

## Decision Rules

- 점수만 던지지 말고 근거를 같이 써야 합니다.
- 데이터가 적으면 고위험으로 과잉 판정하지 않습니다.

## Output Contract

- 계산 근거
- 중간 값
- 최종 결과
- 가정 및 누락값

## Failure Handling

- 핵심 데이터가 비어 있으면 신뢰 낮음으로 표시합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 위험도와 근거 신호가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `retention`, `orchestrator`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
