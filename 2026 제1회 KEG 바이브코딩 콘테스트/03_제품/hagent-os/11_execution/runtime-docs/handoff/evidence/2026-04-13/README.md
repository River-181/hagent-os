---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/evidence/2026-04-13/README.md"
synced_at: 2026-04-13
---
# 2026-04-13 Evidence Index

기준 저장소: `/Users/river/workspace/active/hagent-os`

이 폴더 인덱스는 오늘 세션에서 사용한 증빙 경로를 한 번에 모아 둔 것입니다. 원본 파일은 대부분 `.playwright-cli`와 API 상태에 있습니다.

## 1. 브라우저/화면 증빙

### 온보딩
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T19-44-30-975Z.yml`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T19-44-41-728Z.yml`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T19-44-51-740Z.yml`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T19-44-59-214Z.yml`

### Students deep-link
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T20-00-18-615Z.yml`

### Dashboard deep-link / dedupe
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T20-00-36-977Z.yml`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T20-00-38-472Z.yml`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T20-00-40-234Z.yml`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T20-06-29-852Z.yml`

## 2. 콘솔 로그

- `/Users/river/workspace/active/hagent-os/.playwright-cli/console-2026-04-12T19-44-30-448Z.log`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/console-2026-04-12T20-00-18-227Z.log`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/console-2026-04-12T20-00-36-686Z.log`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/console-2026-04-12T20-00-38-215Z.log`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/console-2026-04-12T20-00-39-725Z.log`
- `/Users/river/workspace/active/hagent-os/.playwright-cli/console-2026-04-12T20-06-29-549Z.log`

## 3. API 증빙 키 포인트

### 비용/토큰
- `GET /api/organizations/be70ebc8-3b55-4ff3-827a-264f06c4d2ee/costs/summary`
- 최신 기준:
  - `totalTokens = 338453`
  - `totalEstimatedCostKrw = 3859`

### approval -> schedule side effect
- approval: `9062e3e8-6c53-4646-a5e5-4fdfbb330905`
- created schedule: `9da64d63-fdf5-470e-962f-8e52de63cf21`
- related activity:
  - `approval.approved`
  - `integration.calendar_pending_credentials`

### inquiry quick-ask -> document
- case: `C-087`
- run: `640b5fa9-e4b0-4bf5-b0c6-b5b81bcba0a2`
- artifact: `C-087 법률 질문 브리프`

### routine trigger
- routine: `8eab7b6b-e605-4eb2-a5b4-0dbb4253f40e`
- case: `C-054`
- run: `5e542f38-e7ac-42dd-bb8d-3273ff5edbfb`
- related activity:
  - `routine.triggered`
  - `run.queued`
  - `run.started`
  - `document.created`
  - `approval.created`
  - `run.completed`

## 4. 연결 문서

- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-d1-verification.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-master-evidence.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-session-log.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-session-memory.md`
