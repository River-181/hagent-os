---
tags:
  - area/wiki
  - type/guide
  - status/active
date: 2026-04-08
up: "[[_06_LLM위키_MOC]]"
aliases:
  - llm-wiki-adaptation
  - karpathy-llm-wiki
---
# Karpathy LLM Wiki 적용안

> 원문: Karpathy, "LLM Wiki"
> 목표: 현재 KEG 워크스페이스에 `raw sources -> persistent wiki -> schema` 구조를 삽입하되, 기존 Obsidian/MOC/증빙 운영과 충돌하지 않게 한다.

## 결론

이 워크스페이스에는 Karpathy 방식이 잘 맞는다.
특히 지금처럼 `리서치 -> 문제 정의 -> 전략 합성 -> 제품 방향`이 매일 바뀌는 상황에서, 단순 RAG보다 **LLM이 직접 유지하는 지속 위키**가 더 유리하다.

다만 현재 워크스페이스에는 이미 아래 두 레이어가 있다.

- 운영 레이어: `.agent/system/`, `_system/`, `_MOC/`
- 증빙 레이어: `04_증빙/`

따라서 LLM Wiki는 이 둘과 섞지 말고 **새 전용 레이어**로 넣어야 한다.

## Karpathy 방식 그대로 유지할 부분

Karpathy 원문의 핵심은 세 가지다.

1. `raw sources`는 immutable source of truth
2. `wiki`는 LLM이 유지하는 persistent, interlinked markdown layer
3. `schema`는 LLM이 wiki를 어떻게 관리할지 규정하는 운영 문서

이 세 가지는 그대로 유지해야 한다.

## 이 워크스페이스에 맞춘 매핑

### 1. Raw Sources

Karpathy의 raw sources는 현재 이 저장소에서 아래가 된다.

- `assets/originals/`
- `assets/pdf/`
- 필요 시 `assets/screenshots/`
- 대회 공식 자료 원본
- 외부 기사/리서치 클리핑 원문

원칙:
- raw는 수정하지 않는다
- 요약/정리/비교는 raw가 아니라 wiki에 쓴다

### 2. Wiki Layer

새 전용 디렉토리:

- `06_LLM위키/`

이 레이어는 LLM이 주로 쓰는 persistent knowledge layer다.

여기에 들어갈 것:
- 인물/기관/entity page
- 개념/concept page
- 문제/problem page
- 가설/thesis page
- 비교/comparison page
- source summary
- evolving synthesis

이 레이어는 `04_증빙`와 다르다.

- `04_증빙` = AI 리포트 재료 원장
- `06_LLM위키` = 리서치와 전략을 누적하는 지식 위키

### 3. Schema Layer

Karpathy가 말한 schema는 지금 구조상 아래 두 군데에 걸쳐 둔다.

- `.agent/AGENTS.md`
- `06_LLM위키/schema.md`

역할 분리:
- `AGENTS.md` = 에이전트 공통 시작 규칙
- `06_LLM위키/schema.md` = LLM Wiki 전용 유지보수 규칙

## 왜 별도 레이어가 필요한가

지금 구조에서 그냥 `02_전략/` 안에 계속 분석 note만 쌓으면:

- 중복 요약이 늘고
- 같은 기관/문제/개념이 여러 note에 흩어지고
- 질문할 때마다 다시 합성하게 된다

Karpathy 방식은 이걸 막는다.

즉:
- raw는 raw로 둔다
- 전략 문서는 결과물로 남긴다
- 그 사이에 LLM-maintained wiki가 축적된다

## 추천 구조

```text
06_LLM위키/
├── index.md
├── log.md
├── schema.md
├── overview.md
├── entities/
├── concepts/
├── problems/
├── theses/
├── comparisons/
└── sources/
```

### 파일 역할

- `index.md`
  - 전체 위키 카탈로그
  - Karpathy 방식 유지
- `log.md`
  - ingest / query / lint append-only log
  - chrono log
- `schema.md`
  - naming, ingest, query, lint 규칙
- `overview.md`
  - 현재 위키의 가장 높은 수준 synthesis

## 이 워크스페이스에 맞는 ingest 흐름

```text
source 추가
-> raw source 위치 확인
-> LLM이 source summary 생성
-> 관련 entity/concept/problem page 갱신
-> index.md 갱신
-> log.md append
-> 리포트 가치가 있으면 master-evidence-ledger에도 1줄 반영
```

핵심:
- 모든 ingest를 `04_증빙`로 직접 쓰지 않는다
- 먼저 `06_LLM위키`를 갱신
- 그 중 리포트 가치가 있는 변화만 `master-evidence-ledger`에 승격

## Query 흐름

Karpathy 원문대로 좋은 질의 결과는 wiki에 다시 편입한다.

예:
- “기관이 좋아할 문제 정의는 무엇인가?”
- “이 대회와 비슷한 대회들의 공통 패턴은?”
- “우리 팀 역량에 맞는 문제 영역은?”

이런 답변은 chat에서 소모시키지 말고:

- `comparisons/`
- `theses/`
- `problems/`

중 하나의 page로 저장하는 것이 맞다.

## Lint 흐름

Karpathy의 lint는 이 프로젝트에서 특히 중요하다.

주기적으로 LLM에게 아래를 시키면 좋다.

- orphan page 찾기
- 중복 개념 page 찾기
- 모순되는 claim 찾기
- 최신 source가 반영 안 된 synthesis 찾기
- problem page는 있는데 evidence가 약한 것 찾기
- evidence는 있는데 wiki에 반영 안 된 것 찾기

이건 대회 후반 갈수록 더 중요해진다.

## 현재 워크스페이스와의 관계

### 유지

- `_MOC/` 중앙 MOC 체계 유지
- `_system/` 도구/대시보드/셋업 체계 유지
- `04_증빙` 단일 원장 체계 유지

### 추가

- `06_LLM위키/` persistent wiki layer 추가

### 금지

- `04_증빙`를 wiki처럼 쓰지 않는다
- `02_전략/`의 결과 문서를 raw source처럼 취급하지 않는다
- raw source를 요약 note로 덮어쓰지 않는다

## 권장 운영 규칙

1. 새 source가 들어오면 raw에 저장
2. LLM은 반드시 `06_LLM위키/`를 먼저 갱신
3. `index.md`, `log.md`는 매번 갱신
4. 중요한 변화만 `master-evidence-ledger` 승격
5. 질의 결과 중 가치 있는 것은 wiki page로 저장
6. 하루 1회 lint 또는 major ingest 후 lint

## 이 방식이 특히 유리한 부분

- 대회 기관 분석 누적
- 유사 대회 패턴 누적
- 교육 시장 pain point 축적
- problem-solution fit 비교
- 팀 역량과 문제 영역의 정합성 판단
- 최종 AI 리포트에서 “우리가 어떻게 점점 정교해졌는지” 설명

## 추천 적용 순서

### Phase 1

- `06_LLM위키/` 골격 생성
- `index.md`, `log.md`, `schema.md`, `overview.md` 작성

### Phase 2

- 현재 전략 문서 3~4개를 첫 wiki ingest 대상으로 삼기
- 기관/계보/문제 영역 page 생성

### Phase 3

- 새 리서치 source는 wiki-first로 처리
- 가치 있는 질의 결과를 wiki page로 저장

### Phase 4

- lint 리듬 도입
- 중복과 모순 정리

## 내 권고

이 프로젝트에서는 Karpathy 방식을 **그대로 유지하되 전용 layer로 분리**하는 것이 최선이다.

좋은 구현은:
- `06_LLM위키`를 별도 knowledge compiler layer로 두고
- `04_증빙`은 리포트 원장으로 남기고
- `.agent/AGENTS.md` + `06_LLM위키/schema.md`가 유지 규칙을 담당하는 구조다.

즉, 이 워크스페이스에선 다음 한 줄이 핵심이다.

> `assets`는 원본, `06_LLM위키`는 compounding knowledge, `04_증빙`은 report-grade evidence.
