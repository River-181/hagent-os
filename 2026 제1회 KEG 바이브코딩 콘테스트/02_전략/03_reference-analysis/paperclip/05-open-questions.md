---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# Open Questions

## Facts Already Strong Enough

- `paperclip`에서 가져와야 하는 핵심은 `control plane`, `org chart`, `approval`, `goal alignment`, `task trace`, `budget governance`다.
- 버려야 하는 핵심은 `zero-human startup` 자체 서사와 미국 SaaS 회사형 role naming이다.
- 한국 교육 운영으로 바꾸면 `민원`, `이탈`, `강사 workload`, `정산/환불`, `컴플라이언스`가 핵심 도메인 축으로 보인다.
- 실제 코드 기준으로도 `plugin`, `adapter`, `company-scoped API`, `local_trusted deployment`가 중요 구조임이 확인됐다.

## Still Unclear Before Local Directory Lock-In

- 첫 중심 사용자군을 `학원 운영자`와 `담임/교사` 중 어디에 둘지
- `entity model`을 지점/반/학생/학부모/강사 중심으로 어떻게 자를지
- `민원`을 conversation, ticket, case 중 어떤 개념으로 고정할지
- `k-skill` taxonomy를 role 중심으로 할지 workflow 중심으로 할지
- 공통 코어와 도메인 확장 pack 경계를 어디에 둘지
- `local_trusted`급 로컬 배포를 초기부터 제품 개성으로 잡을지
- `plugin/domain pack` 구조를 초기에 설계할지, 나중에 붙일지

## Borrowed From `paperclip`

- 운영 보드 중심 진입
- approval이 있는 orchestration
- 역할 기반 task 분해

## Transformed For Korean Academy Operations

- 운영자/교사별 entrypoint 분리
- 민원/상담/재등록/강사 조율 중심 context model
- `k-skill` 기반 domain pack 가능성

## Not Suitable / Discard

- 회사 운영 은유를 그대로 쓰는 것
- 초반부터 너무 많은 agent를 확정하는 것
- 제품 구조를 지금 단계에서 화면/기능 기준으로 잠그는 것

## Recommended Local Analysis File Updates

- `01-ui-entrypoints.md`
  - 운영자 첫 진입과 교사 첫 진입을 따로 분석
- `02-data-context-model.md`
  - entity / case / policy / log 구분을 더 명확히 분석
- `03-agent-skill-structure.md`
  - `k-skill` taxonomy 초안 필요
- `04-k-education-fit-gaps.md`
  - 학원 유형별 domain pack 가능성 추가 검토 필요
- `06-runtime-control-plane-map.md`
  - local-first runtime과 authenticated mode를 우리 제품에 어떻게 번역할지 검토
- `07-plugin-adapter-extensibility.md`
  - core / pack / skill / runtime 경계를 더 선명하게 검토

## Top 5 Domain Questions To Research Next

1. 한국 학원 원장이 실제로 가장 자주 깨지는 운영 흐름은 무엇인가
2. 학부모 `상담`과 `민원`은 현장에서 어떻게 구분되는가
3. 강사 스케줄링은 시간표 문제인가, 아니면 workload/이탈/성과 문제인가
4. 보습/IT, 태권도, 운전면허, 피트니스 사이의 공통 코어는 어디까지인가
5. 규정·정산·환불·차량·시설은 core model인가, 후속 extension인가

## 아직 미정인 것

- 첫 페르소나를 운영자로 할지 교사/강사로 할지
- 첫 핵심 업무를 민원/상담/이탈/강사관리 중 어디에 둘지
- 어떤 로컬 디렉토리 구조가 실제 구현과 분석에 모두 적합한지
- `paperclip`에서 무엇을 빌리고 무엇을 버릴지
- `k-skill` 구조를 제품에 어떻게 녹일지
- plugin/pack 확장을 처음부터 고려할지
- 로컬 설치와 데이터 자산화 경험을 MVP 메시지에 포함할지
