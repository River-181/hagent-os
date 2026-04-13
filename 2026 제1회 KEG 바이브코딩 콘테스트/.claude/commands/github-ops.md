---
tags:
  - area/system
  - type/reference
  - status/active
description: Prepare and execute GitHub-related work in this repo using the project's evidence and workflow rules. Use for commit, branch, push, PR, issue, release, and release-note preparation.
up: "[[.agent/AGENTS]]"
argument-hint: [action, scope, or intent]
disable-model-invocation: true
---

Handle GitHub operations for `$ARGUMENTS`.

## Canonical files

1. `.agent/skills/github-workflow/SKILL.md`
2. `.agent/system/ops/PLAN.md`
3. `.agent/system/ops/PROGRESS.md`
4. `.agent/rules/logging.md`
5. `04_증빙/01_핵심로그/master-evidence-ledger.md`
6. `04_증빙/01_핵심로그/decision-log.md`
7. `.agent/skills/obsidian-workspace/SKILL.md`

## Task

Interpret `$ARGUMENTS` as the GitHub operation to prepare or execute.

1. Clarify whether this is about:
   - branch
   - commit
   - push
   - PR
   - issue
   - release
2. Check what evidence or ops docs must be updated before or after the GitHub action.
3. If release notes or changelog-style notes are involved, keep them Obsidian-compatible.
4. Report the exact preflight checks needed.
5. If the action is risky or destructive, require explicit human confirmation.

## Output format

```
[GitHub intent]
[Preflight checks]
[Required files/ledger]
[Execution plan]
[Risks]
```
