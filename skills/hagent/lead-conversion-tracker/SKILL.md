---
name: lead-conversion-tracker
description: 문의에서 등록까지의 전환 퍼널을 추적합니다.
---

# 상담 전환 추적기

## Use This Skill When

- 문의에서 등록까지의 전환 퍼널과 누락 구간을 추적해야 할 때

## Required Inputs

- 문의 유입 시점
- 상담/체험수업 여부
- 등록 여부
- 이탈 시점

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 문의-상담-체험-등록 단계 데이터가 정본입니다.

## Workflow

- 퍼널 단계를 정의합니다.
- 현재 lead가 어느 단계에 있는지 표시합니다.
- 누락된 follow-up과 병목 구간을 찾습니다.
- 전환 가능성이 높은 다음 액션을 제안합니다.

## Decision Rules

- 문의만 있고 후속 데이터가 없으면 등록 실패로 단정하지 않습니다.

## Output Contract

- 현재 상태
- 변화 추세
- 주의 포인트
- 다음 follow-up

## Failure Handling

- 리드 식별 정보가 중복되면 병합 전에는 추세를 확정하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 현재 퍼널 단계와 다음 follow-up이 제시됩니다.

## Runtime Fit

- Recommended agents: `intake`, `notification`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
