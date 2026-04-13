---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-13
up: "[[.agent/system/memory/MEMORY]]"
aliases:
  - long-term-memory
  - 장기기억
---
# Long-Term Memory

## 대회 핵심

- 대회명: 2026 제1회 KEG 바이브코딩 콘테스트
- 주제: AI활용 차세대 교육 솔루션
- 기간: 2026-04-06 ~ 2026-04-13 / 마감: 2026-04-13 24:00
- 제출물 5개: GitHub(public) + **라이브 URL(필수)** + AI 리포트(.docx→PDF, 2섹션) + 개인정보동의서 + 참가각서
- 심사 4개: 기술 완성도, AI 활용 능력/효율성, 기획력/실무접합성, 창의성
- 정본: `01_대회정보/바이브코딩공모전_공지.md`

## 팀 핵심

- 이승보 (CEO): 한남대 / Orchestrator + 에이전트 개발 담당
- 김주용 (COO): 충남대 / UI + 인프라 + 배포 담당
- 두 사람 모두 풀스택 + AI 네이티브
- 정본: `01_대회정보/team_profiles.md`

## 제품 확정 정보 ← 신규 AI 에이전트는 여기서 시작

### 제품명
HagentOS (Hagwon + Agent + OS)
"한국 교육 기관을 위한 오픈소스 AI 에이전트 오케스트레이션 플랫폼"

### MVP 범위 (D5-D8 빌드)
- Must: Orchestrator + Complaint Agent + Retention Agent + Approval Dashboard + Heartbeat cron
- Scheduler Agent = UI only (full agent logic는 Phase 1)
- 모바일 반응형 (원장이 폰으로 사용)

### 기술 스택 (확정)
- Frontend: **React 19 + Vite 6** + Tailwind CSS v4 + shadcn/ui + TanStack Query
- Backend: **Express v5** + TypeScript ESM
- DB: PostgreSQL 17 + Drizzle ORM (brew postgres 로컬 / Neon.tech 배포)
- AI: Claude API (Sonnet 4.6) + Mock fallback (API 키 없어도 동작)
- Auth: local_trusted 모드 (단일 원장, no next-auth)
- Real-time: SSE via EventEmitter
- 배포: **Railway** (서버+UI) + Neon.tech 또는 Railway PostgreSQL (DB)

### 배포 원칙 (Day 8 확정)
- 배포는 **하나의 코드베이스 두 모드**로 간다.
  - `judge_demo`: 심사용 고정 데모 인스턴스
  - `public_byom`: 사용자 모델 연결형 공개 인스턴스
- 심사용은 `탄자니아 영어학원` seed data와 사전 연결된 모델을 포함한 완성 데모여야 한다.
- 심사위원에게 `모델 키 입력`을 요구하지 않는다. 선택적으로만 `내 모델 연결`을 연다.
- 심사용 인프라 기본안은 `GCP VM + Docker Compose`다.
- 공개용은 onboarding과 org bootstrap을 유지하고 사용자가 자기 모델과 자기 데이터를 붙인다.

### 디자인 시스템
- 북극성: 토스 앱 UI (색상 토큰 직접 추출)
- Primary: `#0ea5b0` (teal) / Background: `#ffffff` / `#f6f7f9` / Dark base: `#17171c`
- Grey 스케일: Toss 원본 (`#f9fafb` ~ `#191f28`)
- 폰트: Pretendard (한국어 최적화, Toss 유사)
- 레이아웃: 4존 — 72px rail + 240px sidebar + flex-1 main + 320px properties panel
- Day 8 late pilot 기준:
  - 전역 rollout 전에 `Skills` 화면을 기준 샘플로 먼저 확정한다.
  - `paperclip`은 구조 참고, `Toss`는 token/spacing/contrast 북극성으로 사용한다.
  - `version bump`는 `Skills` pilot 승인과 좁은 확산 전까지 보류한다.

### 에이전트 (Canonical)
- Must: Orchestrator, Complaint Agent, Retention Agent, Scheduler Agent
- Should: Intake, Staff, Finance, Compliance, Notification, Analytics
- Future: Facility, Teaching

### 핵심 파일 위치
- 기획 정본: `03_제품/hagent-os/` (57개 파일) / 빠른 탐색: `INDEX.md`
- 에이전트 설계: `04_ai-agents/agent-design.md`
- PRD: `02_product/prd.md` / MVP 범위: `02_product/mvp-scope.md`
- DB 모델: `08_data/domain-model.md`
- 디자인: `design.md` + `brand/`
- UI 구조: `09_ux/information-architecture.md` (22개 라우트)
- Paperclip UI 참고: `_research/paperclip-ui-reference.md`
- 로드맵: `10_execution/roadmap.md`
- 미결 블로커: `10_execution/open-questions.md` ==🚨 반드시 확인==
- **갭 분석**: `03_제품/PAPERCLIP-GAP-ANALYSIS.md`

### 제품 코드 위치 (독립 레포)
- **독립 레포**: `/Users/river/workspace/active/hagent-os/`
- **GitHub**: `https://github.com/River-181/hagent-os`
- **Live URL**: `https://hagent-os.up.railway.app`
- **Railway**: `https://railway.com/invite/fmzuFpxK1li`
- **Neon DB**: `https://console.neon.tech/app/projects/rough-feather-95020200`
- **콘테스트 워크스페이스 앱**: `03_제품/app/` (참조용)
- 포트: Server 3200, UI 5174, DB hagent_os:5432
- 현재 demo org canonical:
  - 이름: `탄자니아 영어학원 데모 7`
  - prefix: `탄자니아-영어학원-데모-7`
  - orgId: `be70ebc8-3b55-4ff3-827a-264f06c4d2ee`
- 현재 채널 canonical:
  - `Kakao inbound` / `https://pf.kakao.com/_raDdX`
  - `Telegram inbound/outbound` / `https://t.me/TANZANIA_ENGLISH_ACADEMY_bot`
  - Kakao auto send와 Google Calendar live sync는 env 의존

### AI 리포트 준비 현황
- 세션 증빙: `04_증빙/01_핵심로그/master-evidence-ledger.md` (현재 `ai-session-intake.csv` 기준 최신 세션까지 반영)
- 세션 CSV: `04_증빙/01_핵심로그/ai-session-intake.csv`
- 데일리: `04_증빙/03_daily/2026-04-12.md`, `04_증빙/03_daily/2026-04-13.md`
- 제출 본문 정본: `05_제출/ai-report-final.md` (`git commit 15902fc` pre-Ralph snapshot)
- 핵심 도식 자산: `assets/excaildraw/01_민원-처리-플로우.excalidraw`, `assets/excaildraw/02_AI-협업-구조.excalidraw`, `assets/excaildraw/03_시스템-4계층.excalidraw`
- 프롬프트 보드 정본: `assets/excaildraw/prompf-2026-04-09.excalidraw.md` — Day 8 종료 후 명령형 자연어 블록을 제출용/업무 지시문 톤으로 정제한 canonical prompt board
- 경로 주의: 현재 live source 폴더는 `assets/excaildraw/`다. 과거 ops/export 문서의 `assets/excalidraw/` 표기는 legacy alias로 간주한다.
- 종합 아키텍처 비주얼: `03_제품/hagent-os/diagrams/99_comprehensive-architecture.md`
- 섹션 1 (기획): `prd.md`, `core-bet.md`, `market-and-customer.md`에서 추출
- 섹션 2 (AI 활용): intake CSV + evidence ledger에서 추출

## 현재 우선순위 (D8 기준 — 2026-04-13 업데이트)

1. ~~**D5 (4/10)**: 앱 스켈레톤~~ ✅
2. ~~**D6 (4/11)**: 독립 레포 E2E 재구축~~ ✅
3. ~~**D7 (4/12)**: UX/Goals/온보딩/운영 문서 정리~~ ✅
4. **D8 (4/13)**: ==실사용 제출 마감 + 증빙/리포트/리허설 완료==

### Day 8 핵심 결정 — Control Plane 확장 패턴

**텔레그램 원장 컨트롤** (`a9641e6`): 이동 중 케이스 승인 병목 제거.
- 봇이 케이스 요약 + Confirm/Cancel 버튼 2개만 제공 → 원장 탭 한 번으로 결정 완료
- 결정은 HagentOS 케이스 이력에 자동 기록 (audit trail 유지)
- 어댑터 설계가 채널-독립적 → 카카오·LINE·슬랙으로 동일 구조 확장 가능
- 구현: `telegram.ts` / `telegram-inbound-sync.ts` / `telegram-owner-control.ts` / `approval-decisions.ts`

### 현재 제출 직전 블로커
- `OPENAI_API_KEY` live Codex route
- `LAW_OC` live 법령 조회
- `KAKAO_OUTBOUND_PROVIDER_URL` 없을 때는 bridge 기준 시연
- `GOOGLE_CALENDAR_ACCESS_TOKEN` live sync
- `judge_demo` 배포 패키지 구현
- 최종 reset 가능한 demo bootstrap
- AI 리포트 `docx -> PDF` 최종 변환
- 개인정보동의서 / 참가각서 서명
- 제출 이메일 발송

## 증빙 운영 규칙

- 모든 의미 있는 AI 세션과 사람 미팅은 먼저 `04_증빙/01_핵심로그/ai-session-intake.csv`에 1 row로 기록한다.
- 재사용 가치가 높은 프롬프트만 `04_증빙/01_핵심로그/ai-prompt-intake.csv`에 별도로 저장한다.
- 하루 마감 시 `dispatch-session-intake.py`가 `master-evidence-ledger.md`, `external-ai-usage.csv`, `session-intake-dispatch-report.md`를 재생성한다.
- `external-ai-usage.csv`는 AI provider만 집계하며, 사람 미팅은 intake와 ledger에는 남기되 외부 AI 통계에서는 제외한다.
- exact token source가 없는 Web/App 도구는 `estimated_tokens`로 명시적으로 기록한다.
- 2026-04-13 기준 Day 8 `Codex` 사용량: 사전 Ralph 세션 `571k` + Ralph 1차 A~E `80k` + 2차 T-세션 `186k` + 3차 T-세션 `108k` = **총 ~1,200k tokens** (별도 ChatGPT Pro 플랜). `Claude Max 5x` (오케스트레이터+병렬 서브에이전트) Day 8 실측: **331,000,000 tokens / $168.46 Extra usage** (OpenUsage 2026-04-13 스크린샷). 30일 누적: **1,300,000,000 tokens / $688.98** (OpenUsage 실측). Day 1~7 은 자체 추정, Day 8 은 OpenUsage 실측.
- Ralph loop 병렬 작업은 `15902fc` pre-Ralph snapshot 이후 diff만 별도 세션으로 남기고, 코드 수정이 없어도 evidence-only sync 세션을 intake에 기록한다.
- Day 8 Ralph 루프 구조: 1차(iter 1 + par A/B/C/D/E 병렬 5개) → 2차(T-smoke/T-case/T-case-lean-retry/T-settings-api/T-settings v2/T-seed-log/T-seed-log-retry/T-ui-polish/T-security, 9개) → 3차(T-routine-fix/T-docx/T-png-export/T-security-recover/T-assistant-fix, 5개). 총 19+ Codex 세션이 이날 병렬 실행되었다.
- AI 리포트 최종 docx: `05_제출/20260413_③_2026_KIT_바이브코딩_공모전_망상궤도_AI리포트.docx` — Q1~Q6 전체, 27개 이미지 삽입. PDF 변환만 남은 상태.
- Excalidraw 6종 source set는 `assets/excaildraw/01~06` 기준으로 관리한다. PNG export 관련 `assets/excalidraw/png` 표기는 legacy ops 기록으로 남아 있으니 자동화 실행 전 실제 폴더를 먼저 확인한다.
- 보안 감사 완료: `04_증빙/02_분석자료/security-audit-2026-04-13.md`.
- 루틴 일관성 분석 완료: `04_증빙/02_분석자료/routine-consistency-2026-04-13.md`.
- 라이브 스모크 결과: `04_증빙/02_분석자료/live-smoke-*.md`.
- 제품 베팅 관련 사람 합의는 2026-04-09 22:10 승보님 미팅 기준으로 `소규모 학원`, `로컬 우선`, `데이터 자산화`, `쉬운 AI 에이전트 활용`, `무거운 SaaS 회피`를 유지한다.

## 워크스페이스 구조 / 정본 위치

- 워크스페이스: Obsidian 볼트 + GitHub 저장소 (멀티 AI 협업)
- 운영 계약: `.agent/system/contracts/workspace-contract.md`
- 기억/증빙 정책: `.agent/system/contracts/memory-evidence-policy.md`
- LLM 위키 운영 계약: `.agent/system/contracts/llm-wiki-operations.md`
- 구조 맵: `.agent/system/maps/workspace-atlas.md`
- 실행 계획: `.agent/system/ops/PLAN.md`
- 진행 현황 (SSoT): `.agent/system/ops/PROGRESS.md` ← 작업 전 반드시 확인
- 제품 코드: `03_제품/app/` / 테스트: `03_제품/tests/`

## LLM 위키 핵심 상태

- `06_LLM위키/`는 raw source 재검색 전에 먼저 확인해야 하는 persistent synthesis layer다.
- 핵심 진입점: `06_LLM위키/index.md`, `06_LLM위키/overview.md`, `06_LLM위키/log.md`
- 핵심 축:
  - 문제 선택 문법: `문제_선택_점수표_문법`
  - 문제 후보/탈락 문법: `문제_후보_뱅크와_탈락_문법`
  - 7일 실행 doctrine: `KEG_7일_MVP_플레이북`
  - 제품 구조 비교: `Paperclip_vs_HagentOS_설계_갭`
  - compliance/ops: `학원_운영_법규_체크리스트`, `학원_운영_루프_지도`
  - product interpretation: `운영_Control_Plane_모델`, `한국_교육_도메인_적합성_갭`
- 위키 후보를 찾을 때는 프로젝트 스킬 `.agent/skills/wiki-candidate-harvest/`를 사용한다.
