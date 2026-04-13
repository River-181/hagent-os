---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-13
up: "[[.agent/system/ops/README]]"
aliases:
  - 진행상황
---
# PROGRESS.md — 진행 상황

> **모든 에이전트는 작업 시작 시 이 파일을 읽는다.**
> 작업 완료 시 해당 항목을 업데이트한다.
> 마지막 업데이트: 2026-04-13 (Day 8)

---

## 현재 단계: Day 8 — 제출 직전 마감, 라이브 배포 완료, 제출 패키지 마무리

### Day 8 추가 진행 업데이트 ✅
- [x] `05_제출/ai-report-final.md`와 Excalidraw 3종, `99_comprehensive-architecture`를 묶은 pre-Ralph snapshot(`15902fc`) 확보
- [x] `Telegram outbound` approval delivery 경로와 adapter readiness를 실제 앱 표면에 연결
- [x] `students -> cases`, `schedule -> cases` drill-down 추가
- [x] 우측 `운영 요약` 패널을 `cases / approvals / projects`까지 확장
- [x] `judge_demo`와 `public_byom`을 분리하는 배포 전략 정리
- [x] 증빙/메모리/대시보드/usage stats를 현재 세션 기준으로 최신화
- [x] Ralph 병렬 A에서 허용 경로 한정 증빙/메모리/로그 동기화 완료
- [x] Railway 라이브 URL, GitHub, Railway, Neon, Telegram, Kakao 공개 링크 확정
  - Live: `https://hagent-os.up.railway.app`
  - GitHub: `https://github.com/River-181/hagent-os`
  - Railway: `https://railway.com/invite/fmzuFpxK1li`
  - Neon: `https://console.neon.tech/app/projects/rough-feather-95020200`
  - Telegram: `https://t.me/TANZANIA_ENGLISH_ACADEMY_bot`
  - Kakao: `https://pf.kakao.com/_raDdX`
- [x] 현재 세션 재검증
  - `corepack pnpm --filter @hagent/ui typecheck`
  - `corepack pnpm --filter @hagent/ui build`
  - `corepack pnpm --filter @hagent/db build`
  - `corepack pnpm --filter @hagent/server typecheck`
  - `curl http://127.0.0.1:3200/api/health` → `200`
  - `curl http://127.0.0.1:5174/탄자니아-영어학원-데모-7/dashboard` → `200`
- [ ] `OPENAI_API_KEY`, `LAW_OC`, `KAKAO_OUTBOUND_PROVIDER_URL`, `GOOGLE_CALENDAR_ACCESS_TOKEN` live env 재검증
- [ ] `judge_demo`용 Docker/compose 구현
- [ ] dirty worktree 최종 regression 후 commit/push
- [ ] AI 리포트 `docx -> PDF`
- [ ] 개인정보동의서 / 참가각서 서명
- [ ] 제출 이메일 발송

### Day 7 제출 안정화 업데이트 ✅
- [x] `hagent-os` 좌측 내비를 `오늘 운영 / 학원 운영 / AI 운영 / 운영 관리` 기준으로 재정렬
- [x] `학생 / 직원·강사 / 일정 / 문서 / AI 팀`에 우측 `운영 요약` 패널 연결
- [x] `에이전트`, `플러그인`, `어댑터`, `k-skill 레지스트리` 같은 개발자 표면 용어를 `AI 팀`, `외부 연동`, `AI 연결`, `업무 스킬`로 치환
- [x] `문서/지식베이스`에 운영형 액션(`FAQ`, `상담 답변 초안`, `관련 케이스 연결`, `AI 팀 보완 요청`) 추가
- [x] `ui` 기준 `typecheck`, `build`, 주요 라우트 브라우저 순회 확인 완료 (`dashboard`, `students`, `instructors`, `schedule`, `documents`, `agents`, `settings`)
- [x] 승인 화면 스크롤 버그 수정 (`ApprovalsPage` min-h-0 + native overflow, `ApprovalDetailPage` outer wrapper)
- [x] Settings Danger Zone — 데이터 내보내기(JSON export) + 기관 삭제(CASCADE) 다이얼로그
- [x] 지식베이스 실질화 — 탄자니아 학원 정책 7종 실제 내용; "에이전트에게 보완 요청" 버튼 제거
- [x] 온보딩 전체화면 분리 — Layout 밖 독립 route + `100dvh` 래퍼
- [x] 탄자니아 데모 루틴 3종 생성 (07:00 조회·이탈점수 배치·월요일 브리핑)
- [x] 탄자니아 데모 운영 목표 3종 생성 (이탈률 5%·월평균 민원 3건·강사만족도 4.0)
- [x] Goals 페이지 재설계 — Paperclip 스타일 클린 목록
- [x] GoalDetailPage 신규 — 인라인 제목 수정 + 상태 Select + 메모 자동저장 + 삭제
- [x] Goals ↔ Projects 양방향 연결 — PATCH opsGroupId + GET /projects/:id에 goals 포함
- [x] 사이드바 리네이밍 문서 (`sidebar-restructure.md`) + Paperclip UX 비교 문서 (`domain-ux-paperclip-gap.md`)
- [x] Railway 배포 → 라이브 URL 확보
- [x] `River-181/hagent-os` README 작성
- [x] E2E 최종 브라우저 검증 (온보딩 → dispatch → approvals) — 로컬 기준 통과

## 완료된 작업

### 워크스페이스 구조화 ✅
- [x] 디렉토리 구조 생성 (01~05, assets, 03_제품/app, 03_제품/tests)
- [x] 기존 파일 11개 이동 및 정리
- [x] MOC 6개 작성 및 `_MOC/` 중앙화
- [x] `.agent/AGENTS.md` — 에이전트 공용 진입점
- [x] `.agent/` — agents, rules, skills, adapters, system 정리
- [x] `.claude/` — 최소 어댑터만 유지 (`CLAUDE.md`, `settings.json`)
- [x] `.context/` 내용 흡수 후 폴더 제거
- [x] 옵시디언 설정 (첨부파일 → assets/, 데일리 → 04_증빙/03_daily/)

### 전략 문서 ✅
- [x] 대회 개요서 (`01_대회정보/바이브코딩공모전_공지.md`)
- [x] 마스터 플레이북 (`02_전략/00_foundation/00-vibe_contest_master_playbook_v0_1.md`)
- [x] 계보·포지셔닝 분석 (`02_전략/00_foundation/00-계보_포지셔닝_분석.md`)
- [x] 기관 분석 및 심사 전략 (`02_전략/00_foundation/00-기관_분석_및_심사_전략.md`)

### 프로젝트 관리 ✅
- [x] PM 대시보드 (`_system/dashboard/project-dashboard.md`)
- [x] 태스크 트래커 (`_system/dashboard/project-dashboard.base`)
- [x] `PLAN / PROGRESS / daily / task`를 대시보드와 유기적으로 연결하는 제출용 구조 확정

### 증빙 체계 ✅ (1차)
- [x] ai-usage-log.md — 초기 이벤트 로그 기록
- [x] decision-log.md — DEC-001~005 기록
- [x] prompt-catalog.md — 뼈대
- [x] 데일리 노트 04-06

### 포터블 환경 ✅
- [x] `.agent/adapters/claude/setup.sh` — 원커맨드 플러그인 설치
- [x] `.agent/skills/` — 프로젝트 커스텀 스킬 공간
- [x] `.agent/adapters/claude/portable-config.md` — 이식성 가이드

### 증빙 체계 2차 ✅
- [x] Codex 평가 기록
- [x] 플레이북 분석 + AI 리포트 전략 문서화
- [x] Plan 문서 프로젝트 내 보존
- [x] ai-usage-log 컬럼 확장 (Session_ID + Tokens 필드 포함, U-001~U-018)
- [x] session-log.md 생성
- [x] tool-log.md 생성
- [x] evolution-log.md 생성
- [x] token-strategy.md 생성
- [x] Excalidraw 아키텍처 다이어그램 (5레이어: Human→Harness→AI Agent→Tools→Output/Submit)
- [x] AI-native 운영감사 보고서 작성 (`04_증빙/ai-native-workspace-audit-report.md`)

### 멀티에이전트 조율 ✅
- [x] PROGRESS.md (이 파일)
- [x] PLAN.md
- [x] CLAUDE.md 업데이트 — 에이전트 시작 프로토콜 (PLAN→PROGRESS→AGENTS 순서)
- [x] AGENTS.md 업데이트 — 동일 프로토콜 추가

### V2 운영 정본화 ✅
- [x] `.agent/system/` 골격 생성
- [x] 운영 계약 3종 생성 (`workspace-contract`, `mirroring-policy`, `memory-evidence-policy`)
- [x] memory를 `long-term-memory` + `daily-memory` 구조로 재정리
- [x] registry 4종 생성 (tools, mcp, skills, plugins)
- [x] Mermaid 다이어그램 정본 6종 생성
- [x] `.context/` 내용 흡수 후 폴더 제거
- [x] `.claude/CLAUDE.md`를 최소 어댑터 참조형으로 축소
- [x] `ai-usage-log`, `session-log`, `prompt-catalog`, `tool-log` V2 인터페이스 반영
- [x] `evidence-gate-log.md` 도입
- [x] DEC-007, DEC-008 기록
- [x] 운영 파일을 `.agent/system/ops/`로 이동
- [x] `.claude/agents`, `.claude/rules`, `.claude/skills`를 `.agent/`로 흡수
- [x] memory를 `장기기억/일일기억` 2층 구조로 단순화
- [x] maps를 `workspace-atlas.md` 1파일 기준으로 단순화
- [x] `04_증빙`를 `01_핵심로그 / 02_분석자료 / 03_daily`로 재배치
- [x] `workspace-sync` 스킬 추가
- [x] `github-workflow` 스킬 추가
- [x] `master-evidence-ledger.md` 단일 증빙 원장 도입

### Obsidian 구조 정규화 ✅
- [x] 태그 체계를 `area/*`, `type/*`, `status/*`, `workflow/*` namespace로 재정의
- [x] 기존 평면/별칭성 태그 제거 및 frontmatter 정규화
- [x] child note에 `up` 속성을 의무화해 bottom-up 추적 복원
- [x] 태그 규칙 문서, 감사 스크립트, note template 추가
- [x] `.agent`, `.claude`, visible vault 전반에 동일 규칙 반영

### 재사용 자산화 ✅
- [x] prompt-catalog를 `Intent / Prompt / Input contract / Output contract / Reuse rule / Linked evidence` 구조로 확장
- [x] 태그 정규화, `up` 계층 복원 프롬프트를 자산으로 저장
- [x] prompt packaging 가이드와 template 추가

### 지식 시스템 확장 ✅
- [x] `06_LLM위키/` 레이어 도입
- [x] `index.md`, `overview.md`, `schema.md`, `log.md` 생성
- [x] `karpathy-llm-wiki-adaptation.md`로 현재 vault 매핑 문서화
- [x] 전략 문서, 도메인 조사, `research-results` raw mirror 1차 ingest 완료
- [x] 문제/심사/운영/compliance/control-plane 축 wiki note 확장
- [x] `wiki-candidate-harvest` 프로젝트 스킬 생성 및 실사용

### LLM 위키 운영 확장 ✅
- [x] `06_LLM위키/sources/`에 raw source와 `research-results` 미러 반영
- [x] `문제_선택_점수표_문법`, `문제_후보_뱅크와_탈락_문법`, `KEG_7일_MVP_플레이북` 승격
- [x] `Paperclip_vs_HagentOS_설계_갭`, `학원_운영_법규_체크리스트`, `학원_운영_루프_지도` 승격
- [x] `운영_Control_Plane_모델`, `한국_교육_도메인_적합성_갭` 승격
- [x] `06_LLM위키/tasks/프로젝트_지식화_후보_스캔.md` 생성

### 데일리/메모리 보강 ✅
- [x] 누락된 `2026-04-07.md`, `2026-04-08.md` 생성
- [x] `.agent/system/memory/daily-memory.md`를 현재 구조 기준으로 갱신
- [x] 새 파일/폴더의 생성 이유를 대시보드에 명시

### 세션 intake 파이프라인 ✅
- [x] 엑셀 트래커 시트 구조를 참고한 `ai-session-intake.csv` canonical ledger 도입
- [x] 과거 AI 세션 22건을 intake 파일로 백필
- [x] `dispatch-session-intake.py`로 `master-evidence-ledger.md`, `external-ai-usage.csv`, `session-intake-dispatch-report.md` 재생성 구현
- [x] `session-intake-pipeline.md`와 공용 운영 문서를 intake-first 흐름으로 갱신

### 리서치 운영 정렬 ✅
- [x] `02_전략/research-results/`를 리서치 작업 공간으로 정리
- [x] `research-hub`, `research-plan-eduswarm-v0`, `research-prompts-by-tool`, `research-log` 생성
- [x] `problem-bank`, `problem-scorecard` 초안 생성
- [x] `gemini`, `grok`, `perplexity` 리서치 결과를 통합한 `R-007_EduSwarm_리서치_통합_브리프.md` 작성
- [x] `nlm` 재인증 및 CLI 동작 복구
- [x] NotebookLM 노트북 `KEG EduSwarm Research 2026-04-08` 생성 및 리서치 문서 18개 업로드
- [x] NotebookLM 1차 질의로 `담임 모드` 우선 가설 도출
- [x] Bottom-Up 전용 노트북 `KEG Bottom-Up Academy Research 2026-04-09` 생성 및 소스 18개 업로드
- [x] 바텀업 프롬프트 5종 실행 후 `R-008_NLM_바텀업학원리서치합성.md` 작성
- [x] 바텀업 질의 기준으로 `운영자 모드`와 `민원/이탈` 축이 다시 강하게 부상함을 확인
- [x] `nlm deep research`로 새 웹 소스 22개를 Bottom-Up 노트북에 추가 import
- [x] NotebookLM Studio report artifact 생성 및 Google Docs export 완료
- [x] `02_전략/research-results/20_domain-analysis/`에 학원 운영 도메인 심화 문서 4종 정리
- [x] `02_전략/research-results/`를 `00_hub / 10_reports / 20_domain-analysis / 30_external-ai` 구조로 통합
- [x] 새 deep research import 기준으로 `02_전략/01_problem-framing/01-problem-scorecard.md`를 후보 3개 압축 방식으로 전면 개편
- [x] `02_전략` 루트를 `00_foundation / 01_problem-framing / 02_prompts / 03_decisions / paperclip-analysis / research-results / tasks / archive` 구조로 재정리
- [x] 전략 MOC, 프롬프트, 문제 정의 문서 경로를 새 구조 기준으로 갱신
- [x] 현재 1순위를 `학원 운영자 민원·예외 처리 OS`로 재정렬
- [x] 운영 안내 문서 (`AGENTS`, `workspace-atlas`, `README`, `dashboard`)를 새 전략 구조 기준으로 정렬
- [x] `탄자니아 영어학원` 로고/카카오 채널/챗봇 이미지 17건에 날짜 포함 제목을 부여해 제출용 캡션 기준을 정리
- [x] `2026-04-10` daily note 생성 및 `daily-memory`, `PLAN`, `master-evidence-ledger` 동기화

### Paperclip 코드 해체 분석 ✅
- [x] `02_전략/paperclip-analysis/paperclip-master/`에 실제 reference repo 로컬 복제본 배치
- [x] `ui/src/App.tsx`, `docs/start/architecture.md`, `docs/api/overview.md`, `docs/deploy/deployment-modes.md`, `packages/plugins/sdk/README.md` 기준으로 repo-grounded 분석 수행
- [x] `01-ui-entrypoints.md`, `02-data-context-model.md`, `03-agent-skill-structure.md`, `04-k-education-fit-gaps.md`, `05-open-questions.md` 보강
- [x] `06-runtime-control-plane-map.md`, `07-plugin-adapter-extensibility.md` 추가
- [x] 모방 기준을 `chat UX`가 아니라 `control plane + local-first deployment + plugin/adapter extensibility`로 재정렬
- [x] `08_PAPERCLIP-CLONE-SPEC.md`를 스크린샷 근거까지 포함한 clone contract 문서로 보강

### 앱 실행/운영 상태 정합화 ✅
- [x] `03_제품/app/`이 실제 `ui/`, `server/`, `packages/` 구조와 `package.json` 스크립트를 가진 상태임을 다시 확인
- [x] `http://localhost:5173/` 현재 세션 리스닝 상태 확인 (`not listening`)
- [x] 대시보드/PLAN/daily-memory 문서에서 “앱 없음” 또는 “현재 실행 중”처럼 어긋난 서술을 실제 상태 기준으로 수정
- [x] `03_제품/app/README.md`를 `TBD`에서 실제 실행 안내 문서로 갱신

---

## 참여 중인 AI 에이전트

| AI                    | 환경              | 현재 역할             | 마지막 작업       |
| --------------------- | --------------- | ----------------- | ------------ |
| Claude Opus 4.6 → Sonnet 4.6 | Claude Code CLI | 제품 구현, E2E 재구축 | v1.0 독립 레포 E2E 완성 + mock 오케스트레이터 재작성 (Day 6) |
| GPT-5.4 (ChatGPT Pro) | Web             | 전략 설계, 플레이북 작성    | 플레이북 v0.1 완료 |
| GPT-5 (Codex)         | Desktop App     | 리서치 운영, LLM 위키 구축, 증빙 정리 | LLM wiki 확장 + `wiki-candidate-harvest` 스킬 생성/실사용 완료 |
| Perplexity            | Web             | 리서치 수집            | 운영자/교사 페인포인트 리서치 완료 |

---

### GitHub 연결 ✅
- [x] git init + remote 추가 (https://github.com/River-181/KEG-Mangsanggwedo.git)
- [x] .gitignore 생성
- [x] 초기 커밋 (74 files, 4868 insertions) + push to main

---

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
- [x] `04_ai-agents/agent-design.md` — 에이전트 아키텍처 정본 (Paperclip 메커니즘 반영, DB 스키마, 실행 흐름, 협력 패턴, 예산 모델)
- [x] `04_ai-agents/agent-roles/orchestrator.md` — 태스크 라우팅, 병렬 브리핑 패턴, System Prompt
- [x] `04_ai-agents/agent-roles/complaint.md` — 7종 분류, 긴급도, 에스컬레이션 조건
- [x] `04_ai-agents/agent-roles/retention.md` — 이탈 점수화(4스트림), 개입 권고 6종
- [x] `04_ai-agents/agent-roles/scheduler.md` — 7종 스케줄, 외부 시험 연동, 구글 캘린더 동기화
- [x] `04_ai-agents/agent-roles/intake.md` — 신규 문의 → 등록 전환
- [x] `04_ai-agents/agent-roles/staff.md` — 강사 성과, 번아웃, 노무
- [x] `04_ai-agents/agent-roles/finance.md` — 환불, 세무, 급여
- [x] `04_ai-agents/agent-roles/compliance.md` — 학원법, 소방, 개인정보
- [x] `04_ai-agents/agent-roles/notification.md` — 다채널 알림 (cross-cutting)
- [x] `04_ai-agents/agent-roles/analytics.md` — 주간/월간 리포트
- [x] `05_workflows/complaint-handling.md` — 민원 처리 7단계, k-skill 주입 지점, 분기 처리, DB 스키마
- [x] `05_workflows/churn-detection.md` — 이탈 감지 4스트림, 점수 공식, 개입 → 추적
- [x] `05_workflows/schedule-management.md` — 강사 공결 대체, 구글 캘린더 동기화, 외부 시험 트리거
- [x] `05_workflows/new-enrollment.md` — 문의→상담→등록 전환, follow-up cron, 온보딩
- [x] `05_workflows/morning-briefing.md` — 07:00 heartbeat 병렬 브리핑, Level 0/1 분류
- [x] `05_workflows/compliance-alert.md` — D-30/D-7/D-1 법정 기한, korean-law-mcp 연동
- [x] `06_policies/communication-policy.md` — 채널별 발송 원칙, SLA, AI 투명성
- [x] `06_policies/data-policy.md` — 수집 범위, 보존 기간, 익명화, 감사 로그 불변성
- [x] `06_policies/ai-safety-policy.md` — 절대 금지 3종, 제로휴먼 정책, RBAC, override 보장
- [x] `07_integrations/integrations.md` — Google Calendar MVP, 카카오/SMS Phase2, MCP 13개 연동 가이드, .env 예시
- [x] `08_data/domain-model.md` — ERD + 10개 핵심 테이블 상세, 멀티지점/공교육 확장 가이드
- [x] `08_data/reporting-metrics.md` — 실시간 6지표, 주간/월간 리포트, 에이전트별 KPI, 엑셀 5시트
- [x] `09_ux/information-architecture.md` — 사이트맵, 10개 화면 인벤토리, 4개 여정 흐름, 모바일/데스크톱 분리
- [x] `09_ux/ux-concepts.md` — 승인 카드 해부도, 3-tap 모바일 flow, swipe 제스처, 에러 UX
- [x] `10_execution/roadmap.md` — D5~D8 스프린트, 역할 분담, Phase 1~3, 기술 부채 목록
- [x] `10_execution/open-questions.md` — 기술/제품/도메인/비즈니스 미결 13항목, 우선순위 매트릭스
- [x] Codex 리뷰 03+04 — 완료 (CRITICAL 2 + HIGH 2 수정)
- [x] Codex 리뷰 05+06 — 완료 (CRITICAL 1 + HIGH 3 수정)
- [x] Codex 리뷰 07+10 — 완료 (CRITICAL 1 + HIGH 2 + MEDIUM 2 수정)
- [x] design.md — Paperclip 기반 HagentOS 디자인 시스템
- [x] INDEX.md — 개발자용 빠른 탐색 인덱스
- [x] k-edu-zero-human.md — 제목/내용 업데이트 (Level 0-4 canonical 정렬)
- [x] 07_integrations — @solapi/mcp-server, kimcp 추가, 연동 우선순위 매트릭스
- [x] 증빙 S-PROD-019 추가
- [x] design.md — Toss 색상 토큰 반영 + 복제 언어 제거 (HagentOS 고유 언어)
- [x] ux-concepts.md — "운영 제어판 UX 패턴 + 한국형 재설계"로 리프레이밍
- [x] information-architecture.md — Paperclip 4존 레이아웃 + 22개 라우트 + 모바일 탭바
- [x] _research/paperclip-ui-reference.md — Paperclip 4개 화면 분석 (개발 참고)
- [x] DB 스택 변경: Supabase → PostgreSQL + Drizzle ORM (오픈소스/로컬)
- [x] 대회 요건 확인: 라이브 URL 필수, AI 리포트 2섹션, 배포 필요
- [x] 토스증권 웹 디자인 시스템 분석 완료 (색상 토큰 30개+)
- [x] 랜딩 페이지 방향 확정: Paperclip/Linear 구조 + 한국형 헤로
- [x] 04_증빙/03_daily/2026-04-09.md 업데이트

---

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

---

### HagentOS v1.0 독립 레포 + Paperclip급 E2E 완전 재구축 ✅
> 2026-04-11 (Day 6) — 세션 S-DEV-022

**독립 레포 구축**
- [x] `/Users/river/workspace/active/hagent-os/` — 새 레포 초기화 및 전체 코드 이식
- [x] GitHub: `River-181/hagent-os` (public)
- [x] DB: `hagent_os` (port 5432), Server: 3200, UI: 5174
- [x] vite.config.ts port 5174, proxy → 3200 설정

**서버 E2E 엔진**
- [x] `execution.ts`: AgentRun 완료 → Case.status 자동 변경 + assigneeAgentId + caseComments 자동 삽입 (pending_approval 분기 포함)
- [x] `approvals.ts`: reject → Case.status="todo" 롤백 + SSE 이벤트 + ActivityEvent + agent_hire 승인 시 에이전트 자동 생성 + SOUL.md
- [x] `agents.ts`: POST → SOUL.md 자동 생성 (agentId 폴더 격리), reportsTo 필드, error detail
- [x] `agent-hires.ts`: 신규 — 에이전트 고용 요청 → approval 생성 → 승인 시 에이전트 자동 생성
- [x] `organizations.ts`: POST (에이전트 자동생성 제거), DELETE cascade (8테이블 역순)
- [x] `agent-instructions.ts`: PUT 저장 엔드포인트, agentId 격리 경로 우선 (agentType 폴백)
- [x] `orchestrator.ts`: 케이스 제목 = 실제 지시 내용, 에이전트 0개 400 에러
- [x] DB schema: `reportsTo` FK 추가 (agents.ts + SQL 직접 실행)

**Mock AI 재구축**
- [x] `claude.ts`: mockOrchestratorResponse 전면 재작성
  - 키워드 기반 동적 라우팅: 민원→complaint, 이탈/결석→retention, 일정/강사→scheduler, 기타→orchestrator
  - 모든 "탄자니아 영어학원" 하드코딩 제거
  - General fallback: 실제 지시 내용을 draft에 반영

**UI v1.0 재구축**
- [x] `OnboardingPage.tsx`: 4단계 Paperclip 방식 (학원→CEO→첫실행→완료), agentsApi.create() 직접 호출
- [x] `AgentDetailPage.tsx`: ChatBubble 컴포넌트 + InstructionsTab 4 서브탭 (SOUL/HEARTBEAT/AGENTS/시스템프롬프트) + SettingsTab 편집 가능
- [x] `OrgChartPage.tsx`: reportsTo 기반 동적 트리, 하드코딩 제거, 빈 상태 처리
- [x] `ApprovalsPage.tsx`: POST /approvals/:id/decide 직접 호출, caseTitleMap
- [x] `ApprovalDetailPage.tsx`: 완전 재작성 — 승인/거절 버튼 + 거절 사유 Dialog
- [x] `OrganizationRail.tsx`: "+" 버튼 → 새 학원 추가 + 우클릭 삭제 (확인 모달)
- [x] `App.tsx`: RootRedirect (0개 기관 → /new/onboarding)
- [x] `NewAgentPage.tsx`: title 필드, 모델 선택, reportsTo 선택, 스킬 체크박스
- [x] `ProjectsPage.tsx`: NewProjectDialog 추가

**Fallback 데이터 완전 제거 (11파일)**
- [x] SettingsPage, DocumentsPage, GoalsPage, RoutinesPage, CostsPage
- [x] CaseNewPage (demo students → studentsApi.list)
- [x] OrgChartPage (DEFAULT_INSTRUCTORS 제거)
- [x] AppErrorBoundary, OnboardingPage, InstructorsPage — 탄자니아 완전 제거

**갭 분석 문서**
- [x] `03_제품/PAPERCLIP-GAP-ANALYSIS.md` — 292줄, 14개 갭 P0/P1/P2 분류

**커밋 이력** (River-181/hagent-os)
- `09a02e0` — shadcn semantic color variables
- `6ca036f` — v0.3.0 UI polish + schedule calendar + dispatch pipeline
- `e6f39ea` — v0.3.1 student CRUD, schedule CRUD, agent instructions, documents
- `e5f237c` — v0.3.1 agent controls, dashboard scroll fix, sidebar cleanup
- `28e58a9` — scroll bugs + activity timeline links
- `3254c76` — mock orchestrator keyword routing + case title fix

---

### Day 7 시작 시점 상태 (2026-04-12)

**작업 환경 이동 확정**
- KEG 콘테스트 워크스페이스: `/Users/river/workspace/active/2026 제1회 KEG 바이브코딩 콘테스트/` (문서/증빙)
- 제품 코드 작업 환경: `/Users/river/workspace/active/hagent-os/` (배포 대상 독립 레포)
- GitHub: `River-181/hagent-os` (public)

**미팅 이슈 (01:30 4차 미팅)**
- 에이전트 실제 작동 여부 체감 안 됨 → E2E 브라우저 검증 필요
- 승인 화면 스크롤 버그 → ApprovalsPage/ApprovalDetailPage overflow 수정 필요

## 다음 단계: Day 7 — 배포 + AI 리포트 + 데모 (D-1)

1. **승인 화면 스크롤 버그 수정** (P0) — ✅ 완료
2. **E2E 전체 검증** (포트 3200/5174) — 브라우저에서 직접 통과 — ⏳ 라이브 확인 대기
3. **Railway 배포** → 라이브 URL 확보 — ✅ 완료: `https://hagent-os.up.railway.app`
4. **README** 작성 (설치 방법 + 스크린샷 + 라이브 URL) — ✅ 완료
5. **AI 리포트 초안** — `04_증빙/01_핵심로그/` raw material 기반 — 🔲 남음
6. **데모 스크립트 v0.1** — 2분 시연 경로 — ✅ JUDGE_DEMO.md에 포함됨

## Day 7 Claude 세션 추가 (2026-04-13 오후~저녁)

### 완료
- Phase A: `ui/src/index.css` 토큰 슬림화 (9→5 bg, 7→4 text, 4→2 border, rail/body 통일)
- Phase B: SkillsPage pilot (탭 6→3, FAB 제거, 필터 드롭다운, Primary+⋯ overflow, 스킬 삭제 기능)
- 디자인 문서 5종:
  - `docs/design/ui-harness.md` — **정본** (583줄, AI 필독)
  - `docs/design/DESIGN-STATUS.md` — 30페이지 위반 현황
  - `docs/design/design-system-rules.md` — 압축 규칙
  - `docs/design/agent-prompt-phase-c.md` — Phase C 병렬 에이전트 오케스트레이터
  - `AGENTS.md` (루트) — 새 AI 진입점
- 데모 데이터 강화 (`server/src/data/rich-demo-seed.ts` 신규):
  - 케이스 25개 + agentDraft + caseComments 이력
  - 학원 운영 문서 12개 (환불정책, 플레이북, FAQ, 커리큘럼 등)
  - CEO 메모리 JSON (studentInsights, lastInsight, monthlyStats)
- 에이전트 지침서 상세화 5종 (SOUL.md + HEARTBEAT.md):
  - orchestrator / complaint / scheduler / retention / notification
- Telegram 왕복 완결 (`routes/telegram.ts`): 봇이 AI 응답을 답장
- DEMO_MODE 환경변수 (`config.ts`, `runtime.ts`): API 키 없이 mock 응답
- seed-demo API (`POST /api/organizations/:orgId/seed-demo`): 기존 org에 재시드
- `packages/db/src/seed.ts` (1494줄 레거시) 삭제
- Railway 배포 완료:
  - Dockerfile + railway.toml 신규
  - Neon PostgreSQL 연결 + 마이그레이션
  - UI static 서빙 + SPA catch-all
  - URL: `https://hagent-os.up.railway.app`
- Telegram 봇 생성: `@TANZANIA_ENGLISH_ACADEMY_bot` (토큰 Railway 환경변수 설정됨)
- 세션 핸드오프 문서: [`hagent-os/docs/handoff/2026-04-13-claude-session-summary.md`](/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-claude-session-summary.md)

### 남은 작업 (사람 직접)
- [x] 라이브 URL 접속 및 배포 상태 공유
- [x] Telegram bot 공개 링크 확보
- [ ] AI 리포트 docx 작성 + PDF 변환 (공식 양식)
- [ ] 데모 리허설 2분 시나리오 검증
- [ ] 개인정보 동의서 + 참가 각서 서명 (팀원 각자)
- [ ] 제출 이메일 발송

## 참고: 현재 위키 핵심 진입점

- `06_LLM위키/index.md`
- `06_LLM위키/overview.md`
- `06_LLM위키/log.md`
- `06_LLM위키/tasks/프로젝트_지식화_후보_스캔.md`
