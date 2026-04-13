---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-13
up: "[[.agent/system/memory/MEMORY]]"
aliases:
  - daily-memory
  - 일일기억
---
# Daily Memory

이 파일은 단기 기억과 핸드오프를 위한 요약본이다.

## 현재 상태 (Day 8 — 2026-04-13)

### 앱 개발 현황
- **레포 분리 완료**: 독립 설치형 레포 `/Users/river/workspace/active/hagent-os/`
- **GitHub**: `https://github.com/River-181/hagent-os`
- **Live URL**: `https://hagent-os.up.railway.app`
- **Railway**: `https://railway.com/invite/fmzuFpxK1li`
- **Neon DB**: `https://console.neon.tech/app/projects/rough-feather-95020200`
- **Telegram bot**: `https://t.me/TANZANIA_ENGLISH_ACADEMY_bot`
- **Kakao channel**: `https://pf.kakao.com/_raDdX`
- **포트**: Server 3200, UI 5174
- **DB**: `hagent_os` (brew postgres@17 port 5432)
- **최근 확인 커밋 흐름**: `c44d5a5` → `e4b43f3` → `24ba60f` → `e7681ea` → `a326530` → `f213021` → `f8b37aa`
- **실행 명령**: `cd /Users/river/workspace/active/hagent-os && pnpm dev`

### Day 6 완료 작업 (S-DEV-022)
- **독립 레포 구축**: hagent-os 신규 초기화, DB hagent_os, 포트 3200/5174
- **E2E 재구축 핵심 파일**:
  - `server/src/services/execution.ts` — Case 상태 자동 변경, 댓글 자동 삽입
  - `server/src/routes/approvals.ts` — reject rollback, agent_hire 승인 자동화
  - `server/src/routes/agents.ts` — SOUL.md 자동 생성, agentId 격리
  - `server/src/routes/agent-hires.ts` — 신규 고용 플로우
  - `server/src/routes/organizations.ts` — POST/DELETE cascade
  - `server/src/lib/claude.ts` — 키워드 기반 mock 라우팅 (민원/이탈/일정/기타)
  - `server/src/routes/orchestrator.ts` — 실제 지시문으로 케이스 제목
- **UI 전면 재구축**: OnboardingPage(4단계), AgentDetailPage(ChatBubble+Tabs), OrgChart(reportsTo 트리), Approvals(실동작), OrganizationRail(멀티 학원)
- **Fallback 데이터 완전 제거**: 탄자니아 참조 11파일 모두 실제 API로 교체
- **DB SQL 직접 실행**: reports_to, student_schedules, classGroup, shuttle, email 컬럼

### 01:30 미팅 이슈 (2026-04-12)
- **에이전트 실제 작동 체감 안 됨**: dispatch → 케이스 생성 → 에이전트 실행 → 댓글 흐름이 눈에 보이지 않음
- **승인 화면 스크롤 버그**: ApprovalsPage / ApprovalDetailPage overflow 레이아웃 버그 의심
- 관련 회의록: `04_증빙/04_meetings/2026-04-12_4차-배포전-점검-미팅.md`

### Day 7 이번 세션 완료
- [x] 승인 화면 스크롤 버그 수정 (ApprovalsPage min-h-0 + ApprovalDetailPage wrapper)
- [x] Settings Danger Zone (데이터 export JSON + 기관 삭제 CASCADE)
- [x] 지식베이스 7종 실질화 + "에이전트에게 보완 요청" 버튼 제거
- [x] 온보딩 전체화면 독립 route 분리
- [x] 탄자니아 루틴 3종 + 운영 목표 3종 생성
- [x] Goals 페이지 재설계 (Paperclip 스타일 클린 목록)
- [x] GoalDetailPage 신규
- [x] Goals ↔ Projects 양방향 연결

### 남은 사항 (D-1)
- [x] Railway 배포 → 라이브 URL 확보
- [x] `River-181/hagent-os` README 작성
- [ ] AI 리포트 `docx -> PDF` 최종 변환
- [ ] 개인정보동의서 + 참가각서 서명
- [ ] 제출 이메일 발송

## 다음 세션 체크리스트 (D7)

### 필독 (2분)
1. `.agent/system/ops/PLAN.md` — P0 항목 확인
2. `.agent/system/ops/PROGRESS.md` — 완료 섹션 확인

### D7 목표 (오늘)
1. **라이브 배포 검증 완료** — `https://hagent-os.up.railway.app`
2. AI 리포트 `docx -> PDF` 마감
3. 서명 문서 2종 완료
4. 제출 이메일 발송

### 마감
- **2026-04-13 24:00** (D-1)

### 대회 필수 제출물
- [x] GitHub public URL (`https://github.com/River-181/hagent-os`)
- [x] 라이브 URL (`https://hagent-os.up.railway.app`)
- [ ] AI 리포트 (.docx) — `04_증빙` raw material 사용
- [ ] 개인정보 동의서
- [ ] 참가 각서

---

## Day 8 추가 메모 — 2026-04-13

### 제품 정본 현황 업데이트
- 제품 정본 레포는 계속 `/Users/river/workspace/active/hagent-os/`다.
- Day 8 기준 마지막 핵심 커밋은 `e4b43f3` (`Polish issue properties and academy operations UI`)이며, 직전 UI 기반 정리 커밋은 `c44d5a5`다.
- `issue/properties UI`, `schedule interaction`, `students/settings 안정화`, `telegram approval/outbound`, `skills/capabilities pack`가 Day 8 범위에 포함됐다.

### Day 8 완료 작업
- [x] `05_제출/ai-report-final.md`를 공식 6문항 제출 형식으로 정리하고 pre-Ralph snapshot(`15902fc`) 기준선을 확보
- [x] Excalidraw 3종(`01_민원-처리-플로우`, `02_AI-협업-구조`, `03_시스템-4계층`) + `99_comprehensive-architecture` 제출 비주얼 자산 정리
- [x] `Case/Issue`를 paperclip 방향으로 단순화
  - `done` 컬럼 복구
  - `Comments / Sub-issues / Activity`
  - `Properties` 패널 토글 복원
- [x] `Schedule` 주간/월간 뷰 상호작용 1차 정리
- [x] `Students / Instructors / Agents / Settings` route/panel 안정화 1차 반영
- [x] `Telegram inbound -> approval -> outbound/bridge` 흐름 검증
- [x] Day 8 증빙/메모리/대시보드/진행 현황 동기화
- [x] `Telegram outbound` approval delivery 및 readiness 표면 추가
- [x] `students -> cases`, `schedule -> cases` drill-down 추가
- [x] 우측 `운영 요약` 패널을 `cases / approvals / projects`까지 확장
- [x] `judge_demo`와 `public_byom` 분리 배포 전략 문서화
- [x] Ralph 병렬 A에서 허용 경로 한정 증빙/메모리/로그 전수 동기화 완료
- [x] 현재 세션 재검증
  - `corepack pnpm --filter @hagent/ui typecheck`
  - `corepack pnpm --filter @hagent/ui build`
  - `corepack pnpm --filter @hagent/db build`
  - `corepack pnpm --filter @hagent/server typecheck`
  - `curl http://127.0.0.1:3200/api/health` → `200`
  - `curl http://127.0.0.1:5174/탄자니아-영어학원-데모-7/dashboard` → `200`

### 오늘 핵심 결정 (2026-04-13)
- `05_제출/ai-report-final.md`와 Excalidraw 3종은 `15902fc` pre-Ralph snapshot을 Day 8 제출 기준선으로 본다.
- Ralph 병렬 작업은 코드 수정 없이 허용 경로 evidence-only sync로 분리해 감사 추적선을 유지한다.
- 후속 Ralph 병렬 세션은 `15902fc` 이후 diff만 누적하고 동일 intake-first 규칙을 계속 적용한다.

### Day 8 남은 블로커
- [ ] `OPENAI_API_KEY` live 검증
- [ ] `LAW_OC` live 법령 근거 검증
- [ ] optional `KAKAO_OUTBOUND_PROVIDER_URL` 검증
- [ ] `GOOGLE_CALENDAR_ACCESS_TOKEN` live sync 검증
- [ ] 4개 심사 시나리오 최종 리허설
- [ ] `judge_demo`용 Docker/compose 구현
- [ ] AI 리포트 `docx -> PDF`
- [ ] 개인정보동의서 / 참가각서 서명
- [ ] 제출 이메일 발송

### 현재 워킹트리 주의점
- `hagent-os`는 아직 dirty 상태다.
  - `server/src/routes/organizations.ts`
  - `ui/src/hooks/useSSE.ts`
  - `ui/src/pages/SettingsPage.tsx`
  - `docs/handoff/*`
  - `test-results/`
- 다음 세션은 `commit/push 전 최종 regression`을 먼저 확인해야 한다.

### Day 8 Codex 사용량 추정 (최종 업데이트)

#### 사전 Ralph loop 세션
- `S-PROD-026`: `280,000` tokens
- `S-EVID-027`: `12,000` tokens
- `S-PROD-028`: `96,000` tokens
- `S-PLAN-029`: `18,000` tokens
- `S-EVID-030`: `14,000` tokens
- `S-PROD-031`: `90,000` tokens
- `S-SUB-032`: `45,000` tokens
- `S-RALPH-033`: `16,000` tokens
소계: **571,000 tokens**

#### Ralph 루프 1차 병렬 (A~E)
- `S-RALPH1-A`: `18,000` tokens
- `S-RALPH1-B`: `17,000` tokens
- `S-RALPH1-C`: `16,000` tokens
- `S-RALPH1-D`: `15,000` tokens
- `S-RALPH1-E`: `14,000` tokens
소계: **80,000 tokens**

#### Ralph 루프 2차 T-세션
- `S-RALPH2-SMOKE`: `22,000` tokens
- `S-RALPH2-CASE`: `28,000` tokens
- `S-RALPH2-CASE-LEAN`: `16,000` tokens
- `S-RALPH2-SETTINGS`: `20,000` tokens
- `S-RALPH2-SETTINGS-V2`: `14,000` tokens
- `S-RALPH2-SEEDLOG`: `18,000` tokens
- `S-RALPH2-SEEDLOG-RETRY`: `12,000` tokens
- `S-RALPH2-UIPOLISH`: `32,000` tokens
- `S-RALPH2-SECURITY`: `24,000` tokens
소계: **186,000 tokens**

#### Ralph 루프 3차 T-세션
- `S-RALPH3-ROUTINE`: `20,000` tokens
- `S-RALPH3-DOCX`: `35,000` tokens
- `S-RALPH3-PNG`: `16,000` tokens
- `S-RALPH3-SECURITY`: `18,000` tokens
- `S-RALPH3-ASSISTANT`: `19,000` tokens
소계: **108,000 tokens**

#### Claude (OpenUsage 실측 — 2026-04-13 스크린샷)
- Claude Max 5x 플랜 (오케스트레이터 + 병렬 서브에이전트 포함): **331,000,000 tokens** (Day 8 실측)
- Extra usage: **$168.46**
- 30일 누적: **1,300,000,000 tokens / $688.98**

**Day 8 Codex 총 추정: ~1,200,000 tokens** (별도 ChatGPT Pro 플랜)
**Day 8 Claude 실측: 331,000,000 tokens (OpenUsage)**
**Day 8 전체 AI 총: Claude 331M (실측) + Codex ~1.2M (추정)**

### 현재 세션에서 다음 에이전트가 바로 알아야 할 것
- 라이브 배포 URL은 `https://hagent-os.up.railway.app`가 canonical이다.
- 공개 링크는 아래 5개를 같이 쓴다.
  - GitHub: `https://github.com/River-181/hagent-os`
  - Railway: `https://railway.com/invite/fmzuFpxK1li`
  - Neon DB: `https://console.neon.tech/app/projects/rough-feather-95020200`
  - Telegram bot: `https://t.me/TANZANIA_ENGLISH_ACADEMY_bot`
  - Kakao channel: `https://pf.kakao.com/_raDdX`
- `Telegram Bot`은 실제 bot metadata가 구성된 상태이고 앱에는 `telegram inbound/outbound/approval delivery` 경로가 있다.
- 심사용 URL은 `judge_demo` 고정 데모로 가고 공개 URL은 `public_byom`으로 분리하는 것이 canonical이다.
- 심사용 기본 경험은 `심사위원 개인 키 입력`이 아니라 `사전 연결된 모델 + seed data`를 바로 체험하는 형태다.
- 디자인 rollout은 아직 금지다. `Skills` 화면이 현재 유일한 디자인 pilot이며 `paperclip 구조 + Toss 토큰 discipline`을 기준 샘플로 먼저 확정해야 한다.
- `version bump`는 아직 하지 않는다. `Skills` pilot 승인과 좁은 확산(`Settings / Case / Project / Agent`) 전에는 태그나 릴리즈를 올리지 않는다.
- 제출용 본문과 도식 자산은 `05_제출/ai-report-final.md`, `assets/excaildraw/*.excalidraw`, `03_제품/hagent-os/diagrams/99_comprehensive-architecture.md` 조합이 canonical이다.
- 프롬프트 보드 정본은 `assets/excaildraw/prompf-2026-04-09.excalidraw.md`다. 명령형 자연어 블록은 제출용/업무 지시문 톤으로 전면 정제된 상태다.
- 경로 주의: 현재 live source 폴더는 `assets/excaildraw/`이며, 일부 과거 ops/automation 문서에는 legacy 표기 `assets/excalidraw/`가 남아 있다.
- `build-ai-report-docx.py`는 `assets/excaildraw/`와 legacy `assets/excalidraw/`를 모두 탐색하도록 보강했다. 다만 `ai-report-final.md` 이미지 참조 29개 중 11개는 아직 실파일이 없어 docx full rebuild는 미검증 상태다.
- 증빙/핸드오프 핵심 경로:
  - `/Users/river/workspace/active/hagent-os/.playwright-cli/page-2026-04-12T21-42-48-976Z.png`
  - `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-d1-verification.md`
  - `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-full-regression.md`
  - `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-master-evidence.md`
  - `/Users/river/workspace/active/hagent-os/output/playwright/skills-pilot/skills-after-2026-04-13.png`
