---
name: kakao-channel
description: 카카오 채널 문의를 케이스, 응답 초안, 알림 흐름에 연결하는 wrapper skill입니다.
---

# 카카오 채널 연동

## Use This Skill When

- 카카오 채널 inbound를 케이스와 연결해야 할 때
- 카카오 답변 초안 또는 발송 전 문맥 정리가 필요할 때

## Required Inputs

- 원문 메시지
- 발화자 식별자
- 채널 메타데이터
- 최근 케이스/대화 이력
- outbound 가능 여부

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`

## Source of Truth

- 원문 메시지와 채널 메타데이터가 정본입니다.

## Workflow

- 메시지 원문과 발화자를 먼저 정리합니다.
- 기존 conversation context가 있는지 확인합니다.
- 민원, 일정, 신규 상담 등으로 라우팅 후보를 정합니다.
- 초안 생성과 발송은 분리해서 처리합니다.

## Decision Rules

- 발화자 식별이 불명확하면 케이스는 만들되 단정 응답은 피합니다.
- 채널 발송 가능 여부가 없으면 draft only로 처리합니다.

## Output Contract

- 연동 호출 계획
- 중복 방지 기준
- degraded 안내
- 수동 fallback

## Failure Handling

- 발화자 매칭 실패 시 내부 triage 케이스로 낮춥니다.
- outbound 미구성 시 발송 완료로 기록하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 케이스 연결 또는 triage 방향이 정리됩니다.
- 발송 가능 여부가 draft와 분리됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `notification`, `intake`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
