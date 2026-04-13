---
name: korean-tone-guide
description: 학부모 커뮤니케이션의 한국어 톤앤매너, 완곡 표현, 사과/설명 문장을 가이드합니다.
---

# 학부모 응대 톤 가이드

## Use This Skill When

- 학부모/학생/강사 커뮤니케이션의 한국어 톤앤매너 기준이 필요할 때

## Required Inputs

- 대상 관계
- 상황 맥락
- 금지 표현
- 원하는 톤(차분/단호/완곡)

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 대상 관계와 발송 목적이 정본입니다.

## Workflow

- 누구에게 보내는 문장인지 먼저 정합니다.
- 사과, 설명, 요청, 일정 안내 중 목적을 분리합니다.
- 완곡 표현과 단호 표현의 균형을 맞춥니다.
- 바로 쓸 문장과 표현 원칙을 함께 줍니다.

## Decision Rules

- 과장된 감정 표현과 책임 인정 표현을 구분합니다.

## Output Contract

- 권장 문장
- 수정 포인트
- 금지 표현
- 최종 발송안

## Failure Handling

- 상황 맥락이 없으면 일반 가이드만 제공합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 권장 문장과 금지 표현이 함께 정리됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `retention`, `notification`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
