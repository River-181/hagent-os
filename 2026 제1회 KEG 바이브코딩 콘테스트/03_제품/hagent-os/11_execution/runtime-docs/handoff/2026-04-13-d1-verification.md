---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/2026-04-13-d1-verification.md"
synced_at: 2026-04-13
---
# D1 검증표 및 Blocker 정리

기준 일시: `2026-04-13`

기준 저장소: `/Users/river/workspace/active/hagent-os`

기준 조직:
- `탄자니아 영어학원 데모 7`
- `orgId = be70ebc8-3b55-4ff3-827a-264f06c4d2ee`
- `orgPrefix = 탄자니아-영어학원-데모-7`

테스트 기준:
- API: `http://127.0.0.1:3200`
- UI: `http://127.0.0.1:5174`

## 시작 상태

| 항목 | 기대값 | 실제값 | 상태 |
| --- | --- | --- | --- |
| `server typecheck` | 통과 | 초기 실패 후 수정, 최종 통과 | 통과 |
| `ui typecheck` | 통과 | 초기 실패 후 수정, 최종 통과 | 통과 |
| 데모 org 고정 | 1개 org 기준 검증 | `탄자니아 영어학원 데모 7`로 고정 | 통과 |
| Telegram channel 상태 | inbound/outbound 확인 가능 | Telegram 데이터 존재, 실제 case 생성 이력 확인 | 통과 |

## 오늘 수정한 P0/P1

### P0. `ui/server typecheck` 붕괴
- 원인:
  - `@hagent/shared`의 `AgentType`이 `skills` 메타와 불일치
  - `ProjectDetailPage` JSX 닫힘 태그 누락
  - `CaseDetailPage`, `SkillsPage`, `StudentsPage` 일부 JSX/타입 오류
- 수정 파일:
  - `/Users/river/workspace/active/hagent-os/packages/shared/src/types/index.ts`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/ProjectDetailPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/CaseDetailPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/SkillsPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/StudentsPage.tsx`
- 결과:
  - `npm exec pnpm -- --filter @hagent/server typecheck` 통과
  - `npm exec pnpm -- --filter @hagent/ui typecheck` 통과

### P0. route 기반 org 진입 시 빈 화면
- 증상:
  - `/탄자니아-영어학원-데모-7/students`에서 API에 학생 15명이 있어도 UI가 `0명`으로 노출
- 원인:
  - `selectedOrgId`가 route의 `orgPrefix`와 동기화되지 않아, deep-link 진입 시 다른 org context를 참조
- 수정 파일:
  - `/Users/river/workspace/active/hagent-os/ui/src/context/OrganizationContext.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/StudentsPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/DashboardPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/ApprovalsPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/CasesPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/DocumentsPage.tsx`
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/SchedulePage.tsx`
- 결과:
  - 학생 화면 Playwright 재검증에서 `총 15명 · 현재 표시 15명`
  - 대시보드/승인/케이스/문서/일정도 route 기준 org로 조회

### P1. 대시보드 최근 인바운드/문서 중복 노출
- 원인:
  - `DashboardPage`가 raw activity/documents를 그대로 자름
- 수정 파일:
  - `/Users/river/workspace/active/hagent-os/ui/src/pages/DashboardPage.tsx`
- 결과:
  - case/document key 기준 1차 dedupe 적용
  - 동일 title이지만 다른 case인 항목은 여전히 남을 수 있음

## 시나리오별 검증표

| 시나리오 | 재현 절차 | 기대값 | 실제값 | 상태 |
| --- | --- | --- | --- | --- |
| 온보딩 -> 첫 진입 | Playwright로 `/new/onboarding` 진입, `Load demo academy`, `Academy Setup 실행` | org 생성 후 첫 화면 진입 | `tanzania-english-academy-ax3m` 생성, project detail로 이동 확인 | 통과 |
| Students 목록 | Playwright로 `/탄자니아-영어학원-데모-7/students` 진입 | 학생 데이터 노출 | `총 15명 · 현재 표시 15명` 확인 | 통과 |
| Students 상세/운영 레코드 | Students table/card 확인 | 보호자/결제/리스크가 운영 객체로 보임 | 보호자 수, 결제수단, 프로젝트 건수, risk 표시 확인 | 통과 |
| Telegram/Kakao 문의 -> case | 대시보드 recent inbound, cases API 확인 | 채널 문의가 case로 남음 | Telegram/Kakao case 다수 확인 | 통과 |
| archived 재사용 금지 | 기존 조치 기준 + 현재 목록 확인 | 숨긴 case 재사용 금지 | 신규 visible case 흐름 유지 | 통과 |
| 승인 -> 일정 side effect | `POST /api/approvals/9062.../approve` | schedule 생성 + sideEffect 기록 | schedules `38 -> 39`, `프로모션 등록 상담 세션` 생성, `pending_credentials` 기록 | 통과 |
| approval -> activity/log | approval/case/activity 조회 | `approval.approved`와 sideEffect 흔적 존재 | `approval.approved`, `integration.calendar_pending_credentials` 확인 | 통과 |
| inquiry -> case/document | `POST /api/organizations/:orgId/quick-ask` with `D1 법률 검증` | inquiry case 생성, run 실행, artifact 생성 | `C-087` 생성, run completed, `C-087 법률 질문 브리프` 생성 | 통과 |
| inquiry follow-up append | 같은 `assistantSessionId/threadId`로 후속 quick-ask | 기존 case에 append | `C-087` comments/runs 증가 확인 | 통과 |
| routine trigger | `POST /api/organizations/:orgId/routines/8eab.../trigger` with complaint case | run 생성, activity 기록 | `routine.triggered`, `run.completed`, `approval.created`, `document.created` 확인 | 통과 |
| wakeup guard | `POST /api/agents/:id/wakeup` | active run 중복 방지 | `Agent already has an active run` 응답 확인 | 통과 |
| stale recovery | 기존 activity 조회 | stale queued/running 자동 회수 | `run.recovered_stale` activity 다수 확인 | 통과 |

## 데이터 흐름 확인

### approval -> schedule -> activity
- approval: `9062e3e8-6c53-4646-a5e5-4fdfbb330905`
- created schedule: `9da64d63-fdf5-470e-962f-8e52de63cf21`
- activity:
  - `approval.approved`
  - `integration.calendar_pending_credentials`
- 확인값:
  - `GOOGLE_CALENDAR_ACCESS_TOKEN` 부재 시 DB schedule은 생성되고, 외부 calendar만 `pending_credentials`

### routine -> run -> document -> approval
- routine: `8eab7b6b-e605-4eb2-a5b4-0dbb4253f40e`
- case: `C-054 환불 정책 정리`
- run: `5e542f38-e7ac-42dd-bb8d-3273ff5edbfb`
- activity:
  - `routine.triggered`
  - `run.queued`
  - `run.started`
  - `document.created`
  - `approval.created`
  - `run.completed`

### inquiry quick-ask -> document
- case: `C-087 D1 법률 검증`
- run: `640b5fa9-e4b0-4bf5-b0c6-b5b81bcba0a2`
- artifact:
  - `C-087 법률 질문 브리프`

## 남은 Blocker / Risk

### P1. agent status와 live run 상태 불일치
- 관찰:
  - `GET /api/agents/4551...`는 `status=idle`
  - 같은 시점 `GET /api/cases/C-054`의 latest run은 `running`
- 영향:
  - 운영 화면에서 에이전트 상태 신뢰도가 떨어짐
- 권장:
  - agent API 또는 UI에서 `latest active run` 기반 live status 파생

### P1. 최근 인바운드에 내용상 중복처럼 보이는 항목 잔존
- 관찰:
  - 다른 case지만 같은 sender/title로 보이는 항목이 남음
- 영향:
  - 운영자 관점에서 “중복 접수”처럼 읽힐 수 있음
- 권장:
  - `same sender + same normalized title + recent window` 수준 추가 dedupe 또는 group label 제공

### P1. Document 중복 데이터 잔존
- 관찰:
  - `C-015 카카오 회신` 중복
  - 동일 project brief 제목 다수 존재
- 영향:
  - 문서함 신뢰도와 탐색성이 떨어짐
- 권장:
  - server-side dedupe/migration 또는 import/update 정책 정리

### P1. external env 미완성
- `GOOGLE_CALENDAR_ACCESS_TOKEN` 없음
- 결과:
  - approval sideEffect는 DB schedule까지만 생성되고 외부 calendar sync는 `pending_credentials`

### P2. Telegram webhook live 미완성
- 현재 `poll` 기반도 허용되지만, 심사 중 서버 재시작/지연에 취약

## 수정 후 재검증 요약

| 항목 | 수정 전 | 수정 후 |
| --- | --- | --- |
| Students deep-link | API에 학생 15명 있어도 UI 0명 | UI에 15명 정상 표시 |
| Dashboard/Approvals/Cases/Documents/Schedule deep-link | route org와 context org 불일치 가능 | route prefix 기준 org resolve |
| UI typecheck | 실패 | 통과 |
| server typecheck | 실패 | 통과 |
| Dashboard recent inbound/documents | raw 중복 노출 | 1차 dedupe 적용 |

## D2로 넘길 항목

1. `agent.status` live derivation 정리
2. `Dashboard/Inbox` sender/title 수준 추가 dedupe
3. 문서 중복 데이터 cleanup 또는 merge 정책
4. `GOOGLE_CALENDAR_ACCESS_TOKEN` 및 live env 주입
5. Telegram webhook public HTTPS 등록
