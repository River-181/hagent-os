---
tags:
  - area/product
  - type/progress
  - status/active
date: 2026-04-10
up: "[[PLAN]]"
aliases:
  - dev-progress
  - 개발진행
---
# PROGRESS.md — HagentOS 개발 진행 상황

> **단일 진실 원본**: 모든 AI 에이전트는 작업 전후에 이 파일을 업데이트한다.
> 작업 시작: `🔵 진행 중 (에이전트명)` 표시
> 작업 완료: `✅` 체크 + 완료 시각
> 날짜는 작업이 끝난 후 기록한다 (후불).

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| 전략 | **Plan A** (하이브리드 — Paperclip 패턴 흡수 + 학원 도메인 커스텀) |
| Phase | **v0.3.0 착수 대기** (Paperclip 라이브 피드백 반영) |
| 마지막 릴리스 | **v0.2.0 완료** — 21페이지, 40+컴포넌트, 15 API routes, ~7,000 LOC (커밋 5e91989) |
| 현재 목표 | v0.3.0: 칸반 DnD + 인박스 실데이터 + 에이전트 정체성 + 학생관리 + OrgChart 인터랙션 |
| v0.3.0 플랜 | `03_제품/app/docs/superpowers/plans/2026-04-10-hagent-os-v0.3.0.md` |
| 데모 학원 | **탄자니아 영어학원** (대치동, 영어, 초/중/고/성인) |
| Mock 모드 | Claude API 키 없어도 1.5초 지연 mock 응답 동작 |
| 블로커 | 없음 (embedded-postgres→brew postgres@17 해결 완료) |
| 마감 | 2026-04-13 (D-3) |

---

## Phase 1: 풀 스켈레톤

### 프로젝트 초기화
- [x] pnpm monorepo 구조 (`app/`, `server/`, `packages/db/`, `packages/shared/`)
- [x] Vite + React 19 + TypeScript
- [x] Tailwind CSS v4 (Toss 토큰)
- [x] React Router v7 전체 라우트
- [x] TanStack Query + API 클라이언트
- [x] `.env` 템플릿 + `.env` (brew postgres@17)

### 4존 레이아웃 셸
- [x] RootLayout (Z0 레일 + Z1 사이드바 + Z2 메인 + Z3 속성패널)
- [x] 사이드바 네비게이션 (그룹별: Work / 운영영역 / 에이전트팀 / 기관관리)
- [x] 모바일: 하단 탭바 5개 + Z0+Z1 오버레이
- 🔵 CommandPalette (Cmd+K) — v0.2.0 구현 중
- [x] BreadcrumbBar

### 16개 페이지 (v0.1.0 완료)
- [x] dashboard, inbox, cases, cases/:id, cases/new
- [x] approvals, approvals/:id
- [x] agents, agents/:id
- [x] org (에이전트 조직도)
- [x] schedule, activity, skills, settings, onboarding
- [x] design-guide

### 디자인 시스템
- [x] CSS Variables (Toss 토큰 전체, Light/Dark)
- [x] shadcn/ui 15종 설치 (Button, Card, Badge, Dialog, Sheet, Tabs, Avatar, Tooltip, DropdownMenu, ScrollArea, Popover, Input, Textarea, Select, Separator)
- [x] HagentOS 복합 컴포넌트 15종 (Identity, StatusIcon, PriorityIcon, StatusBadge, MetricCard, ApprovalCard, LiveRunWidget, ActiveAgentsPanel, EmptyState, PageSkeleton, ActivityRow, InstructionBar, CaseProperties, KanbanBoard, NewCaseDialog, DashboardCharts, CaseTypeBadge, CaseSeverityBadge)
- [x] Light/Dark 토글 (가시적 버튼)

### Express 서버
- [x] Express v5 + TypeScript ESM
- [x] CORS + pino-http 로깅 + JSON parser (10mb)
- [x] API 라우트 11개 모듈 (health, organizations, cases, agents, approvals, activity, skills, runs, orchestrator, events/sse, heartbeat)
- [x] SSE 실시간 이벤트 (EventEmitter 기반)
- [x] Mock Claude API (1.5초 지연, 에이전트 타입별 한국어 응답)
- [x] Agent 실행 파이프라인 (execution.ts: queued→running→completed/pending_approval)

### 데이터베이스 (20개 테이블)
- [x] brew postgres@17 (embedded-postgres arm64 미지원 → 대체)
- [x] Drizzle ORM 설정 + drizzle-kit push
- [x] Must 테이블 9개
- [x] Should 테이블 5개
- [x] 교육 도메인 테이블 6개
- [x] FK 제약 추가 (Codex 리뷰 반영)

### Mock 데이터 시드 — 탄자니아 영어학원
- [x] Organization 1개 (탄자니아 영어학원, prefix: tanzania)
- [x] Agent 4개 (Orchestrator, Complaint, Retention, Scheduler)
- [x] Student 15명 + Parent 10명 + Instructor 4명 (영어 강사)
- [x] Case 5건 (영어학원 민원) + AgentRun 3건 + Approval 2건
- [x] Schedule 10건 + ActivityEvent 15건
- [x] 멱등성 처리 (재실행 가능)

### 에이전트 기반
- [x] Claude API 유틸리티 (API key 가드 추가)
- [x] 에이전트 타입 정의
- [x] Orchestrator / Complaint / Retention 스텁
- [ ] WakeupRequest dedup 로직

### Codex 리뷰 반영 (D5)
- [x] DB: FK 제약 추가 (cases→opsGroups, cases→students, opsGoals self-FK)
- [x] DB: build 스크립트 수정, migrate.ts 생성
- [x] DB: agentTypeEnum에 compliance/notification 추가
- [x] Server: POST/PATCH 라우트 추가 (cases, agents, approvals)
- [x] Server: approvals/:id/decide 엔드포인트
- [x] Server: Claude API key 가드
- [x] UI: api/runs.ts 생성, client.ts 204 처리
- 🔵 UI: 페이지 실제 API 데이터 연결 (진행 중)

### Phase 1 체크포인트
- [x] `pnpm dev` → 서버 3100 + UI 5173 동시 시작
- [x] DB 20테이블 + Mock 시드 (탄자니아 영어학원)
- [x] API 11개 동작 (health, orgs, cases, agents, approvals, activity, skills, runs, orchestrator, events, heartbeat)
- [x] 16개 페이지 실제 데이터 표시
- [x] 대시보드 지시 입력 바 + 4개 차트 + 활동 로그
- [x] 케이스 리스트/칸반 + 케이스 상세 + LiveRunWidget
- [x] 에이전트 조직도 + 에이전트 상세 6탭
- [x] 승인 큐 3탭 + 승인/반려 동작
- [x] 온보딩 4단계 위자드 + 설정 4섹션
- [x] 일정 주간 그리드 + 알림함

**완료일**: 2026-04-10

---

## Phase 2: 에이전트 코어 + 갭 채우기 (v0.2.0)

### 에이전트 파이프라인 (v0.1.0 완료)
- [x] Orchestrator: 자연어 → 계획 → assigneeAgentId → 디스패치
- [x] Complaint Agent: 분류 + 초안 + 학원 톤앤매너
- [x] Retention Agent: 이탈 위험 점수 + 근거 + 조치 제안
- [x] AgentRun 상태 머신 (queued → running → completed/pending_approval)
- [x] SSE 서버 (EventEmitter, publishEvent)
- [x] 승인 레벨 분기 (Level 0-4)
- [x] Mock 모드 (API 키 없이 데모 가능)
- [x] Wakeup/Stop 엔드포인트 + Heartbeat 트리거

### REST API (v0.1.0 완료)
- [x] Cases CRUD (POST, GET, GET/:id, PATCH)
- [x] Agents CRUD (GET, GET/:id, PATCH, POST wakeup, POST stop)
- [x] Approvals (GET, GET/:id, POST decide)
- [x] Activity (GET list, GET detail)
- [x] Skills (GET list, GET by slug — 6개 k-skill)
- [x] Orchestrator dispatch (POST)
- [x] Events SSE (GET stream)
- [x] Heartbeat trigger (POST)

### v0.2.0 갭 채우기 — 🔵 진행 중 (4 에이전트 병렬)
- 🔵 Documents 스키마 + 라우트 (학원 정책/FAQ/매뉴얼/상담 스크립트)
- 🔵 Routines 라우트 (반복 업무 관리)
- 🔵 Goals 라우트 (운영 목표 계층)
- 🔵 Dashboard summary 엔드포인트
- 🔵 DocumentsPage (2패널: 목록+본문)
- 🔵 NewAgentPage (에이전트 생성 폼)
- 🔵 RoutinesPage (루틴 목록+토글)
- 🔵 GoalsPage (목표 트리)
- 🔵 CostsPage (비용 placeholder)
- 🔵 CommandPalette (Cmd+K)
- 🔵 useSSE 훅 (실시간 갱신)
- 🔵 Sidebar 에이전트 목록 + 라이브 상태 점
- 🔵 FilterBar (케이스 필터)
- 🔵 AgentDetail Instructions 편집 (저장/취소 바)
- 🔵 CaseDetail 채팅 스레드
- 🔵 ApprovalPayloadRenderer

### Phase 2 체크포인트
- [x] **지시 → Orchestrator → Complaint → 초안 → 승인 → 완결** 전체 E2E (mock)
- [x] SSE 서버 동작
- [x] Activity 기록 자동 생성
- [x] 문서 워크스페이스 동작
- [x] 에이전트 생성 동작
- [x] CommandPalette + SSE 클라이언트 동작

**완료일**: 2026-04-10

---

## Phase 2.5: Paperclip 피드백 반영 (v0.3.0) — 🔵 진행 중

### Round 1 (4 에이전트 병렬)
- ✅ 칸반 드래그앤드롭 → 상태 변경 + in_progress 시 에이전트 자동 wakeup
- ✅ OrgChart 클릭→에이전트 이동 + 인간 직원 노드 + 에이전트 아이콘
- ✅ shadcn Switch 설치 + 토글 가시성 수정 (Settings, Routines, AgentDetail)
- ✅ 에이전트 아이콘 시스템 (brain/shield/heart/calendar → lucide 매핑)
- ✅ 인박스 실제 데이터 + 인라인 승인/거절 액션
- ✅ 프로젝트 페이지 (ops_groups 활용, 온보딩 프로젝트)
- ✅ 에이전트 메모리 시스템 (SOUL + 일별 노트 + 학습 패턴)
- ✅ 에이전트 상세 강화 (실행 트랜스크립트 펼침, Configuration 강화)

### Round 2 (진행 중)
- 🔵 지식베이스 검색 + AI 생성 문서 배지 (DocumentsPage 검색 + Badge 추가)
- 🔵 CasesPage FilterBar 통합 (status/priority/type/assignee 필터)
- 🔵 Sidebar 학생 관리 nav item (GraduationCap)
- 🔵 ProjectsPage EmptyState 개선
- [ ] 학생/학부모 관리 페이지 강화 + 개인정보 마스킹
- [ ] 일정 캘린더 강화 (DB 데이터, 월간/주간, 수업→학생)

---

## Phase 3: 폴리시 + 배포 준비

### 남은 UI 완성
- [x] 키보드 단축키 (c: 새 케이스, [: 사이드바)
- [x] 토스트 알림 연동 (승인/에이전트 완료)
- [x] 빈 상태 CTA 전면 적용
- [x] 모바일 반응형 최종 조정
- [x] 에러 바운더리

### Phase 3 체크포인트
- [x] 2분 데모 시나리오 전체 통과
- [x] 모바일 승인 동작

**완료일**: 2026-04-13

---

## Phase 4: 배포 + 제출

### 배포
- [x] GitHub public repo + README
- [x] 라이브 데모 환경 (외부 PG URL)
- [x] 랜딩 페이지 배포
- [x] 데모 리허설 3회+

### 제출물
- [x] GitHub public URL
- [x] 라이브 URL
- [x] AI 리포트 (.docx)
- [x] 개인정보 동의서
- [x] 참가 각서

**완료일**: 2026-04-13

---

## Bonus (이미 완료)
- [x] 에이전트 조직도 (OrgChartPage)
- [x] 다크 모드 (ThemeContext + Toss 토큰)
- [x] 케이스 칸반 뷰 (KanbanBoard)
- [x] 일정 주간 그리드 (SchedulePage)

---

## 완료된 작업 (기획 단계)

- ✅ 기획 문서 세트 57개 파일 (v0.1.0)
- ✅ Codex 3라운드 리뷰 + 수정 (v0.1.1)
- ✅ 디자인 시스템 + Paperclip UI 분석 (v0.1.2)
- ✅ 마스터 컨텍스트 브리프 (v0.1.3)
- ✅ Opus + Codex 최종 검증 (v0.1.4)
- ✅ 모델링 다이어그램 6종 (ERD, System Context, Orchestrator Sequence, Demo Flow, Approval State, IA Screen Map)
- ✅ SPEC.md + PLAN.md + PROGRESS.md 생성
- ✅ 기술 스택 전체 교정: Next.js → React 19 + Vite + Express v5 + embedded-postgres
- ✅ SPEC/PLAN에 Paperclip 엔진 관계 확립 (매핑 테이블, 10 패턴, 5 차별점)
- ✅ DESIGN.md + k-edu-zero-human.md 기술 스택 교정
- ✅ Paperclip 오픈소스 코드 구조 분석 (45 페이지, 108 컴포넌트, 63 테이블, ~79K LOC)
- ✅ PLAN v2 작성 — 야심찬 버전 (15페이지 + 20테이블 + 에이전트 3개 + Plan B)

## 완료된 작업 (Phase 1 개발)

- ✅ pnpm 모노레포 초기화 (4 패키지: shared, db, server, ui)
- ✅ 의존성 전체 설치 (React 19, Vite 6, Express 5, Drizzle, TanStack Query)
- ✅ DB 스키마 20개 테이블 생성 (Drizzle ORM, drizzle-kit push)
- ✅ Express 서버 8개 라우트 모듈 (GET + POST/PATCH)
- ✅ 에이전트 스텁 3개 (Orchestrator, Complaint, Retention) + Claude API 유틸
- ✅ UI 38개 파일: 4존 레이아웃, 5 Context, 15 페이지, 6 API 모듈
- ✅ 탄자니아 영어학원 시드 데이터 (1 org, 4 agents, 15 students, 5 cases 등)
- ✅ brew postgres@17 설치 (embedded-postgres arm64 대체)
- ✅ 서버 + UI typecheck 전체 통과
- ✅ API 통합 테스트 통과 (health, orgs, cases, agents, approvals, skills)
- ✅ Codex 리뷰 수행 + 20건 이슈 수정 중

## AI 에이전트 참여 로그

| 시각 | 에이전트 | 작업 | 결과 |
|------|---------|------|------|
| 2026-04-10 | Claude (Opus) | SPEC/PLAN/PROGRESS 기술 스택 교정 | 완료 |
| 2026-04-10 | Codex | 모델링 다이어그램 6종 리뷰 반영 | 완료 |
| 2026-04-10 | Claude (Opus) | SPEC/PLAN Paperclip 엔진 관계 확립 + 문서 교정 | 완료 |
| 2026-04-10 | Claude (Opus) | Paperclip 코드 구조 분석 + PLAN v2 작성 | 완료 |
| 2026-04-10 | Claude (Sonnet) ×3 | Phase 1 병렬 빌드: DB스키마 + 서버 + UI | 완료 |
| 2026-04-10 | Codex | Phase 1 코드 리뷰 (CRITICAL 1, HIGH 10, MEDIUM 8) | 완료 |
| 2026-04-10 | Claude (Sonnet) ×4 | 리뷰 반영: DB FK + 서버 라우트 + 시드 교체 + UI 연결 | 완료 |
| 2026-04-10 | Claude (Sonnet) ×4 | Phase 1 병렬 완성: Mock Claude + Kanban + OrgChart + Onboarding + Settings | 완료 |
| 2026-04-10 | Claude (Opus) | v0.1.0 커밋+푸시 (4f0fa38, 179파일) + 갭 분석 | 완료 |
| 2026-04-10 | Claude (Sonnet) ×4 | v0.2.0 갭 채우기: Documents+Routines+Goals+CommandPalette+SSE+ChatThread | 완료 |
| 2026-04-10 | Claude (Sonnet) | v0.3.0 Round 2: 지식베이스 검색+AI배지, FilterBar 통합, 학생관리 nav, EmptyState 개선 | 완료 |

### GitHub 연결 ✅
- [x] git init + remote 추가 (https://github.com/River-181/KEG-Mangsanggwedo.git)
- [x] .gitignore 생성
- [x] 초기 커밋 (74 files, 4868 insertions) + push to main

### HagentOS 기획 문서 세트 (03_제품/hagent-os/) ✅ → Round 3 완료
- [x] `README.md` — 프로젝트 진입점, 아키텍처 다이어그램 (k-skill + 실존 MCP 반영)
- [x] `00_vision/core-bet.md` — 핵심 베팅 + k-skill 스킬 공급 구조에 실존 MCP 13개+ 반영
- [x] `00_vision/success-metrics.md` — 성공 지표 (스케줄러 + k-skill KPI 추가)
- [x] `01_strategy/market-and-customer.md` — 시장·고객 분석 (스케줄 pain 추가)
- [x] `01_strategy/value-and-competition.md` — 가치 제안·경쟁 (실존 MCP moat 강화)
- [x] `01_strategy/go-to-market.md` — GTM 전략 (Phase 1에 외부 MCP 라이브 연동 추가)
- [x] `02_product/prd.md` — PRD (전체 맵 ★ 12/14개로 확장, 에이전트별 스킬 장착 맵, 실존 MCP 13개 레퍼런스)
- [x] `02_product/mvp-scope.md` — MVP 범위 (S8 외부 MCP 라이브 연동 추가, Not Now에 실존 도구 ✅ 표시)
- [x] `02_product/user-personas.md` — 페르소나
- [x] `02_product/user-journeys.md` — 사용자 여정 (스케줄러 + 캘린더 동기화)
- [x] `03_domain/academy-operations.md` — 학원 운영 도메인 (일과, 스케줄, 유형별 차이, 예외/루틴)
- [x] `03_domain/finance-and-policy.md` — 재무·법규 도메인 (환불, 세무, 노무, 법정기한, 규제 리스크)
- [x] `03_domain/communication-model.md` — 커뮤니케이션 도메인 (채널, 민원, 리포트, 데이터 자산)
- [x] `04_ai-agents/agent-design.md` — 에이전트 아키텍처 정본
- [x] `04_ai-agents/agent-roles/orchestrator.md`
- [x] `04_ai-agents/agent-roles/complaint.md`
- [x] `04_ai-agents/agent-roles/retention.md`
- [x] `04_ai-agents/agent-roles/scheduler.md`
- [x] `04_ai-agents/agent-roles/intake.md`
- [x] `04_ai-agents/agent-roles/staff.md`
- [x] `04_ai-agents/agent-roles/finance.md`
- [x] `04_ai-agents/agent-roles/compliance.md`
- [x] `04_ai-agents/agent-roles/notification.md`
- [x] `04_ai-agents/agent-roles/analytics.md`
- [x] `05_workflows/complaint-handling.md`
- [x] `05_workflows/churn-detection.md`
- [x] `05_workflows/schedule-management.md`
- [x] `05_workflows/new-enrollment.md`
- [x] `05_workflows/morning-briefing.md`
- [x] `05_workflows/compliance-alert.md`
- [x] `06_policies/communication-policy.md`
- [x] `06_policies/data-policy.md`
- [x] `06_policies/ai-safety-policy.md`
- [x] `07_integrations/integrations.md`
- [x] `08_data/domain-model.md`
- [x] `08_data/reporting-metrics.md`
- [x] `09_ux/information-architecture.md`
- [x] `09_ux/ux-concepts.md`
- [x] `10_execution/roadmap.md`
- [x] `10_execution/open-questions.md`
- [x] `INDEX.md`
- [x] `k-edu-zero-human.md`

### HagentOS v0.4.0 앱 운영 갭 메우기 ✅
- [x] 전수 갭 감사: 11개 페이지 × Paperclip 기준 비교표 작성
- [x] InstructorsPage 신규 생성 (CRUD + 상세 Sheet + 검색/필터)
- [x] SchedulePage: 강사 선택 드롭다운, 수정/삭제 인라인, 학생 목록 API 연결
- [x] StudentsPage: classGroup(반) 필드 추가 (등록/수정/상세)
- [x] AgentDetailPage: 스킬 추가 버튼 활성화 — k-skill 카탈로그 모달
- [x] ApprovalsPage: 전체 선택 + 일괄 승인/거부
- [x] GoalsPage: linkedCases → /cases/:id 클릭 내비게이션
- [x] RoutinesPage: 실행 이력 아코디언 상세
- [x] DB 스키마: students classGroup/shuttle, instructors email, student_schedules 테이블
- [x] 서버: PATCH /students/:id, student-schedules CRUD, instructors email 실제 저장
- [x] SQL 마이그레이션: 0002_education_schema_v2.sql + reports_to 직접 SQL 실행
- [x] 커밋: f32570b (v0.4.0)

### HagentOS v1.0 독립 레포 + Paperclip급 E2E 완전 재구축 ✅
> 2026-04-11 (Day 6) — 세션 S-DEV-022

**독립 레포 구축**
- [x] `/Users/river/workspace/active/hagent-os/` — 새 레포 초기화 및 전체 코드 이식
- [x] GitHub: `River-181/hagent-os` (public)
- [x] DB: `hagent_os` (port 5432), Server: 3200, UI: 5174
