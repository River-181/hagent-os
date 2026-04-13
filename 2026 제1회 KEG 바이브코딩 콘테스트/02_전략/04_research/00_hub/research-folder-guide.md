---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[02_전략/04_research/00_hub/research-hub]]"
aliases:
  - research-folder-guide
  - 리서치폴더가이드
---
# 리서치 폴더 가이드

> `02_전략/04_research/` 하나만 리서치 정본으로 사용한다.

## 현재 구조 원칙

- `00_hub/`: 허브, 계획, 프롬프트, 로그, 가이드
- `10_reports/`: 핵심 합성 보고서와 NotebookLM 산출물
- `20_domain-analysis/`: 제품 구조 판단용 도메인 분석 노트
- `30_external-ai/`: 외부 AI raw 결과 아카이브
  - 개별 raw 파일은 원문 보존을 위해 frontmatter가 없을 수 있다.

## 무엇이 정본인가

- 경로와 읽는 순서 기준 정본: 이 문서
- 리서치 작업 진입점 정본: `00_hub/research-hub.md`
- 최종 합성 정본: `10_reports/`
- 한국 학원 운영 지식 정본: `20_domain-analysis/`
- 도구별 원시 결과 정본: `30_external-ai/<tool>/`

## 읽는 순서

1. [research-hub.md](/Users/river/workspace/active/hagent-os/2026%20제1회%20KEG%20바이브코딩%20콘테스트/02_전략/04_research/00_hub/research-hub.md)
2. [R-008_NLM_바텀업학원리서치합성.md](/Users/river/workspace/active/hagent-os/2026%20제1회%20KEG%20바이브코딩%20콘테스트/02_전략/04_research/10_reports/R-008_NLM_바텀업학원리서치합성.md)
3. [R-009_NLM_딥리서치_및_스튜디오보고서.md](/Users/river/workspace/active/hagent-os/2026%20제1회%20KEG%20바이브코딩%20콘테스트/02_전략/04_research/10_reports/R-009_NLM_딥리서치_및_스튜디오보고서.md)
4. [domain-research-hub.md](/Users/river/workspace/active/hagent-os/2026%20제1회%20KEG%20바이브코딩%20콘테스트/02_전략/04_research/20_domain-analysis/domain-research-hub.md)

## 정리 원칙

- 모든 리서치는 `02_전략/04_research/` 아래에서 끝낸다.
- `hub / reports / domain-analysis / external-ai` 4층만 유지한다.
- 새 raw 결과는 `30_external-ai/<tool>/`로 넣는다.
- 새 합성 문서는 `10_reports/`, 새 도메인 노트는 `20_domain-analysis/`로 넣는다.
- raw 결과 파일명을 바꿀 때는 허브 문서의 링크도 함께 바꾼다.
- 같은 의미의 새 결과가 나오면 기존 raw를 지우지 말고 `30_external-ai/`에 보관하고, `10_reports/`에서 최신 합성만 갱신한다.
- `30_external-ai/`는 archive 성격이므로 원문 텍스트를 억지로 정규화하지 않는다.
