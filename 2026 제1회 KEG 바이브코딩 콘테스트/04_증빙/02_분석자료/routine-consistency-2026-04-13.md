---
tags:
  - area/evidence
  - type/report
  - status/active
  - workflow/analysis
date: 2026-04-13
up: "[[_04_증빙_MOC]]"
---

이번 정합 점검에서는 데모 루틴 5종의 이름·스케줄·소유 에이전트 기준을 단일 정의로 모아 중복 정의를 제거했다. `agentId`는 생성·수정 시 필수로 강제했고, 시드 단계에서는 누락 가능성이 있던 배정을 포함해 기본 담당을 모두 명시했다. 기본값 규칙은 일반 루틴 `orchestrator`, 민원성 루틴 `complaint`, 이탈 방어 루틴 `retention`, 시간·알림성 루틴 `scheduler`로 통일했다. 기존 DB의 `agentId IS NULL` 행은 시작 시 마이그레이션에서 루틴명 기반으로 백필하도록 추가했으며, `corepack pnpm --filter @hagent/server typecheck`는 임시 복제본 기준 통과했다.
