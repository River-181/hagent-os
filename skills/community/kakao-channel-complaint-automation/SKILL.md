---
name: kakao-channel-complaint-automation
description: 카카오 채널 민원을 수신하고 초안 응답 흐름을 연결합니다.
---

# 카카오 민원 자동화

## Use This Skill When

- 카카오 채널 민원을 수신부터 초안 응답 흐름까지 자동화해야 할 때

## Required Inputs

- 원문 메시지
- 채널 메타데이터
- 기존 케이스 여부
- 발송 승인 정책

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`

## Source of Truth

- 카카오 inbound 원문과 발송 정책이 정본입니다.

## Workflow

- 수신 문맥을 complaint triage로 정리합니다.
- 초안 생성과 발송 단계를 분리합니다.
- 승인 지점과 발송 조건을 표시합니다.
- activity와 케이스 연결을 남깁니다.

## Decision Rules

- 자동화라고 해도 민감 응답은 승인 전 발송하지 않습니다.

## Output Contract

- 연동 호출 계획
- 중복 방지 기준
- degraded 안내
- 수동 fallback

## Failure Handling

- 카카오 outbound 미구성 시 초안까지만 수행합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 수신-초안-승인-발송 경계가 분리되어 있습니다.

## Runtime Fit

- Recommended agents: `complaint`, `notification`, `intake`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
