---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# K-Education Fit Gaps

## Facts

- `paperclip`은 `zero-human company`를 위한 범용 business orchestration에 가깝다.
- 우리 문제는 `한국 교육 운영`이며, 학원/교사/학부모/학생 관계와 규정이 훨씬 강하게 얽혀 있다.
- 따라서 translation unit은 기능보다 `도메인 문맥`이다.
- 코드 기준으로도 `paperclip`은 `multi-company`, `cost control`, `board governance`, `plugin install`, `adapter reload` 같은 범용 운영 기능을 넓게 가진다.
- 반면 한국형 학원 운영은 범용 회사 운영보다 훨씬 관계적이고 증빙/규정 의존적이다.

## Borrowed From `paperclip`

- 운영 시스템을 `control plane`으로 보는 시각
- org chart, governance, budget, task trace, approval 흐름
- `runtime + control plane` 이원 구조

## Transformed For Korean Academy Operations

- `company operations`를 `academy/class operations`로 번역
- `mission growth`를 `운영 안정 + 교육 품질 + 유지율 + 분쟁 관리`로 번역
- company template를 `학원 유형별 운영 pack` 또는 `k-skill bundle`로 번역
- `multi-company portfolio`를 그대로 따라가기보다 `지점 운영` 또는 `원장/실장/강사 다중 역할`로 번역
- `board claim / auth mode` 같은 구조는 향후 학원 내 다중 사용자 협업과 맞닿을 수 있다.

## Korean Academy-Specific Domains Emerging From Research

### parent complaints

- 단순 FAQ가 아니라 감정 소모, 야간 연락, 반복 질문, 증빙 보존 이슈가 있다.
- `민원`과 `상담`을 구분해야 할 가능성이 높다.

### student retention / re-enrollment

- 사교육 운영자에게는 매출과 직결된다.
- 출결, 성과 설명, 상담 이력, 시험 일정과 연결된다.

### instructor scheduling and workload

- 강사 이탈은 반 운영 품질과 환불/민원까지 연쇄 영향을 준다.
- 스케줄은 보강, 반 연속성, 강사 피로도와 같이 봐야 한다.

### legal / tax / finance / vehicle / facility operations

- 한국 학원은 유형에 따라 적용 법과 운영 이슈가 다르다.
- 보습/IT 학원, 태권도/피트니스, 운전면허 학원은 운영 OS가 다르게 생긴다.
- 따라서 단일 제품 구조보다 `공통 코어 + 도메인 pack` 가능성이 크다.

## Not Suitable / Discard

- `zero-human` 서사를 한국 교육 현장에 그대로 들이대는 것
- 스타트업 성장 서사를 첫 제품 언어로 가져오는 것
- 미국 SaaS 회사 기준 agent taxonomy
- 도메인 차이를 무시한 단일 universal workflow

## Biggest Fit Gaps

- 한국 학원은 학부모와 강사의 관계가 제품 UX에 직접 반영되어야 한다.
- 공교육은 규정/개인정보/증빙이 강해 `assistant`가 아니라 `compliance-aware system`이 필요하다.
- 사교육은 매출/환불/재등록이 강해 `operations OS`로 보여야 한다.
- 도메인별 차이 때문에 로컬 디렉토리와 product structure를 너무 일찍 잠그면 안 된다.
- `paperclip`의 `goal` 중심 구조는 한국 학원에서는 `운영 case` 중심 구조로 일부 이동할 가능성이 높다.
- `cost control`은 교육 운영에서는 `환불 리스크`, `민원 비용`, `강사 workload`, `이탈 비용`까지 넓어질 수 있다.

## Open Questions

- 첫 MVP를 보습/IT 학원 기준으로 볼지, 더 일반적인 academy operator 기준으로 볼지
- 공교육 확장 가능성은 분석 레벨에 두고 제품 구조는 사교육 중심으로 갈지
- 차량/시설/세무 같은 무거운 운영 기능을 core model에 넣을지 domain extension으로 뺄지
- `원본 데이터 통제`와 `AI 자유도`를 제품 문구로만 둘지, 실제 local deployment 경험까지 같이 설계할지
