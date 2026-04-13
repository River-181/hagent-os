---
name: humanizer
description: 딱딱한 초안을 사람 친화적인 한국어로 다듬습니다.
---

# 휴머니저

## Use This Skill When

- 기계적으로 들리는 초안을 더 사람다운 운영 톤으로 바꿔야 할 때

## Required Inputs

- 원문 초안
- 상대방 관계(학부모/학생/강사)
- 상황 맥락
- 너무 강하거나 딱딱하면 안 되는 표현

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 원문 초안의 사실관계가 정본입니다.

## Workflow

- 초안이 딱딱한지, 방어적인지, 과한지 먼저 진단합니다.
- 같은 의미를 유지하며 더 부드러운 표현으로 바꿉니다.
- 민원/연체/상담 같은 감정 맥락에서는 완곡 표현을 우선합니다.
- 실사용 가능한 최종안과 더 보수적인 대안을 같이 줄 수 있습니다.

## Decision Rules

- 법적 책임을 인정하는 표현을 임의로 추가하지 않습니다.
- 과한 이모지, 과잉 사과, 지나친 친근함은 피합니다.

## Output Contract

- 발송 가능한 최종안
- 더 보수적인 대안
- 톤 조정 포인트
- 주의 표현

## Failure Handling

- 원문 사실관계가 불명확하면 문체만 다듬고 내용 확장은 하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 최종안이 더 자연스럽지만 사실은 유지됩니다.
- 위험한 표현이나 과도한 감정 표현이 제거됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `notification`, `retention`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
