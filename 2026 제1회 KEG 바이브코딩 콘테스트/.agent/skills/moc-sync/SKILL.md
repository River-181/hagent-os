---
tags:
  - area/system
  - type/reference
  - status/active
name: moc-sync
description: Keep the centralized `_MOC/` space current. Use when creating, moving, or updating section indexes, vault home links, or top-level navigation notes in this KEG workspace.
up: "[[.agent/skills/README]]"
---

# MOC Sync

이 스킬은 `_MOC/` 아래의 중앙 MOC 공간을 유지한다.

## 언제 사용하나

- 새 섹션이 생겼을 때
- 섹션 문서 구조가 바뀌었을 때
- `00 HOME.md`의 네비게이션을 갱신할 때
- MOC가 오래되어 탐색성이 떨어질 때

## 정본 파일

1. `_MOC/_MOC_HOME.md`
2. `00 HOME.md`
3. `.agent/system/maps/workspace-atlas.md`
4. `.agent/rules/obsidian-conventions.md`

## 규칙

- MOC 파일은 `_MOC/` 아래만 둔다.
- 새 MOC를 만들면 `_MOC/_MOC_HOME.md`를 먼저 갱신한다.
- 구조 변경이 크면 `workspace-atlas.md`와 `master-evidence-ledger.md`도 검토한다.
