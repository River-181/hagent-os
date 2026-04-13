---
tags:
  - area/system
  - type/reference
  - status/active
name: github-issue-ops
description: Use when managing GitHub issues in this KEG repo, including issue creation, triage, labeling, commenting, closing, reopening, deduplication, and converting work into issue-sized tasks. Aligns issue work with evidence logs, Obsidian notes, and the repo's contest workflow.
up: "[[.agent/skills/README]]"
---

# GitHub Issue Ops

이 스킬은 GitHub `issue` 운영을 다룬다. 단순 생성뿐 아니라 triage, 라벨링, 상태 전환, 중복 정리, 작업 단위화까지 포함한다.

## 언제 사용하나

- 새 issue를 만들 때
- issue를 triage할 때
- bug / research / product / evidence / submission 작업을 issue로 쪼갤 때
- 중복 issue를 정리할 때
- issue comment, close, reopen, edit가 필요할 때
- 문서 태스크를 GitHub issue와 연결할 때

## 반드시 읽을 파일

1. `.agent/skills/github-workflow/SKILL.md`
2. `.agent/system/ops/PLAN.md`
3. `.agent/system/ops/PROGRESS.md`
4. `.agent/system/ops/project-manager.md`
5. `04_증빙/01_핵심로그/master-evidence-ledger.md`
6. `04_증빙/01_핵심로그/decision-log.md`

## 기반 명령

- `gh issue list`
- `gh issue view`
- `gh issue create`
- `gh issue edit`
- `gh issue comment`
- `gh issue close`
- `gh issue reopen`
- 필요 시 `gh issue status`

## 기본 원칙

- issue 제목은 해결 수단이 아니라 문제를 먼저 드러내야 한다.
- issue 하나는 한 번의 명확한 완료 조건을 가져야 한다.
- 전략/리서치/제품/증빙/제출 중 어느 트랙인지 분명해야 한다.
- 중복 issue를 새로 만들기 전에 기존 issue와 note를 먼저 확인한다.
- issue 생성이나 상태 전환이 의미 있는 의사결정이면 증빙 로그를 남긴다.

## 표준 순서

### 1. Triage

1. 요청이 새 issue인지 기존 issue 관리인지 분류한다.
2. 기존 issue 중복 여부를 확인한다.
3. 트랙과 우선순위를 정한다.
4. `done` 기준이 한 줄로 설명되는지 확인한다.

### 2. Create

본문은 아래 순서를 기본값으로 쓴다.

```markdown
## 배경

## 해야 할 일
- [ ]

## 완료 조건
- [ ]

## 관련 문서
- [[문서]] 또는 경로
```

추가 권장 메타:

- label
- assignee
- milestone
- related note or MOC

### 3. Maintain

- 코멘트는 상태 변화나 blocker가 생겼을 때만 의미 있게 남긴다.
- close는 완료 조건 충족 후 한다.
- reopen은 완료 기준이 깨졌을 때만 한다.
- issue를 더 작은 작업으로 쪼개야 하면 parent/child 관계를 본문에 남긴다.

## Obsidian / Evidence 연결

- Obsidian 태스크 노트가 있으면 issue 본문에 링크를 남긴다.
- 반대로 issue를 기준으로 note를 만들면 관련 note에 issue 번호를 남긴다.
- 의미 있는 issue 작업 후 확인할 파일:
  - `04_증빙/01_핵심로그/master-evidence-ledger.md`
  - 필요 시 `04_증빙/01_핵심로그/decision-log.md`

## 결과물

- 중복 없는 issue 구조
- 완료 조건이 명확한 backlog
- GitHub issue와 Obsidian/증빙이 연결된 상태
