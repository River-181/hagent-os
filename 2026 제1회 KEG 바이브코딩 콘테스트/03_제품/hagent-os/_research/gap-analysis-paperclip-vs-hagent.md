---
tags: [area/product, type/analysis, status/active]
date: 2026-04-09
up: "[[hagent-os/README]]"
---
# Gap Analysis: Paperclip Spec vs HagentOS 설계

> Paperclip 비교 분석 메모와 raw reference를 기준으로 HagentOS 설계 문서의 누락/불일치 파악.
> 대상 문서: `domain-model.md`, `information-architecture.md`, `prd.md`
> 제출용 README / AGENTS 적용 관점은 `paperclip-readme-agents-application.md` 참고.

---

## 요약 판정

**전체 정렬도: ~55%** — 핵심 컨셉(Company→Agent→Task→Approval)은 잘 이식됐으나, Paperclip의 작업 추적 계층(Issue/Goal/Project)과 실시간/API 레이어가 상당 부분 미설계.

1. **Issue 엔티티 부재** — Paperclip의 핵심 작업 단위인 Issue가 HagentOS에서 Case로 대체됐으나, 필수 필드(parentId, goalId, checkoutRunId, labels, blockedBy/blocks, planDocument)가 누락
2. **Agent 상세 탭 3개 미설계** — Instructions, Configuration, Budget 탭이 IA에 없음
3. **실시간 이벤트 + API 레이어 설계 부재** — WebSocket LiveEvent, API 모듈 구조가 전무

---

## CRITICAL (구현 전 반드시 반영)

### C1. Issue(Case) 필드 심각한 누락

- **Paperclip**: Issue에 `parentId`(서브이슈 계층), `goalId`(목표 연결), `checkoutRunId`(원자적 체크아웃), `labels[]`, `blockedBy[]`/`blocks[]`, `planDocument`, `documentSummaries`, 관련 테이블 `IssueComment[]`, `IssueDocument[]`, `IssueAttachment[]`, `IssueWorkProduct[]`
- **HagentOS 현재**: Case 테이블에 `type`, `severity`, `status`, `agentDraft`, `approvalStatus`만 존재. 계층 구조, 목표 연결, 원자적 체크아웃, 라벨, 의존성 차단 모두 없음
- **필요 액션**: `domain-model.md` → Case 테이블에 다음 컬럼 추가:
  - `parentId` (UUID → Case, nullable) — 하위 케이스 계층
  - `goalId` (UUID → Goal, nullable) — 운영 목표 연결
  - `checkoutRunId` (UUID → AgentRun, nullable) — 원자적 작업 할당
  - `labels` (TEXT[]) — 분류 태그
  - `blockedBy` / `blocks` (UUID[]) — 케이스 간 의존성
  - `assigneeAgentId` (UUID → Agent) — 현재는 암묵적, 명시 필요
  - `priority` (ENUM: `urgent|high|medium|low|none`) — severity와 별도
  - 관련 테이블: `CaseComment`, `CaseDocument`, `CaseAttachment` 분리

### C2. Agent 상세 페이지 탭 불완전

- **Paperclip**: 6개 탭 — `dashboard | instructions | skills | configuration | runs | budget`
- **HagentOS 현재**: `/[org]/agents/:id` "설정, 실행 이력, 성과 차트"만 기술. Instructions(시스템 프롬프트 편집), Configuration(어댑터/EnvVar/권한), Budget(예산 정책) 탭 미설계
- **필요 액션**: `information-architecture.md` → 에이전트 상세 섹션 추가:
  ```
  탭: 대시보드 | 지시사항 | 스킬 | 설정 | 실행이력 | 예산
  ```
  - 지시사항: 마크다운 에디터로 시스템 프롬프트 편집
  - 설정: 어댑터 타입/모델, 환경변수 관리, 권한 토글
  - 예산: 월 한도, 현재 지출, 이용률 바, 하드스톱 토글

### C3. Goal(운영 목표) 엔티티 미정의

- **Paperclip**: Goal은 계층적(`parentId`), Issue와 N:1 연결, Project와 연동. 에이전트가 "why"를 항상 파악
- **HagentOS 현재**: 라우트 `/[org]/goals`는 v2로 배치. domain-model.md에 Goal 테이블 정의 없음
- **필요 액션**: `domain-model.md`에 Goal 테이블 추가 (MVP에서 간소화 가능하나 스키마는 정의 필요):
  ```
  Goal: id, organizationId, parentId→Goal, title, description,
        status(active|completed|archived), targetDate, ownerAgentId
  ```
  `information-architecture.md` → v2에서 MVP로 격상 검토 (최소 데이터 모델은 선반영)

### C4. CompanySecret(환경변수/API키 관리) 미설계

- **Paperclip**: `CompanySecret` 테이블 + `secretsApi` (CRUD, 로테이션), Agent Configuration 탭의 `EnvVarEditor`
- **HagentOS 현재**: Agent 테이블의 `adapterConfig` JSONB에 암묵적 포함. 전용 비밀 관리 없음
- **필요 액션**: `domain-model.md`에 `OrganizationSecret` 테이블 추가:
  ```
  OrganizationSecret: id, organizationId, key, encryptedValue,
                      agentIds(TEXT[]), createdAt, rotatedAt
  ```
  `information-architecture.md` → 기관 설정 하위에 "API 키 / 환경변수" 섹션 추가

### C5. 인증 이중 주체(Board + Agent) 미설계

- **Paperclip**: 2가지 인증 주체 — board(인간, 쿠키 세션 via BetterAuth) + agent(API 키 JWT, 단일 에이전트 스코프)
- **HagentOS 현재**: `/auth` 라우트만 존재. 에이전트 API 키 인증 개념 없음
- **필요 액션**: `domain-model.md`에 `AgentKey` 테이블 추가. `prd.md` 기술 스택 섹션에 인증 아키텍처 명시:
  - 인간: Supabase Auth (또는 BetterAuth) 쿠키 세션
  - 에이전트: `AgentKey` 테이블 → JWT 발급 → API 호출 시 Bearer 인증

---

## HIGH (개발 중 반영)

### H1. CommandPalette (Cmd+K) 누락

- **Paperclip**: 글로벌 `Cmd+K` → 검색/네비게이션 오버레이. 사이드바 검색 버튼과 연동
- **HagentOS 현재**: 사이드바에 "검색 버튼"만 기술. CommandPalette 오버레이 미설계
- **필요 액션**: `information-architecture.md` 사이드바 구조 1번 항목에 `(Cmd+K → CommandPalette 오버레이)` 명시

### H2. 케이스 목록 Kanban 뷰 누락

- **Paperclip**: Issues 페이지에 리스트/칸반 뷰 전환 + `FilterBar` (상태/우선순위/프로젝트/담당자 필터)
- **HagentOS 현재**: 케이스 목록 라우트만 존재. 뷰 모드, 필터 바 미설계
- **필요 액션**: `information-architecture.md` → 케이스 목록에 "뷰 전환(리스트/칸반) + FilterBar(상태/유형/에이전트/우선순위)" 추가

### H3. Routine(루틴) 엔티티 상세 불충분

- **Paperclip**: Routine은 cron 표현식 + `ScheduleEditor` UI, 동시성/캐치업 정책, 템플릿 변수, 웹훅 트리거
- **HagentOS 현재**: 보조 테이블에 `Routine(agentId, cronExpression, enabled)`만. IA에 `/[org]/auto-runs`로 매핑
- **필요 액션**: `domain-model.md` → Routine 테이블 확장:
  - `concurrencyPolicy` (ENUM: `skip|queue|cancel_previous`)
  - `catchupPolicy` (ENUM: `skip|run_once|run_all`)
  - `variables` (JSONB) — 템플릿 변수 정의
  - `RoutineTrigger` 테이블 추가 (type: `cron|webhook|event`)

### H4. HeartbeatRun 상세 필드 부족

- **Paperclip**: `invocationSource`(timer/assignment/on_demand), `logStore`/`logRef`/`logBytes`, `stdoutExcerpt`/`stderrExcerpt`, `sessionIdBefore`/`sessionIdAfter`, `usageJson`/`resultJson`
- **HagentOS 현재**: AgentRun에 `input`/`output` JSONB, `tokensUsed`, `costCents`만
- **필요 액션**: `domain-model.md` → AgentRun 테이블에 추가:
  - `invocationSource` (ENUM: `heartbeat|assignment|on_demand|webhook`)
  - `logRef` (TEXT) — 로그 저장 참조
  - `stdoutExcerpt` / `stderrExcerpt` (TEXT)
  - `sessionIdBefore` / `sessionIdAfter` (TEXT)

### H5. Project 엔티티 미정의

- **Paperclip**: Project는 Issue 집합, 전용 Overview/Issues/Workspaces/Config/Budget 탭, leadAgent 지정
- **HagentOS 현재**: Project 개념 없음. 케이스가 flat 구조
- **필요 액션**: MVP에서는 "운영 영역"(사이드바 6번)이 Project 역할을 할 수 있음. `domain-model.md`에 `OperationArea` 테이블 정의 검토, 또는 v2 명시적 배치

### H6. 실시간 WebSocket 설계 부재

- **Paperclip**: `ws(s)://{host}/api/companies/{companyId}/events/ws` → `LiveEvent` 스트리밍 → React Query 캐시 무효화, 지수 백오프 재연결
- **HagentOS 현재**: 대시보드에 "live count 배지", "live 인디케이터" 기술만. 기술적 실시간 메커니즘 미설계
- **필요 액션**: 별도 `realtime-architecture.md` 또는 `prd.md` 기술 섹션에 추가:
  - Supabase Realtime (Postgres Changes) 활용 or 자체 WebSocket
  - 이벤트 타입 정의, 캐시 무효화 전략, 재연결 정책

### H7. API 레이어 구조 미설계

- **Paperclip**: 19개 API 모듈 명확 정의 (auth, companies, agents, issues, routines, goals, approvals, heartbeats, activity, costs, budgets, secrets, skills, adapters, plugins, access, executionWorkspaces, dashboard, health)
- **HagentOS 현재**: API 모듈 구조 정의 없음
- **필요 액션**: `prd.md` 또는 별도 `api-design.md`에 최소 API 모듈 목록 정의 (MVP 스코프):
  - `authApi`, `organizationsApi`, `agentsApi`, `casesApi`, `approvalsApi`, `agentRunsApi`, `routinesApi`, `activityApi`, `budgetsApi`, `dashboardApi`, `skillsApi`

---

## MEDIUM (있으면 좋음)

### M1. Inbox 탭 세분화 부족

- **Paperclip**: 4탭(Mine/Recent/Unread/All) + 6개 카테고리 필터 + 키보드 단축키(`e` 아카이브)
- **HagentOS**: 알림함 단일 페이지
- **액션**: IA에 알림함 탭 구조(내 것/미읽음/전체) + 카테고리 필터 추가

### M2. Activity 로그 필터 부재

- **Paperclip**: 엔티티 타입별 필터 드롭다운
- **HagentOS**: `/[org]/activity` 페이지만 존재
- **액션**: IA에 "엔티티 타입 필터" 명시

### M3. 이슈/케이스 Chat 탭의 @mention 지원

- **Paperclip**: 댓글에서 `@mention`으로 에이전트 호출, 파일 드래그앤드롭 첨부
- **HagentOS**: 케이스 상세의 "댓글" 탭만 기술
- **액션**: 케이스 상세 댓글 섹션에 "@에이전트 멘션" 기능 명시

### M4. Agent 생성 페이지 상세 부족

- **Paperclip**: 이름/직함/역할/ReportsToPicker/어댑터/하트비트/스킬 체크박스, 첫 에이전트 CEO 고정
- **HagentOS**: `/[org]/agents/new` v2로 배치. 온보딩에서만 에이전트 구성
- **액션**: MVP에서 온보딩 이후 에이전트 추가 기능 필요 여부 재검토

### M5. 비용 화면 세분화

- **Paperclip**: Costs 페이지 5탭(Overview/Budgets/Providers/Billers/Finance)
- **HagentOS**: `/[org]/budget` 단일 페이지
- **액션**: MVP에서는 Overview + Budgets 2탭이면 충분. IA에 탭 구조 명시

---

## NOT NEEDED (HagentOS 맥락에서 불필요)

| Paperclip 기능 | 불필요 사유 |
|---------------|-----------|
| ExecutionWorkspace (git worktree) | HagentOS 에이전트는 코드 작성이 아닌 운영 업무 수행. 격리 워크스페이스 불필요 |
| Plugin 시스템 (50+ capabilities, 13 UI slots) | k-skill 시스템이 대체. MVP에서 플러그인 아키텍처 과잉 |
| Worker Plugin entrypoint | 에이전트 어댑터로 충분 |
| Instance Settings (multi-instance) | 단일 인스턴스 SaaS 모델. Supabase가 인프라 관리 |
| Adapter Manager UI | MVP에서 어댑터는 코드 레벨 설정. UI 불필요 |
| Company Export/Import (ZIP) | MVP 스코프 외 |
| CLI 도구 (paperclipai) | MVP에서 웹 UI 우선. CLI는 v2 |
| Board Claim / Invite 시스템 | MVP는 단일 원장 계정. 팀 초대는 v2 |
| Feedback Data Sharing 토글 | MVP 불필요 |
| OrgChart SVG 캔버스 (팬/줌) | HagentOS `/[org]/org-chart`에 있으나, SVG 인터랙티브 수준은 MVP에서 간소화 가능 |

---

## 영역별 정렬도 체크

| 영역 | Paperclip | HagentOS | 정렬도 |
|------|-----------|----------|:------:|
| 데이터 모델 — 핵심 엔티티 | Company, Agent, Issue, Goal, Project + 15개 보조 | Organization, Agent, Case + 10개 보조. Goal/Project/Secret 없음 | 🔴 |
| 데이터 모델 — Issue 필드 | parentId, goalId, checkoutRunId, labels, blocks 등 풍부 | Case에 최소 필드만 | 🔴 |
| 화면 구성 — 레이아웃 | 4-Zone (CompanyRail + Sidebar + Main + Properties) | 4-Zone 동일 구조 | 🟢 |
| 화면 구성 — 사이드바 | Work(Issues/Routines/Goals) + Projects + Agents + Company | Work(케이스/자동실행/목표) + 운영영역 + 에이전트 + 기관관리 | 🟢 |
| 화면 구성 — Agent 상세 | 6탭 상세 설계 | 라우트만 존재, 탭 미정의 | 🟡 |
| 화면 구성 — Case/Issue 상세 | Chat/Timeline/Documents 3탭 + Properties 패널 | 본문+실행결과+댓글/하위케이스/이력 + 속성패널 | 🟡 |
| API 레이어 | 19개 모듈, 상세 엔드포인트, 필터 파라미터 | 미설계 | 🔴 |
| 실시간 이벤트 | WebSocket LiveEvent, React Query 무효화, 재연결 | "live" 키워드만, 기술 설계 없음 | 🔴 |
| 인증 | Board(쿠키) + Agent(JWT) 이중 주체 | `/auth` 라우트만 | 🔴 |
| 스킬 시스템 | CompanySkill, 파일 트리 브라우저, GitHub/npm 소스 | k-skill 레지스트리, 설치/장착 흐름 설계 완료 | 🟢 |
| 승인 시스템 | Approval 엔티티, 타입별 렌더러, 댓글, revision_requested | Approval 테이블 + 승인 큐/상세 라우트 | 🟢 |
| 예산/비용 | 5탭 Costs, BudgetPolicy, Incidents, Provider별 분류 | Agent에 budgetMonthlyCents, `/[org]/budget` 단일 페이지 | 🟡 |
| 배포 | local_trusted / authenticated 이중 모드 | Supabase + Vercel (SaaS 단일 모드) | 🟢 |
| 온보딩 | Wizard 오버레이 (회사 생성 → 에이전트) | 6단계 기관 프로필 + 추천 에이전트 팀 (잘 설계됨) | 🟢 |

---

## 우선 조치 권장 순서

1. **domain-model.md 보강** — C1(Case 필드), C3(Goal), C4(Secret), C5(AgentKey), H3(Routine 확장), H4(AgentRun 확장)
2. **information-architecture.md 보강** — C2(Agent 상세 6탭), H1(CommandPalette), H2(Kanban+FilterBar)
3. **신규 문서 작성** — H6(`realtime-architecture.md`), H7(`api-design.md`)
4. **prd.md 기술 섹션 추가** — C5(인증 아키텍처), H6(실시간 전략)
