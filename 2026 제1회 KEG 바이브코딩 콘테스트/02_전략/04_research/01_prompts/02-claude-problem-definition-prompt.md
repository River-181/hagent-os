---
tags:
  - area/strategy
  - type/template
  - status/active
date: 2026-04-09
up: "[[_02_전략_MOC]]"
aliases:
  - claude-problem-definition-prompt
  - 문제정의용클로드프롬프트
---
# Claude Prompt For Problem Definition

> Claude가 기능/화면으로 너무 빨리 내려가지 않고, 문제 정의와 페르소나를 먼저 쓰도록 유도하는 프롬프트.

```text
You are writing pre-spec strategy material for this project.
Do not write feature lists, screens, architecture, APIs, or implementation plans first.
Your job is to define the problem clearly before product specification begins.

Read and obey the following source-of-truth note first:
- `02_전략/01_problem-framing/02-problem-definition-source.md`
- `02_전략/02_problem-framing/02-problem-definition-source.md`

Project context:
- The project direction is `EduPaperclip`.
- It is a Korean education-oriented, role-based AI orchestration system inspired by `paperclip`.
- The open question is not "what features should we build first?"
- The open question is "which user and which operational pain should we commit to first?"

Important constraints:
1. Do not jump to detailed features.
2. Do not write UI ideas unless they are necessary to explain the problem context.
3. Do not try to satisfy every user segment at once.
4. Treat this as a problem-definition and persona-definition task, not a product-spec task.
5. Be concrete about pains, workflows, and why current tools are insufficient.
6. Explicitly distinguish:
   - what is already decided
   - what is still undecided
   - what should be researched next

Your output must be a single markdown note with exactly these sections:

1. `# Problem Definition Draft`
2. `## What We Are Actually Trying To Solve`
3. `## Why This Problem Matters Now`
4. `## Primary User Candidates`
5. `## Persona 1`
6. `## Persona 2`
7. `## Current Workflow And Friction`
8. `## Existing Alternatives And Their Limits`
9. `## Why A Role-Based AI Team Is More Appropriate Than A Single Chatbot`
10. `## What We Will Not Decide Yet`
11. `## Research Questions Before Spec`
12. `## Recommendation`

Writing instructions:
- Use Korean for explanation, but keep product names, paths, APIs, and technical terms in English when useful.
- Optimize for decision quality, not volume.
- If evidence is weak, say it is weak.
- If something is a hypothesis, label it as a hypothesis.
- The `Recommendation` section must end with:
  - the most promising first user
  - the first operational pain to focus on
  - 3 questions that must be answered before writing `spec.md`

Use these existing files only as supporting inputs, not as output format templates:
- `02_전략/02_problem-framing/03-problem-bank.md`
- `02_전략/02_problem-framing/04-problem-scorecard.md`
- `02_전략/05_decisions/02-bet-memo.md`
- `02_전략/05_decisions/01-decision-sprint.md`
- `02_전략/05_decisions/04-demo-critical-path.md`
- `02_전략/05_decisions/05-risk-register.md`
- `02_전략/05_decisions/03-scope-board.md`

The final note should help the team choose the first committed problem, not prematurely lock features.
```

## 사용 의도

- Claude가 너무 빨리 `MVP 기능`, `UI`, `spec`으로 내려가는 것을 막는다.
- 먼저 `문제`, `사용자`, `병목`, `기존 대안`, `왜 AI 팀이어야 하는가`를 정리하게 만든다.

## 기대 산출물

- 문제 정의 초안 1개
- 핵심 페르소나 1~2개
- spec 이전에 더 조사해야 할 질문 목록
