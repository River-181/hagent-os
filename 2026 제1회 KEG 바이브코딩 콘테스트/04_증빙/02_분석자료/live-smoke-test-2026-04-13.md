---
tags:
  - area/evidence
  - type/report
  - status/active
  - workflow/live-validation
date: 2026-04-13
status: completed-partial
up: "[[_04_증빙_MOC]]"
---

# Live Smoke Test — 2026-04-13

## 결론
- 라이브 URL 기준 스모크는 첫 HTTP probe 단계에서 외부 DNS 해석 실패로 중단됐다.
- `curl`뿐 아니라 `python socket.getaddrinfo()` 기준으로도 현재 러너는 `google.com`, `railway.app`, `hagent-os.up.railway.app` 모두 해석하지 못했다.
- 따라서 아래 `FAIL`은 앱 기능 판정이 아니라, **live endpoint를 실제로 때리지 못한 transport-level blocker**를 뜻한다.
- 기능 기대값과 추후 재검증 포인트는 `/Users/river/workspace/active/hagent-os` 코드, [JUDGE_DEMO.md](/Users/river/workspace/active/hagent-os/JUDGE_DEMO.md:1), [2026-04-13-full-regression.md](/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-full-regression.md:1)를 기준으로 병기했다.

## 환경 / 방법
- Target: `https://hagent-os.up.railway.app`
- Repo reference: `/Users/river/workspace/active/hagent-os`
- Live probe: `curl -i -L --max-time 20`, `python socket.getaddrinfo`, `dig`, `nslookup`
- Browser automation: Playwright 사용 전제조건(`npx`) 확인 완료, public DNS blocker 때문에 실제 browser open 미진행
- 제한:
  - 현재 셸은 외부 DNS egress 자체가 막혀 있다.
  - 그래서 live UI/HTTP/SSE/API는 transport 이전 단계에서 전부 block되었다.

## Live Probe Matrix

| ID | 영역 | 대상 | 방법 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| L-001 | 기본 접속 | `/` | `curl` | HTML shell 또는 org redirect | `curl: (6) Could not resolve host: hagent-os.up.railway.app` | FAIL |
| L-002 | 기본 헬스체크 | `/api/health` | `curl` | health JSON 응답 | host resolve 실패 | FAIL |
| L-003 | 인증 표면 | `/api/auth` | `curl` + 코드 확인 | auth surface 또는 intentional absence 문서화 | live probe blocked. 코드 기준 현재 제품은 `local_trusted`/no-login이며 `/api/auth` route 없음 | INFO |
| L-004 | 온보딩 | `/new/onboarding`, `/demo/onboarding` | browser 예정 + 코드 확인 | 첫 접속 온보딩 렌더, org bootstrap 가능 | root access blocker로 미실행. 정적 route는 [ui/src/App.tsx](/Users/river/workspace/active/hagent-os/ui/src/App.tsx:1), API는 [ui/src/api/organizations.ts](/Users/river/workspace/active/hagent-os/ui/src/api/organizations.ts:1) / [server/src/routes/organizations.ts](/Users/river/workspace/active/hagent-os/server/src/routes/organizations.ts:93) | FAIL |
| L-005 | 시드 데이터 | judge default org, cases/agents/schedules/documents | browser/curl 예정 + 문서 확인 | `탄자니아 영어학원 데모 7` preload + 기본 데이터 노출 | live probe blocked. 정적 기준선만 확인: [JUDGE_DEMO.md](/Users/river/workspace/active/hagent-os/JUDGE_DEMO.md:9), [2026-04-13-full-regression.md](/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-full-regression.md:54) | FAIL |
| L-006 | 케이스 속성 패널 | `PATCH /api/cases/:id` | curl 예정 + 코드 확인 | 상태/우선순위/담당 에이전트 변경 | live probe blocked. 관련 코드: [ui/src/components/CaseProperties.tsx](/Users/river/workspace/active/hagent-os/ui/src/components/CaseProperties.tsx:1), [server/src/routes/cases.ts](/Users/river/workspace/active/hagent-os/server/src/routes/cases.ts:434) | FAIL |
| L-007 | 에이전트 실행 | `POST /api/organizations/:orgId/quick-ask`, `POST /api/agents/:id/wakeup`, `GET /api/runs/:id` | curl 예정 + 코드 확인 | case/run 생성 및 run 조회 | live probe blocked. 관련 코드: [ui/src/api/cases.ts](/Users/river/workspace/active/hagent-os/ui/src/api/cases.ts:1), [ui/src/api/agents.ts](/Users/river/workspace/active/hagent-os/ui/src/api/agents.ts:1), [ui/src/api/runs.ts](/Users/river/workspace/active/hagent-os/ui/src/api/runs.ts:1), [server/src/routes/cases.ts](/Users/river/workspace/active/hagent-os/server/src/routes/cases.ts:286), [server/src/routes/agents.ts](/Users/river/workspace/active/hagent-os/server/src/routes/agents.ts:413), [server/src/routes/runs.ts](/Users/river/workspace/active/hagent-os/server/src/routes/runs.ts:11) | FAIL |
| L-008 | 로그 스트리밍 | `GET /api/organizations/:orgId/events/sse` | `curl -N` 예정 + 코드 확인 | SSE 연결, keepalive, org event stream | live probe blocked. 정적 구현: [ui/src/hooks/useSSE.ts](/Users/river/workspace/active/hagent-os/ui/src/hooks/useSSE.ts:1), [server/src/routes/events.ts](/Users/river/workspace/active/hagent-os/server/src/routes/events.ts:1) | FAIL |
| L-009 | 승인 플로우 | inbox → case → approval approve/decide | browser/curl 예정 + 코드 확인 | approval queue 조회/승인/결과 반영 | live probe blocked. 정적 route: [server/src/routes/approvals.ts](/Users/river/workspace/active/hagent-os/server/src/routes/approvals.ts:114), UI: [ui/src/pages/ApprovalsPage.tsx](/Users/river/workspace/active/hagent-os/ui/src/pages/ApprovalsPage.tsx:1) | FAIL |
| L-010 | 설정 / 모델 / API 키 | `/settings`, `/api/adapters`, `/api/adapters/test`, `PATCH /api/organizations/:id` | browser/curl 예정 + 코드 확인 | adapter readiness 조회, 모델 선택, org 저장 | live probe blocked. 관련 코드: [ui/src/pages/SettingsPage.tsx](/Users/river/workspace/active/hagent-os/ui/src/pages/SettingsPage.tsx:1), [ui/src/api/adapters.ts](/Users/river/workspace/active/hagent-os/ui/src/api/adapters.ts:1), [server/src/routes/adapters.ts](/Users/river/workspace/active/hagent-os/server/src/routes/adapters.ts:55) | FAIL |
| L-011 | 주요 UI 라우트 | `/dashboard`, `/cases`, `/inbox`, `/agents`, `/skills`, `/documents`, `/schedule`, `/students`, `/projects`, `/settings` | browser 예정 + 코드 확인 | judge-facing 주요 화면 접근 가능 | root DNS blocker로 미실행. 정적 route 기준은 [ui/src/App.tsx](/Users/river/workspace/active/hagent-os/ui/src/App.tsx:1) | FAIL |

## 정적 기준선 메모
- 라이브 데모 default org: `탄자니아 영어학원 데모 7`
- judge 문서상 라이브 접속은 no-login이다: [JUDGE_DEMO.md](/Users/river/workspace/active/hagent-os/JUDGE_DEMO.md:9)
- root redirect / org-prefix routing은 [ui/src/App.tsx](/Users/river/workspace/active/hagent-os/ui/src/App.tsx:1), [ui/src/context/OrganizationContext.tsx](/Users/river/workspace/active/hagent-os/ui/src/context/OrganizationContext.tsx:1), [ui/src/components/Layout.tsx](/Users/river/workspace/active/hagent-os/ui/src/components/Layout.tsx:18)
- live smoke가 다시 가능해지면 우선 순서는 `L-001` → `L-002` → `L-004` → `L-005` → `L-006`~`L-010`

## 판정 요약
- PASS: 0
- FAIL: 10
- INFO: 1
- blocker: `BUG-001`
