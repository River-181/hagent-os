---
tags:
  - area/system
  - type/reference
  - status/active
description: Sync Obsidian-facing workspace structure, notes, MOCs, and atlas after note or vault changes. Use for vault hygiene, note restructuring, wikilink cleanup, and Obsidian consistency.
up: "[[.agent/AGENTS]]"
argument-hint: [target note, folder, or scope]
disable-model-invocation: true
---

Sync the Obsidian workspace for `$ARGUMENTS`.

## Canonical rules

- `.agent/skills/obsidian-workspace/SKILL.md`
- `.agent/skills/workspace-sync/SKILL.md`
- `.agent/rules/obsidian-conventions.md`
- `.agent/system/maps/workspace-atlas.md`
- `_MOC/_MOC_HOME.md`
- `_MOC/_04_증빙_MOC.md`

## Task

Treat this repository as an Obsidian vault, not a generic Markdown folder.

1. Identify whether `$ARGUMENTS` affects:
   - note content
   - MOC links
   - daily note flow
   - `.base` files
   - atlas or evidence structure
2. Normalize the result to Obsidian conventions:
   - `[[wikilink]]`
   - YAML frontmatter
   - correct MOC references
3. If the structure changed, update `_MOC/_MOC_HOME.md` and `workspace-atlas.md`.
4. If report-worthy facts changed, reflect them in `04_증빙/01_핵심로그/`.
5. State whether Evidence Gate follow-up is required.

## Output format

```
[Scope]
[Obsidian issues found]
[Files to sync]
[Evidence impact]
[Next step]
```
