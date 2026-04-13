---
name: document-setup-pack
description: HWPX/문서 산출물 경로와 템플릿 사용 기준을 준비하는 setup pack입니다.
---

# 문서 자동화 Setup Pack

## Use This Skill When

- 문서 템플릿, 산출물 경로, 문서 생성 운영 기준을 초기 설정해야 할 때

## Required Inputs

- 생성할 문서 종류
- 템플릿 유무
- 출력 포맷
- 보관 위치
- 승인 필요 여부

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `hwpx-cli`

## Source of Truth

- 템플릿 출처와 실제 출력 포맷 요구사항이 정본입니다.

## Workflow

- 문서 종류와 템플릿 출처를 먼저 정리합니다.
- 자동 생성 가능한 문서와 수동 검토가 필요한 문서를 구분합니다.
- 파일명 규칙과 보관 경로를 정합니다.
- 문서 생성 후 어디에 연결할지(Case/Project/Approval)까지 남깁니다.

## Decision Rules

- 템플릿 없는 문서를 완료된 자동화처럼 말하지 않습니다.

## Output Contract

- 설정 체크리스트
- 누락 secret/env
- 테스트 절차
- 남은 리스크

## Failure Handling

- 출력 포맷이나 템플릿이 없으면 setup 일부 완료로 남깁니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 문서 종류별 생성 기준과 보관 위치가 정리됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `operations`, `marketing`
- Common entrypoints: `onboarding`, `project`, `case`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
