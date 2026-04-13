---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/2026-04-13-full-regression.md"
synced_at: 2026-04-13
---
# 2026-04-13 Full Regression

- 기준 저장소: `/Users/river/workspace/active/hagent-os`
- 기준 org:
  - `orgId = be70ebc8-3b55-4ff3-827a-264f06c4d2ee`
  - `orgPrefix = 탄자니아-영어학원-데모-7`
- 기준 API: `http://127.0.0.1:3200`
- 기준 UI: `http://127.0.0.1:5174`
- 실행 원칙:
  - 실패가 나와도 가능한 범위는 끝까지 계속 검증
  - 테스트 아티팩트는 `FULL-REGRESSION` prefix 사용

## Session Addendum — 2026-04-13 Students / Case

- 목적:
  - `Students` 상세 interaction 문제 재현/수정
  - `CaseDetail` properties polish 및 `done` 상태 저장 브라우저 확인
- 범위 파일:
  - `ui/src/pages/StudentsPage.tsx`
  - `ui/src/components/CaseProperties.tsx`
  - `ui/src/pages/CaseDetailPage.tsx`
- session evidence:
  - handoff: `docs/handoff/2026-04-13-students-case-session.md`
  - evidence folder: `output/playwright/session-2026-04-13-students-case`
  - session logs: `output/session-logs/2026-04-13-students-case-session.md`
- 핵심 결과:
  - `/students` crash 수정
  - `/students/:id` deep-link infinite update loop 수정
  - `CaseDetail` status dropdown으로 `done` 이동 후 board 반영 확인
  - `CaseDetail` compact `Documents` preview 추가

## 1. 시작 상태

| 항목 | 실제값 | 상태 |
| --- | --- | --- |
| `server typecheck` | 실패 | 실패 |
| `ui typecheck` | 통과 | 통과 |
| `vite build` | 통과, chunk size warning 1건 | 통과 |
| API listen | `*:3200` | 통과 |
| UI dev server | 재기동 필요, 최종 `5174`에서 확인 | 조건부 통과 |

### 즉시 발견된 blocker

1. `server typecheck` 실패
   - 파일: `server/src/routes/organizations.ts:508`
   - 내용: `agentType === "ceo"` 비교가 현재 `AgentType` union과 불일치
2. UI dev server가 중간에 내려감
   - Playwright 첫 배치에서 `chrome-error://chromewebdata/`, `ERR_CONNECTION_REFUSED`
   - 원인: `5174/5175` 모두 listen 중이 아니었음
   - 조치: `@hagent/ui dev` 재기동 후 재검증

## 2. 정적 게이트

### `server`

```bash
npm exec pnpm -- --filter @hagent/server typecheck
```

- 결과: 실패
- 에러:

```text
src/routes/organizations.ts(508,63): error TS2367:
This comparison appears to be unintentional because the types
'"orchestrator" | "complaint" | "retention" | "scheduler" | "intake" | "staff" | "compliance" | "notification"'
and '"ceo"' have no overlap.
```

### `ui`

```bash
npm exec pnpm -- --filter @hagent/ui typecheck
corepack pnpm --filter @hagent/ui exec vite build
```

- `ui typecheck`: 통과
- `vite build`: 통과
- 잔여 warning:
  - `dist/assets/index-*.js` chunk size warning

## 3. 기준 데이터 스냅샷

| 객체 | 개수 |
| --- | ---: |
| students | 15 |
| cases | 29 |
| approvals | 39 |
| agents | 5 |
| schedules | 39 |
| documents | 125 |
| notifications | 37 |
| activity | 660 |
| routines | 3 |
| goals | 4 |
| projects | 8 |

대시보드 요약:

- agents: `total=5`, `running=0`
- cases: `total=106`, `active=39`
- approvals: `total=39`, `pending=18`
- tokens.total: `336769`

## 4. 핵심 API / 시나리오 검증

### 4.1 quick-ask -> case -> run -> document -> follow-up append

실행:

```bash
POST /api/organizations/:orgId/quick-ask
```

초기 요청:
- title: `FULL-REGRESSION 법률/운영 검증`
- assistantSessionId: `full-regression-session`
- threadId: `full-regression-thread`

결과:
- 생성: `caseId=8d5e57b2-900e-481a-850f-71aa5f0f6fc8`
- `identifier=C-113`
- `runId=7ddebb73-8f3c-4b90-a18a-e1bfff1ad6a9`
- 첫 run 최종 상태: `completed`
- usage:
  - `totalTokens=300`
  - `estimatedCostKrw=3`

follow-up 요청:
- 같은 `assistantSessionId/threadId` 사용

결과:
- `appended=true`
- 같은 `caseId=8d5e57b2-900e-481a-850f-71aa5f0f6fc8`
- second run: `e8759546-570a-429b-abae-2a86c724cd14`
- 최종 case 상태:
  - `status=in_review`
  - `comments=4`
  - `runs=2`
  - `documents[0].title = C-113 운영 질문 브리프`

판정: 통과

### 4.2 approval -> schedule side effect

대상 approval:
- `approvalId=15f1d1fd-bae1-42a4-9bc4-ab487ac25335`
- title: `실행 계획 수립`

실행:

```bash
POST /api/approvals/15f1d1fd-bae1-42a4-9bc4-ab487ac25335/approve
```

결과:
- approval 상태: `approved`
- side effect:
  - `googleCalendar.status = pending_credentials`
  - `missingEnv = GOOGLE_CALENDAR_ACCESS_TOKEN`
- 생성 schedule:
  - `scheduleId=15450aca-2f02-4292-81a5-f6de59e56458`
  - `title=학부모 상담 일정`
  - `type=counseling`
  - `18:30:00 ~ 19:00:00`
- schedule count:
  - `39 -> 40`

판정: 통과

### 4.3 notifications dedupe + grouped read

관찰된 dedupe 그룹:
- `outbound_ready`, `duplicateCount=2`, `title=C-065 카카오 발송 준비`
- `outbound_failed`, `duplicateCount=2`, `title=C-033 텔레그램 발송 실패`

실행:

```bash
PATCH /api/notifications/8b77e744-894f-4a19-aa50-3ec4654da813/read
```

결과:
- 대상 row `read=true`
- 같은 dedupe group의 `duplicateIds` 전체가 `read=true`로 보임

판정: 통과

### 4.4 heartbeat / wakeup / routine

#### heartbeat

```bash
POST /api/heartbeat/trigger
```

결과:
- `triggeredRuns=0`
- `recoveredStaleRuns.recoveredCount=0`

판정: 통과

#### wakeup guard

```bash
POST /api/agents/4551c64a-23ba-42db-a9ae-4e6019a9cf6a/wakeup
```

결과:
- `422`
- `error = "No pending cases available for this agent"`

판정: 조건부 통과

#### routine trigger

```bash
POST /api/organizations/:orgId/routines/8eab7b6b-e605-4eb2-a5b4-0dbb4253f40e/trigger
```

결과:
- `422`
- `error = "No eligible case found for routine trigger"`

판정: 조건부 통과

메모:
- 현 시점엔 eligible case pool이 없어서 negative-path만 확인됨

## 5. 외부 연동 / Settings

### adapter test

| key | 결과 |
| --- | --- |
| `codex_local` | `degraded`, auth missing/fallback |
| `korean-law-mcp` | `degraded`, `LAW_OC` missing |
| `kakao-outbound` | `degraded`, `KAKAO_OUTBOUND_PROVIDER_URL` missing |
| `telegram-outbound` | `degraded`, `TELEGRAM_BOT_TOKEN` missing |

### Telegram webhook status

```bash
GET /api/channels/telegram/webhook/:orgId/status
```

결과:
- `transportMode = poll`
- `webhookInfo.url = ""`
- `pending_update_count = 0`

판정:
- polling fallback 기준 통과
- public webhook 등록 기준은 미완료

### 외부 outbound 검증 범위

이번 라운드에서 실제로 확인한 범위:
- `POST /api/adapters/test`
- `GET /api/channels/telegram/webhook/:orgId/status`
- Settings 저장 데이터에 남아 있는 최근 연결 테스트 상태

이번 라운드에서 **확인하지 못한 범위**:
- Telegram으로 실제 메시지 발송 후 외부 채널 수신 화면까지 확인
- Kakao outbound provider를 통한 실제 외부 발송 수신 확인

해석:
- 이번 결과는 `연결 테스트 / degraded fallback / 설정 저장값` 검증이다.
- 실제 외부 수신 단말 기준 `delivery proof`는 아직 없다.
- 특히 현재 서버 프로세스 기준 `telegram-outbound`는 `TELEGRAM_BOT_TOKEN` missing으로 degraded인데,
  org 저장 설정에는 과거 `telegram-outbound.connected=true` 이력이 남아 있다.
  즉, **현재 process env와 저장된 UI 상태가 어긋날 가능성**이 있다.

## 6. 브라우저 스모크

Playwright로 재확인한 route:

- `/탄자니아-영어학원-데모-7/dashboard`
- `/탄자니아-영어학원-데모-7/settings`
- `/탄자니아-영어학원-데모-7/cases`
- `/탄자니아-영어학원-데모-7/agents`
- `/탄자니아-영어학원-데모-7/inbox`

결과:
- 재기동 후 모두 `HagentOS` title과 org shell 렌더 확인
- console:
  - React DevTools info 1건
  - `Errors: 0`
  - `Warnings: 0`

메모:
- 첫 Playwright 배치는 UI server down 상태로 실패
- 재기동 후 route-level smoke만 재확인
- screenshot path 지정은 `playwright-cli screenshot` 호출 형식 이슈로 이번 문서에는 미포함

### UI dev server down 관찰

증거:
- 실패 시점 `curl 5173/5174/5175` 모두 connection refused
- `lsof` 기준 listen 중인 것은 `3200`만 존재
- 이후 `corepack pnpm --filter @hagent/ui dev -- --host 127.0.0.1 --port 5175` 재기동 시
  실제 Vite는 다시 `http://localhost:5174/`로 올라옴

해석:
- 이 라운드에서 확인된 사실은 **“UI가 한 시점에 내려가 있었다”**는 점까지다.
- 아직 `vite` 자체 crash인지, 세션 종료인지, 다른 프로세스 충돌인지 코드 원인은 분리하지 못했다.
- 따라서 이번 문서에서는 이를 `운영 리스크`로만 기록하고, 코드 버그로 단정하지 않는다.

### SSE reconnect 검증 상태

코드 근거:
- client: [ui/src/hooks/useSSE.ts](/Users/river/workspace/active/hagent-os/ui/src/hooks/useSSE.ts:1)
  - `EventSource` 오류 시 `5s` 후 재연결
  - `agent/case/approval` 이벤트 시 관련 query invalidate
  - notifications query invalidate 포함
- server: [server/src/routes/events.ts](/Users/river/workspace/active/hagent-os/server/src/routes/events.ts:1)
  - `/api/organizations/:orgId/events/sse`
  - 최초 `connected` event 전송
  - `30s` keepalive ping

빠른 재검증:

```bash
GET /api/organizations/:orgId/events/sse
POST /api/organizations/:orgId/quick-ask
```

실제 수신한 SSE 라인:

```text
data: {"type":"connected","organizationId":"be70ebc8-3b55-4ff3-827a-264f06c4d2ee"}
data: {"type":"agent.run.queued","payload":{"runId":"b3057be8-a946-439b-bd6d-effc0eddb7f2","caseId":"7284f32b-4e31-47cb-919c-39adb3b9482c","agentType":"complaint"}}
```

판정:
- SSE endpoint가 실제 `connected`와 후속 `agent.run.queued` event를 내보내는 것까지는 확인
- 브라우저에서 `disconnect -> reconnect -> query invalidate`까지의 end-to-end 증거는 이번 문서에 없음
- 따라서 **endpoint-level 검증 통과 / browser reconnect invalidate는 미검증**

## 7. 남은 리스크

### P0

1. `server typecheck`
   - 시작 상태에서는 실패였으나 `Post-report patch`로 해소
   - 현재 잔여 P0는 없음

### P1

1. UI dev server 안정성
   - 중간에 내려가서 브라우저 스모크 재기동 필요
   - 빠른 재확인 시점에는 `5174` listen 정상 복구
2. adapter/live env 정합성
   - Settings 저장 정보에는 Telegram connected 이력이 있으나
   - 현재 adapter test는 `TELEGRAM_BOT_TOKEN missing`으로 degraded
   - 실제 운영 config와 현재 server process env가 다를 가능성 있음
3. health endpoint 인식 불일치
   - 서버 루트 `/`는 404 HTML
   - 실제 health route는 `/api/health`
   - `curl /api/health` 결과는 정상 JSON
   - 즉, 서버 버그라기보다 **운영 기대와 문서/체크 명령이 어긋난 상태**

### 미검증

1. SSE reconnect end-to-end
   - SSE event stream 자체는 확인했지만 browser reconnect + invalidate까지는 미확인
2. Telegram/Kakao 실제 outbound delivery
   - adapter/settings/API 상태는 확인했지만 실제 외부 메시지 수신 증적은 이번 문서에서 미수집
3. 전 페이지 전체 시각 스모크
   - 핵심 5개 route만 재검증
4. 세션 증빙 연속성은 `2026-04-13-session-memory.md`에 누적되고, 필요 시 `docs/handoff/2026-04-13-master-evidence.md`에서 최종 상태로 추적

## 8. 수정 우선순위

1. `server typecheck` 복구
2. 필요 시 server root health expectation 정리
3. UI dev server 불안정 원인 분리
4. SSE / 외부 outbound 실검증 추가
5. health check 기준을 `/api/health`로 통일

## 9. Post-report patch

수정:
- 파일: `server/src/routes/organizations.ts`
- 변경: `a.agentType === "ceo"` 제거

이유:
- 현재 `AgentType` union에 `"ceo"`가 없어 `TS2367` 발생
- 실제 데모 데이터 탐색 기준으로도 CEO 식별은 `slug === "ceo"` 또는 `slug === "orchestrator"`면 충분

재검증:

```bash
npm exec pnpm -- --filter @hagent/server typecheck
```

- 결과: 통과

추가 수정:
- 파일: `ui/src/hooks/useSSE.ts`
- 변경:
  - reconnect timer에 exponential backoff 추가
  - `online`, `visibilitychange` 시 재연결 시도
  - reconnect/open 시 org 주요 query invalidate
  - 기존 `EventSource` close 정리 로직 일원화

의도:
- 브라우저 탭 복귀, 일시적 네트워크 복구, SSE 연결 오류 이후 stale 상태가 오래 남는 문제를 줄이기 위함

재검증:

```bash
npm exec pnpm -- --filter @hagent/ui typecheck
corepack pnpm --filter @hagent/ui exec vite build
```

- 결과:
  - `ui typecheck` 통과
  - `vite build` 통과

## 10. Follow-up improvements

수정:
- 파일: `server/src/routes/adapters.ts`
- 파일: `ui/src/api/adapters.ts`
- 파일: `ui/src/pages/SettingsPage.tsx`
- 변경:
  - `GET /api/adapters`가 optional `orgId`를 받아 기관별 `telegram-outbound` 준비 상태를 반영
  - `SettingsPage`는 선택 기관 기준으로 adapter/integration 목록을 조회

이유:
- 기존에는 `Settings`가 전역 process env 기준 `integrations`를 그대로 보여줘서,
  기관 설정에 `telegram.botToken`이 있어도 `telegram-outbound`가 degraded처럼 보일 수 있었다.
- 이번 수정으로 `Settings`에서는 최소한 선택 기관 기준 준비 상태가 반영된다.

수정:
- 파일: `server/src/routes/health.ts`
- 파일: `server/src/app.ts`
- 변경:
  - 서버 루트 `/`에 health JSON alias 추가
  - `/`와 `/api/health`가 같은 payload를 반환하도록 정리

이유:
- 운영 체크에서 `/`와 `/api/health` 기대가 갈려 있었다.
- 이번 수정으로 빠른 smoke check와 운영 확인이 덜 헷갈린다.

재검증:

```bash
corepack pnpm --filter @hagent/server exec tsc --noEmit --pretty false --tsBuildInfoFile /tmp/hagent-server-fix.tsbuildinfo -p tsconfig.json
corepack pnpm --filter @hagent/ui exec tsc --noEmit --pretty false --tsBuildInfoFile /tmp/hagent-ui-fix.tsbuildinfo -p tsconfig.json
```

- 결과:
  - `server typecheck` 통과
  - `ui typecheck` 통과

미검증:
- 이번 세션에서는 `127.0.0.1:3200`이 listen 중이 아니어서
  `GET /`, `GET /api/health`, `GET /api/adapters?orgId=...` 런타임 smoke는 재확인하지 못했다.

## 11. Dashboard / Runtime follow-up

수정:
- 파일: `ui/src/components/DashboardCharts.tsx`
- 변경:
  - 기존 4개 chart tile 구조는 유지
  - 각 tile 상단에 작은 meta summary를 추가하고, bar density/label noise를 줄여 `운영 신호`처럼 읽히게 정리
  - `실행 활동`, `긴급도`, `상태`, `완료율`이 KPI row를 그대로 반복하지 않도록 설명과 수치 톤 조정

수정:
- 파일: `ui/vite.config.ts`
- 변경:
  - frontend port는 `UI_PORT` 또는 `VITE_PORT` 기준, 기본값 `5174`
  - backend proxy target은 `API_PORT`, 기본값 `3200`
  - `strictPort: true` 추가

이유:
- 기존에는 Vite frontend port와 backend proxy target이 모두 `PORT`에 엮여 있어
  `--port 5175` 같은 실행과 실제 listen/proxy 기대가 쉽게 꼬였다.

수정:
- 파일: `server/src/app.ts`
- 변경:
  - CORS 허용 목록에 `localhost/127.0.0.1`의 `5173/5174/5175`를 포함
  - 루트 `/`가 `health` payload alias를 반환하도록 유지

재검증:

```bash
corepack pnpm --filter @hagent/server exec tsc --noEmit --pretty false --tsBuildInfoFile /tmp/hagent-server-dashboard.tsbuildinfo -p tsconfig.json
corepack pnpm --filter @hagent/ui exec tsc --noEmit --pretty false --tsBuildInfoFile /tmp/hagent-ui-dashboard.tsbuildinfo -p tsconfig.json
corepack pnpm --filter @hagent/ui exec vite build
env PORT=3210 npm exec pnpm -- --filter @hagent/server dev
curl http://127.0.0.1:3210/
curl http://127.0.0.1:3210/api/health
curl 'http://127.0.0.1:3210/api/adapters?orgId=be70ebc8-3b55-4ff3-827a-264f06c4d2ee'
```

결과:
- `server typecheck` 통과
- `ui typecheck` 통과
- `vite build` 통과
- `GET /` on temporary server (`3210`) → health JSON 반환
- `GET /api/health` on temporary server (`3210`) → health JSON 반환
- `GET /api/adapters?orgId=be70...` on temporary server (`3210`) → `telegram-outbound.connected = true`

메모:
- 기존 `3200` 프로세스는 이 새 코드 이전에 떠 있던 프로세스라서,
  같은 시점 `GET /`는 여전히 `Cannot GET /`를 반환했다.
- 따라서 이번 런타임 판정은 **임시 검증 서버 `3210` 기준 통과**로 기록한다.

## 12. Live restart / UI follow-up

수정:
- 파일: `package.json`
- 파일: `server/src/config.ts`
- 파일: `server/src/routes/adapters.ts`
- 파일: `ui/src/hooks/useSSE.ts`
- 파일: `ui/src/pages/SettingsPage.tsx`
- 파일: `ui/src/components/DashboardCharts.tsx`
- 파일: `ui/src/pages/DashboardPage.tsx`
- 파일: `ui/src/pages/InboxPage.tsx`
- 변경:
  - root `pnpm dev`가 `server + ui`를 같이 띄우도록 정리
  - server 기본 포트를 `3200`으로 맞춤
  - `SSE` reconnect timer의 stale 재시도를 막고 `online/visibilitychange` 재연결 가드를 보강
  - `Settings`에서 integration 상태 출처를 `조직 설정 기반 / process env 기반`으로 직접 표시
  - `DashboardCharts` 설명/메타를 더 짧게 줄여 KPI row와의 중복을 낮춤
  - `Inbox` 상단 보조 패널을 2열로 재배치하고 필터/리허설 블록을 더 조용하게 압축

재검증:

```bash
corepack pnpm --filter @hagent/server exec tsc --noEmit --pretty false --tsBuildInfoFile /tmp/hagent-server-fastfollow.tsbuildinfo -p tsconfig.json
corepack pnpm --filter @hagent/ui exec tsc --noEmit --pretty false --tsBuildInfoFile /tmp/hagent-ui-fastfollow.tsbuildinfo -p tsconfig.json
corepack pnpm --filter @hagent/ui exec vite build
curl http://127.0.0.1:3200/
curl http://127.0.0.1:3200/api/health
curl 'http://127.0.0.1:3200/api/adapters?orgId=be70ebc8-3b55-4ff3-827a-264f06c4d2ee'
curl -I 'http://127.0.0.1:5174/%ED%83%84%EC%9E%90%EB%8B%88%EC%95%84-%EC%98%81%EC%96%B4%ED%95%99%EC%9B%90-%EB%8D%B0%EB%AA%A8-7/dashboard'
curl -I 'http://127.0.0.1:5174/%ED%83%84%EC%9E%90%EB%8B%88%EC%95%84-%EC%98%81%EC%96%B4%ED%95%99%EC%9B%90-%EB%8D%B0%EB%AA%A8-7/inbox'
```

결과:
- `server typecheck` 통과
- `ui typecheck` 통과
- `vite build` 통과
- live `3200` 재기동 후 `GET /`와 `GET /api/health` 모두 health JSON 반환
- live `3200`에서 `GET /api/adapters?orgId=be70...` → `telegram-outbound.connected = true`, `statusSource = "org-configured"`
- `dashboard` route `200 OK`
- `inbox` route `200 OK`

추가 확인:
- 브라우저 수준 `SSE`는 offline/online 전환 후 console error `0`까지는 확인
- 다만 `disconnect -> reconnect -> query invalidate`가 실제 데이터 refresh로 이어지는지는 아직 미검증

미검증:
- Telegram/Kakao 실제 외부 outbound receipt 증적은 이번 라운드에서도 확보하지 못함
- `Dashboard`, `Inbox`는 route/타입/빌드 기준 통과했지만 Playwright screenshot 기반 visual QA는 미실행
