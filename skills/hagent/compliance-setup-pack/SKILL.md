---
name: compliance-setup-pack
description: 환불 정책, 상담 정책, 학원 운영 규정과 법령 점검 경로를 초기 설정하는 setup pack입니다.
---

# 법령/환불 Setup Pack

## Use This Skill When

- 환불 정책, 상담 정책, 기본 규정과 법령 조회 경로를 초기 설정해야 할 때

## Required Inputs

- 기관 정책 문서 유무
- 적용할 법령 범위
- 승인 정책
- 담당자

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `korean-law-mcp`

## Source of Truth

- 기관이 실제 보유한 정책 문서와 운영 기준이 정본입니다.

## Workflow

- 필수 정책 문서 목록을 먼저 정리합니다.
- 없는 문서와 있는 문서를 구분합니다.
- 법령 조회 경로와 검토 책임자를 연결합니다.
- 향후 환불/민원 케이스에 재사용 가능한 기준을 남깁니다.

## Decision Rules

- 문서가 없으면 setup 완료 대신 TODO를 남깁니다.

## Output Contract

- 설정 체크리스트
- 누락 secret/env
- 테스트 절차
- 남은 리스크

## Failure Handling

- 정책 초안만 있고 승인되지 않았다면 운영 기준으로 확정하지 않습니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 있는 문서와 없는 문서가 구분되어 남습니다.

## Runtime Fit

- Recommended agents: `orchestrator`, `complaint`, `finance`
- Common entrypoints: `onboarding`, `project`, `case`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
