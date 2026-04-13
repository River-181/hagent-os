---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[_02_전략_MOC]]"
aliases:
  - research-results-root
---
# research-results

> 전략 리서치 결과의 정본 폴더. 현재 canonical root는 `02_전략/04_research/`다.

## 진입점

- [[02_전략/04_research/00_hub/research-hub]] — 전체 리서치 작업 허브
- [[02_전략/04_research/00_hub/research-folder-guide]] — 현재 구조와 읽는 순서
- [[02_전략/04_research/00_hub/research-log]] — 날짜별 리서치 로그

## 구조

- `00_hub/` — 허브, 가이드, 프롬프트, 로그
- `10_reports/` — 핵심 합성 보고서
- `20_domain-analysis/` — 한국 학원 운영 도메인 분석
- `30_external-ai/` — `gemini`, `grok`, `perplexity` raw 결과

## 정리 원칙

- 루트에는 새 raw 파일을 두지 않는다.
- 새 외부 AI 결과는 `30_external-ai/<tool>/`로 넣는다.
- 제품 판단에 직접 쓰는 합성만 `10_reports/`로 올린다.
- 학원 운영 지식 정리는 `20_domain-analysis/`에서 누적한다.
- 파일명이나 위치를 바꾸면 `research-hub`, `research-folder-guide`, `research-log` 링크도 같이 갱신한다.
