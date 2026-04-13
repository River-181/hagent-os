---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/polished-honking-hinton.md"
synced_at: 2026-04-13
---
# Plan: KEG 콘테스트 심사 준비 — 데모 강화 + 배포

## Context

2026-04-13 24:00 마감. HagentOS를 심사위원이 실제로 체험할 수 있는 상태로 만들어야 함.
심사 기준: 기술적 완성도 / AI 활용 능력 / 기획력·실무 접합성 / 창의성.

**5가지 핵심 요구사항:**
1. 탄자니아 영어학원 데모에 풍부한 AI 상호작용 이력(케이스+메모리) 추가
2. 1 repo 2 mode 전략 (범용 사용자 + 심사위원 DEMO_MODE)
3. AI 모델 없어도 동작하는 DEMO_MODE (판사가 API 키 없어도 체험 가능)
4. Telegram 봇 → 케이스 등록 → AI 응답 → 텔레그램 답변 발송 완결
5. 에이전트 메모리 시스템을 눈에 보이게 (학원 상황을 기억하고 있는 AI)

**핵심 발견 (코드 탐색 결과):**
- `processChannelInbound()` → `autoRouteCase()` → `executeAgentRun()` 까지 동작 (awaitRouting=true 기본값)
- `execution.ts:479`: `agentDraft = agentOutput.suggestedReply` — AI 응답이 case에 저장됨
- `telegram-outbound.ts`: `sendTelegramMessage(db, { organizationId, caseRecord, approvalId, draft })` 존재하나 Telegram 웹훅 핸들러에서 **절대 호출 안 됨** → 이것만 고치면 왕복 완성
- Mock 모드: API 키 없으면 `runtime.ts`에서 자동 fallback → `DEMO_MODE=true` 명시적 추가는 5줄 변경
- Dockerfile / railway.toml 없음 → 새로 생성 필요

---

## 구현 순서 (의존성 기준)

```
1. DEMO_MODE env var     [30분] — 독립, 가장 먼저
2. Rich demo seed data   [3시간] — bootstrap.ts 의존
3. Telegram outbound fix [45분] — webhook.ts 이해 후
4. Railway deployment    [1시간] — 위 3개 완료 후
5. Docs (JUDGE_DEMO.md + README) [45분] — 배포 후 URL 넣기
```

---

## Step 1 — DEMO_MODE 환경 변수

**파일:** `server/src/lib/config.ts`
```ts
// loadConfig() 반환 객체에 추가
demoMode: process.env.DEMO_MODE === "true",
```

**파일:** `server/src/lib/runtime.ts`
- `runWithAdapter()` 함수에서, API 호출 직전에:
```ts
if (config.demoMode || !config.anthropicApiKey) {
  return getMockResponse(agentType, message) // 이미 존재하는 함수
}
```
- mock response metadata에 `{ demo: true }` 표시 추가

**검증:** `DEMO_MODE=true pnpm dev` → 케이스 생성 → AI 응답이 mock 텍스트로 나오는지 확인

---

## Step 2 — 풍부한 데모 시드 데이터

### 2-A. 새 파일: `server/src/data/rich-demo-seed.ts`

**RICH_CASES** (25개) — 각 케이스:
```ts
{
  title: "이수아 무단결석 3회 — 학부모 상담 필요",
  type: "complaint",
  status: "done",
  severity: "same_day",
  source: "kakao",
  agentDraft: "이수아 학생이 3주 연속 월/수요일 무단결석 패턴을 보이고 있습니다. 학부모와 직접 상담을 권장하며, 이번 주 금요일 오후 2시 상담 예약을 제안드립니다.",
  // metadata: { senderId, threadId, caseKind }
}
```

**케이스 종류 분포** (총 25개):
- `complaint` 6개 (학부모 민원, 학생 이탈 위험)
- `refund` 4개 (환불 요청, 수강료 조정)
- `schedule` 5개 (보강, 일정 변경)
- `inquiry` 5개 (입학 상담, FAQ)
- `payment` 3개 (결제 안내, 연체)
- `churn` 2개 (이탈 리스크 알림)

**RICH_COMMENTS** — 케이스당 2-3개:
```ts
{ caseId: "ref:케이스제목", authorType: "agent", content: "학부모에게 카카오톡 메시지를 발송했습니다." }
{ caseId: "ref:케이스제목", authorType: "system", content: "케이스 상태가 in_progress → done으로 변경되었습니다." }
```

**CEO_MEMORY** — CEO 에이전트 memory JSON:
```ts
{
  studentInsights: {
    "이수아": "3주 연속 결석/지각. 2026-04-08 학부모 상담 권고. 이탈 위험 높음",
    "김서준": "월요일 결석 패턴. 보강 요청 2회 누적",
    "한지민": "고3 수능 압박 스트레스. 심리 상담 연계 고려"
  },
  monthlyStats: { resolvedCases: 21, pendingCases: 4, escalatedCases: 3 },
  recurringIssues: ["월요일 결석 집중", "상반기 환불 요청 증가"],
  lastInsight: "이번 달 이탈 위험 학생 3명 — 이수아 > 김서준 > 한지민 순 우선순위",
  updatedAt: "2026-04-13T09:00:00+09:00"
}
```

### 2-B. `server/src/services/bootstrap.ts` 수정

`bootstrapOrganization()` 함수 내 demo mode 분기 추가:
```ts
// 기존 setup case 생성 이후에 추가
if (mode === "demo") {
  await seedRichDemoData(db, { organizationId: org.id, agents })
}
```

`seedRichDemoData(db, { organizationId, agents })` 함수 (같은 파일 또는 rich-demo-seed.ts에):
1. `RICH_CASES` → `db.insert(schema.cases)` (caseId 배열 저장)
2. `RICH_COMMENTS` → `db.insert(schema.caseComments)`
3. CEO 에이전트 찾아서 → `db.update(schema.agents).set({ memory: CEO_MEMORY })`

### 2-C. Demo seed API endpoint

`server/src/routes/organizations.ts` 또는 새 파일에:
```
POST /api/organizations/:orgId/seed-demo
```
- `DEMO_MODE=true` 또는 `NODE_ENV=development` 환경에서만 허용
- `seedRichDemoData()` 호출
- 온보딩 완료 후 자동 호출 OR 수동 호출

**검증:** POST `/api/organizations/:orgId/seed-demo` → GET `/api/cases?orgId=:id` → 25개 케이스 + agentDraft 확인

---

## Step 3 — Telegram Outbound 완결

**파일:** `server/src/routes/telegram.ts` (웹훅 핸들러, 현재 51-101줄 근처)

`processChannelInbound()` 호출 후:
```ts
const result = await processChannelInbound(db, "telegram", normalized, {
  awaitRouting: true,  // 이미 기본값이지만 명시
  organization,
})

// === 추가할 코드 ===
// agentDraft 가져오기 (AI가 케이스에 응답을 저장함)
if (result.caseId) {
  const [updatedCase] = await db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.id, result.caseId))

  const draft = updatedCase?.agentDraft
  if (draft) {
    // 비동기 발송 (응답 지연 방지)
    void sendTelegramMessage(db, {
      organizationId: result.organizationId,
      caseRecord: updatedCase,
      approvalId: `telegram-auto-${result.caseId}`,
      draft,
      mode: "auto",
    }).catch(() => null)  // 실패해도 케이스 접수는 성공 처리
  }
}
// === 추가 끝 ===
```

**import 추가:**
```ts
import { sendTelegramMessage } from "../services/integrations/telegram-outbound.js"
import { eq } from "drizzle-orm"
import * as schema from "@hagent/db"
```

**검증:**
1. Tanzania 데모 org Telegram 봇 토큰 연결 (Settings → 연결 → Telegram)
2. 텔레그램 봇에 "환불 규정 알려줘" 전송
3. 10초 이내 AI 응답 수신 확인

---

## Step 4 — Railway 배포

### 4-A. `Dockerfile` (repo root)
```dockerfile
FROM node:20-slim
RUN npm install -g corepack && corepack enable pnpm
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY server/ ./server/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hagent/db build
RUN pnpm --filter @hagent/shared build
RUN pnpm --filter @hagent/server build
EXPOSE 3200
CMD ["node", "server/dist/index.js"]
```

### 4-B. `railway.toml` (repo root)
```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "node server/dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30

[[services]]
name = "hagent-server"
```

### 4-C. Railway 환경 변수 설정
```
DATABASE_URL=        (Neon.tech PostgreSQL URL)
ANTHROPIC_API_KEY=   (실제 심사용)
PORT=3200
NODE_ENV=production
DEPLOYMENT_MODE=local_trusted
```

**검증:** Railway 배포 → `curl https://{railway-url}/health` → `{ ok: true }` 확인

---

## Step 5 — 심사 문서

### 5-A. `JUDGE_DEMO.md` (repo root)
내용:
- 라이브 URL + 로그인 없이 바로 접속 가능한 Tanzania 데모 경로
- Telegram 봇 링크 + "이 메시지를 보내보세요" 예시 3개
- 2분 데모 시나리오 (단계별 스크린샷 경로 포함)
- 로컬 실행 with DEMO_MODE (API 키 불필요)
- 에이전트 메모리 확인 경로 (AgentDetail → Memory 탭)

### 5-B. `README.md` 업데이트
- 최상단: 라이브 데모 URL 배너
- AI 도구 섹션: Claude Code / Codex / Anthropic API
- 빠른 시작 (DEMO_MODE)
- 심사위원 가이드 → JUDGE_DEMO.md 링크

---

## Step 6 — 워크스페이스 플랜 저장

위 플랜을 KEG 워크스페이스에도 저장:
- 경로: `03_제품/DEMO-LAUNCH-PLAN.md`
- Obsidian frontmatter 포함
- PROGRESS.md 업데이트

---

## 변경 파일 요약

| 파일 | 변경 유형 | 크기 |
|------|----------|------|
| `server/src/lib/config.ts` | 수정 | tiny |
| `server/src/lib/runtime.ts` | 수정 | tiny |
| `server/src/data/rich-demo-seed.ts` | **신규** | large |
| `server/src/services/bootstrap.ts` | 수정 | small |
| `server/src/routes/telegram.ts` | 수정 | small |
| `Dockerfile` | **신규** | small |
| `railway.toml` | **신규** | tiny |
| `JUDGE_DEMO.md` | **신규** | medium |
| `README.md` | 수정 | small |
| `03_제품/DEMO-LAUNCH-PLAN.md` (KEG workspace) | **신규** | medium |

---

## 검증 시나리오 (최종)

1. `DEMO_MODE=true pnpm dev` → 케이스 생성 → mock 응답 확인
2. Tanzania 데모 org → 케이스 목록 → 25개 + agentDraft 표시
3. AgentDetail → CEO 에이전트 → Memory 탭 → `studentInsights` JSON 표시
4. Telegram 봇 메시지 전송 → 10초 내 AI 응답 수신
5. Railway URL → 헬스체크 → 탄자니아 데모 org 접속
6. 2분 데모 시나리오 리허설 통과
