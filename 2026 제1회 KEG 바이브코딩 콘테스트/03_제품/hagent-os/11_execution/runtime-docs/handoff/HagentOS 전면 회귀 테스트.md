---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/HagentOS 전면 회귀 테스트.md"
synced_at: 2026-04-13
---
  # HagentOS 전면 회귀 테스트 + 증적 수집 + 보고서 기반 수정 계획

  ## 요약

  현재 기준은 /Users/river/workspace/active/hagent-os의 실제 제품 저장소, 기준 환경은
  API=http://127.0.0.1:3200, UI=http://127.0.0.1:5174, 기준 데모 org는 be70ebc8-3b55-4ff3-827a-
  264f06c4d2ee / 탄자니아-영어학원-데모-7로 잡습니다.
  이번 라운드는 수정 먼저가 아니라 아래 순서로 고정합니다.

  1. 전면 테스트 실행
  2. 증적 수집
  3. 단일 보고서 작성
  4. 보고서 기준으로 P0/P1부터 수정
  5. 수정 후 재검증

  실패 정책은 P0 blocker가 나와도 전체 테스트를 끝까지 진행으로 고정합니다. 즉, 심사에 직접 쓰
  는 흐름이 막혀도 가능한 나머지 API/UI/외부채널 경로를 계속 태워서 전체 failure map을 먼저 만
  듭니다.

  ## 실행 방식

  ### 1. 병렬 트랙 구성

  병렬 에이전트/트랙을 아래처럼 분리합니다. 각 트랙은 서로 다른 write target 없이 테스트/증적
  수집만 수행하고, 최종 리포트는 메인 스레드에서 통합합니다.

  - Track A: 정적 게이트
      - npm exec pnpm -- --filter @hagent/server typecheck
      - npm exec pnpm -- --filter @hagent/ui typecheck
      - corepack pnpm --filter @hagent/ui exec vite build
      - health, organizations, 핵심 list API smoke
  - Track B: 핵심 심사 시나리오
      - 온보딩
      - 대시보드
      - Students
      - Cases
      - Approval -> Schedule/Outbound/Activity
      - Assistant inquiry/project
  - Track C: 채널/외부 연동
      - Settings adapter test
      - Telegram inbound/outbound
      - Kakao inbound/approval bridge/outbound
      - degraded path 확인 (LAW_OC, GOOGLE_CALENDAR_ACCESS_TOKEN, KAKAO_OUTBOUND_PROVIDER_URL)
  - Track D: 운영/복구/실시간
      - notifications dedupe/read group
      - SSE reconnect
      - routine trigger
      - heartbeat
      - wakeup guard
      - stale run recovery
  - Track E: 전 페이지 시각 스모크
      - 모든 page route 1회 진입
      - console error/warning 수집
      - screenshot 저장
      - shell 붕괴, 빈 화면, 404, infinite loading 탐지

  ### 2. 증적 산출 위치

  보고와 추적이 섞이지 않도록 아티팩트를 고정합니다.

  - 마스터 보고서:
      - docs/handoff/2026-04-13-full-regression.md
  - Playwright 캡처:
      - output/playwright/full-regression/
  - API raw log 요약:
      - 보고서 본문 표에 정리하고, 긴 raw payload는 필요한 것만 부록으로 첨부
  - 실패 스크린샷:
      - output/playwright/full-regression/failures/
  - 성공 대표 스크린샷:
      - output/playwright/full-regression/smoke/

  ### 3. 테스트 순서

  #### Phase 0. 시작 상태 고정

  - 현재 dirty worktree를 기록하되 건드리지 않음
  - 현재 dev server/session, env 제약, org id/prefix를 보고서 첫머리에 고정
  - server, ui 접속성 확인
  - 기준 데이터 수량 스냅샷:
      - students
      - instructors
      - schedules
      - cases
      - approvals
      - documents
      - agents
      - notifications

  #### Phase 1. 정적 게이트

  - server typecheck
  - ui typecheck
  - vite build
  - 실패 시:
      - blocker로 기록
      - 수정 없이 다음 Phase 진행

  #### Phase 2. 핵심 API 회귀

  핵심 route를 GET/POST/PATCH 단위로 검증합니다.

  - GET /api/organizations
  - GET /api/organizations/:orgId/dashboard/summary
  - GET /api/organizations/:orgId/students
  - GET /api/organizations/:orgId/cases
  - GET /api/organizations/:orgId/notifications
  - GET /api/organizations/:orgId/agents
  - GET /api/organizations/:orgId/schedules
  - GET /api/organizations/:orgId/activity
  - GET /api/organizations/:orgId/routines
  - GET /api/organizations/:orgId/goals
  - GET /api/organizations/:orgId/projects

  쓰기/행동 API:

  - POST /api/orchestrator/dispatch
  - POST /api/heartbeat/trigger
  - POST /api/organizations/:orgId/routines/:id/trigger
  - POST /api/approvals/:id/approve
  - POST /api/approvals/:id/reject
  - POST /api/organizations/:orgId/quick-ask
  - POST /api/messages/kakao/send
  - POST /api/adapters/test
  - POST /api/agents/:id/wakeup
  - POST /api/telegram/... 관련 테스트 route
  - 필요한 경우 onboarding/bootstrap route

  각 API는 아래를 같이 기록합니다.

  - 기대 side effect
  - 실제 DB/API 관찰 객체
  - activity/log 흔적
  - 문서/approval/run/schedule/notification 중복 여부

  #### Phase 3. 심사 시나리오 전면 리허설

  JUDGE_DEMO.md, docs/handoff/2026-04-12-demo-rehearsal.md, docs/handoff/2026-04-13-d1-
  verification.md를 합쳐 실제 심사용 시나리오를 다시 탑니다.

  - 시나리오 1: 온보딩 -> 첫 진입
  - 시나리오 2: Dashboard -> Cases -> 특정 case -> approval -> side effect
  - 시나리오 3: Telegram 문의 -> case 생성 -> 답변/상태 흔적
  - 시나리오 4: Kakao 문의/approval bridge -> outbound 상태
  - 시나리오 5: Assistant inquiry -> document artifact -> follow-up append
  - 시나리오 6: Project decomposition -> child cases -> outputs
  - 시나리오 7: Students -> student detail -> linked schedule/cases/payments
  - 시나리오 8: Schedule -> 이동/반영 확인
  - 시나리오 9: Agents -> detail/memory/runs
  - 시나리오 10: Settings -> save + adapter test + 결과 반영

  각 시나리오는 절차 / 기대값 / 실제값 / 상태 / 증적 링크 / blocker 6열로 고정합니다.

  #### Phase 4. 전 페이지 UI/UX 스모크

  대상은 전체 page route입니다.

  - DashboardPage
  - CasesPage
  - CaseDetailPage
  - CaseNewPage
  - ApprovalsPage
  - ApprovalDetailPage
  - InboxPage
  - StudentsPage
  - SchedulePage
  - DocumentsPage
  - ProjectsPage
  - ProjectDetailPage
  - GoalsPage
  - GoalDetailPage
  - AgentsPage
  - AgentDetailPage
  - OrgChartPage
  - SkillsPage
  - CapabilitiesPage
  - PluginsPage
  - AdaptersPage
  - RoutinesPage
  - ActivityPage
  - InstructorsPage
  - SettingsPage
  - AssistantPage
  - CostsPage
  - OnboardingPage
  - NewAgentPage
  - DesignGuidePage

  각 페이지에서 확인할 항목:

  - 진입 가능 여부
  - 빈 화면 여부
  - console error/warning
  - infinite loading 여부
  - org context mismatch 여부
  - shell 붕괴 여부
  - primary action 존재 여부
  - 주요 list/detail 데이터 렌더 여부

  #### Phase 5. 실시간/복구/회복력

  - SSE 연결 후 서버 재시작 또는 연결 끊김 상황에서 reconnect 동작
  - notifications query invalidate 여부
  - stale run recovery activity 생성
  - wakeup guard
  - heartbeat 후 pending case 처리
  - notifications dedupe/read group 반영
  - archived case 재사용 금지 확인

  #### Phase 6. 외부 채널 실검증

  실채널은 포함으로 고정합니다.

  - Telegram
      - 실제 문의 전송
      - case 생성
      - conversation-context grouping
      - 응답 수신
      - activity/approval/document/run 흔적
  - Kakao
      - 실제 inbound 또는 replay 기반 생성
      - approval bridge / auto send 가능 여부
      - 발송 상태 저장
      - provider URL 미설정 시 degraded/fallback 명시
  - Adapter test
      - Codex
      - LAW
      - Kakao
      - Telegram

  외부 채널은 데모 데이터 오염을 허용하고, 보고서에 실제 테스트 시각과 생성된 케이스/approval
  id를 남깁니다.

  ## 보고서 형식

  최종 문서는 docs/handoff/2026-04-13-full-regression.md 한 개로 통합합니다.

  포맷:

  - 시작 상태
  - 환경/제약
  - 정적 게이트 결과
  - 시나리오별 검증표
  - API/객체 흐름 검증표
  - 전 페이지 UI 스모크 표
  - 외부 채널 검증표
  - P0/P1/P2 blocker 목록
  - 수정 우선순위
  - 수정 대상 파일 후보
  - 미검증/환경 의존 항목

  severity 기준:

  - P0: 심사 흐름 중단, 빈 화면, type/build fail, 데이터 손실, 중복 생성 치명
  - P1: 심사 체감 훼손, 잘못된 상태/연결, 주요 UX 혼란
  - P2: 미감, 잔여 경고, 경미한 정합성

  ## 수정 라운드 계획

  보고서 작성 전에는 코드 수정하지 않습니다.
  보고서가 완성되면 아래 순서로 수정합니다.

  1. P0 blocker

  - type/build/runtime crash
  - route/org mismatch
  - approval/outbound/schedule/run 불일치

  2. P1 blocker

  - 심사 시나리오 혼란
  - 잘못된 상태 배지/중복 객체/실시간 반영 실패

  3. P2

  - UI polish
  - residual warnings
  - copy/token 정리

  수정은 각 배치마다:

  - 작은 가역적 patch
  - 관련 체크 즉시 재실행
  - 보고서에 before/after 갱신

  ## 테스트 케이스와 성공 기준

  반드시 통과 또는 명시적 degraded/fallback 설명이 필요한 항목:

  - server typecheck 통과
  - ui typecheck 통과
  - vite build 통과
  - 데모 org deep link 진입 시 모든 핵심 페이지가 동일 org context 사용
  - onboarding으로 새 org 생성 후 첫 화면 진입
  - student list/detail가 실제 데이터와 일치
  - case 생성/append/reopen/child-case 흐름 일관
  - archived case는 재사용되지 않음
  - approval -> schedule/document/activity/outbound 중 해당 side effect가 빠지지 않음
  - notification dedupe/group read 동작
  - SSE reconnect 후 UI가 다시 살아남
  - stale run recovery activity 생성
  - Telegram은 conversation context 단위 grouping 유지
  - Settings 저장과 adapter test 결과가 UI/API에 반영
  - 외부 연동 미설정 항목은 crash가 아니라 degraded로 보임

  ## 가정과 기본값

  - 기준 org는 탄자니아-영어학원-데모-7로 고정하고, onboarding 검증용 org는 별도 ephemeral org
    를 추가 생성합니다.
  - UI 검증 기준 포트는 현재 실세션 기준 5174를 우선 사용합니다. 5175와 다르면 보고서에 실제 포
    트를 기록합니다.
  - 외부 채널 테스트는 실제 발송/생성까지 포함하며, 데모 데이터 오염은 허용합니다.
  - GOOGLE_CALENDAR_ACCESS_TOKEN, LAW_OC, KAKAO_OUTBOUND_PROVIDER_URL 미설정 시 성공 기준은 정
    상 degraded/fallback입니다.
  - 최종 수정은 보고서 완료 후 시작합니다. 테스트 중 발견된 문제라도 중간 패치 없이 먼저 전수
    수집합니다.