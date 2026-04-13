---
name: attendance-followup
description: 결석, 지각, 잦은 일정 누락에 대한 후속 연락과 내부 follow-up을 정리합니다.
---

# 출결 후속 조치

## Use This Skill When

- 결석, 지각, 잦은 일정 누락 후속 연락이 필요할 때

## Required Inputs

- 학생 이름
- 결석/지각 패턴
- 최근 보호자 소통 이력
- 필요 시 보강 가능 시간

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`, `solapi`

## Source of Truth

- 최신 출결 기록과 최근 보호자 소통 이력이 정본입니다.

## Workflow

- 단발성 이슈인지 반복 신호인지 먼저 구분합니다.
- 학부모 안내, 내부 공유, 보강 제안 중 필요한 조치를 나눕니다.
- 강한 경고보다 사실 확인과 다음 단계 제안을 우선합니다.
- 이탈 징후가 있으면 churn 관련 스킬로 연결합니다.

## Decision Rules

- 반복 결석은 단순 출결 알림으로 끝내지 않습니다.
- 민감한 사유 추정은 하지 않습니다.

## Output Contract

- 후속 연락 초안
- 위험 신호
- 내부 조치
- 다음 follow-up 시점

## Failure Handling

- 출결 데이터가 불완전하면 패턴 판단을 보수적으로 합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 후속 연락 초안과 내부 조치가 함께 제시됩니다.

## Runtime Fit

- Recommended agents: `operations`, `scheduler`
- Common entrypoints: `case`, `project`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
