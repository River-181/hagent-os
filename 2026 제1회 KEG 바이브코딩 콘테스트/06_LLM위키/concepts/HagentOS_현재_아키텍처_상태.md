---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-13
up: "[[index]]"
status: active
aliases:
  - HagentOS architecture snapshot
  - current architecture state
---
# HagentOS 현재 아키텍처 상태

## Summary First

2026-04-13 기준 HagentOS는 `pnpm workspace` 위에서 돌아가는 운영 control plane이다. 현재 정본은 `React 19 + Vite` SPA, `Express v5 + TypeScript ESM` API, `PostgreSQL + Drizzle ORM`, adapter-based agent runtime, 그리고 [[케이스_승인_후속조치_모델|`case -> approval -> schedule/document/notification` 루프]]로 읽는 것이 맞다.

## 현재 구조 스냅샷

- workspace 루트는 `package.json` + `pnpm-workspace.yaml` 기준으로 `packages/*`, `server`, `ui` 3축으로 구성된다.
- `ui`는 `React 19`, `react-router-dom v7`, `@tanstack/react-query`, `Vite 6`, `Tailwind CSS v4` 조합이다.
- `server`는 `Express 5.1`, `embedded-postgres`, `drizzle-orm`, `zod`, `pino` 기반이다.
- `packages/shared`와 `packages/db`가 공용 타입과 DB 경계를 맡는다.

## 앱 표면 구조

### UI 라우트

`ui/src/App.tsx` 기준 현재 운영 표면은 아래가 핵심이다.

- `dashboard`
- `inbox`
- `cases`, `cases/:id`
- `approvals`, `approvals/:id`
- `agents`, `agents/:id`
- `schedule`
- `documents`
- `routines`
- `goals`, `projects`
- `students`, `instructors`
- `skills`, `plugins`, `adapters`, `settings`

즉 현재 제품은 chat-first가 아니라 `dashboard / inbox / case / approval / agent / schedule`이 먼저 보이는 [[운영보드_우선_UI_원칙|board-first 구조]]다. 이 해석은 [[운영_Control_Plane_모델]]과 같은 방향이다.

### API 표면

`server/src/app.ts` 기준 핵심 API 군은 아래다.

- `/api/organizations`
- `/api/cases`, `/api/approvals`, `/api/runs`
- `/api/agents`, `/api/agent-hires`, `/api/agent-instructions`
- `/api/orchestrator`, `/api/heartbeat`, `/api/events`
- `/api/skills`, `/api/capabilities`, `/api/plugins`, `/api/adapters`
- `/api/documents`, `/api/projects`, `/api/goals`, `/api/activity`
- `/api/notifications`, `/api/schedules`, `/api/students`, `/api/messages`, `/api/telegram`

이 레이어는 단순 CRUD가 아니라 `audit-friendly mutation`과 `org-scoped control plane`으로 보는 편이 정확하다.

## 에이전트 런타임 구조

[[03_제품/hagent-os/04_ai-agents/agent-design]] 기준 실행 모델은 아래 순서로 정리된다.

1. trigger
2. wakeup request 생성과 coalesce
3. agent claim
4. context injection
5. LLM call
6. output 처리
7. approval gate 또는 자동 실행
8. audit log 적재

현재 shipped baseline의 활성 팀은 아래 5개다.

- `orchestrator`
- `complaint`
- `retention`
- `scheduler`
- `notification`

즉 문서상 더 많은 에이전트가 정의되어 있어도, 2026-04-13 현재 실제 검증 기준 팀은 5개로 읽어야 한다.

## 현재 검증된 핵심 루프

[[03_제품/hagent-os/02_product/prd]]와 `2026-04-13-full-regression.md`를 합치면, 현재 검증된 범위는 아래다.

- onboarding
- quick-ask -> case/run 생성
- approval 처리
- document / knowledge base 생성
- schedule side effect 생성
- notification dedupe + grouped read
- Telegram inbound / outbound path

이 말은 “아키텍처는 넓지만, 실제 증명은 운영 루프 중심으로 좁혀져 있다”는 뜻이다.

## 현재 env 의존 경계

아래는 구조는 존재하지만 live credential이 없으면 degraded 또는 pending 상태가 되는 경계다.

- Google Calendar live sync: `GOOGLE_CALENDAR_ACCESS_TOKEN`
- 법령 조회: `LAW_OC`
- Kakao outbound auto send: `KAKAO_OUTBOUND_PROVIDER_URL`
- Codex direct route: `OPENAI_API_KEY` 또는 `codex qauth`

따라서 현재 제품 설명에서 “연동 가능”과 “지금 이 환경에서 완전 동작”은 분리해서 써야 한다.

## 아키텍처 해석 포인트

- `React 19 + Vite + Express + pnpm workspace`는 기술 선택 그 자체보다 `빠른 실험 + 운영 control plane`을 지지하는 조합이다.
- agent는 영속 엔티티이고, skill은 주입되는 capability이며, channel/integration은 side effect 경계다.
- UI는 업무 객체를 먼저 보여주고, runtime은 뒤에서 실행된다.
- 제품의 경쟁력은 model sophistication 단독이 아니라 `case / approval / document / schedule / notification`이 한 조직 단위로 연결된다는 점에 있다.

## Related Pages

- [[운영_Control_Plane_모델]]
- [[역할기반_agent_skill_구조]]
- [[k-skill_생태계_결정_내역]]
- [[멀티에이전트_운영_모델]]
- [[배포_버그_수정_요약_2026-04-13]]

## Source Trace

- [[03_제품/hagent-os/02_product/prd]]
- [[03_제품/hagent-os/04_ai-agents/agent-design]]
- [[.agent/system/memory/long-term-memory]]
- [[.agent/system/memory/daily-memory]]
- [[.agent/system/ops/PROGRESS]]
- `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-full-regression.md`
