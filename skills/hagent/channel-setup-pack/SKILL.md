---
name: channel-setup-pack
description: Kakao, Telegram, SMS 같은 인바운드/아웃바운드 채널의 연결 상태를 점검하고 운영 기준을 맞추는 setup pack입니다.
---

# 채널 연결 Setup Pack

## Use This Skill When

- Kakao, Telegram, SMS 채널의 연결 상태와 운영 기준을 초기 설정해야 할 때

## Required Inputs

- 채널 종류
- 사용 목적
- 필수 secret/env
- 인바운드/아웃바운드 정책
- 테스트 방법

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`, `telegram-bot`, `solapi`

## Source of Truth

- 실제 secret/env/integration 상태가 정본입니다.

## Workflow

- 채널별 inbound/outbound 요구사항을 나눕니다.
- secret/env와 provider 상태를 먼저 점검합니다.
- 연결 테스트, 샘플 발송, fallback 순서로 계획을 세웁니다.
- 운영 기준과 승인 기준을 문서화합니다.

## Decision Rules

- 실제 발송 전에는 테스트 채널과 운영 채널을 구분합니다.
- 연결 성공과 실제 delivery proof를 같은 것으로 보지 않습니다.

## Output Contract

- 설정 체크리스트
- 누락 secret/env
- 테스트 절차
- 남은 리스크

## Failure Handling

- public HTTPS 또는 provider URL이 없으면 live 운영 준비 완료로 표시하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 연결 준비 상태와 테스트 절차가 분리됩니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `complaint`, `notification`
- Common entrypoints: `onboarding`, `agent`, `project`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
