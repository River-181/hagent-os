---
name: kakao-complaint-pack
description: 카카오 채널 민원을 분류하고 답변 초안, 승인, 발송까지 한 흐름으로 묶는 운영 pack입니다.
---

# 카카오 민원 처리 Pack

## Use This Skill When

- 카카오 채널 민원을 케이스, 분류, 답변, 승인, 발송 흐름으로 묶어야 할 때
- 학부모 문의를 단순 응답이 아니라 운영 조치까지 연결해야 할 때

## Required Inputs

- 원문 메시지와 발화 시각
- 학생/보호자 식별 정보
- 관련 케이스나 최근 대화 이력
- 정책 문서와 답변 기준
- Kakao inbound/outbound 준비 상태

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`, `kakao-outbound`

## Source of Truth

- 원문 메시지와 기존 conversation context가 정본입니다.
- 정책/문서 근거가 있으면 답변 초안보다 근거 문서를 우선합니다.

## Workflow

- 메시지를 complaint/intake/schedule/refund 계열로 먼저 분류합니다.
- 답변에 필요한 내부 사실과 정책 문서를 연결합니다.
- 초안 작성 후 approval 필요 여부를 결정합니다.
- 승인 후 발송, 문서화, activity 기록까지 한 세트로 정리합니다.

## Decision Rules

- 환불, 보상, 강한 사과 표현은 승인 없이 확정하지 않습니다.
- 외부 발송 전에는 학생/보호자 매칭이 맞는지 다시 확인합니다.

## Output Contract

- 실행 순서
- 하위 스킬 구성
- 승인 필요 단계
- 미준비 의존성

## Failure Handling

- Kakao outbound provider가 없으면 발송 대신 초안과 수동 전송 지침을 반환합니다.
- 학생 매칭이 불명확하면 intake로 낮춰 분류합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 분류, 초안, 승인 지점, 발송/수동 fallback이 한 흐름으로 정리됩니다.
- 민감 응답은 승인 필요 여부가 반드시 표시됩니다.

## Runtime Fit

- Recommended agents: `complaint`, `notification`, `orchestrator`
- Common entrypoints: `case`, `project`, `onboarding`
- Adapter compatibility: `codex_local`, `claude_local`
- Locale: `ko-KR`
