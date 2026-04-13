---
name: k-skill-registry
description: 한국형 외부 스킬 레지스트리를 curated upstream asset으로 등록하고 필요한 skill만 선별 수입합니다.
---

# k-skill 레지스트리

## Use This Skill When

- 외부 한국형 skill registry에서 필요한 skill을 찾아 curated asset으로 들여와야 할 때

## Required Inputs

- 찾는 기능
- 출처 registry
- 호환 adapter
- 배포 제약

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- registry 출처와 현재 설치된 skill 목록이 정본입니다.

## Workflow

- 필요 기능을 먼저 좁힙니다.
- registry에서 후보를 찾고 출처를 확인합니다.
- 현재 스킬과 중복 여부를 봅니다.
- 등록, 검증, 롤백 순서를 정리합니다.

## Decision Rules

- 출처와 유지보수 상태가 불명확한 항목은 기본 후보에서 제외합니다.

## Output Contract

- 등록 판단
- 호환성
- 설치/검증 절차
- 롤백 방법

## Failure Handling

- 유사한 내부 스킬이 이미 있으면 신규 import보다 재사용을 우선 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 등록 판단과 롤백 방법이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `staff`
- Common entrypoints: `agent`, `project`, `onboarding`
- Adapter compatibility: `codex_local`, `claude_local`
- Locale: `ko-KR`
