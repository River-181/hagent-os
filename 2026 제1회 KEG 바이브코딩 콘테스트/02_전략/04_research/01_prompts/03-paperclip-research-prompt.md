---
tags:
  - area/strategy
  - type/template
  - status/active
date: 2026-04-09
up: "[[_02_전략_MOC]]"
aliases:
  - paperclip-research-prompt
  - paperclip분석프롬프트
---
# Paperclip Research Prompt

```text
You are helping define `EduPaperclip`, a Korean education-focused operating system inspired by `paperclip` and informed by `k-skill`.

Goal:
Do not propose final features yet. First analyze what parts of `paperclip` should be borrowed, transformed, or discarded for Korean academy and education operations.

Read these files first:
- `02_전략/02_problem-framing/02-problem-definition-source.md`
- `02_전략/03_reference-analysis/paperclip/README.md`

Write findings into these analysis buckets if relevant:
- `02_전략/03_reference-analysis/paperclip/01-ui-entrypoints.md`
- `02_전략/03_reference-analysis/paperclip/02-data-context-model.md`
- `02_전략/03_reference-analysis/paperclip/03-agent-skill-structure.md`
- `02_전략/03_reference-analysis/paperclip/04-k-education-fit-gaps.md`
- `02_전략/03_reference-analysis/paperclip/05-open-questions.md`

Focus on these questions:
1. What are `paperclip`’s real entrypoints, workflows, and core mental model?
2. Which UI patterns and user journeys are reusable for an academy operator?
3. What data/context structure makes this more than a simple chatbot?
4. Which agent roles or orchestration ideas survive translation into Korean academy operations?
5. How could `k-skill`-like packaged skills become a differentiator?
6. What Korean academy-specific domains appear through research?
   - parent complaints
   - student retention / re-enrollment
   - instructor scheduling and workload
   - legal / tax / finance / vehicle / facility operations
7. Which parts are still too unclear and need more domain research before fixing local directories and product structure?

Constraints:
- Stay in pre-spec mode.
- Do not write screen-by-screen product spec.
- Do not lock final feature scope.
- Separate facts, hypotheses, and open questions.
- Optimize for helping the team decide the local file structure and research direction.

Your final output should include:
- borrowed from `paperclip`
- transformed for Korean academy operations
- not suitable / discard
- recommended local analysis file updates
- top 5 domain questions to research next
```
