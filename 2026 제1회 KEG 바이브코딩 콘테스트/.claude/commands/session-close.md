---
tags:
  - area/system
  - type/reference
  - status/active
description: Close a working session cleanly. Update progress, memory, evidence, and Evidence Gate status before ending the session.
up: "[[.agent/AGENTS]]"
argument-hint: [what changed]
disable-model-invocation: true
---

Close this session using `$ARGUMENTS` as the summary of what changed.

## Canonical files

1. `.agent/system/ops/PROGRESS.md`
2. `.agent/system/memory/daily-memory.md`
3. `04_증빙/01_핵심로그/master-evidence-ledger.md`
4. `04_증빙/01_핵심로그/decision-log.md`
5. `04_증빙/01_핵심로그/prompt-catalog.md`
6. `.agent/system/logs/evidence-gate-log.md`
7. `.agent/skills/workspace-sync/SKILL.md`

## Task

Perform an end-of-session closure checklist.

1. Determine what changed in this session.
2. Update `PROGRESS.md` if the state or next handoff changed.
3. Update `daily-memory.md` if today's working memory changed.
4. Record the session in `master-evidence-ledger.md`.
5. If a human decision was made, point to `decision-log.md`.
6. If a prompt should be reused, point to `prompt-catalog.md`.
7. Report whether the session is `Passed` or `Pending Evidence`.

## Output format

```
[Session summary]
[Files requiring update]
[Evidence promotions]
[Gate status]
[Next handoff]
```
