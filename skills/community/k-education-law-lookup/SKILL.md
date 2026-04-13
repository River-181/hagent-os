---
name: k-education-law-lookup
description: 학원 운영 관련 법령과 행정 규정을 조회하도록 래핑합니다.
---

# 교육 법령 조회

## Use This Skill When

- 학원 운영 관련 법령, 행정 규정, 환불/개인정보/출결 관련 근거를 찾아야 할 때

## Required Inputs

- 질문 주제
- 기관 유형
- 판단이 필요한 행위
- 필요한 답변 수준(요약/근거/원문)

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `korean-law-mcp`

## Source of Truth

- 최신 조회 결과와 관련 조문이 정본입니다.

## Workflow

- 질문을 법령 쿼리 단위로 좁힙니다.
- 운영 판단에 필요한 조문과 해석 포인트를 분리합니다.
- 원문 인용보다 요약과 적용 판단을 함께 제공합니다.
- 실제 조치에 쓰일 때는 사람 검토 필요 여부를 표시합니다.

## Decision Rules

- 법률 자문처럼 단정하지 않습니다.
- 조문이 없거나 불명확하면 해석 확정 대신 근거 부족을 밝힙니다.

## Output Contract

- 조회 결과 요약
- 관련 조문/근거
- 운영 적용 포인트
- 추가 확인 필요 사항

## Failure Handling

- 법령 integration이 없으면 내부 정책 기준으로만 답하고 degraded를 명시합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 관련 조문과 운영 적용 포인트가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `compliance`, `finance`, `staff`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
