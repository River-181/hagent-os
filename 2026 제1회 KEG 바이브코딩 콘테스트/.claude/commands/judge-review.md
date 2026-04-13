---
tags:
  - area/system
  - type/reference
  - status/active
description: Review work using the contest judging lens. Use for strategy, product concept, demo flow, evidence quality, or submission readiness checks.
up: "[[.agent/AGENTS]]"
argument-hint: [artifact, folder, or scope]
disable-model-invocation: true
---

Run a judge-style review for `$ARGUMENTS`.

## Canonical files

- `01_대회정보/바이브코딩공모전_공지.md`
- `.agent/rules/contest-constraints.md`
- `.agent/agents/judge.md`
- `04_증빙/02_분석자료/ai-native-workspace-audit-report.md`
- `05_제출/`

## Task

Use the contest judging frame.

1. Evaluate the target against:
   - technical completeness
   - AI usage quality and efficiency
   - planning and real-world fit
   - creativity
2. Identify the weakest judging dimension first.
3. Point out what is missing for a convincing demo or submission.
4. If evidence quality is weak, say which logs or materials are missing.
5. Distinguish between:
   - must-fix before submission
   - should-improve
   - nice-to-have

## Output format

```
[Review target]
[Top findings]
[Judging risk]
[Missing evidence]
[Priority actions]
```
