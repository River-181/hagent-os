---
name: compliance-refund-pack
description: 환불 문의와 학원 운영 규정 검토를 법령 조회, 환불 계산, 근거 정리 흐름으로 묶는 pack입니다.
---

# 교육 법령/환불 검토 Pack

## Use This Skill When

- 환불 문의와 운영 규정 검토를 법령 조회, 계산, 답변 근거 정리까지 묶어 처리해야 할 때

## Required Inputs

- 환불 사유
- 결제/수강 이력
- 환불 정책 문서
- 법령 조회 가능 여부

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `korean-law-mcp`

## Source of Truth

- 기관 정책 문서와 법령 조회 결과가 정본입니다.

## Workflow

- 사실관계 정리, 정책 확인, 법령 조회, 계산, 답변 초안 순서로 진행합니다.
- 정책과 법령이 충돌하면 사람 검토 지점을 먼저 둡니다.
- 숫자와 문장을 따로 만들지 말고 하나의 승인 패키지로 묶습니다.
- 최종 발송 전에는 반드시 approval 조건을 점검합니다.

## Decision Rules

- 법령 조회 결과가 없으면 법적 단정 문구를 쓰지 않습니다.

## Output Contract

- 실행 순서
- 하위 스킬 구성
- 승인 필요 단계
- 미준비 의존성

## Failure Handling

- 정책 문서가 없으면 규정 검토 완료로 말하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 정책/법령/계산/답변 초안이 한 흐름으로 묶입니다.

## Runtime Fit

- Recommended agents: `compliance`, `finance`, `complaint`
- Common entrypoints: `case`, `project`, `onboarding`
- Adapter compatibility: `codex_local`, `claude_local`
- Locale: `ko-KR`
