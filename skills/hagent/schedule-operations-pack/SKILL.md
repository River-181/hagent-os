---
name: schedule-operations-pack
description: 보강, 상담 예약, 시간표 조정을 캘린더 연동과 일정 최적화 흐름으로 묶는 운영 pack입니다.
---

# 보강/일정 조정 Pack

## Use This Skill When

- 보강, 상담 예약, 시간표 조정을 캘린더 연동까지 포함해 한 번에 다뤄야 할 때

## Required Inputs

- 변경 대상 일정
- 참여자
- 제약조건
- 외부 캘린더 사용 여부

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `google-calendar-mcp`

## Source of Truth

- 내부 일정 데이터와 availability 정보가 정본입니다.

## Workflow

- 일정 변경 종류를 분류합니다.
- 충돌 확인, 대안 탐색, 확정, 공지 순서로 진행합니다.
- 외부 캘린더와 내부 일정 반영을 분리합니다.
- 후속 알림과 activity 기록까지 포함합니다.

## Decision Rules

- 대체안 없이 일정 취소만 제안하지 않습니다.

## Output Contract

- 실행 순서
- 하위 스킬 구성
- 승인 필요 단계
- 미준비 의존성

## Failure Handling

- 참여자 availability가 없으면 확정안 대신 후보안만 제공합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 변경안과 후속 공지가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `scheduler`, `orchestrator`, `staff`
- Common entrypoints: `case`, `project`, `onboarding`
- Adapter compatibility: `codex_local`, `claude_local`
- Locale: `ko-KR`
