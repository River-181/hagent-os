---
tags: [area/product, type/reference, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/README]]"
---
# Roadmap

> 마지막 업데이트: 2026-04-13 (runtime docs, full regression, 제출 정리 반영)

## 역할 분담
- **이승보(승)**: AI 에이전트/오케스트레이터 설계 및 구현, Claude API 연결, 대회 전략
- **김주용(용)**: UI/프론트엔드, 인프라/배포, DB 스키마, 유저 플로우
- **AI 에이전트**: 코드 생성, 문서화, 통합 테스트 보조

---

## Phase 0: 대회 최종 스프린트 (D-3, ~4/13)

### 목표
Must-have 기능만 구현. 평가 기준 점수 최대화.

### Day별 목표

**D5 (4/10 목): 인프라 + 앱 스켈레톤 + 운영 갭 해소** ✅ 완료
- [x] Vite + React 19 + Express v5 + Drizzle ORM 초기화
- [x] 핵심 테이블: Organization, Agent, Case, AgentRun, Approval, Student, Instructor, Schedule, Attendance, Documents, Routines, Goals, OpsGroups, ActivityEvents, Notifications 등 22+ 테이블
- [x] PostgreSQL 17 로컬 + Drizzle ORM 마이그레이션 구성
- [x] local_trusted 모드 (인증 없이 시작)
- [x] Seed 데이터: 탄자니아 영어학원 (학생 10명, 강사 5명, 수업 12개, 민원 케이스 5건, 에이전트 7종)
- [x] Claude API 연결 (mock fallback 포함)
- [x] E2E 파이프라인: dispatch → orchestrator → complaint agent → AgentRun → Approval
- [x] 카카오톡/SMS 웹훅 → 케이스 자동 생성 + 에이전트 배정
- [x] 24개 페이지: Dashboard, Inbox, Cases(+칸반), CaseDetail, Approvals, Agents, AgentDetail, OrgChart, Schedule, Students, Instructors, Goals, Routines, Projects, Documents, Skills, Costs, Activity, Settings, Onboarding 등
- [x] 에이전트 Controls: Assign Task, Run Heartbeat, Pause/Resume
- [x] 에이전트 Instructions (파일 뷰어 + 시스템 프롬프트 편집)
- [x] k-skill 카탈로그 12종 + 에이전트 스킬 장착 모달
- [x] 운영 갭 감사 + P0/P1 즉시 수정 (InstructorsPage, SchedulePage 편집/삭제, 반배정, 일괄승인)
- [x] DB 스키마 v2: students(classGroup/shuttle), instructors(email), student_schedules 테이블
- [x] 커밋: f32570b, 9a4c80c

**D6 (4/11 금): 에이전트 E2E 검증 + 온보딩 + 배포** ✅ 완료
- [x] DB 마이그레이션 실행 (0002_education_schema_v2.sql) — 용
- [x] OnboardingPage 완성: 학원명 입력 → 에이전트팀 자동 배치 → 대시보드 리디렉션 — 용
- [x] 에이전트 E2E 재검증: dispatch → run → approval 실시간 SSE 확인 — 승
- [x] Heartbeat cron 동작 확인 (node-cron 07:00) — 승
- [x] Railway/Render 배포 + 환경변수 설정 — 용
- [x] GitHub README 작성 (라이브 URL 포함) — 용
- [x] 데모 스크립트 v0.1 작성 (2분 시연 경로) — 승+용

**D7 (4/12 토): 안정화 + 데모 리허설** ✅ 대부분 완료
- [x] 데모 시나리오 실제 실행 2회 (민원 접수 → 에이전트 처리 → 승인) — 승+용
- [x] AI 리포트 초안 완성 (제출 필수) — 승
- [x] 버그 수정 및 UI 폴리싱 — 용
- [ ] k-skill 실제 동작 확인 (refund-calculator, k-education-law-lookup) — 승

**D8 (4/13 일): 제출**
- [x] 최종 데모 테스트 — 승+용
- [x] 제출 패키징 (README + AI 리포트 + 라이브 URL + GitHub) — 용
- [ ] 제출 마감 24:00 전 완료

**절대 하지 않는 것 (D6-D8):**
- [x] Google Calendar sync → Phase 1
- [x] 카카오 i 오픈빌더 실제 연결 → Phase 1 (웹훅 엔드포인트만 준비됨)
- [x] Scheduler Agent 실제 에이전트 로직 → UI+루틴 완성으로 대체
- [x] 복잡한 인증 → local_trusted 모드로 제출

> **현재 상태**: D5-D7은 실질적으로 닫혔고, D8은 제출 마감 시점만 남았다. 최신 실행 근거는 `runtime-docs/handoff/2026-04-13-full-regression.md`.

---

## Phase 1: 초기 사용자 (대회 후, ~5월~6월)

### 목표
베타 10~30개 학원 모집, MVP KPI 추적, 수익화 경로 검증.

- 카카오톡 알림 / SMS 연동
- 학원별 맞춤 설정 (환불 정책, 시간표 관리)
- 사용자 피드백 루프 (주간 리포트)
- Scheduler Agent 풀 구현 (Google Calendar 양방향 동기화)

---

## Phase 2: 도메인 확장 (3~6개월)

### 목표
태권도, 예체능 도메인별 팩 출시, 공교육 파일럿.

- Staff Agent 강화 (자동 신청서 검토, 면접 일정 제안)
- 도메인별 워크플로우 템플릿
- 공교육 데이터 연계 (시험 성적, 출석)
- 멀티 계정 (실장/강사 역할 분리)

---

## Phase 3: 플랫폼화 (6~12개월)

### 목표
k-skill 커뮤니티 플랫폼으로 진화, 데이터 인사이트 판매.

- k-skill 레지스트리 (학원/교사 공유 에이전트 마켓)
- 다지점 관리 기능 (체인 학원)
- 데이터 분석 & 인사이트 대시보드

---

## 기술 부채 & 의도적 지연 항목

| 항목 | 현재 상태 | 대회 후 우선순위 |
|------|---------|-----------------|
| Google Calendar OAuth 도메인 검증 | 로컬 테스트만 | 높음 |
| SMS/Kakao 배치 전송 | 제외 | 높음 |
| DB RLS 정책 자동화 | 앱 레벨 필터링 | 중간 |
| Scheduler Agent 풀 로직 | UI 전용 | 높음 (Phase 1) |
| 멀티 계정 (강사/실장) | 단일 원장 MVP | 중간 (Phase 1) |
| 다국어 지원 | 한국어만 | 낮음 |

---

## 마일스톤 & 성공 기준

| 마일스톤 | 기준 | 목표 |
|---------|------|------|
| **대회 제출** | Approval Dashboard 데모, Complaint/Retention Agent 동작, Heartbeat cron | 4/13 자정 |
| **Phase 1 (베타)** | 10개 학원, 50명 학생, 90% 가동률 | 6/1 |
| **Phase 2 (도메인)** | 30개 학원, 3개 도메인 팩 | 9/1 |
| **Phase 3 (플랫폼)** | k-skill 레지스트리 론칭, 100개 학원 | 12/1 |

---

## 리스크 & 완화 전략

- **토큰 비용**: D6에 병렬 에이전트 실비 산출 → 가격 모델 조정
- **일정**: 이승보(에이전트)/김주용(UI) 병렬화, Mock 데이터로 에이전트 먼저 테스트
- **심사**: 4/13 오전 자체 검수 → 마지막 수 시간 버그 수정 여유
- **Scheduler Agent 과욕**: UI만 완성, 풀 에이전트 로직은 Phase 1으로 명시 연기
