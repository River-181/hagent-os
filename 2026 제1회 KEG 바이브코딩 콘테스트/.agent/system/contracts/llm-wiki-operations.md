---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-08
up: "[[.agent/system/contracts/workspace-contract]]"
aliases:
  - llm-wiki-operations
  - llm위키운영규칙
---
# LLM Wiki Operations

> 이 문서는 `06_LLM위키/`를 모르는 AI 에이전트도 동일한 방식으로 읽고, 검색하고, 갱신하게 만드는 운영 계약이다.

## 목적

- 대화 맥락이 없는 에이전트도 `06_LLM위키/`만 읽고 현재 프로젝트의 지속 지식을 회수한다.
- 에이전트가 같은 raw source를 반복해서 처음부터 읽는 비용을 줄인다.
- durable synthesis는 위키에 쌓고, report-grade material만 `[[master-evidence-ledger]]`로 승격한다.

## 역할 구분

1. `assets/` = raw source, immutable
2. `06_LLM위키/` = persistent synthesis, query first
3. `04_증빙/` = AI report material, evidence only

## Cold Start Protocol

새로운 AI 에이전트는 프로젝트에 들어오면 아래 순서를 따른다.

1. `[[.agent/AGENTS]]`
2. `[[workspace-contract]]`
3. `[[memory-evidence-policy]]`
4. `[[workspace-atlas]]`
5. `[[06_LLM위키/index]]`
6. `[[06_LLM위키/overview]]`
7. `[[06_LLM위키/log]]`의 최근 항목
8. 필요 시 관련 page만 추가 읽기

규칙:
- raw source부터 읽지 않는다.
- 먼저 위키에서 현재 합성된 맥락을 회수한다.
- 위키에 답이 없거나 충돌이 있거나 freshness가 의심될 때만 raw source로 내려간다.

## Query Protocol

질문을 받으면 아래 순서로 처리한다.

1. `index.md`에서 관련 주제를 찾는다.
2. 관련 `entity/concept/problem/thesis/comparison/source` page를 읽는다.
3. 위키 기준으로 1차 답을 구성한다.
4. 아래 조건이면 raw source를 재검증한다.

raw source 재검증 조건:
- 위키 page가 비어 있거나 너무 얕다.
- 둘 이상의 page가 서로 충돌한다.
- page에 근거 링크가 없다.
- 사용자가 최신성 또는 정확성 검증을 요구한다.
- answer가 중요한 의사결정에 직접 영향을 준다.

답변 규칙:
- 먼저 위키를 참조했다는 점을 드러낸다.
- 위키 page와 raw source를 구분해서 인용한다.
- durable finding이면 답변 후 위키를 갱신한다.

## Ingest Protocol

새 source를 읽었거나 새 insight가 생기면 아래 순서로 반영한다.

0. 신규 source candidate를 넓게 찾는 단계면 `.agent/skills/wiki-candidate-harvest/SKILL.md`와 `scripts/scan_candidates.py`를 먼저 사용한다.
1. raw source 위치 확인
2. `sources/` summary 생성 또는 갱신
3. 관련 `entities/`, `concepts/`, `problems/`, `theses/`, `comparisons/` page 갱신
4. `index.md`에 topic link 반영
5. `log.md`에 ingest entry append
6. report-grade라면 `[[master-evidence-ledger]]`에 승격

규칙:
- 하나의 page는 하나의 topic만 다룬다.
- raw source 문장 복붙이 아니라 synthesis를 적는다.
- page 상단에는 항상 "무엇이 확정 사실이고, 무엇이 해석인지"가 드러나야 한다.
- 이미 위키에 같은 축이 있으면 새 note를 만들기보다 기존 note 보강을 먼저 검토한다.
- candidate scan 결과는 필요하면 `06_LLM위키/tasks/` 아래 backlog note로 남긴다.

## Writeback Protocol

에이전트가 작업 중 새로 정리한 durable knowledge는 대화 안에서만 끝내지 않는다.

다음에 해당하면 위키 writeback 대상이다.
- 이후 다른 에이전트가 재사용할 가능성이 높다.
- 전략/문제정의/심사 문법에 영향을 준다.
- 반복 검색 비용을 줄여준다.
- raw source 여러 개를 합성한 결과다.

다음에 해당하면 위키가 아니라 증빙만 쓴다.
- 단순 작업 로그
- 세션 감상
- 리포트용 이벤트 기록
- 일회성 진행 메모

## Lint Protocol

위키를 수정한 에이전트는 아래를 점검한다.

- orphan page가 없는가
- 중복 page가 없는가
- `index.md`에서 찾을 수 있는가
- raw source 근거가 끊기지 않았는가
- 오래된 synthesis가 있는가

최소 lint 행동:
- 새 page 생성 시 `index.md` link 추가
- `log.md` append
- 관련 page 1개 이상 cross-link

## Escalation Rules

아래 상황이면 위키를 신뢰하지 말고 사람 또는 raw source 검증으로 올린다.

- 위키와 raw source가 충돌한다
- page가 오래되어 현재 대회 상황과 안 맞을 수 있다
- 심사 전략을 바꿀 정도의 중요한 결론이다
- 외부 최신 정보 의존도가 높다

## Done Definition

LLM wiki 관련 작업은 아래를 만족해야 완료다.

- 관련 page 또는 source summary가 갱신되었다
- `index.md`에서 해당 topic을 찾을 수 있다
- `log.md`에 append 되었다
- report-grade 내용이면 `[[master-evidence-ledger]]`에도 남았다
