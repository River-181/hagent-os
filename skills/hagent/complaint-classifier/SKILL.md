---
name: complaint-classifier
description: 학부모 민원을 유형과 긴급도로 분류합니다.
---

# 민원 분류기

## Use This Skill When

- 학부모 민원을 유형, 긴급도, 담당 흐름으로 분류해야 할 때

## Required Inputs

- 원문 메시지
- 학생/보호자 정보
- 관련 과거 케이스
- 민원 대상(강사/수업/비용/일정)

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 원문 메시지와 기존 케이스 이력이 정본입니다.

## Workflow

- 주제와 감정 강도를 먼저 분리합니다.
- 환불, 수업 품질, 일정, 태도, 안전 이슈로 유형화합니다.
- 즉시 escalation이 필요한지 판단합니다.
- 답변 초안에 들어가야 할 사실 확인 항목을 남깁니다.

## Decision Rules

- 환불/안전 이슈는 일반 문의보다 높은 우선순위로 둡니다.
- 사실 확인 전 책임 인정 문구를 확정하지 않습니다.

## Output Contract

- 분류 결과
- 긴급도
- 담당 agent 후보
- 분류 근거

## Failure Handling

- 메시지가 모호하면 범주를 좁히지 않고 추가 확인 질문을 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 유형, 긴급도, 담당 흐름이 정리됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `orchestrator`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
