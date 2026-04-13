---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/2026-04-13-master-evidence.md"
synced_at: 2026-04-13
---
# 2026-04-13 Master Evidence

- 작성 시각: `2026-04-13 07:19:50 KST`
- 기준 저장소: `/Users/river/workspace/active/hagent-os`
- 기준 조직:
  - `orgId = be70ebc8-3b55-4ff3-827a-264f06c4d2ee`
  - `orgPrefix = 탄자니아-영어학원-데모-7`
- 기준 서버:
  - API: `http://127.0.0.1:3200`
  - UI: `http://127.0.0.1:5174`

## 1. 오늘 반영/확인한 핵심

### 코드/동작
- `server typecheck`, `ui typecheck` 복구 및 재통과
- `route orgPrefix -> selectedOrgId` 불일치 수정
- `Students`, `Dashboard`, `Approvals`, `Cases`, `Documents`, `Schedule` deep-link 정합성 복구
- `Dashboard` 최근 인바운드/문서 1차 dedupe 적용
- D1 리허설 시나리오 재현 및 증빙 문서화
- late Day 8 기준 `Skills` pilot 디자인 정리
  - `/api/skills` 로딩 실패 원인을 `agentTypes` enum mismatch로 복구
  - `SkillsPage`를 dense list + flat detail 구조로 다시 정리
  - dark neutral token을 `Toss` 기준에 맞춰 더 차분한 blue-gray 쪽으로 조정

### 검증 흐름
- 온보딩 -> 첫 진입
- Students deep-link / 목록 렌더
- Telegram/Kakao 문의 -> case
- approval -> schedule sideEffect
- inquiry quick-ask -> case -> run -> document -> append
- routine trigger / wakeup guard / stale recovery

## 2. 오늘 수정 파일

- `/Users/river/workspace/active/hagent-os/packages/shared/src/types/index.ts`
- `/Users/river/workspace/active/hagent-os/server/src/services/skills.ts`
- `/Users/river/workspace/active/hagent-os/packages/db/src/schema/agents.ts`
- `/Users/river/workspace/active/hagent-os/ui/src/context/OrganizationContext.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/StudentsPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/DashboardPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/ApprovalsPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/CasesPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/DocumentsPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/SchedulePage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/ProjectDetailPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/CaseDetailPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/pages/SkillsPage.tsx`
- `/Users/river/workspace/active/hagent-os/ui/src/index.css`

### 오늘 추가 문서
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-d1-verification.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-master-evidence.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-session-log.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-session-memory.md`
- `/Users/river/workspace/active/hagent-os/docs/handoff/evidence/2026-04-13/README.md`

## 3. 최신 검증 결과

### 타입/정적 체크
- `npm exec pnpm -- --filter @hagent/server typecheck`
  - 결과: 통과
- `npm exec pnpm -- --filter @hagent/ui typecheck`
  - 결과: 통과
- `corepack pnpm --filter @hagent/ui exec tsc --noEmit --pretty false -p /Users/river/workspace/active/hagent-os/ui/tsconfig.json`
  - 결과: 통과

### Skills pilot 검증
- `curl -s 'http://localhost:3200/api/skills?orgId=be70ebc8-3b55-4ff3-827a-264f06c4d2ee' | jq 'length'`
  - 결과: `40`
- `curl -s 'http://localhost:3200/api/skills?orgId=be70ebc8-3b55-4ff3-827a-264f06c4d2ee' | jq '.[0] | {slug,displayName,installed,ready}'`
  - 결과: `payment-reminder / 결제 안내 및 리마인더 / installed: true / ready: false`
- `curl -I 'http://127.0.0.1:5174/탄자니아-영어학원-데모-7/skills/payment-reminder'`
  - 결과: `HTTP/1.1 200 OK`
- Playwright screenshot:
  - `/Users/river/workspace/active/hagent-os/output/playwright/skills-pilot/skills-after-2026-04-13.png`

### D1 핵심 시나리오
- 온보딩:
  - `Load demo academy` -> `Academy Setup 실행` -> project detail 진입 확인
- Students:
  - `/탄자니아-영어학원-데모-7/students`
  - 실제값: `총 15명 · 현재 표시 15명`
- approval -> schedule:
  - approval: `9062e3e8-6c53-4646-a5e5-4fdfbb330905`
  - schedule count: `38 -> 39`
  - created schedule: `9da64d63-fdf5-470e-962f-8e52de63cf21`
  - Google Calendar: `pending_credentials`
- quick-ask -> artifact:
  - case: `C-087`
  - run: `640b5fa9-e4b0-4bf5-b0c6-b5b81bcba0a2`
  - artifact: `C-087 법률 질문 브리프`
- routine trigger:
  - routine: `8eab7b6b-e605-4eb2-a5b4-0dbb4253f40e`
  - case: `C-054`
  - run: `5e542f38-e7ac-42dd-bb8d-3273ff5edbfb`
  - activity: `routine.triggered`, `run.completed`, `document.created`, `approval.created`

## 4. 토큰/비용 추정치

기준: `GET /api/organizations/be70ebc8-3b55-4ff3-827a-264f06c4d2ee/costs/summary`

### 전체
- `totalTokens = 338453`
- `totalEstimatedCostKrw = 3859`

### 모델별
- `gpt-5-codex`
  - `inputTokens = 186142`
  - `outputTokens = 152311`
  - `totalTokens = 338453`
  - `estimatedCostKrw = 3859`

### 에이전트별
- `민원담당`
  - `totalRuns = 51`
  - `totalTokens = 217693`
  - `estimatedCostKrw = 2480`
- `스케줄러`
  - `totalRuns = 21`
  - `totalTokens = 26062`
  - `estimatedCostKrw = 300`
- `이탈방어`
  - `totalRuns = 5`
  - `totalTokens = 94698`
  - `estimatedCostKrw = 1079`
- `알림담당`
  - `totalRuns = 1`
  - `totalTokens = 0`
- `원장 김데모`
  - `totalRuns = 10`
  - `totalTokens = 0`

## 5. 실패 / 미검증 / 제한

### 실패 아님, 하지만 미완료
- `GOOGLE_CALENDAR_ACCESS_TOKEN` 없음
  - 결과: approval sideEffect는 DB schedule까지 생성, 외부 calendar는 `pending_credentials`
- Telegram webhook public HTTPS 미등록
  - 현재 기본 전략은 `poll fallback`
- `KAKAO_OUTBOUND_PROVIDER_URL` live 상태 미확정

### 남은 P1
- agent API의 `status`와 live run 상태가 어긋날 수 있음
- Dashboard recent inbound는 1차 dedupe만 적용, 내용상 중복처럼 보이는 항목 일부 잔존
- Documents 중복 데이터 잔존

### 이번 문서화 범위 밖
- `SSE replay/backlog`
- 전체 과거 데이터 cleanup migration
- 실제 배포 URL 확보
- `Claude CLI` 디자인 재컨펌
  - 결과: timeout
  - 상태: 미검증

## 6. 다음 세션 진입 포인트

다음 세션은 아래 순서로 바로 이어가면 됩니다.

1. `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-d1-verification.md` 확인
2. `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-session-memory.md` 확인
3. D2 우선순위 착수
   - `agent.status` live derivation
   - Dashboard/Inbox sender-title dedupe 강화
   - Documents 조회 dedupe
   - Settings integration status를 `live / fallback / missing`으로 정리
4. 디자인 확산은 보류
   - `Skills` pilot 승인 전에는 전역 rollout과 `version bump` 금지
   - 다음 확산 순서는 `Settings -> Case -> Project -> Agent`
