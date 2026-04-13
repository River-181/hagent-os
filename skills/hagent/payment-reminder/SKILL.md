---
name: payment-reminder
description: 결제 예정, 미납, 연체 상황에 맞는 안내 문구와 후속 조치를 만듭니다.
---

# 결제 안내 및 리마인더

## Use This Skill When

- 수강료 예정일, 1차 미납, 장기 연체에 맞는 안내 문구가 필요할 때
- 금액, 기한, 문의 채널을 포함한 실제 발송 초안을 만들어야 할 때

## Required Inputs

- 학생 또는 보호자 이름
- 결제 상태와 미납 단계
- 청구 금액과 납부 기한
- 최근 상담/민원 이력
- 발송 채널(Kakao/SMS/내부 메모)

## Preflight

- 대상 조직과 현재 작업 컨텍스트를 먼저 확인합니다.
- 기존 케이스, 문서, 학생, 일정 중 무엇이 정본인지 확인합니다.
- Required integrations: `kakao-channel`, `solapi`

## Source of Truth

- 학생/보호자 기본정보는 학생/케이스 기준 정보를 우선합니다.
- 금액과 기한은 최신 결제/청구 정보가 정본입니다.

## Workflow

- 미납 단계가 예정/1차/장기 연체 중 어디인지 먼저 판정합니다.
- 최근 민원이나 취약 맥락이 있으면 톤을 낮추고 사람 검토를 우선합니다.
- 금액, 기한, 납부 방법, 문의 채널을 빠짐없이 넣습니다.
- 발송용 문안과 내부 공유용 요약을 분리합니다.

## Decision Rules

- 장기 연체는 압박보다 상담 유도 문안이 우선입니다.
- 민원 중인 보호자에게는 자동 발송보다 승인 후 발송이 기본입니다.

## Output Contract

- 발송 초안
- 단계 판정
- 누락 정보
- 승인 필요 여부

## Failure Handling

- 금액 또는 기한이 없으면 초안을 확정하지 않고 누락값을 먼저 요청합니다.
- 채널 integration이 없으면 내부 공유용 문안과 수동 발송 지침만 반환합니다.

## Guardrails

- 확인되지 않은 사실을 실행 완료처럼 말하지 않습니다.
- 외부 발송, 환불, 일정 변경처럼 운영 영향이 큰 작업은 approval 필요 여부를 먼저 표시합니다.
- integration이 없거나 degraded면 수동 fallback과 다음 조치를 같이 적습니다.

## Done When

- 발송 초안에 금액, 기한, 문의 채널이 모두 포함됩니다.
- 승인 필요 여부와 미발송 조건이 분리됩니다.

## Runtime Fit

- Recommended agents: `operations`, `finance`
- Common entrypoints: `case`, `project`
- Adapter compatibility: `codex_qauth`, `codex_local`, `claude_local`
- Locale: `ko-KR`
