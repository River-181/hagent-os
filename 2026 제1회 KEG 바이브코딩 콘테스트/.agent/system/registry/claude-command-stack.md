---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/system/README]]"
aliases:
  - claude-command-stack
  - claude-commands
---
# Claude Command Stack

이 문서는 이 프로젝트에서 Claude Code용 `sub-agent`, `command`, `skill`을 어떻게 나눌지 정리한 정본이다.

## 1. 조사 결과 요약

- 현재 Claude Code 공식 문서 기준으로 custom commands는 skills에 통합되었다.
- 다만 `.claude/commands/*.md` 파일은 계속 동작하며, `.claude/skills/<name>/SKILL.md`와 같은 frontmatter를 지원한다.
- command key는 기본적으로 **파일명**에서 온다. 예: `.claude/commands/session-start.md` → `/session-start`
- 정확한 frontmatter 필드는 다음을 쓸 수 있다.
  - `description`
  - `argument-hint`
  - `disable-model-invocation`
  - `user-invocable`
  - `allowed-tools`
  - `model`
  - `effort`
  - `context`
  - `agent`
- 인자 전달은 `$ARGUMENTS`, `$ARGUMENTS[N]`, `$0`, `$1` 형식을 쓴다.

## 2. 이 프로젝트에서의 역할 분리

### Sub-agents

긴 작업을 역할 기준으로 분리할 때 사용한다.

- `pm` — 우선순위/진행 관리
- `research` — 문제/시장/대회 리서치
- `product` — 문제정의, 스펙
- `builder` — 구현
- `qa` — 검증
- `judge` — 심사 관점 점검
- `evidence` — 증빙 정리
- `submission` — 제출 패키징

### Skills

반복 워크플로와 도구 결합 규칙을 담는다.

- `workspace-sync` — memory/atlas/evidence 정합화
- `obsidian-workspace` — vault note/MOC/`.base` 운영
- `github-workflow` — branch/commit/push/PR/issue/release

### Commands

사람이 명시적으로 자주 누르는 entrypoint다.

- `/session-start`
- `/obsidian-sync [target]`
- `/session-close [summary]`
- `/problem-scan <topic>`
- `/github-ops [action or scope]`
- `/judge-review [artifact or scope]`

## 3. 왜 이 6개만 두는가

- 세션 시작
- vault 동기화
- 세션 종료
- 문제 리서치
- GitHub 운영
- 심사 리허설

이 6개가 현재 대회 준비 운영 루프의 대부분을 덮는다. 더 늘리면 `/` 메뉴가 커지고 선택 비용이 올라간다.

## 4. command 작성 규칙

- command는 `.claude/commands/`에 둔다.
- 파일명은 slash command key가 되므로 lowercase + hyphen만 쓴다.
- side effect가 있는 command는 `disable-model-invocation: true`를 넣는다.
- 내부 운영 문서는 항상 `.agent/system/`을 정본으로 참조한다.
- Obsidian note를 만지는 command는 `obsidian-workspace` 규칙을 먼저 따른다.
- 증빙 가치가 있는 command는 종료 전에 `master-evidence-ledger` 반영 여부를 먼저 점검한다.

## 5. 향후 추가 후보

필요할 때만 추가한다.

- `/report-pack`
- `/token-audit`
- `/artifact-capture`
- `/demo-freeze`
- `/submission-check`
