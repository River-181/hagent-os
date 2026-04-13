---
name: wiki-candidate-harvest
description: Find and prioritize project files that should be promoted into the KEG workspace LLM wiki. Use when scanning the repo for durable knowledge candidates, turning raw strategy/product/submission documents into wiki backlog, or refreshing the list of notes that deserve `concepts/`, `problems/`, `theses/`, `comparisons/`, `entities/`, or `sources/` pages.
---

# Wiki Candidate Harvest

## Overview

이 스킬은 이 저장소에서 `06_LLM위키/`로 승격할 만한 문서를 찾고, 왜 후보인지 설명 가능한 backlog로 정리할 때 사용한다.

## Read First

1. `.agent/AGENTS.md`
2. `.agent/system/contracts/llm-wiki-operations.md`
3. `.agent/skills/obsidian-workspace/SKILL.md`
4. `references/candidate-signals.md`

## Workflow

1. `06_LLM위키/index.md`, `06_LLM위키/overview.md`, `06_LLM위키/log.md`를 먼저 읽어 이미 승격된 축을 확인한다.
2. `python3 scripts/scan_candidates.py --root <repo>`를 실행해 후보 파일과 추천 wiki type을 뽑는다.
3. 상위 후보를 실제로 열어 다음 중 무엇으로 승격할지 정한다.
   - `concept`
   - `problem`
   - `thesis`
   - `comparison`
   - `entity`
   - `source`
4. 결과를 `06_LLM위키/tasks/` 아래 backlog note로 남기고, 필요하면 즉시 승격한다.
5. 구조를 바꿨으면 `bash _system/tools/obsidian/tag-audit.sh`로 `tags/up` 누락을 점검한다.

## Selection Rules

- 반복 조회 가능성이 높을수록 우선한다.
- raw log보다 synthesis 가능한 문서를 우선한다.
- 심사 문법, 문제 정의, 제품 구조, 제출 전략에 영향을 주는 문서를 우선한다.
- 이미 위키에 같은 축이 있으면 새 note를 만들기보다 기존 note 보강을 우선한다.
- 단순 초안, 일회성 메모, 개인 운영 로그는 낮게 본다.

## Output Format

- 빠른 스캔만 필요하면 스크립트 출력 그대로 사용한다.
- 기록이 필요하면 `06_LLM위키/tasks/`에 아래 형식으로 남긴다.

```md
# 프로젝트 지식화 후보 스캔

## Top candidates
- `<path>` -> `<recommended type>` | `<why>`

## Fast-track promotions
- 바로 승격할 2-5개

## Later backlog
- 추가 검토 후보
```

## Resources

### `scripts/scan_candidates.py`

프로젝트 전역의 Markdown 파일을 스캔해 점수, 추천 wiki type, 추천 이유를 출력한다.

### `references/candidate-signals.md`

어떤 문서가 좋은 wiki 후보인지 판단하는 규칙과 path/type 매핑 기준이다.
