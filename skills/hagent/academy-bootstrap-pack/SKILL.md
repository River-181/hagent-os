---
name: academy-bootstrap-pack
description: 기관 기본 정보, 채널, 정책, 기본 팀, starter project와 setup case 생성을 한 번에 시작하는 onboarding pack입니다.
---

# 학원 온보딩 Bootstrap Pack

## Use This Skill When

- 새 기관 온보딩 시 기본 팀, 채널, 정책, starter project를 한 번에 구성해야 할 때

## Required Inputs

- 기관 이름과 유형
- 운영 규모
- 주요 채널
- 필수 정책 문서 유무
- 기본 agent 팀 구성

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`, `google-calendar-mcp`

## Source of Truth

- 기관 기본 정보와 실제 준비된 채널/정책이 정본입니다.

## Workflow

- 기관 기본 정보와 운영 범위를 먼저 정리합니다.
- 채널, 정책, 문서, 기본 agent를 순서대로 구성합니다.
- setup case와 starter project를 만들어 초기 검증 경로를 남깁니다.
- 바로 쓰기 가능한 것과 추가 설정이 필요한 것을 분리합니다.

## Decision Rules

- 온보딩 단계에서 live 발송 채널은 미검증이면 자동 활성화하지 않습니다.
- 기관에 없는 정책이나 문서를 완료 상태처럼 표시하지 않습니다.

## Output Contract

- 실행 순서
- 하위 스킬 구성
- 승인 필요 단계
- 미준비 의존성

## Failure Handling

- 기관 기본 정보가 부족하면 seed만 하고 채널 활성화는 보류합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 즉시 사용 가능 항목과 추가 설정 항목이 분리됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `complaint`, `scheduler`, `retention`
- Common entrypoints: `onboarding`, `project`, `agent`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
