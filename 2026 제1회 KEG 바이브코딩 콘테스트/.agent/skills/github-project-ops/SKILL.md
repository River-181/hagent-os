---
tags:
  - area/system
  - type/reference
  - status/active
name: github-project-ops
description: Use when managing GitHub Projects for this KEG repo, including project creation, fields, views, item add/update, draft issue management, and project-board hygiene. Designed for contest sprint planning and alignment with Obsidian Bases, PLAN/PROGRESS, and evidence logs.
up: "[[.agent/skills/README]]"
---

# GitHub Project Ops

이 스킬은 GitHub `Projects` 운영을 다룬다. 이슈 백로그를 보드로 연결하고, 스프린트 상태와 진행률을 GitHub 쪽에서 유지할 때 사용한다.

## 언제 사용하나

- GitHub Project를 새로 만들 때
- 프로젝트 필드와 상태 컬럼을 설계할 때
- issue나 draft item을 project에 추가할 때
- item 상태를 `Todo / In Progress / Blocked / Done` 등으로 갱신할 때
- Obsidian `project-dashboard.base`와 GitHub Project를 맞출 때
- 데모/제출 기준의 sprint board를 정리할 때

## 반드시 읽을 파일

1. `.agent/skills/github-workflow/SKILL.md`
2. `.agent/system/ops/PLAN.md`
3. `.agent/system/ops/PROGRESS.md`
4. `.agent/system/ops/project-manager.md`
5. `_system/dashboard/project-dashboard.base`
6. `.agent/skills/obsidian-workspace/SKILL.md`
7. `04_증빙/01_핵심로그/master-evidence-ledger.md`

## 기반 명령

- `gh project list`
- `gh project view`
- `gh project create`
- `gh project edit`
- `gh project field-list`
- `gh project field-create`
- `gh project item-list`
- `gh project item-add`
- `gh project item-create`
- `gh project item-edit`

## 기본 원칙

- GitHub Project는 실제 실행 보드여야 한다. 장식용 보드로 두지 않는다.
- `PLAN / PROGRESS / project-dashboard.base / GitHub Project`가 서로 어긋나지 않게 한다.
- project scope가 없으면 먼저 `gh auth refresh -s project`가 필요한지 확인한다.
- board 필드는 최소화한다. 과한 커스텀 필드는 유지비만 높인다.

## 권장 기본 필드

- `Status`: Todo / In Progress / Blocked / Done
- `Track`: 전략 / 개발 / QA / 증빙 / 제출
- `Priority`: P0 / P1 / P2
- `Owner`: 이승보 / 김주용 / AI
- `Day`: D0 ~ D7
- `Demo Critical`: true / false

## 표준 순서

### 1. Project 설계

1. 이미 있는 project가 있는지 확인한다.
2. 없다면 sprint board용 project를 만든다.
3. 최소 필드를 만든다.
4. repository link 여부를 정한다.

### 2. Item 운영

1. issue를 item으로 추가한다.
2. issue로 만들기 애매한 일은 draft item으로 만든다.
3. `Status`, `Track`, `Priority`를 먼저 채운다.
4. blocker가 생기면 `Blocked`로 바꾸고 이유를 comment 또는 note에 남긴다.

### 3. 동기화

- GitHub Project 변경이 있으면 `PLAN`, `PROGRESS`, `_system/dashboard/project-dashboard.base` 중 무엇을 같이 바꿔야 하는지 판단한다.
- Obsidian 쪽 상태가 정본이면 GitHub를 거기에 맞춘다.
- GitHub 쪽 상태가 더 최신이면 `PROGRESS`와 daily note를 갱신한다.

## Obsidian / Evidence 연결

- Obsidian 태스크 노트와 GitHub item은 서로 참조 가능해야 한다.
- Project 상태 변경이 실질적인 운영 의사결정이면 증빙 로그를 남긴다.
- 최소 연결 대상:
  - `04_증빙/01_핵심로그/master-evidence-ledger.md`
  - 필요 시 `04_증빙/01_핵심로그/decision-log.md`

## 결과물

- 실제 운영 가능한 GitHub Project 보드
- PLAN/PROGRESS/Obsidian board와 어긋나지 않는 상태 추적
- 대회 7일 스프린트에 맞는 최소 필드 구조
