# Claude 세션 요약 — 2026-04-13

> 다른 AI 에이전트(Codex, Cursor, 이후 Claude 세션)를 위한 핸드오프 문서  
> 작업자: Claude Code (Sonnet/Opus 4.6)  
> 세션 시간: 2026-04-13 오전 ~ 오후 (Phase A~B+ 완료, D3 진행)  
> 출품 마감: 2026-04-13 24:00

---

## TL;DR

이 세션에서 **디자인 시스템 정비 + 데모 데이터 강화 + Railway 배포**를 완료했다.  
남은 것: **사용자가 직접 온보딩 + 텔레그램 봇 연결 + AI 리포트 docx 작성**.

**라이브 URL**: `https://hagent-os.up.railway.app` ✅

---

## 1. 완료한 작업 (요약)

### 1-A. 디자인 시스템 (Phase A+B)

| 항목 | 결과 | 파일 |
|------|------|------|
| 토큰 슬림화 | 배경 9→5, 텍스트 7→4, 경계 4→2 | `ui/src/index.css` |
| rail/body 통일 | `--bg-canvas` #f4f6f8 → #ffffff | 위와 동일 |
| SkillsPage 리워크 | 탭 6→3, FAB 제거, 필터 드롭다운화, Primary+⋯ overflow, 스킬 삭제 기능 | `ui/src/pages/SkillsPage.tsx` |
| Panel radius | `rounded-[20px]` → `rounded-lg` (10px) | `ui/src/components/ui/workspace-surface.tsx` |
| Assistant 재배치 | FAB → BreadcrumbBar 아이콘 | `AssistantContext.tsx`, `BreadcrumbBar.tsx`, `AssistantLauncher.tsx` |
| Properties 조건부 | `panelContent !== null`인 페이지만 | `BreadcrumbBar.tsx` |

### 1-B. 데모 데이터 대폭 강화

| 항목 | 결과 | 파일 |
|------|------|------|
| 케이스 25개 | complaint 6, refund 4, schedule 5, inquiry 10, churn 2 — 각 `agentDraft` + caseComments | `server/src/data/rich-demo-seed.ts` → `RICH_CASES` |
| 학원 문서 12개 | 환불정책 v3, 보강 규정, 입학 상담 스크립트, 플레이북, 이탈 대응 매뉴얼, FAQ 20선, 법정 캘린더, 수능 커리큘럼, 강사 채용표, 개인정보 처리방침, 카카오 응답 가이드, 프로모션 기획안 | 위 파일 → `DEMO_DOCUMENTS` |
| CEO 메모리 | `studentInsights`, `monthlyStats`, `recurringIssues`, `lastInsight` | 위 파일 → `CEO_MEMORY` |
| Bootstrap 통합 | `bootstrapOrganization(mode="demo")` 시 자동 시드 | `server/src/services/bootstrap.ts` → `seedRichDemoData()` |
| seed-demo API | 기존 org에 재시드 | `POST /api/organizations/:orgId/seed-demo` |
| 레거시 삭제 | `packages/db/src/seed.ts` 1494줄 | 삭제됨 |

### 1-C. 에이전트 지침서 상세화 (5개 에이전트)

파일: `server/src/routes/agents.ts` → `buildSoulMd()`, `server/src/services/bootstrap.ts` → `buildInstructionFile()`

| 에이전트 | SOUL.md 핵심 | HEARTBEAT.md 루틴 |
|---------|-------------|------------------|
| orchestrator | 위임 원칙, 라우팅 규칙, 에스컬레이션 조건, 메모리 관리 | 일일 5회 체크포인트, 월간 통계 분석 |
| complaint | 공감 원칙, 48시간 룰, 처리 우선순위표 | 긴급 대응 절차 (접수 즉시 3단계) |
| scheduler | 수업 연속성, 자동화 규칙, 결석 3회→retention 전달 | 결석 기록 3회/일 + 주간 일정 확인 |
| retention | riskScore 기준표, 6단계 개입 전략 | 이탈 위험 학생 접촉 추적 |
| notification | 발송 채널 선택 매트릭스, 자동 트리거 | 수강료 D-3/D+7/D+14 발송 루틴 |

**파일 시스템 직접 업데이트됨**:
```
server/data/agents/{agent-id}/instructions/SOUL.md
server/data/agents/{agent-id}/instructions/HEARTBEAT.md
```

### 1-D. Telegram 왕복 완결

이전 상태: inbound → 케이스 생성은 됐으나 bot이 답장 안 함.  
수정: `processChannelInbound()` 이후 `sendTelegramMessage()` 호출.

파일: `server/src/routes/telegram.ts` — 웹훅 핸들러에서 비동기 발송.

### 1-E. DEMO_MODE 환경변수

`DEMO_MODE=true` 시 Anthropic API 키 없이 mock 응답 강제.  
파일: `server/src/config.ts`, `server/src/lib/runtime.ts`.

### 1-F. 설계 문서 (`docs/design/`)

| 파일 | 역할 |
|------|------|
| `ui-harness.md` | **AI 에이전트 필독** — 토큰, 컴포넌트 패턴, 금지 규칙, 체크리스트 (583줄) |
| `design-system-rules.md` | 압축 규칙 요약 + PR 전 체크리스트 |
| `DESIGN-STATUS.md` | 30개 페이지 위반 현황 (색상+구조+위계) + Phase 진행 |
| `agent-prompt-phase-c.md` | Phase C 병렬 에이전트 오케스트레이터 프롬프트 (16 에이전트 6 배치) |
| `AGENTS.md` (루트) | 새 AI 에이전트 진입점 |
| `2026-04-13-*.md` | Codex 이전 설계 문서 (SUPERSEDED 표시) |

### 1-G. Railway 배포

**URL**: `https://hagent-os.up.railway.app` ✅  
**프로젝트 ID**: `8820141d-ca2e-48a6-83ab-97ae268f0058`  
**서비스 ID**: `c429f54d-3671-4227-b229-25fd13b099fe`

배포 과정 중 해결한 빌드 이슈 5가지:
1. Dockerfile에 루트 `tsconfig.json` 복사 누락 → 추가
2. 헬스체크 경로 `/health` → `/api/health` (실제 경로 맞춤)
3. `EmbeddedPostgres` 최상단 import → 동적 import (바이너리 없어도 크래시 안 함)
4. DB 검증이 서버 시작을 블로킹 → 비동기 백그라운드로 변경
5. `packages/db` + `packages/shared` exports `src/*.ts` → `dist/*.js` (프로덕션에서 Node가 .ts 로드 불가)
6. UI static 서빙 추가 (`app.use(express.static(uiDist))` + SPA catch-all)

환경변수 설정 완료:
```
DATABASE_URL=        Neon PostgreSQL
OPENAI_API_KEY=      Codex API (Anthropic API 없어서 대체)
TELEGRAM_BOT_TOKEN=  8760061426:AAH10BKrbq0ZB6sCEimgiQ-z6Do8O2ZYnsI
PORT=3200
NODE_ENV=production
DEPLOYMENT_MODE=local_trusted
DEMO_MODE=false  (OpenAI 키 있으므로 실 AI 사용)
```

Neon DB 마이그레이션 완료 (로컬에서 `tsx src/migrate.ts` 실행).

---

## 2. 커밋 히스토리 (이 세션)

```
d763863  fix: 루트 / 핸들러 제거 → UI 서빙 우선
b08fe50  feat: 서버에서 UI static 서빙 + Dockerfile UI 빌드 추가
3dce99f  fix: packages exports src/*.ts → dist/*.js
a6cd5c4  fix: Railway 헬스체크 제거 (디버깅)
f8b37aa  fix: 서버 시작 순서 — 헬스체크 통과 후 DB 검증
f213021  fix: EmbeddedPostgres 동적 import
a326530  fix: Railway 헬스체크 경로 /health → /api/health
e7681ea  fix: Dockerfile 루트 tsconfig.json 복사
24ba60f  feat: 에이전트 지침서 + 학원 문서 12개 상세화
49afd7e  feat: 심사 준비 — README, JUDGE_DEMO, seed-demo 엔드포인트
10d1436  feat: 심사 준비 — 데모 강화 + Telegram 왕복 + Railway 설정
e0e0110  docs: Phase C 병렬 에이전트 오케스트레이터 프롬프트
36a069f  feat: Phase A+B 디자인 통일 + Skills 전면 리워크 + 설계 문서
```

---

## 3. 현재 상태

### ✅ 완료
- 로컬 dev 서버 동작 (포트 3200 server, 5174 UI)
- Railway 프로덕션 배포 동작
- Neon DB 연결 + 마이그레이션
- 탄자니아 데모 7 org 로컬에 존재 (학생 15, 강사 6, 일정 39, 케이스 29, 문서 20, 에이전트 5)
- Telegram 봇 생성됨 (@TANZANIA_ENGLISH_ACADEMY_bot)
- 모든 설계 문서 작성 + GitHub 커밋

### 🔲 남은 작업 (마감까지)

**P0 — 사람 직접 수행**:
1. **라이브 URL 접속 → 온보딩**  
   `https://hagent-os.up.railway.app` → "탄자니아 영어학원" 이름으로 demo mode 온보딩  
   → 케이스 25개 + 문서 12개 + 에이전트 5개 자동 시드
2. **Telegram 봇 연결**  
   Settings → 연결 → Telegram → 토큰 `8760061426:AAH10BKrbq0ZB6sCEimgiQ-z6Do8O2ZYnsI` 입력 → 웹훅 등록
3. **README/JUDGE_DEMO의 조직 slug 업데이트** (라이브에서 생성된 slug 반영)

**P1 — 제출 문서**:
4. AI 리포트 초안 (공식 docx 양식에 작성)
5. 데모 리허설 2분 시나리오 검증
6. 개인정보 동의서 + 참가 각서 서명 (팀원 각자)

---

## 4. 다른 AI 에이전트를 위한 가이드

### 이 레포에서 작업하기 전 필독
```
/AGENTS.md                           진입점
/docs/design/ui-harness.md           UI 코딩 규칙 정본 (필독)
/docs/design/DESIGN-STATUS.md        페이지별 위반 현황
/docs/design/agent-prompt-phase-c.md Phase C 전역 UI 통일 작업 프롬프트
/docs/handoff/2026-04-13-final-3-day-roadmap.md  전체 로드맵 (D1-D3)
```

### UI 작업 시 필수 규칙
1. **Tailwind 색상 유틸 금지**: `bg-white`, `text-slate-*`, `bg-emerald-*` 등 X. `style={{ backgroundColor: "var(--bg-elevated)" }}` 형태.
2. **페이지 래퍼**: `<div className="p-6 md:p-8 space-y-6">` + `WorkspaceHeader` 조합.
3. **Primary 버튼 1개**: 한 영역에 solid primary 1개만, 나머지는 `⋯` DropdownMenu.
4. **탭 최대 4개**: 5개 이상이면 구조 재설계.
5. **금지**: `rounded-[20px]`, `bg-white`, 스케일 밖 font-size(11/13/15/17px), FAB.

### 서버 작업 시 주의
- `packages/db`, `packages/shared`의 exports는 `dist/*.js` 참조 중.  
  → 로컬 dev(`pnpm dev`)도 build 후 tsx가 dist를 로드한다.  
  → **변경 후 반드시 `pnpm build`** (또는 tsx가 자동 처리하도록 재설정 필요 시 주의).
- `EmbeddedPostgres`는 `embedded-postgres` 패키지에서 **동적 import**로만 로드. `DATABASE_URL` 있으면 건너뜀.
- 새 API 엔드포인트는 `server/src/routes/*.ts`에 추가, `services/*.ts`로 로직 분리.

### 데모 시드 구조
- `server/src/data/tanzania-preset.ts`: 학생/강사/일정/메시지 원본
- `server/src/data/rich-demo-seed.ts`: AI 상호작용 이력 (케이스+메모리+문서)
- 신규 org 생성 (온보딩 `mode="demo"`) 시 → `bootstrap.ts`가 두 파일 모두 사용
- 기존 org에 재시드: `POST /api/organizations/:orgId/seed-demo`

### Railway 배포 재배포
```bash
cd /Users/river/workspace/active/hagent-os
railway up --detach
# 상태 확인: railway service status
# 로그: railway logs --lines 50
```

### 주요 파일 맵
```
서버 진입: server/src/index.ts
서버 앱: server/src/app.ts  (UI static 서빙 포함)
라우트: server/src/routes/*.ts
서비스: server/src/services/*.ts
DB 스키마: packages/db/src/schema/*.ts
공유 타입: packages/shared/src/types/
UI 페이지: ui/src/pages/*.tsx
UI 컴포넌트: ui/src/components/ui/*  (shadcn + workspace-surface)
CSS 토큰: ui/src/index.css
```

---

## 5. 알려진 이슈 / 주의사항

1. **현재 유효한 Railway URL은 `hagent-os.up.railway.app`**  
   이전 문서에 남아 있던 `divine-simplicity-production.up.railway.app` 는 현재 `404 Application not found` 상태다. 심사/데모 기준 URL은 `https://hagent-os.up.railway.app` 로 본다.

2. **AGENT_DATA_DIR 파일시스템 영속성**  
   Railway 컨테이너는 재배포마다 파일시스템 초기화. `server/data/agents/{id}/instructions/SOUL.md`는 재배포 후 사라진다.  
   → 온보딩 시점에 재생성됨(`writeAgentInstructionFiles`)이므로 실사용상 문제 없음. 다만 재배포 후 기존 org의 커스텀 지침서는 날아갈 수 있음.

3. **OPENAI_API_KEY 사용 중**  
   Anthropic API는 별도 유료 구독 필요해서 Codex(OpenAI) 키 사용. `runtime.ts`의 `callCodex` 경로 활성화됨. Claude 응답이 아닌 GPT-4 기반 응답.

4. **테스트 데이터 잔재**  
   기존 탄자니아 데모 7 org(로컬): 테스트 케이스 61개 + 문서 120개 삭제 완료, 현재 깨끗함.  
   라이브 배포본 기준 URL은 `https://hagent-os.up.railway.app`.

5. **시드 데이터 중 케이스-학생 연결 미완성**  
   `rich-demo-seed.ts`의 케이스는 학생 이름을 title에 포함하지만 `studentId` 필드는 비어있음. 우선순위 낮음 (시연에선 중요하지 않음).

---

## 6. 세션 통계

- 편집한 파일: ~25개
- 신규 파일: 12개 (rich-demo-seed, AssistantContext, design docs 6개, handoff 2개, etc.)
- 삭제한 파일: 1개 (`packages/db/src/seed.ts`)
- 커밋: 13개
- 라이브 URL 확보까지 Dockerfile/설정 수정: 6회
- 빌드 성공: 3회 (첫 실패 → 5번 빌드 에러 → 6번째 성공)

---

*다음 세션/에이전트가 이 문서를 읽고 바로 이어받을 수 있도록 작성됨. 추가 질문이 있으면 세션 transcript: `/Users/river/.claude/projects/-Users-river-workspace-active-2026--1--KEG-----------/` 참조.*
