---
title: 2026-04-13 Live Regression
date: 2026-04-13
status: in_progress
owner: codex
---

# 2026-04-13 Live Regression

## Scope

- target: `https://hagent-os.up.railway.app`
- method: `curl` + real browser flow + targeted live mutations
- policy: test first, document findings, then apply small reversible fixes

## Live truth snapshot

### Health

- `GET /api/health`
  - `{"status":"ok","version":"0.3.0"}`

### Organizations

- main org
  - `id: 1a5eda31-c548-475d-a234-c5d1e6587766`
  - `prefix: tanzania-english-academy`
  - `name: Tanzania English Academy`
- onboarding-created orgs observed during live testing
  - `0148cb5d-3db0-4d50-b1b7-fe268036989d`
  - `297fd176-b719-4e33-938d-7d71bddd47bf`
  - `af78cd51-14fd-4468-9bc0-fb5637dfd112`

### Main org API counts

- `dashboard.summary`
  - `agents.total = 4`
  - `cases.total = 37`
  - `cases.active = 11`
  - `approvals.total = 5`
  - `approvals.pending = 2`
  - `runs.total = 9`
  - `tokens.total = 3264`
- list endpoints
  - `agents = 4`
  - `cases = 37`
  - `projects = 3`
  - `goals = 1`
  - `documents = 29`
  - `schedules = 27`
  - `approvals = 5`
  - `notifications = 2`
  - `activity = 83`
  - `routines = 5`

## Browser findings before fix

### P0 mismatches

1. Invalid org route looked like a valid empty app
   - wrong slug routes still rendered shell
   - some invalid org ids returned `200 []`
   - operator could believe the product had no data rather than wrong org context

2. Dashboard binding mismatch
   - `/tanzania-english-academy/dashboard`
   - cards and charts rendered `0` despite non-zero summary API
   - `완료 안정성 0/0`, activity bars all zero

3. Agents page hydration mismatch
   - `/tanzania-english-academy/agents`
   - UI showed `전체 에이전트 0명`, `최근 run 0건`
   - API truth had `4` agents

4. Case detail properties panel broken
   - `/tanzania-english-academy/cases/:id`
   - route shell opened but detail panel showed no usable case properties
   - related agents/projects/activity queries depended on stale organization state

5. Settings state mismatch
   - header org label often showed placeholder `기관명`
   - model/adapter/channel cards did not match live adapter truth
   - `telegram-outbound` API was `connected=true`, UI still looked unconfigured

6. Schedule dialogs still depended on stale org state
   - page-level schedule query used active org
   - dialog-level create/edit/delete still used `selectedOrgId`
   - direct route and stale local storage could make schedule mutation no-op or fail

### Other findings

- onboarding could create extra orgs with incomplete seed
- some onboarding-created orgs had `agents=0`, `cases=0`, `documents=0`, `routines=0`
- live adapter tests:
  - `codex_local`: reached OpenAI but returned `429 quota exceeded`
  - `codex_qauth`: login required
  - `telegram-outbound`: org-configured and connected
  - `kakao-outbound`: provider missing
  - `korean-law-mcp`: cached fallback available

## Live mutation checks

### Approval

- approved pending approval
  - `approvalId: 29f18a0f-144f-44f5-8006-6d989b574204`
- result
  - `status = approved`
  - `decision.sideEffects.kakaoMessage.status = ready_to_send`
- activity recorded
  - `approval.approved`
  - `message.outbound.ready`

### Case patch

- case
  - `be388af1-21bf-488c-ba41-16d89b0516df`
- changed through API
  - `status: in_progress -> in_review`
  - `priority: 2 -> 0`
- result
  - API persisted mutation successfully
  - org case list reflected updated values

## Fixes applied in current local branch

### UI org hydration

- `ui/src/pages/SettingsPage.tsx`
  - switched from `selectedOrgId` to `useActiveOrgId(orgPrefix)`
- `ui/src/pages/CaseDetailPage.tsx`
  - switched related queries, mutations, panel widgets, and live run widget to `activeOrgId`
- `ui/src/pages/SchedulePage.tsx`
  - passed `activeOrgId` into `ScheduleDetailDialog` and `NewScheduleDialog`
  - removed stale `selectedOrgId` dependency from dialog-level mutations

### Prior local fixes already present

- invalid org route fallback in `ui/src/components/Layout.tsx`
- stale selected org healing in `ui/src/context/OrganizationContext.tsx`
- agents page hydration via `useActiveOrgId`
- dashboard chart fallback logic for live agent run shape
- onboarding immediate cache hydration and redirect
- bootstrap routines seed for new demo orgs

## Verification plan after current patch

1. local `ui typecheck`
2. local browser smoke against updated branch
3. deploy
4. live re-check
   - dashboard
   - agents
   - case detail
   - settings
   - schedule dialogs

## Remaining high-priority items

- deploy latest branch to Railway
- re-run live browser verification with screenshots
- verify onboarding-created org seed completeness after deploy
- verify case properties panel interactions in browser, not API only
- verify settings save + connection tests against live UI state model

## Follow-up after live deploy (`9909b16`, `0396a18`)

### Fixes pushed

- `9909b16 fix: stabilize live case detail interactions`
  - `ui/src/components/CaseProperties.tsx`
    - replaced Radix selects with native `<select>` controls for:
      - `status`
      - `priority`
      - `assigneeAgentId`
      - `opsGroupId`
- `0396a18 perf: slim live case detail payload`
  - `server/src/routes/cases.ts`
    - removed per-run `skillContext` / `usage` enrichment from `/api/cases/:id`
    - kept only fields actually consumed by `CaseDetailPage`
    - retained top-level assignee skill runtime summary

### Live re-check

- `GET /api/cases/be388af1-21bf-488c-ba41-16d89b0516df`
  - before: `time_total ≈ 14.8s`
  - after: `time_total ≈ 7.6s`
- direct-open:
  - `https://hagent-os.up.railway.app/tanzania-english-academy/cases/be388af1-21bf-488c-ba41-16d89b0516df`
  - after waiting `8s`, case detail body and properties panel both rendered
  - `직원용 운영 플레이북`, `속성`, `프로젝트 · 학원 운영 정책 정비` confirmed visible

### Case properties browser mutation proof

- live browser session `livecase3`
- target case:
  - `be388af1-21bf-488c-ba41-16d89b0516df`

Verified:
- `priority`
  - browser interaction changed value
  - live API confirmed persistence:
    - `priority = 1`
- `assigneeAgentId`
  - browser interaction changed to `140d5f15-8369-4359-b9bc-bf8d3fd33e54`
  - live API confirmed persistence
- `opsGroupId`
  - browser interaction changed to `afdda557-748b-40fa-80d9-5242e4de90d2`
  - live API confirmed persistence

Restored:
- `status = in_review`
- `priority = 0`
- `assigneeAgentId = bf19fd9c-4596-4446-9f97-de7dbc031be5`
- `opsGroupId = 297d8c90-ef23-49ab-a8c5-315d5243715b`

### Updated interpretation

- `CaseProperties` field mutation is now working on live.
- `CaseDetail` direct-open was not mainly a stale org bug anymore; it was dominated by slow `/api/cases/:id` response time.
- remaining issues should now focus on:
  - onboarding seed completeness
  - settings state model clarity
  - approval/result/document workflow completeness
  - external channel proof
