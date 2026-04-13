---
name: sms-notification-automation
description: 학부모 안내와 결석/일정 안내 문자 발송을 연결합니다.
---

# SMS 자동화

## Use This Skill When

- 학부모 안내, 결석 알림, 일정 공지를 문자로 발송해야 할 때
- Kakao fallback 또는 긴급 문자 경로가 필요할 때

## Required Inputs

- 수신자 이름과 전화번호
- 발송 목적
- 긴급도
- 승인 여부
- SMS provider 상태

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `aligo-sms`

## Source of Truth

- 발송 대상 번호와 발송 목적이 정본입니다.

## Workflow

- SMS가 주 채널인지 fallback 채널인지 먼저 정합니다.
- 140자 내 요약과 장문 대체안을 구분합니다.
- 예약 발송인지 즉시 발송인지 확인합니다.
- 발송 후 내부 activity 기록 문구를 같이 만듭니다.

## Decision Rules

- 민감한 사안은 문자만 보내지 말고 내부 검토를 남깁니다.
- 전화번호 검증 없이 발송 확정하지 않습니다.

## Output Contract

- 발송 초안
- 채널 선택 이유
- 발송 조건
- fallback 경로

## Failure Handling

- provider가 없으면 발송 대신 텍스트와 수동 절차를 반환합니다.
- 전화번호가 없거나 형식이 틀리면 중단합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 발송 초안과 채널 선택 이유가 함께 제시됩니다.
- provider 부재 시 수동 fallback이 표시됩니다.

## Runtime Fit

- Recommended agents: `notification`, `complaint`, `intake`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
