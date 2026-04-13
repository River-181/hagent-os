---
name: hwpx-document-pack
description: 한글(HWPX) 문서 처리와 산출물 연결 흐름을 케이스/프로젝트 작업에 붙이는 document pack입니다.
---

# HWPX 문서 자동화 Pack

## Use This Skill When

- HWPX 문서 처리와 산출물 연결을 케이스/프로젝트 흐름에 붙여야 할 때

## Required Inputs

- 문서 종류
- 템플릿 경로
- 필수 필드
- 출력 위치
- 승인 여부

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `hwpx-cli`

## Source of Truth

- 원본 템플릿과 입력 필드가 정본입니다.

## Workflow

- 읽기/쓰기/변환 중 어떤 작업인지 먼저 정합니다.
- 템플릿 필드와 실제 입력값을 매핑합니다.
- 문서 생성 후 연결할 Case/Project/Approval 위치를 정합니다.
- 수동 검토가 필요한 부분을 표시합니다.

## Decision Rules

- 서식이 깨질 수 있는 구간은 미검증으로 남깁니다.

## Output Contract

- 실행 순서
- 하위 스킬 구성
- 승인 필요 단계
- 미준비 의존성

## Failure Handling

- 템플릿 필드가 모자라면 임의 채우기보다 누락값을 반환합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 생성 경로와 수동 검토 포인트가 함께 남습니다.

## Runtime Fit

- Recommended agents: `staff`, `orchestrator`, `compliance`
- Common entrypoints: `case`, `project`, `onboarding`
- Adapter compatibility: `codex_local`, `claude_local`
- Locale: `ko-KR`
