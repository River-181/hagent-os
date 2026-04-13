# HagentOS — AI Agent Instructions

> **모든 AI 에이전트(Claude Code, Codex, Cursor 등)가 작업 시작 전에 읽는 파일.**

---

## 시작 전 체크

1. `README.md` 로 제품 개요와 실행 흐름을 먼저 확인한다.
2. UI 작업이면 `docs/design/ui-harness.md`, `docs/design/design-system-rules.md` 를 먼저 읽는다.
3. 심사 데모 흐름을 건드리면 `JUDGE_DEMO.md` 도 함께 확인한다.

---

## 스택 & 포트

| 항목 | 값 |
|------|-----|
| UI | React 19 + Vite + TypeScript (`ui/`) |
| Server | Express + Drizzle ORM (`server/`) |
| DB | PostgreSQL 17, DB명 `hagent_os`, 포트 5432 |
| 패키지 매니저 | pnpm workspace |
| UI 포트 | 5174 (dev) |
| Server 포트 | 3200 |

```bash
# 루트에서 전체 실행
pnpm dev

# 서버만
pnpm dev:server

# UI만
pnpm dev:ui

# 전체 타입체크
pnpm typecheck

# 전체 빌드
pnpm build

# 빌드 검증 (작업 완료 후 반드시)
cd ui && npx vite build
```

기본 로컬 URL:

- UI: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:3200`

---

## 폴더 구조

```
ui/src/
  pages/          ← 페이지 컴포넌트 (각 라우트 1개)
  components/     ← 재사용 컴포넌트
    ui/           ← shadcn + HagentOS 기본 컴포넌트
  context/        ← React Context
  api/            ← API 클라이언트 (서버 호출)
  lib/            ← 유틸리티

server/src/
  routes/         ← Express 라우터 (기능별 1파일)
  services/       ← 비즈니스 로직 (DB 접근)

packages/
  db/             ← Drizzle 스키마
  shared/         ← 공유 타입
```

---

## UI 작업 전 필독

**모든 UI 코드 작성 전에 다음 파일을 읽는다:**

```
docs/design/ui-harness.md     ← 토큰, 패턴, 금지 규칙, 코드 예시
docs/design/design-system-rules.md  ← 압축 규칙 참조
```

### 3줄 요약

1. `var(--토큰명)` 인라인 스타일만. Tailwind `bg-teal-*`, `text-slate-*` 색상 유틸 금지.
2. 페이지는 `<div className="p-6 md:p-8 space-y-6">` + `WorkspaceHeader` + `WorkspacePanel` 조합.
3. Primary 버튼은 한 영역에 1개. 나머지는 `⋯` DropdownMenu.

### 주요 컴포넌트 경로

```tsx
import { WorkspacePanel, WorkspaceHeader, WorkspaceEmptyState }
  from "@/components/ui/workspace-surface"
```

### 기준 구현체

`ui/src/pages/SkillsPage.tsx` — Phase B pilot 통과 파일. 2-col 상세 화면의 정석 구현.

---

## 서버 작업 규칙

- 새 엔드포인트: `server/src/routes/` 에 라우터 추가, `server/src/services/` 에 로직 분리.
- DB 접근은 반드시 `services/` 레이어에서만.
- 환경변수: `.env` 파일, `process.env.XXX` 패턴.
- 에러 응답: `res.status(4xx).json({ error: "메시지" })`.

---

## 커밋 규칙

```
feat: 새 기능
fix:  버그 수정
refactor: 리팩터링
docs: 문서
chore: 설정/의존성
```

---

## 작업 완료 기준

1. `cd ui && npx vite build` 에러 없이 통과
2. `cd ui && npx tsc --noEmit` 에러 없이 통과
3. UI 작업이면 `docs/design/ui-harness.md` 체크리스트 확인
