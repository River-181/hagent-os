---
tags:
  - area/system
  - type/reference
  - status/active
description: Start a Claude work session for this KEG workspace. Read the canonical ops and memory docs, then summarize the immediate next action, blockers, and files to touch.
up: "[[.agent/AGENTS]]"
argument-hint: [focus]
disable-model-invocation: true
---

Start this session for the KEG workspace.

## Canonical files to read first

1. `.agent/system/ops/PLAN.md`
2. `.agent/system/ops/PROGRESS.md`
3. `.agent/AGENTS.md`
4. `.agent/system/contracts/workspace-contract.md`
5. `.agent/system/contracts/memory-evidence-policy.md`
6. `.agent/system/memory/long-term-memory.md`
7. `.agent/system/memory/daily-memory.md`
8. `.agent/system/maps/workspace-atlas.md`
9. `.agent/rules/obsidian-conventions.md`

## Task

- Use `$ARGUMENTS` as an optional focus area.
- Summarize:
  - current phase
  - top 3 immediate tasks
  - blockers or ambiguity
  - files most likely to change
  - whether this looks like `research`, `ops`, `product`, `build`, `qa`, or `submission` work
- If the requested work clearly maps to one of the project agents, say which agent spec should guide the work.
- If note or MOC work is involved, follow `.agent/skills/obsidian-workspace/SKILL.md`.

## Output format

Use this exact section order:

```
[Session focus]
[Current phase]
[Top 3 tasks]
[Blockers]
[Likely files]
[Recommended agent/skill]
```
