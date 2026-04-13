---
name: student-data-import
description: 엑셀, CSV, 상담 목록 형태의 학생 데이터를 정규화하여 가져옵니다.
---

# 학생 데이터 가져오기

## Use This Skill When

- 엑셀, CSV, 상담 목록의 학생 데이터를 시스템 필드로 정규화해야 할 때

## Required Inputs

- 원본 파일 또는 표
- 컬럼 정의
- 필수 필드 기준
- 중복 판단 기준

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 원본 파일과 표준 필드 매핑표가 정본입니다.

## Workflow

- 컬럼 의미와 포맷을 먼저 해석합니다.
- 중복, 누락, 형식 오류를 사전 검출합니다.
- 표준 필드 매핑표를 만듭니다.
- 샘플 row로 dry-run 결과를 보여줍니다.

## Decision Rules

- 대량 반영 전에 샘플 검증을 생략하지 않습니다.

## Output Contract

- 매핑 규칙
- 오류 목록
- 샘플 반영 결과
- 실행 제안

## Failure Handling

- 주민번호 등 민감정보가 들어오면 필요한 최소 필드만 쓰도록 줄입니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 샘플 dry-run과 오류 목록이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `intake`, `analytics`
- Adapter compatibility: `claude_local`
- Locale: `ko-KR`
