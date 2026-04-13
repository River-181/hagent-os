---
name: agent-creator
description: 학원 운영 역할에 맞는 에이전트 구성, 이름, 기본 스킬 장착 기준을 설계합니다.
---

# 에이전트 생성기

## Use This Skill When

- 학원 운영 역할에 맞는 새 agent를 설계하거나 추가할 때

## Required Inputs

- 역할 이름
- 담당 업무
- 상위 보고 대상
- 필수 스킬
- 필수 adapter/integration

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- 현재 org chart와 기존 agent 책임 범위가 정본입니다.

## Workflow

- 기존 agent와 책임 중복 여부를 먼저 확인합니다.
- 역할, 이름, 보고 체계, 기본 스킬을 정합니다.
- 최소 실행 구성과 확장 구성을 분리합니다.
- 생성 후 runtime check까지 제안합니다.

## Decision Rules

- 한 agent에 너무 많은 역할을 몰지 않습니다.
- 실행 경로가 없는 agent를 이름만 만들지 않습니다.

## Output Contract

- 생성 제안
- 설정 초안
- 검증 절차
- 운영 주의사항

## Failure Handling

- 역할 경계가 모호하면 새 agent보다 기존 agent 확장을 제안합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 새 agent 역할과 검증 절차가 명확합니다.

## Runtime Fit

- Recommended agents: `orchestrator`
- Common entrypoints: `agent`, `onboarding`, `project`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
