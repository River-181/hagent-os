---
name: schedule-manager
description: 수업, 상담, 보강, 법정 기한 등 학원 운영 일정을 CRUD 관점으로 정리합니다.
---

# 일정 관리 스킬

## Use This Skill When

- 수업, 상담, 보강, 행사, 법정 기한 일정을 생성/수정/취소해야 할 때
- 일정 변경이 학생, 강사, 보호자 공지와 함께 움직여야 할 때

## Required Inputs

- 이벤트 종류
- 시작/종료 시각
- 담당 강사 또는 책임자
- 연결 학생/그룹
- 취소/변경 사유
- 외부 캘린더 연동 여부

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 일정 시간과 참여자는 최신 schedule 데이터가 정본입니다.
- 외부 캘린더는 내부 일정 확정 후 반영합니다.

## Workflow

- 생성/수정/취소 중 어떤 작업인지 먼저 명확히 합니다.
- 같은 시간대 충돌과 중복 일정을 먼저 확인합니다.
- 영향받는 학생, 강사, 보호자에게 필요한 후속 안내를 계산합니다.
- 내부 일정 변경과 외부 채널 공지를 분리해서 제안합니다.

## Decision Rules

- 확정 전 일정은 외부 캘린더에 바로 쓰지 않습니다.
- 취소 일정은 연결 학생과 출결/보강 후속조치를 같이 봅니다.

## Output Contract

- 생성/수정/취소 제안
- 충돌 요약
- 영향 대상
- 후속 조치

## Failure Handling

- 시간, 강사, 학생 정보가 불완전하면 일정 확정안을 내지 않습니다.
- Google Calendar가 없으면 내부 일정 기준안만 제공합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 생성/수정/취소 중 작업 종류가 명확합니다.
- 충돌 여부와 후속 공지 대상이 함께 정리됩니다.

## Runtime Fit

- Recommended agents: `scheduler`, `orchestrator`, `notification`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
