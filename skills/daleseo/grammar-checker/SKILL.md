---
name: grammar-checker
description: 한국어 문장을 교정하고 더 자연스러운 표현을 제안합니다.
---

# 문장 다듬기

## Use This Skill When

- 한국어 문장을 교정하고 더 자연스러운 표현으로 바꿔야 할 때

## Required Inputs

- 원문 문장
- 발송 채널 또는 문서 종류
- 유지해야 할 사실 정보

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 원문 문장의 사실 정보가 정본입니다.

## Workflow

- 맞춤법, 띄어쓰기, 호응, 반복 표현을 먼저 점검합니다.
- 의미를 바꾸지 않는 범위에서 자연스럽게 다듬습니다.
- 채널에 맞는 톤으로 맞춥니다.
- 수정본과 핵심 수정 포인트를 함께 반환합니다.

## Decision Rules

- 내용 요약으로 정보를 잃지 않습니다.
- 지나치게 공손하거나 기계적인 표현으로 바꾸지 않습니다.

## Output Contract

- 수정된 문장
- 핵심 수정 포인트
- 남은 모호성
- 채널별 권장 표현

## Failure Handling

- 문맥이 부족하면 더 자연스러운 대안만 제시하고 단정 교정은 피합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 수정본이 의미를 바꾸지 않습니다.
- 핵심 수정 포인트가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `notification`, `analytics`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
