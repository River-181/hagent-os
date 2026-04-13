---
name: agent-runtime-checker
description: 에이전트 실행 전 adapter, model, env, integration readiness를 점검합니다.
---

# 에이전트 런타임 점검기

## Use This Skill When

- agent 실행 전에 adapter, model, env, integration readiness를 확인해야 할 때
- 실패 가능성이 높은 run을 사전에 걸러야 할 때

## Required Inputs

- 대상 agent
- adapter type과 model
- 필수 env/secret
- 필수 integration 목록
- 실행하려는 작업 종류

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- 추가 runtime 요구사항이 없더라도 실제 발송/동기화 전에는 연결 상태를 다시 확인합니다.

## Source of Truth

- adapter 상태와 integration 상태는 현재 시스템 설정값이 정본입니다.

## Workflow

- adapter와 model availability를 먼저 확인합니다.
- 작업 종류에 필요한 integration과 secret을 대조합니다.
- 누락 항목이 실제 blocker인지 degraded인지 분리합니다.
- 즉시 실행 가능, 제한 실행, 실행 금지 중 하나로 판정합니다.

## Decision Rules

- 발송형 작업은 outbound provider 부재 시 제한 실행 또는 금지로 봅니다.
- 법령/캘린더 연동이 없으면 근거 문구에 degraded를 반드시 표시합니다.

## Output Contract

- 상태 판정
- 발견 이슈
- 즉시 조치
- 미검증 항목

## Failure Handling

- adapter 상태를 읽을 수 없으면 보수적으로 제한 실행으로 판정합니다.
- 필수 env를 모르면 실행 가능하다고 단정하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 실행 가능/제한/금지 중 하나로 판정됩니다.
- 즉시 조치가 3개 이하로 정리됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`
- Common entrypoints: `agent`, `case`, `onboarding`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
