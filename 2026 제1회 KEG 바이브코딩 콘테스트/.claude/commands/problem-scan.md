---
tags:
  - area/system
  - type/reference
  - status/active
description: Run a structured problem discovery pass for this contest. Use when researching education pain points, candidate ideas, or evidence-backed problem definitions.
up: "[[.agent/AGENTS]]"
argument-hint: <topic or user segment>
disable-model-invocation: true
---

Run a problem scan for `$ARGUMENTS`.

## Canonical inputs

- `01_대회정보/바이브코딩공모전_공지.md`
- `02_전략/vibe_contest_master_playbook_v0_1.md`
- `.agent/agents/research.md`
- `.agent/AGENTS.md`
- `04_증빙/01_핵심로그/prompt-catalog.md`

## Task

Use the research-agent mindset.

1. Frame the target user segment or topic from `$ARGUMENTS`.
2. Identify candidate pain points in the format:
   - who
   - when
   - why it hurts
   - current workaround
   - why AI meaningfully helps
3. Score each candidate on:
   - field realism
   - AI fit
   - 7-day build feasibility
   - demo clarity
   - business extension
4. Recommend what to write next in `02_전략/` or `03_제품/`.
5. If the prompt itself is reusable, suggest promotion into `prompt-catalog.md`.

## Output format

```
[Research scope]
[Candidate problems]
[Scored shortlist]
[Best next document]
[Evidence/log follow-up]
```
