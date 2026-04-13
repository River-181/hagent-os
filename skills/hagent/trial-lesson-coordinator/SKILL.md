---
name: trial-lesson-coordinator
description: 체험수업 문의를 수집하고 일정, 안내, 후속 상담까지 연결합니다.
---

# 체험수업 코디네이터

## Use This Skill When

- 체험수업 문의를 수집하고 일정, 안내, 후속 상담까지 연결해야 할 때

## Required Inputs

- 문의자 정보
- 희망 일정
- 과목/레벨
- 가능 강사
- 후속 상담 기준

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `google-calendar-mcp`, `kakao-channel`

## Source of Truth

- 문의자 정보, 희망 조건, 강사 가용성이 정본입니다.

## Workflow

- lead 정보와 희망 조건을 먼저 정리합니다.
- 가능 슬롯과 강사를 찾습니다.
- 체험수업 안내 문안과 후속 상담 계획을 같이 만듭니다.
- 등록 전환 tracking과 연결합니다.

## Decision Rules

- 희망 일정만 있고 확정 슬롯이 없으면 예약 완료처럼 쓰지 않습니다.

## Output Contract

- 조정안
- 확인 필요 사항
- 담당자/시간
- fallback 안

## Failure Handling

- 강사 가용성이 없으면 후보 일정만 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 확정안 또는 후보안과 후속 상담 계획이 제시됩니다.

## Runtime Fit

- Recommended agents: `counseling`, `scheduler`
- Common entrypoints: `case`, `project`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
