---
name: hwpx-document-processor
description: 한글 문서 템플릿과 문서 읽기/쓰기 절차를 제공합니다.
---

# HWPX 문서 처리

## Use This Skill When

- HWPX 문서를 읽거나 쓰거나 템플릿 기반으로 생성해야 할 때

## Required Inputs

- 원본 문서 또는 템플릿
- 변경할 필드
- 출력 포맷
- 문서 목적

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `hwpx-cli`

## Source of Truth

- 원본 문서/템플릿과 필드 매핑이 정본입니다.

## Workflow

- 읽기/쓰기/변환 작업을 먼저 나눕니다.
- 필드 매핑과 치환값을 정리합니다.
- 서식 민감 구간은 미리 표시합니다.
- 출력 후 수동 검토 포인트를 남깁니다.

## Decision Rules

- 서식 보존을 확정적으로 약속하지 않습니다.

## Output Contract

- 처리 계획
- 필드 매핑
- 검토 포인트
- 출력 결과 요약

## Failure Handling

- 템플릿 구조를 읽지 못하면 우회 포맷을 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 처리 계획과 수동 검토 포인트가 함께 남습니다.

## Runtime Fit

- Recommended agents: `staff`, `compliance`, `analytics`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
