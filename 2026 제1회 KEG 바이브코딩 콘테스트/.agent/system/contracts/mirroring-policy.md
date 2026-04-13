---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/system/contracts/workspace-contract]]"
aliases:
  - mirroring-policy
  - 미러링정책
---
# Mirroring Policy

## 핵심 원칙

- `.agent/system/`이 공용 정본이다.
- `.claude/`는 Claude 전용 미러/어댑터다.
- `.context/`는 제거되었고 내용은 `.agent/system/`으로 흡수되었다.

## 미러링 규칙

1. 공용 규칙 변경은 항상 `.agent/system/`에서 먼저 한다.
2. `.claude/`는 공용 내용을 복제하지 않고 참조 또는 요약만 한다.
3. `.claude`의 미러 문서 상단에는 `Canonical:` 경로를 둔다.
4. Claude 런타임 호환을 위해 꼭 필요한 최소 파일만 `.claude/`에 남긴다.
5. 미러 변경이 발생하면 `.agent/system/logs/mirroring-change-log.md`에 기록한다.

## 미러 대상

| 위치 | 역할 |
|---|---|
| `.claude/CLAUDE.md` | 공용 시작 프로토콜의 Claude 적응판 |
| `.claude/settings.json` | Claude 런타임 환경 변수 |
| `.claude/setup.sh` | Claude setup shim |
