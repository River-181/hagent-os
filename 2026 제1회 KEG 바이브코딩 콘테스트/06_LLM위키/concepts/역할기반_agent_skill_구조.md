---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-12
up: "[[index]]"
status: active
aliases:
  - role_based_agent_skill_structure
  - agent_skill_architecture
---
# 역할기반 agent skill 구조

## Summary First

제품 차별점은 agent 수가 아니라 역할과 capability를 어떻게 패키징하느냐다. 이 프로젝트는 범용 모델 위에 `role-based agent`, `k-skill`, `plugin/domain pack`, `adapter`를 나눠 얹는 구조로 봐야 한다.

## Layer Split

- agent:
  - 역할을 분담받아 실행하는 운영 단위
- skill:
  - 재사용 가능한 instruction package
- plugin/domain pack:
  - UI, job, event, tool, data endpoint까지 확장하는 제품 단위
- adapter:
  - runtime bridge

## Korean Education Translation

- 살아남을 가능성이 높은 role:
  - Complaint / Parent Communication
  - Retention / Re-enrollment
  - Instructor Scheduling
  - Student Summary / Counseling
  - Compliance / Policy
  - Finance / Refund
  - Vehicle / Facility
- 하지만 이것을 바로 final feature list로 잠그면 안 된다.
- `운영자 모드`와 `교사 모드`는 필요한 role 구성이 다를 수 있다.

## k-skill Reading

- 범용 agent보다 한국형 운영 업무를 skill 단위로 패키징하는 것이 차별점이 될 수 있다.
- 유력한 skill 범주:
  - 학부모 민원 응대 규칙
  - 재등록/이탈 징후 읽기
  - 강사 스케줄/보강 조율
  - 환불/정산/약관 계산
  - 학원법/체육시설/운전면허 규정 체크

## Skill Vs Pack

- prompt-like skill로 충분한 것:
  - 민원 응대 가이드
  - 상담 초안
  - 학생 요약
- plugin/domain pack이 더 맞는 것:
  - 차량 운행 기록 대시보드
  - 점검 알림
  - 정산/환불 workflow
  - 승인 중심 운영 보드

## What Not To Do

- CEO/CTO 같은 회사 role naming을 그대로 가져오기
- agent를 너무 많이 두어 orchestration만 복잡하게 만들기
- skill을 prompt preset 정도로 축소하기
- marketplace를 제품 본체처럼 다루기

## Architecture Consequence

- `agents/`와 `skills/`를 분리해 본다.
- 추가로 `adapters/`, `plugins/`, `domain-packs/` 사고틀을 같이 가져간다.
- 그래야 제품이 prompt collection이 아니라 운영 OS처럼 보인다.

## Current Readback

- 현재 결정 정본은 [[k-skill_생태계_결정_내역]]이다.
- 실제 shipped snapshot은 [[HagentOS_현재_아키텍처_상태]]에서 확인한다.

## Linked Sources

- [[03-agent-skill-structure]]
- [[학원_운영_k-skill_및_MCP_후보_맵]]

## Related Pages

- [[운영_Control_Plane_모델]]
- [[한국_교육_도메인_적합성_갭]]
- [[Paperclip_vs_HagentOS_설계_갭]]
- [[k-skill_생태계_결정_내역]]
