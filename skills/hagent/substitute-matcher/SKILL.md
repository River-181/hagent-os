---
name: substitute-matcher
description: 대체 가능한 강사 후보를 수업 조건에 맞춰 정리합니다.
---

# 대체강사 매처

## Use This Skill When

- 결강이나 일정 변경 시 대체 가능한 강사 후보를 골라야 할 때

## Required Inputs

- 수업 시간
- 필요 과목/레벨
- 필수 조건
- 후보 강사 목록과 가용 시간

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 강사 가용 시간과 수업 조건이 정본입니다.

## Workflow

- 필수 조건과 선호 조건을 분리합니다.
- 후보군을 좁히고 적합도 이유를 씁니다.
- 1안과 fallback 1개 정도로 압축합니다.
- 학생/학부모 공지가 필요한지 같이 봅니다.

## Decision Rules

- 가용 시간 확인 없이 후보를 확정하지 않습니다.

## Output Contract

- 상위 후보
- 적합도 근거
- 제외 이유
- 추천안

## Failure Handling

- 후보가 없으면 무리한 매칭 대신 일정 조정 옵션을 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 상위 후보와 제외 이유가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `scheduler`, `staff`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
