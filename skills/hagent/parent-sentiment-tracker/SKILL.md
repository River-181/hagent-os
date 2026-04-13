---
name: parent-sentiment-tracker
description: 민원 문맥에서 감정 강도와 위험 신호를 감지합니다.
---

# 학부모 감정 추적기

## Use This Skill When

- 학부모 민원 맥락에서 감정 강도와 위험 신호를 파악해야 할 때

## Required Inputs

- 원문 메시지
- 최근 대화 이력
- 반복 민원 여부
- 핵심 불만 주제

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 원문 메시지와 최근 대화 이력이 정본입니다.

## Workflow

- 불만 주제와 감정 강도를 분리합니다.
- 격앙, 불신, 이탈 예고 같은 신호를 봅니다.
- 고위험 신호는 complaint/churn 후속으로 연결합니다.
- 답변 문구보다 내부 triage가 먼저 필요한지 판정합니다.

## Decision Rules

- 강한 표현이 있다고 바로 법적 위협으로 해석하지 않습니다.

## Output Contract

- 탐지 신호
- 위험도
- 근거 데이터
- 추천 조치

## Failure Handling

- 짧은 단문 하나로 강한 결론을 내리지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 감정 강도와 추천 triage가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `retention`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
