---
tags:
  - area/evidence
  - type/report
  - status/active
  - workflow/audit
date: 2026-04-13
up: "[[_04_증빙_MOC]]"
aliases:
  - security-audit-2026-04-13
---

# HagentOS Security Audit — 2026-04-13

## Summary
- Severity count: `P0 3 / P1 4 / P2 1`
- Audit scope: secret exposure, auth/authz, input validation, SQL/ORM, XSS/CSRF, CORS, rate limiting, dependencies, Railway config
- P0 fixed in `main`-based clone: `.gitignore`, `server/src/routes/organizations.ts`, `docs/handoff/2026-04-13-claude-session-summary.md`
- Checks run:
  - `corepack pnpm --filter @hagent/server typecheck` at `/Users/river/workspace/active/hagent-os` — passed
  - `corepack pnpm --filter @hagent/ui typecheck` at `/Users/river/workspace/active/hagent-os` — passed
  - `corepack pnpm audit --json` — timed out after 60s
  - `npm audit --json --audit-level=high` — not applicable (`ENOLOCK`, pnpm workspace)
- No verified finding in this audit for `CORS wildcard`, `dangerouslySetInnerHTML`-based XSS, `drizzle sql`` string interpolation`, or cookie-session flag misuse. Cookie-based auth code was not present in the app repo.

## Findings

### SEC-001 [P0] Tracked Telegram bot token exposed in handoff document
- 위치: `docs/handoff/2026-04-13-claude-session-summary.md:102`, `docs/handoff/2026-04-13-claude-session-summary.md:150`
- 현상: 실제 형태의 `TELEGRAM_BOT_TOKEN` 값이 plaintext로 추적되고 사용 안내에도 그대로 노출됨
- 영향: 봇 탈취, 임의 webhook 등록/해제, 사칭 메시지 발송, Git history를 통한 장기 노출 위험
- 권장 조치: HEAD에서 즉시 redaction, Telegram token 회전, 이후 문서/로그에 실토큰 금지
- 적용 상태: fixed

### SEC-002 [P0] `.env*` 전체가 ignore되지 않아 비밀 파일 추적 위험이 남아 있었음
- 위치: `.gitignore:1-8`
- 현상: `.env`만 ignore되고 `.env.local`, `.env.production`, `.env.development` 등은 추적 가능 상태였음
- 영향: 로컬/배포용 비밀이 실수로 Git에 포함될 수 있음
- 권장 조치: `.env*` 일괄 ignore, 예외는 `.env.example`만 허용
- 적용 상태: fixed

### SEC-003 [P0] 조직 설정 bootstrap/export 응답에서 저장형 비밀값이 노출될 수 있었음
- 위치: `server/src/routes/organizations.ts:82-158`, `server/src/routes/organizations.ts:210-219`, `server/src/routes/organizations.ts:486-533`
- 현상: 조직 설정에 저장된 `aiPolicy.apiKey`, `telegram.botToken`, `telegram.webhookSecret`, `telegram.ownerControl.passwordHash`가 일부 응답 경로에서 raw payload로 반환될 수 있었음
- 영향: 브라우저 JSON, settings 화면, export 응답을 통해 조직별 OpenAI/Telegram 비밀 유출 가능
- 권장 조치: 공통 masking helper로 bootstrap/export/list/detail/update 응답 전부 sanitize
- 적용 상태: fixed

### SEC-004 [P1] 다수의 ID 기반 라우트가 org-scope 검증 없이 교차 조직 접근을 허용함
- 위치: `server/src/routes/approvals.ts:148-281`, `server/src/routes/cases.ts:538-759`, `server/src/routes/documents.ts:119-343`, `server/src/routes/runs.ts:11-69`, `server/src/routes/students.ts:105-220`, `server/src/routes/goals.ts:37-68`, `server/src/routes/projects.ts:135-187`
- 현상: `:id`만으로 조회/수정/삭제가 가능하고, 요청 주체의 `organizationId`와 대상 레코드의 `organizationId`를 교차 검증하지 않음
- 영향: ID 추측 또는 누출 시 타 기관의 approval, case, document, student, run, goal, project 데이터 읽기/수정 가능
- 권장 조치: 모든 detail/mutation route를 `organizations/:orgId/...` 형태로 고정하거나, DB 조회 시 `organizationId` join check를 강제
- 적용 상태: deferred

### SEC-005 [P1] Telegram owner-control 관리 라우트에 인증/권한 게이트가 없음
- 위치: `server/src/routes/telegram.ts:305-352`
- 현상: `GET/PATCH /channels/telegram/owner-control/:orgId`, `POST /revoke`, `POST /test`가 별도 auth 없이 orgId만으로 실행됨
- 영향: API 접근 가능 주체가 owner-control 설정 열람/변경, 세션 revoke, 테스트 메시지 발송을 임의 수행 가능
- 권장 조치: 운영자 인증과 org membership/role 검증을 추가하고 민감 액션은 별도 audit trail로 남길 것
- 적용 상태: deferred

### SEC-006 [P1] 입력 검증이 일부 조직 설정 라우트 외에는 거의 없고 파일 import 제한도 부족함
- 위치: `server/src/routes/documents.ts:80-102`, `server/src/routes/documents.ts:208-343`, `server/src/routes/goals.ts:20-68`, `server/src/routes/projects.ts:193-240`, `server/src/routes/orchestrator.ts:12-35`
- 현상: 대부분의 mutating route가 `req.body`를 직접 신뢰하며, `documents/import-preview`는 확장자 기반 처리만 하고 MIME/size upper bound가 없음
- 영향: malformed payload 저장, oversized base64 업로드, parser abuse, 비정상 상태 데이터 누적 가능
- 권장 조치: Zod schema를 route 경계에 추가하고 string/array/file size limit, MIME allowlist, numeric bounds를 명시
- 적용 상태: deferred

### SEC-007 [P1] AI 비용 유발 엔드포인트에 rate limiting이 없음
- 위치: `server/src/routes/cases.ts:286-340`, `server/src/routes/orchestrator.ts:11-35`, `server/src/routes/adapters.ts:97-255`
- 현상: `quick-ask`, `orchestrator dispatch`, `adapter test`에 per-IP/per-org rate limit, concurrency cap, idempotency guard가 없음
- 영향: 비용 폭증, 모델 abuse, 외부 호출 남용, 서비스 저하 가능
- 권장 조치: org/IP 기준 sliding-window limiter와 org budget/quota, duplicate request suppression을 추가
- 적용 상태: deferred

### SEC-008 [P2] Railway secret/public 변수 분류 기준이 repo에 명시돼 있지 않음
- 위치: `railway.toml:1-11`, `Dockerfile:1-32`, `.env.example:2-20`
- 현상: 배포 설정은 존재하지만 어떤 변수가 Railway secret인지, 어떤 값이 public/default인지 정리된 운영 문서가 없음
- 영향: 운영자가 심사/배포 과정에서 비밀값을 잘못 분류하거나 공유 스크린샷에 노출할 위험이 있음
- 권장 조치: README 또는 ops 문서에 env matrix를 추가해 `secret / public / optional / local-only`를 명시
- 적용 상태: deferred

## 결론 및 후속
- 이번 감사에서 즉시 수정한 P0는 3건이다. 핵심은 `tracked secret 제거`, `.env*` 보호, `organization settings 응답 masking`이다.
- 교차 조직 접근과 Telegram owner-control auth 부재가 다음 우선순위다. 이 둘이 실제 권한 모델의 핵심 리스크다.
- Dependency HIGH/CRITICAL 평가는 이번 턴에서 확정하지 못했다. `corepack pnpm audit --json`은 60초 내 완료되지 않았고, `npm audit`는 pnpm workspace에서 `ENOLOCK`로 실패했다.
- 원격 `git push`는 셸 네트워크에서 `Could not resolve host: github.com`로 실패했다. 로컬 app hotfix commit은 생성되었으며 hash는 `f420a0bff7b28586ba2aeb13fdffa0556d1ef1a2`다.
- 즉시 후속 조치:
  - Telegram bot token 실제 회전
  - org-scope enforcement 공통 미들웨어 도입
  - Telegram owner-control route auth 추가
  - rate limit 및 dependency audit 재실행
