---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-12
up: "[[.agent/system/ops/README]]"
aliases:
  - 계획
---
# PLAN.md — 실행 계획

> **모든 에이전트는 작업 시작 시 이 파일을 읽는다.**
> 자신의 역할에 해당하는 작업을 찾아 실행한다.
> 마지막 업데이트: 2026-04-12 (Day 7)

---

## 대회 타임라인

| Day | 날짜 | 초점 | 종료 조건 |
|-----|------|------|----------|
| 0 | 04-06 | ==세팅 + 리서치 준비== | 워크스페이스 완성, 리서치 시작 가능 |
| 1 | 04-07 | 문제 리서치 → 후보 3개 축소 | problem-bank, scorecard 완성 |
| 2 | 04-08 | 의사결정 스프린트 → 1개 확정 | decision-sprint, scope-board 확정 |
| 3 | 04-09 | 뼈대 앱 + 핵심 플로우 | 첫 배포, 데모 크리티컬 작동 |
| 4 | 04-10 | 구현 전 정본 잠금 + 앱 스켈레톤 착수 | UI/IA 정본 잠금, 앱 시작 가능 |
| 5 | 04-11 | ==E2E 실동작 + 독립 레포 + 온보딩== | E2E 통과, 독립 레포 배포 가능 상태 ✅ |
| 6 | 04-12 | ==배포 + E2E 검증 + AI 리포트== | 라이브 URL 확보, 데모 2분 통과 |
| 7 | 04-13 | ==제출== | 마감 24:00 전 제출 완료 |

---

## 현재 우선순위 (Day 7 — 2026-04-12)
> 마지막 업데이트: 2026-04-12

### ✅ 완료 (Day 5~6 초반)
- v0.4.0: 강사관리·일정편집·반배정·일괄승인·스킬추가·목표링크·루틴이력
- DB 마이그레이션: reports_to, classGroup, shuttle, email, student_schedules 직접 SQL 실행
- **독립 레포 생성**: `/Users/river/workspace/active/hagent-os/` → GitHub `River-181/hagent-os`
- **v1.0 E2E 완전 재구축** (Paperclip 방식):
  - execution.ts: Case status 자동 변경 + caseComments 자동 삽입 + assigneeAgentId 설정
  - approvals.ts: reject → Case.status="todo" 롤백 + agent_hire 승인 시 자동 에이전트 생성
  - agents.ts: POST → SOUL.md 자동 생성, agentId 기반 Instructions 격리
  - agent-hires.ts: 에이전트 고용 요청 플로우 (신규)
  - organizations.ts: POST(에이전트 없음) + DELETE cascade
  - claude.ts: Mock 오케스트레이터 → 키워드 기반 동적 라우팅
  - orchestrator.ts: 실제 지시 내용으로 케이스 제목, 에이전트 0개 400 에러
- **UI v1.0 재구축**:
  - OnboardingPage: 4단계 Paperclip 방식 (학원→CEO→첫실행→완료)
  - AgentDetailPage: ChatBubble + InstructionsTab 4 서브탭 + SettingsTab 편집
  - OrgChartPage: reportsTo 기반 동적 트리
  - ApprovalsPage + ApprovalDetailPage: 승인/거절 실동작
  - OrganizationRail: 멀티 학원 추가/삭제
  - App.tsx: RootRedirect (0개 기관 → 온보딩)
- fallback 데이터 제거: 11개 파일 탄자니아/목업 데이터 완전 제거
- 최종 커밋: `3254c76` (River-181/hagent-os)

### P0 — Day 7 현재 (즉시)
1. **승인 화면 스크롤 버그 수정** (`hagent-os/ui`)
   - ApprovalsPage / ApprovalDetailPage overflow 레이아웃 수정
2. **E2E 전체 검증** (`hagent-os/` 포트 3200/5174)
   - 온보딩 → 학원 생성 → CEO 에이전트 → 첫 dispatch → 대시보드
   - 케이스 생성 확인 (제목 = 실제 지시 내용)
   - 승인/거절 실동작 확인 (스크롤 수정 후)
   - OrgChart reportsTo 트리 렌더링
3. **배포 설정** (Railway 또는 Render)
   - `hagent-os/` 레포 Railway 배포
   - 외부 PG URL 연결 (Neon.tech 또는 Railway PostgreSQL)
   - 라이브 URL 확보 → README에 삽입
4. **GitHub README** (`River-181/hagent-os`)
   - 설치 방법, 스크린샷, 라이브 URL

### P1 — Day 7 보조
5. **AI 리포트 초안** (제출 필수 — `04_증빙` raw material 기반)
6. **데모 스크립트 v0.1** (2분 시연 경로)

### P2 — Day 7 후반 / D8 제출
7. 데모 리허설 2회
8. 제출 패키징 (README + AI 리포트 + 라이브 URL + 개인정보동의서 + 참가각서)

---

## 역할별 할 일

### PM Agent
- 매 세션 시작: `project-dashboard`, `PLAN`, `PROGRESS` 동기 확인
- 매일 밤: 데일리 노트 작성, 내일 단일 목표 설정

### Research Agent
- Day 2: 문제 은행 3개 후보로 축소
- Day 2: 전략 문서에서 `06_LLM위키/` 첫 ingest 수행

### Judge Agent
- Day 2: 후보 3개에 대한 심사위원 시뮬레이션
- Day 5: 중간 심사 시뮬레이션

### Evidence Agent
- 상시: master-evidence-ledger 기록
- 상시: 필요 시 decision/prompt만 승격
- 상시: `daily`와 `daily-memory` 공백 날짜 보정
- Day 5: AI 리포트 초안 컴파일

### Product Agent
- Day 2: 문제 정의서, 페르소나, 유저 스토리
- Day 2: demo-critical-path 정의

### Builder Agent
- Day 2~3: 기술 스택 확정, 앱 스켈레톤
- Day 3~4: 핵심 플로우 구현

### QA Agent
- Day 4: 테스트 케이스, 엣지케이스
- Day 6: 최종 QA

### Submission Agent
- Day 5: README, AI 리포트
- Day 7: 제출 패키징

---

## 위험 관리

| ID | 위험 | 영향 | 대응 |
|---|---|---|---|
| R1 | 문서만 강하고 제품 늦음 | 치명 | Day 2까지 반드시 기술 스택 확정 |
| R2 | 증빙 이중화 혼란 | 중간 | DEC-004 결정 완료, 마크다운 단일 마스터 |
| R3 | 다중 AI 맥락 유실 | 높음 | PROGRESS.md + PLAN.md로 동기화 |
| R4 | 배포 실패 | 치명 | Day 3부터 매일 배포 검증 |
| R5 | API Key 노출 | 탈락 | .gitignore + 커밋 전 검사 |
| R6 | 메모리-증빙 동기화 누락 | 높음 | 세션 종료 시 Evidence Gate 강제 |
| R7 | 대시보드가 빈 판으로 남음 | 높음 | `type/task` note를 실제 운영 입력점으로 사용 |

---

## 이번 턴 완료 항목

- `.agent/system/` 공용 운영 정본 골격 생성 완료
- `.context/` 내용 흡수 및 폴더 제거 완료
- `.claude/` 최소 어댑터화 완료
- `04_증빙` 핵심 로그 스키마 개편 완료
- 제출용 대시보드 역할을 `PLAN/PROGRESS/daily/task`와 연결하는 방향 확정

---

> 관련: [[.agent/system/ops/PROGRESS|PROGRESS]], [[_system/dashboard/project-dashboard|project-dashboard]], [[00 HOME]]
