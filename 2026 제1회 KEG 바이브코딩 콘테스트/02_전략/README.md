---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[_02_전략_MOC]]"
aliases:
  - strategy-root
---
# 02_전략

> 전략 문서의 작업 루트. `02_전략/`는 이제 index 역할만 맡고, 실제 문서는 바깥의 주제별 top-level 폴더로 재배치한다.

## 이번 정리 원칙

- `02_전략/` 아래에 전략 문서를 계속 쌓지 않는다.
- 실제 내용은 `02_전략/01_foundation/`, `02_전략/02_problem-framing/`, `02_전략/03_reference-analysis/`, `02_전략/04_research/`, `02_전략/05_decisions/`, `02_전략/06_tasks/`, `02_전략/98_archive/`로 분리한다.
- 문서명은 `숫자 prefix + kebab-case`로 읽는 순서를 드러낸다.
- 링크 안정성을 위해 note 이동과 rename은 Obsidian CLI로 처리했다.

## 현재 구조

- `02_전략/01_foundation/` — 대회 해석, 계보, 심사 전략의 출발점
  - [[01-vibe-contest-master-playbook-v0-1]]
  - [[02-계보-포지셔닝-분석]]
  - [[03-기관-분석-및-심사-전략]]
- `02_전략/02_problem-framing/` — 문제 정의와 후보 압축의 기준 문서
  - [[01-bottom-up-academy-research-source]]
  - [[02-problem-definition-source]]
  - [[03-problem-bank]]
  - [[04-problem-scorecard]]
  - [[05-paperclip-교육-아이디어-통합정리]]
- `02_전략/03_reference-analysis/` — 레퍼런스 제품/구조 해체 분석
  - [[02_전략/03_reference-analysis/paperclip/README]]
- `02_전략/04_research/` — 리서치 허브, 프롬프트, 보고서, 도메인 분석, 외부 AI raw
  - [[01-notebooklm-bottom-up-prompts]]
  - [[02-claude-problem-definition-prompt]]
  - [[03-paperclip-research-prompt]]
- `02_전략/05_decisions/` — 베팅, 범위, 데모, 리스크 의사결정
  - [[01-decision-sprint]]
  - [[02-bet-memo]]
  - [[03-scope-board]]
  - [[04-demo-critical-path]]
  - [[05-risk-register]]
- `02_전략/06_tasks/` — 전략 태스크
  - [[01-리서치-공간-구축-및-초기-계획]]
  - [[02-문제-후보-3개-축소]]
  - [[03-최종-문제-1개-확정]]
- `02_전략/98_archive/` — 보관용 문서와 캡처

## 권장 읽는 순서

1. [[_02_전략_MOC]]
2. [[01-vibe-contest-master-playbook-v0-1]]
3. [[02-problem-definition-source]]
4. [[02_전략/04_research/00_hub/research-hub]]
5. [[01-decision-sprint]]

## 빠른 가이드

- 문제를 다시 잡아야 할 때: `02_전략/01_foundation/` → `02_전략/02_problem-framing/`
- 리서치 질문을 던질 때: `02_전략/04_research/01_prompts/` → `02_전략/04_research/`
- 제품 방향을 결정할 때: `02_전략/05_decisions/`
- reference product를 흡수할 때: `02_전략/03_reference-analysis/`
- 지금 무엇을 해야 하는지 볼 때: `02_전략/06_tasks/`
