---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[02_전략/04_research/00_hub/research-hub]]"
aliases:
  - research-external-ai-archive
---
# external-ai archive

> 외부 AI 원문 결과 보관 구역. 원문 보존을 우선한다.

## 구조

- `gemini/`
- `grok/`
- `perplexity/`

## 운영 원칙

- 이 폴더의 개별 raw 파일은 원문 보존을 위해 frontmatter나 본문 구조를 강제로 정규화하지 않는다.
- 제품 판단에 직접 쓰는 내용은 `10_reports/`나 `20_domain-analysis/`로 다시 합성한다.
- 파일명 변경이나 이동이 생기면 `00_hub/research-hub.md`, `00_hub/research-folder-guide.md`, `00_hub/research-log.md`의 링크를 같이 갱신한다.
