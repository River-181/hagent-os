---
name: google-calendar-mcp
description: 수업, 상담, 보강 일정을 Google Calendar와 연결하는 wrapper skill입니다.
---

# Google Calendar MCP

## Use This Skill When

- 내부 일정을 Google Calendar 이벤트로 동기화해야 할 때
- 상담/보강 일정 변경을 외부 캘린더까지 반영해야 할 때

## Required Inputs

- 일정 제목과 시간
- 참여자 또는 학생/강사 정보
- 기존 외부 이벤트 id 여부
- 캘린더 쓰기 권한 상태

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `google-calendar-mcp`

## Source of Truth

- 내부 확정 일정이 정본이고 외부 캘린더는 반영 대상입니다.

## Workflow

- 내부 일정이 확정 상태인지 먼저 확인합니다.
- 동일 학생/강사/시간 조합의 기존 이벤트를 먼저 조회합니다.
- 생성/수정/취소 중 어떤 동기화인지 분리합니다.
- 성공/실패 결과와 수동 fallback을 같이 남깁니다.

## Decision Rules

- 확정되지 않은 임시 일정은 외부 캘린더에 쓰지 않습니다.
- 중복 이벤트 가능성이 있으면 생성보다 조회/업데이트를 우선합니다.

## Output Contract

- 연동 호출 계획
- 중복 방지 기준
- degraded 안내
- 수동 fallback

## Failure Handling

- access token이나 권한이 없으면 pending_credentials로 명시합니다.
- 기존 이벤트 id가 없고 중복 가능성이 높으면 생성 보류를 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 생성/수정/취소 계획이 명확합니다.
- pending_credentials 또는 수동 fallback 여부가 표시됩니다.

## Runtime Fit

- Recommended agents: `scheduler`, `orchestrator`, `notification`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
