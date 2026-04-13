---
name: external-skill-importer
description: 외부 GitHub 스킬과 MCP 소스를 curated upstream 자산으로 등록하고 포크 기준을 정리합니다.
---

# 외부 스킬 가져오기

## Use This Skill When

- 외부 GitHub skill 또는 MCP 기반 스킬을 curated asset으로 가져와야 할 때

## Required Inputs

- 소스 repo 또는 패키지
- 라이선스/출처
- 목적
- 호환 adapter
- 필요 integration

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 외부 스킬의 실제 출처, 라이선스, 호환성이 정본입니다.

## Workflow

- 출처, 라이선스, 유지보수 가능성을 먼저 확인합니다.
- 실제 필요한 부분만 가져오고 중복 스킬은 피합니다.
- skill package와 runtime 제약을 정리합니다.
- 검증 방법과 롤백 방법을 함께 남깁니다.

## Decision Rules

- 출처 불명확한 스킬은 curated asset으로 등록하지 않습니다.

## Output Contract

- 등록 판단
- 호환성
- 설치/검증 절차
- 롤백 방법

## Failure Handling

- 라이선스나 호환성이 불명확하면 가져오기 보류를 권장합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 등록/검증/롤백 방법이 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `operations`
- Common entrypoints: `onboarding`, `project`, `agent`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
