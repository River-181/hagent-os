---
tags:
  - area/wiki
  - type/guide
  - status/active
date: 2026-04-08
up: "[[_06_LLM위키_MOC]]"
status: active
aliases:
  - llm-wiki-schema
---
# LLM Wiki Schema

## 목적

이 문서는 `06_LLM위키/`를 LLM이 어떻게 유지해야 하는지 규정한다.

## 3-Layer 원칙

1. raw sources = `assets/`
2. persistent wiki = `06_LLM위키/`
3. report-grade evidence = `04_증빙/`

## 규칙

- raw source는 수정하지 않는다.
- 새 source를 읽으면 summary와 관련 page를 `06_LLM위키/`에 반영한다.
- `index.md`는 매 ingest 후 갱신한다.
- `log.md`는 ingest/query/lint 때 append한다.
- 가치 있는 synthesis만 `[[master-evidence-ledger]]`에 승격한다.
- 모르는 에이전트는 raw source보다 먼저 `index.md`, `overview.md`, 최근 `log.md`를 읽는다.
- 모든 note frontmatter에는 최소 `tags`, `date`, `up`, `status`가 있어야 한다.
- 같은 vault 안의 연결은 가능하면 markdown link보다 `[[wikilink]]`를 우선한다.
- 시점 의존 note는 제목 또는 첫 문단에 `as of` 날짜를 명시한다.

## Page Types

- `entities/` — 기관, 사람, 서비스
- `concepts/` — 개념, 심사 문법, 패턴
- `problems/` — 문제 영역
- `theses/` — 가설, 주장, 전략 명제
- `comparisons/` — 비교 분석
- `sources/` — source summary

## Operations

### Cold Start

- read `[[.agent/AGENTS]]`
- read `[[workspace-contract]]`
- read `[[workspace-atlas]]`
- read `index.md`
- read `overview.md`
- read recent `log.md`
- only then decide whether raw source is needed

### Ingest

- read raw source
- write/update source summary
- update related entity/concept/problem page
- update `index.md`
- append `log.md`

### Query

- read `index.md` first
- read relevant pages
- answer with page references
- if answer is durable, save it as a new wiki page
- descend to raw source only when page is missing, weak, contradictory, or high-stakes

### Lint

- orphan pages
- duplicate topics
- contradictions
- stale synthesis
- missing cross-links
- missing source trace

## Agent Writeback Rules

- 반복 재사용 가능한 정리는 위키에 writeback 한다.
- 단순 세션 로그는 위키에 쓰지 않는다.
- report-grade material은 위키 반영 후 `[[master-evidence-ledger]]`에 승격한다.

## Naming

- file names can be Korean
- one topic per page
- summary first, evidence later
- current-state note는 “개념”이 아니라 “현재 shipped/verified 기준”을 먼저 쓴다
