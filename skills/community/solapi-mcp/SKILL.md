---
name: solapi-mcp
description: 문자와 알림 메시지 발송을 위한 외부 SMS wrapper skill입니다.
---

# Solapi SMS

## Use This Skill When

- Solapi를 통해 문자 발송이나 상태 점검을 해야 할 때

## Required Inputs

- 수신 번호
- 메시지 본문
- 발송 시점
- provider 자격 증명 상태

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `aligo-sms`

## Source of Truth

- 실제 provider 상태와 수신 번호가 정본입니다.

## Workflow

- 발송인지 상태 확인인지 먼저 구분합니다.
- 번호 형식과 본문 길이를 점검합니다.
- 발송 성공/실패와 후속 조치를 기록합니다.
- 대체 채널이 필요한지 판단합니다.

## Decision Rules

- 발송 결과가 없으면 성공 처리하지 않습니다.

## Output Contract

- 연동 호출 계획
- 중복 방지 기준
- degraded 안내
- 수동 fallback

## Failure Handling

- provider 인증 정보가 없으면 발송을 시도하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 발송 계획과 실패 시 수동 fallback이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `notification`, `complaint`, `intake`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
