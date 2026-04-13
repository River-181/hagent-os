---
name: message-template-pack
description: 민원·공지·리마인더 템플릿을 제공합니다.
---

# 메시지 템플릿 팩

## Use This Skill When

- 민원, 공지, 리마인더 메시지 템플릿을 빠르게 꺼내 써야 할 때

## Required Inputs

- 메시지 목적
- 대상자
- 채널
- 필수 포함 정보

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 메시지 목적과 채널이 정본입니다.

## Workflow

- 목적과 채널별 템플릿 후보를 먼저 고릅니다.
- 사실 정보와 가변 필드를 채웁니다.
- 과한 장식 없이 발송 가능한 문장으로 정리합니다.
- 필요하면 grammar/humanizer를 후속 적용합니다.

## Decision Rules

- 템플릿만 복붙하지 말고 실제 상황에 맞는 필드 채움 여부를 확인합니다.

## Output Contract

- 권장 템플릿
- 가변 필드
- 수정 포인트
- 최종 발송안

## Failure Handling

- 필수 변수값이 없으면 빈칸 템플릿 상태로만 반환합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 가변 필드가 채워진 템플릿 초안이 제시됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `notification`, `intake`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
