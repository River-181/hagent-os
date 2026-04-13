---
tags:
  - area/system
  - type/reference
  - status/active
name: obsidian-workspace
description: Use when editing notes, MOCs, daily logs, Bases files, or vault structure in this KEG repo. Wraps the global obsidian-cli, obsidian-markdown, and obsidian-bases skills with the repo's canonical memory, atlas, and evidence rules.
up: "[[.agent/skills/README]]"
---

# Obsidian Workspace

이 스킬은 이 저장소를 일반 Markdown 폴더가 아니라 Obsidian vault로 다룰 때 사용하는 프로젝트 전용 스킬이다.

## 언제 사용하나

- 노트, MOC, daily note를 만들거나 수정할 때
- `00 HOME.md` 또는 `_MOC.md` 계열을 갱신할 때
- `.base` 파일을 만들거나 수정할 때
- wikilink, frontmatter, embed 규칙을 맞춰야 할 때
- vault 구조 변경이 memory, atlas, evidence에 영향을 줄 때

## 함께 따를 글로벌 스킬

1. `obsidian-cli` — vault 조회, note append/create, base query
2. `obsidian-markdown` — frontmatter, wikilink, callout, embed 규칙
3. `obsidian-bases` — `.base` 파일 구조와 뷰 규칙

## 반드시 읽을 파일

1. `.agent/AGENTS.md`
2. `.agent/rules/obsidian-conventions.md`
3. `.agent/system/contracts/workspace-contract.md`
4. `.agent/system/memory/MEMORY.md`
5. `.agent/system/maps/workspace-atlas.md`
6. `_MOC/_04_증빙_MOC.md`
7. `_MOC/_MOC_HOME.md`

## 기본 원칙

- 내부 링크는 `[[wikilink]]`를 기본값으로 쓴다.
- 외부 URL만 Markdown link `[]()`를 쓴다.
- 모든 노트는 YAML frontmatter를 유지한다.
- 새 노트는 생성 시점에 `tags`, `date`, `up`을 함께 넣는다.
- 부모가 있는 note는 `up` 없이 만들지 않는다.
- 새 note를 만들면 필요한 `_MOC/` 갱신과 atlas 반영 여부를 함께 판단한다.
- note 수정이 리포트 가치가 있으면 `[[master-evidence-ledger]]` 반영을 함께 판단한다.
- 구조 작업 후에는 `bash _system/tools/obsidian/tag-audit.sh`로 태그와 `up` 누락을 점검한다.

## 표준 순서

1. 작업 대상이 note, MOC, daily, base 중 무엇인지 분류한다.
2. vault 상호링크가 바뀌면 관련 `_MOC/` 파일과 `workspace-atlas.md` 반영 여부를 확인한다.
3. note 생성/조회/append는 가능하면 `obsidian` CLI 사용을 먼저 검토한다.
4. `.base` 파일은 일반 텍스트가 아니라 Obsidian Bases 문법으로 다룬다.
5. 구조나 운영 사실이 바뀌면 `workspace-sync` 스킬 기준으로 memory/evidence까지 맞춘다.

## 결과물

- Obsidian에서 바로 읽히는 note 구조
- wikilink와 frontmatter가 깨지지 않는 상태
- MOC, atlas, evidence가 함께 맞는 상태
