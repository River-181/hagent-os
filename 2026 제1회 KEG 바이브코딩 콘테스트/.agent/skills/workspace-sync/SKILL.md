---
tags:
  - area/system
  - type/reference
  - status/active
name: workspace-sync
description: Use when updating workspace structure, memory, maps, or evidence logs in this KEG repo. Consolidates changes into the canonical files, promotes report-worthy facts from memory to evidence, updates the single workspace atlas, and enforces Evidence Gate at session end.
up: "[[.agent/skills/README]]"
---

# Workspace Sync

이 스킬은 이 워크스페이스의 정합성을 유지하기 위한 전용 스킬이다.

## 언제 사용하나

- 폴더/파일 위치를 바꿨을 때
- `.agent/system/memory/`를 수정했을 때
- `.agent/system/maps/`를 수정했을 때
- `04_증빙/`의 로그를 갱신해야 할 때
- 세션 종료 전에 Evidence Gate를 통과시켜야 할 때
- Obsidian note 구조 변경이 memory, atlas, evidence에 영향을 줄 때

## 반드시 읽을 파일

1. `.agent/system/contracts/workspace-contract.md`
2. `.agent/system/contracts/memory-evidence-policy.md`
3. `.agent/system/memory/MEMORY.md`
4. `.agent/system/maps/workspace-atlas.md`
5. `_MOC/_04_증빙_MOC.md`
6. `_MOC/_MOC_HOME.md`
7. `04_증빙/01_핵심로그/master-evidence-ledger.md`
7. `.agent/rules/logging.md`
8. `.agent/rules/obsidian-conventions.md`

## 작업 순서

1. 변경이 `장기 기억`, `일일 기억`, `구조`, `증빙` 중 어디에 속하는지 분류한다.
2. 장기 사실이면 `long-term-memory.md`, 단기 맥락이면 `daily-memory.md`를 갱신한다.
3. 리포트 가치가 있으면 먼저 `master-evidence-ledger.md`에 기록한다.
4. 구조가 바뀌면 `workspace-atlas.md`와 `system-change-log.md`를 갱신한다.
5. 중요한 결정만 `decision-log.md`, 재사용 프롬프트만 `prompt-catalog.md`로 승격한다.
6. 세션 종료 시 `master-evidence-ledger.md`를 기준으로 Evidence Gate 필요 여부를 판단한다.
6. Obsidian note/MOC가 바뀌면 `_MOC/`, wikilink, frontmatter가 유지되는지 확인한다.

## 절대 규칙

- 메모리만 바꾸고 증빙 원장을 빼먹지 않는다.
- 구조를 바꿨으면 atlas를 빼먹지 않는다.
- 여러 로그를 동시에 수동으로 맞추는 방식을 기본값으로 두지 않는다.
- 현재 정본은 `.agent/`와 `04_증빙/`라는 사실을 뒤집지 않는다.

## 결과물

- 메모리와 증빙이 서로 어긋나지 않는 상태
- `workspace-atlas.md`가 최신 상태
- 세션 종료 시 `master-evidence-ledger.md`가 최신 상태
