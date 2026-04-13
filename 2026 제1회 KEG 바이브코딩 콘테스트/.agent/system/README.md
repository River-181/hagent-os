---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/AGENTS]]"
aliases:
  - agent-system
  - 운영시스템정본
---
# Agent System

> 이 디렉토리는 이 워크스페이스의 공용 운영 정본이다.
> 모든 AI 에이전트 공통 규칙, 운영 계약, 메모리, 레지스트리, 맵, 시스템 로그는 여기서 관리한다.

## 원칙

- `.agent/system/` = 공용 정본
- `04_증빙/` = AI 리포트 재료 정본
- `.agent/system/memory/` = 운영 기억 보조 레이어
- `.claude/` = Claude 전용 미러/어댑터
- `_MOC/` = 중앙 MOC 공간
- `_system/tools/` = 저장소 종속 도구 정본
- `.context/` = 제거됨. 내용은 `.agent/system/`으로 흡수
- 이 저장소의 문서 레이어 = Obsidian vault

## 읽는 순서

1. `contracts/workspace-contract.md`
2. `contracts/memory-evidence-policy.md`
3. `memory/MEMORY.md`
4. `memory/long-term-memory.md`
5. `memory/daily-memory.md`
6. `maps/workspace-atlas.md`

## 디렉토리 역할

- `ops/`: PLAN, PROGRESS, 운영 대시보드, Bases 파일
- `contracts/`: 운영 계약, 정본/미러 정책, 도구별 운영 계약
- `memory/`: 장기 기억과 일일 기억
- `registry/`: tools, MCP, plugins, skills 등록부
- `maps/`: 워크스페이스 구조 atlas
- `logs/`: 시스템 변경/미러링/Evidence Gate 로그
- `automation/`: 자동화 규칙과 명세

## Obsidian 기준

- note는 Obsidian note로 작성한다.
- 내부 문서는 `[[wikilink]]` 기준으로 연결한다.
- `.base` 파일은 Obsidian Bases로 다룬다.
- vault 조작은 가능하면 `obsidian` CLI를 우선 검토한다.
- 관련 규칙: `.agent/rules/obsidian-conventions.md`
- 관련 스킬: `.agent/skills/obsidian-workspace/SKILL.md`

## 반드시 기억할 것

- 리포트에 쓸 수 있는 사실은 최종적으로 `04_증빙/`에 있어야 한다.
- 직접 입력 정본은 `04_증빙/01_핵심로그/master-evidence-ledger.md` 하나다.
- 메모리에만 있고 증빙에 없는 상태는 세션 종료 시 `Done`으로 간주하지 않는다.
