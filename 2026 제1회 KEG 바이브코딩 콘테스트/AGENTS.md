# AGENTS.md

Guidance for human and AI contributors working in this contest repository.

## 1. Purpose

This repository is the contest workspace for **HagentOS**.

It contains:

- product definition
- evidence and handoff documents
- submission materials
- operating rules for AI-assisted work

The implementation repository is separate:

- product code: `/Users/river/workspace/active/hagent-os`

## 2. Read This First

Before making changes, read in this order:

1. `03_제품/hagent-os/README.md`
2. `03_제품/hagent-os/02_product/prd.md`
3. `03_제품/hagent-os/02_product/mvp-scope.md`
4. `03_제품/hagent-os/09_ux/domain-ux-paperclip-gap.md`
5. `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-full-regression.md`

If the task is implementation-facing, verify the live product state in `/Users/river/workspace/active/hagent-os` before trusting workspace docs.

## 3. Repo Map

- `01_대회정보/`: contest rules, timeline, judging material
- `02_전략/`: problem framing, bets, decisions, prompts, research
- `03_제품/`: product definition and domain design
- `04_증빙/`: evidence and logs
- `05_제출/`: final deliverables
- `06_LLM위키/`: long-lived AI knowledge base
- `_MOC/`: navigation and maps
- `_system/`: workspace dashboard, tool setup, system docs
- `.agent/`: operating rules for AI collaboration

## 4. Product Invariants

Do not violate these without explicit approval:

1. `Organization` scope is the primary tenant boundary.
2. `Case -> Approval -> Schedule / Document / Activity` is the core loop.
3. Archived cases must not be silently reused.
4. Notification dedupe and grouped read behavior must remain intact.
5. Stale run recovery and SSE reconnect must not be weakened.
6. Live demo org data must not be destroyed casually.

## 5. Engineering Rules

1. Prefer small, reversible edits.
2. Keep product docs and implementation state aligned when behavior changes.
3. Do not overwrite strategy or handoff docs wholesale unless asked.
4. When adding a new plan or analysis doc in this workspace, place it in the most specific existing folder instead of inventing a new top-level area.
5. If implementation behavior is the source of truth, say so clearly.

## 6. Verification Before Hand-off

For implementation-facing work, run the most relevant checks in the product repo:

```bash
npm exec pnpm -- --filter @hagent/server typecheck
npm exec pnpm -- --filter @hagent/ui typecheck
corepack pnpm --filter @hagent/ui exec vite build
curl http://127.0.0.1:3200/api/health
curl 'http://127.0.0.1:3200/api/adapters?orgId=be70ebc8-3b55-4ff3-827a-264f06c4d2ee'
```

If something is not run, report it explicitly.

## 7. Definition of Done

A change is done when all are true:

1. The repository-level document or code change matches the current product direction.
2. Relevant checks have been run, or missing checks are explicitly reported.
3. No unrelated files were edited.
4. Exact changed files are named in the handoff.
5. Risks and unverified items are called out clearly.

## 8. Demo-Specific Rules

When preparing judge-facing materials:

1. Optimize for 90-second comprehension.
2. Show the product as an approval-driven operations system, not as a chatbot.
3. Prefer real, verified flows over future roadmap claims.
4. Keep README and judge docs visually clean and easy to skim.

