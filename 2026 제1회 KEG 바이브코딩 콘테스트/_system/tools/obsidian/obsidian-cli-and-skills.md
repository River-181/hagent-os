---
tags:
  - area/system
  - type/guide
  - status/active
  - workflow/review
date: 2026-04-06
up: "[[_system/tools/README]]"
aliases:
  - obsidian-cli-and-skills
  - Obsidian CLI
---
# Obsidian CLI + Skills

## 역할

- MOC 유지
- note 생성/append/read
- daily note 관리
- `.base` 파일 관리
- 태그 감사 및 정규화 점검

## 이 저장소의 규칙

- MOC 파일은 `_MOC/` 아래에만 둔다.
- note 링크는 `[[wikilink]]`를 기본으로 쓴다.
- 구조 변경 시 [[_MOC_HOME]]과 [[workspace-atlas]]를 함께 갱신한다.
- 태그 규칙은 [[tagging-system]]을 기준으로 한다.

## 필요한 외부 구성

- Obsidian Desktop App
- Obsidian CLI (`obsidian`)
- 글로벌 skill
  - `obsidian-cli`
  - `obsidian-markdown`
  - `obsidian-bases`
  - `json-canvas`

## 프로젝트 내 관련 스킬

- [[.agent/skills/obsidian-workspace/SKILL|obsidian-workspace]]
- [[.agent/skills/moc-sync/SKILL|moc-sync]]

## 검증 명령

```bash
obsidian help
obsidian search query="MOC" limit=5
obsidian read file="_MOC_HOME"
bash _system/tools/obsidian/tag-audit.sh
```

## 관련 자산

- [[tagging-system]] — 정식 태깅 규칙
- `_system/tools/obsidian/tag-audit.sh` — 통합 감사 스크립트
- `_system/tools/obsidian/templates/standard-note-template.md` — 일반 note 템플릿
- `_system/tools/obsidian/templates/task-note-template.md` — task note 템플릿
