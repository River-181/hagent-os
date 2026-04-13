---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/2026-04-13-students-case-session.md"
synced_at: 2026-04-13
---
# 2026-04-13 Students / Case Session Handoff

- repo: `/Users/river/workspace/active/hagent-os`
- local date: `2026-04-13`
- note:
  - Playwright artifact timestamp는 UTC 기준이라 `.playwright-cli/page-2026-04-12T17-*.yml`처럼 보인다.
  - 이 문서는 KST `2026-04-13` 세션의 증빙 메모다.

## 1. 오늘 실제 수정

### `Students`

- 파일: `ui/src/pages/StudentsPage.tsx`
- 수정 요지:
  - `schedule` 응답 shape를 `StudentsPage` 기준으로 항상 정규화하도록 `normalizeSchedules()` 추가
  - `matchesScheduleToStudent()`에서 `studentIds`, `grades`, `title`를 안전하게 방어
  - `schedulesQuery`에 `select: normalizeSchedules` 적용
  - `StudentDetailSheet`는 `selectedStudentId`만이 아니라 실제 `selectedStudent`가 확보된 뒤에만 mount

### `Case / Issue`

- 파일: `ui/src/components/CaseProperties.tsx`
- 수정 요지:
  - editable field가 dropdown이라는 점을 상단 helper copy로 명시
  - `status / priority / assignee / project` trigger 스타일 통일
  - static badge와 editable control의 시각 구분 정리

- 파일: `ui/src/pages/CaseDetailPage.tsx`
- 수정 요지:
  - compact `Documents` section에 대표 문서 preview 2줄 추가
  - multi-document일 때 `+N` badge 추가
  - 검증 중 `C-006`을 `done`으로 이동 후 board 반영 확인, 이후 다시 `in_review`로 복원

## 2. 원인 정리

### `Students` base route crash

- 증상:
  - `/students` 진입 시 error boundary
  - 메시지: `Cannot read properties of undefined (reading 'includes')`
- 원인:
  - `queryKeys.schedules.list(...)`를 여러 페이지가 공유하는데, 페이지별로 서로 다른 shape의 schedule data가 cache에 들어감
  - `StudentsPage`에서 raw shape를 그대로 읽으면서 `includes()` 호출
- 증빙:
  - console: `output/playwright/session-2026-04-13-students-case/console-students-base-crash.log`
  - snapshot: `output/playwright/session-2026-04-13-students-case/page-students-base-crash.yml`

### `Students` deep-link loop

- 증상:
  - `/students/:id` 직접 진입 시 `Maximum update depth exceeded`
- 원인:
  - detail route 진입 시 `Sheet`가 학생 resolve 전에 먼저 mount되며 update loop가 발생
  - `selectedStudent` 준비 전에는 sheet를 mount하지 않도록 바꿔 해결
- 증빙:
  - fail log 1: `output/playwright/session-2026-04-13-students-case/console-students-deeplink-loop-1.log`
  - fail log 2: `output/playwright/session-2026-04-13-students-case/console-students-deeplink-loop-2.log`
  - fail snapshot: `output/playwright/session-2026-04-13-students-case/page-students-deeplink-loop.yml`

## 3. 검증 결과

### 정적 검증

```bash
./ui/node_modules/.bin/tsc --noEmit --pretty false -p ./ui/tsconfig.json
corepack pnpm --filter @hagent/ui build
```

- 결과:
  - `tsc`: 통과
  - `build`: 통과
  - 잔여 warning:
    - Vite large chunk warning 1건

### 브라우저 실검증

기준 URL:
- `http://localhost:5174/bootstrap-smoke-academy/students`
- `http://localhost:5174/bootstrap-smoke-academy/students/30517f5d-e0d0-4fcb-9a84-5322db9f056f`
- `http://localhost:5174/bootstrap-smoke-academy/cases/7e115579-e487-4503-956e-2043404e31f0`

실제 확인 항목:
- `/students` 렌더 정상
- 목록 → `상세보기` → detail sheet open 정상
- detail sheet close 후 `/students` 복귀 정상
- `/students/:id` deep-link 직접 진입 정상
- `CaseDetail` properties status dropdown에서 `done` 변경 저장 정상
- board의 `완료 1` 반영 정상
- `CaseDetail` compact `Documents` preview 렌더 정상

성공 증빙:
- students base snapshot: `output/playwright/session-2026-04-13-students-case/page-students-base-ok.yml`
- students deep-link snapshot: `output/playwright/session-2026-04-13-students-case/page-students-deeplink-ok.yml`
- case detail snapshot: `output/playwright/session-2026-04-13-students-case/page-case-detail-polish.yml`
- cases board `done` snapshot: `output/playwright/session-2026-04-13-students-case/page-cases-board-done.yml`
- screenshots:
  - `output/playwright/session-2026-04-13-students-case/students-base.png`
  - `output/playwright/session-2026-04-13-students-case/students-detail.png`
  - `output/playwright/session-2026-04-13-students-case/case-detail.png`

## 4. 실패 / 미검증

### 이번 세션에서 실패 후 수정 완료

- `Students` base route crash
- `Students` deep-link infinite update loop

### 아직 미검증

- `Students` detail 내부 액션 버튼 전체
  - `관련 케이스 보기`
  - `연결 일정 보기`
  - `연결 프로젝트 보기`
  - `학생 정보 수정`
- `Students` detail에서 `shuttle` toggle 저장의 서버 반영까지는 브라우저 재검증 안 함
- `CaseDetail` `Documents` expanded 상태에서 다문서 생성/수정 플로우 미검증
- `Schedule` resize / monthly chip / dense overlap polish는 이번 세션 범위 밖

## 5. 증빙 폴더

- master evidence folder:
  - `output/playwright/session-2026-04-13-students-case`
- 포함 파일:
  - screenshots 3개
  - crash console logs 3개
  - success console logs 3개
  - page snapshots 8개
  - evidence readme 1개

## 6. 세션 로그 / 토큰 추정치

- session log summary:
  - `output/session-logs/2026-04-13-students-case-session.md`
- runtime note:
  - 초기에는 `server`가 이미 `:3200`에서 listen 중이었음
  - 이후 법령 fallback 검증을 위해 `:3200` server를 최신 코드로 재기동함
  - `ui`는 `corepack pnpm --filter @hagent/ui dev`로 `:5174`에서 기동
- rough token estimate:
  - input/context: `45k ~ 65k`
  - output/reasoning-visible: `8k ~ 15k`
  - total: `53k ~ 80k`
- 주의:
  - 정확한 telemetry가 아니라 CLI 대화 길이 + Playwright snapshot YAML 노출량 기준의 추정치다.

## 7. 다음 세션 시작점

다음 세션에서는 아래 순서로 바로 이어가면 된다.

1. `Schedule` polish
   - resize up/down
   - monthly chip interaction
   - dense overlap layout
2. `Students` detail 잔여 액션 검증
3. `CaseDetail` expanded `Documents` 플로우 재검증
4. Playwright smoke를 스크립트/반자동 절차로 고정

즉시 참고 파일:
- `ui/src/pages/StudentsPage.tsx`
- `ui/src/components/CaseProperties.tsx`
- `ui/src/pages/CaseDetailPage.tsx`
- `docs/handoff/2026-04-13-full-regression.md`
- `output/playwright/session-2026-04-13-students-case/README.md`

## 8. 법령 fallback addendum

- 파일:
  - `server/src/services/integrations/korean-law.ts`
  - `server/src/routes/adapters.ts`
  - `server/src/lib/agents/complaint.ts`
  - `server/src/lib/agents/types.ts`
  - `server/src/services/case-artifacts.ts`
- 수정 요지:
  - `LAW_GO_KR_OC`가 없어도 fallback excerpt가 매칭되면 `cached-excerpt`를 바로 반환하도록 변경
  - 민원/운영 질문의 `legalBasis.summary`에 조문 발췌 전문을 우선 싣도록 변경
  - artifact 문서도 `detail` 우선으로 렌더하도록 변경
  - adapter test의 `lastResult`와 `statusSummary`가 fallback 성공 상태를 `connected`로 보여주도록 정리
- 실제 검증:
  - `corepack pnpm --filter @hagent/server typecheck`
  - `PORT=3211 SKIP_SCHEMA_SYNC=true corepack pnpm --filter @hagent/server dev`
  - `curl -s -X POST http://localhost:3211/api/adapters/test -H 'Content-Type: application/json' -d '{"key":"korean-law-mcp"}'`
  - 기존 `:3200` 서버를 최신 코드로 재기동 후 `curl -s -X POST http://localhost:3200/api/adapters/test -H 'Content-Type: application/json' -d '{"key":"korean-law-mcp"}'`
  - 결과 핵심:
    - `connected: true`
    - `degraded: false`
    - `source: "cached-excerpt"`
    - `preview`: 환불 기준 조문 요약 반환
- 참고:
  - 이 검증은 `LAW_GO_KR_OC` 미설정 로컬 기준이다.
  - Railway의 `ECONNRESET` 실환경은 이번 세션에서 직접 재현하지 못했고, 네트워크 실패 시 fallback 경로가 동작하도록 코드 기준 보강했다.
