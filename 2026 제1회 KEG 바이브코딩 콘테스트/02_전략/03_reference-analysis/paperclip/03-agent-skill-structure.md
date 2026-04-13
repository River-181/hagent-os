---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# Agent And Skill Structure

## Facts

- `paperclip`의 핵심은 특정 모델이 아니라 `agent를 직원처럼 다루는 orchestration layer`다.
- agent는 독립적으로 실행되지만 heartbeat, assignment, approval, budget으로 관리된다.
- skill은 단순 버튼보다 `재사용 가능한 instruction package`에 가깝다.
- 따라서 진짜 차별점은 agent 수보다 `어떻게 role과 capability를 패키징하느냐`에 있다.
- 코드 기준으로는 skill만 있는 것이 아니라 `adapter`와 `plugin`이 같이 존재한다.
- adapter는 runtime bridge이고, plugin은 UI slot / job / event / tool / action / data endpoint를 추가하는 확장 레이어다.
- plugin worker는 `ctx.events`, `ctx.jobs`, `ctx.data`, `ctx.actions`, `ctx.tools`, `ctx.state`, `ctx.agents` 같은 host API를 capability-gated로 받는다.

## Borrowed From `paperclip`

- 상위 orchestrator가 하위 역할을 분배하는 구조
- `승인 필요한 일`과 `자동 실행 가능한 일`을 나누는 governance
- role-based delegation
- portable skill / template 발상
- runtime adapter를 분리해 모델/에이전트 교체 비용을 낮추는 구조
- plugin을 통해 domain-specific UI와 job을 붙이는 구조

## Transformed For Korean Academy Operations

- 미국식 회사 role은 교육 운영 role로 바뀌어야 한다.
- 살아남을 가능성이 있는 role 범주는 아래 정도다.
  - Complaint / Parent Communication
  - Retention / Re-enrollment
  - Instructor Scheduling
  - Student Summary / Counseling
  - Compliance / Policy
  - Finance / Refund
  - Vehicle / Facility
- 다만 이것을 최종 feature list나 final agent list로 잠그면 안 된다.
- `운영자 모드`와 `교사 모드`는 살아남는 role이 다를 가능성이 높다.

## `k-skill` As Differentiator

- 차별점은 범용 agent보다 `한국형 운영 업무를 skill 단위로 패키징`하는 데 있을 수 있다.
- agent는 범용이더라도 skill은 한국형 규칙과 맥락을 담을 수 있다.
- 유력한 skill 범주는 다음과 같다.
  - 학부모 민원 응대 규칙
  - 재등록/이탈 징후 읽기
  - 강사 스케줄/보강 조율
  - 환불/정산/약관 계산
  - 학원법/평생교육/체육시설/운전면허 규정 체크
- 이 경우 제품은 `운영 OS`, 차별점은 `k-skill registry`가 된다.
- 다만 실제 구현 단위는 `skill`만으로 부족할 수 있다.
- 어떤 것은 `prompt-like skill`로 충분하지만, 어떤 것은 `plugin-like pack`이 더 맞다.
  - 예: 학부모 민원 응대 가이드는 skill
  - 예: 차량 운행 기록 대시보드 + 점검 알림은 plugin/domain pack

## Not Suitable / Discard

- CEO/CTO/CMO 같은 실리콘밸리 회사 role naming
- agent를 너무 많이 두어 orchestration 복잡도만 키우는 것
- skill을 단순 prompt preset 정도로만 보는 것
- skill marketplace를 지금 단계에서 제품 본체로 다루는 것

## Recommended Local Analysis Update

- 로컬 파일 구조는 `agents/`와 `skills/`를 분리해 보는 편이 맞다.
- 다만 skill은 role 중심보다 `workflow`와 `policy` 중심 taxonomy가 더 맞을 가능성이 있다.
- 추가로 `adapters/`, `domain-packs/`, `plugins/` 사고틀도 같이 가져가야 한다.
- 그래야 “학원 운영용 AI 시스템”이 단순 prompt collection으로 축소되지 않는다.

## Open Questions

- 한국형 학원 운영에서 필요한 최소 agent는 무엇인가
- `k-skill` 같은 배포 가능한 skill 구조를 어떻게 붙일 수 있는가
- 법무/세무/차량/민원 등 특화 skill을 어떤 단위로 나눌 것인가
- `agent`와 `skill` 중 어느 쪽을 제품 차별점의 중심에 둘지 아직 미정이다
