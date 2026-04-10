---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-10
up: "[[_03_제품_MOC]]"
---
# App

> 실제 제출 제품 앱 워크스페이스.
> 현재 `ui/`, `server/`, `packages/` 구조가 존재하고, dev command도 정의되어 있다.

## Setup

- Node: `>=20`
- Package manager: `pnpm`
- workspace root: `03_제품/app`

```bash
cd "03_제품/app"
pnpm install
```

## Development

루트 스크립트:

```bash
cd "03_제품/app"
pnpm dev      # server
pnpm dev:ui   # vite ui
```

주요 위치:
- `03_제품/app/ui` — Vite + React UI
- `03_제품/app/server` — Express server
- `03_제품/app/packages/db` — DB package
- `03_제품/app/packages/shared` — shared package

현재 확인:
- `package.json`, `pnpm-workspace.yaml`, `ui/vite.config.ts` 존재
- `node_modules` 존재
- 이 세션 시점에는 `http://localhost:5173/`가 리스닝 중이지 않았음

## Deployment

배포 방식과 최종 런타임 문서는 제품 정본과 함께 계속 갱신한다.
