---
tags:
  - area/system
  - type/reference
  - status/active
name: github-workflow
description: Use when working on GitHub operations in this KEG repo, including git status review, branch setup, commit, push, pull request, issue triage/creation, release/tag creation, and GitHub hygiene. Aligns every GitHub action with the repo's evidence and workspace-sync rules.
up: "[[.agent/skills/README]]"
---

# GitHub Workflow

이 스킬은 이 프로젝트의 GitHub 운영 전반을 다룬다.

## 언제 사용하나

- 커밋을 만들거나 푸시할 때
- 새 브랜치를 만들 때
- PR을 열거나 정리할 때
- 이슈를 만들거나 업데이트할 때
- 릴리즈/태그를 만들 때
- GitHub 운영 상태를 점검할 때

## 반드시 읽을 파일

1. `.agent/AGENTS.md`
2. `.agent/system/ops/PLAN.md`
3. `.agent/system/ops/PROGRESS.md`
4. `.agent/system/contracts/workspace-contract.md`
5. `.agent/rules/logging.md`
6. `_MOC/_04_증빙_MOC.md`
7. 필요 시 `.agent/skills/workspace-sync/SKILL.md`
8. issue 운영이면 `.agent/skills/github-issue-ops/SKILL.md`
9. project 보드 운영이면 `.agent/skills/github-project-ops/SKILL.md`
10. release 작업이면 `_system/tools/github/release-policy.md`

## 기본 원칙

- GitHub 작업도 증빙의 일부다.
- 의미 있는 GitHub 작업은 `04_증빙/01_핵심로그/`에 남긴다.
- 사용자 승인 없이 destructive action을 하지 않는다.
- `commit/push` 전에는 secret/privacy preflight를 먼저 통과한다.
- release는 기본값이 `draft` 또는 보류다. 사용자가 명시적으로 원할 때만 final로 간다.
- release는 배포만이 아니라 `운영 업데이트 기록`으로도 사용한다.
- GitHub 관련 note, changelog, release note 초안도 Obsidian note 규칙에 맞춰 관리한다.

## 표준 순서

### 1. Preflight

먼저 아래를 확인한다.

1. `git status --short`
2. 현재 브랜치와 원격
3. 변경 범위가 요청과 맞는지
4. 증빙 로그 업데이트 필요 여부
5. `bash _system/tools/github/pre-push-safety-check.sh`

### 2. Commit / Push

커밋 전 체크:

1. 변경 파일이 요청 범위 안에 있는지 확인
2. `PROGRESS.md` 또는 관련 증빙 로그 반영 여부 확인
3. 테스트/검증 가능하면 최소 1개 이상 수행
4. staged diff에 secret, token, credentials, runtime profile이 없는지 확인
5. 커밋 메시지는 의도와 범위를 짧게 설명

푸시 전 체크:

1. 브랜치명이 목적을 설명하는지 확인
2. 원격이 올바른지 확인
3. release 준비가 아닌데 main 직푸시는 피한다
4. `pre-push-safety-check.sh` 결과를 다시 확인한다

### 3. Pull Request

#### 2인 협업 브랜치 규칙 (이승보 + 김주용)

main 브랜치는 직접 push 불가 (브랜치 보호 활성화). 모든 변경은 PR을 통해 병합한다.

**브랜치 네이밍**

```
river/<작업명>    ← 이승보
juyong/<작업명>   ← 김주용
```

예시:
```
river/배포-railway
river/E2E-검증
juyong/AI-리포트
juyong/데모-스크립트
```

**작업 플로우**

```bash
# 1. 항상 최신 main에서 시작
git checkout main && git pull
git checkout -b river/배포-railway

# 2. 작업 후 커밋
git add <파일> && git commit -m "feat: ..."
git push -u origin river/배포-railway

# 3. PR 생성
gh pr create --title "feat: ..." --assignee "@me"

# 4. 상대방이 리뷰 → Approve → Merge (squash 권장)
gh pr merge --squash
```

**PR 본문 최소 항목**

```markdown
## 변경 내용
- 

## 검증
- [ ] 로컬 실행 확인

## 관련 태스크
- 
```

**병렬 작업 시 주의**

- 같은 파일을 동시에 수정하면 충돌 발생 → 작업 시작 전 Slack/카톡으로 담당 파일 공유
- `03_제품/app/` 코드는 가능하면 담당 영역을 나눈다 (서버 ↔ UI)

PR 기본값:

- 가능하면 `draft`로 시작
- 본문에는 목적, 변경 범위, 검증, 남은 리스크를 쓴다
- 증빙이 중요한 변경이면 관련 `04_증빙/01_핵심로그/` 파일을 함께 언급한다

### 4. Issue

이슈 생성/정리 원칙:

- 중복 이슈를 먼저 확인
- 제목은 문제 중심으로 쓴다
- 본문은 `배경 / 해야 할 일 / 완료 조건 / 관련 문서` 순으로 쓴다
- 전략, 제품, 증빙 중 어디에 속하는지 분명히 한다
- 반복적인 triage, dedupe, 상태 전환은 `github-issue-ops`를 우선 따른다

추천 템플릿:

```markdown
## 배경

## 해야 할 일
- [ ]

## 완료 조건
- [ ]

## 관련 문서
-
```

### 5. Release / Tag

release 전 체크:

1. 무엇을 릴리즈하는지 명확한가
2. 제출물 기준으로 재현 가능한 상태인가
3. README, 제출 문서, 증빙 링크가 따라오는가
4. 사용자 승인 또는 명시적 요청이 있는가

release 판단 기준:

- 구조 개편, 운영 규칙 변경, 도구 체계 확정, 문제정의 동결, MVP 동결, 제출 동결처럼 상태 변화가 분명할 때 release를 만든다.
- 사소한 수정은 release를 만들지 않는다.
- 기존 draft release를 업데이트 기록으로 계속 보강할 수 있다.

release 노트 소스:

- `05_제출/`
- `04_증빙/01_핵심로그/decision-log.md`
- `04_증빙/01_핵심로그/evolution-log.md`
- `04_증빙/01_핵심로그/ai-usage-stats.md`
- `_system/tools/github/release-note-template.md`

### 6. Project Management

- GitHub Project 운영은 `github-project-ops`를 우선 따른다
- `PLAN`, `PROGRESS`, `_system/dashboard/project-dashboard.base`와 충돌이 나지 않게 유지한다
- project scope가 필요하면 `gh auth refresh -s project` 여부를 먼저 점검한다

## GitHub 작업과 증빙 연결

아래 작업은 끝난 뒤 증빙 반영을 확인한다.

- commit / push
- PR 생성
- issue 생성 또는 상태 전환
- release / tag 생성

최소 연결 대상:

- `04_증빙/01_핵심로그/master-evidence-ledger.md`
- 필요 시 `04_증빙/01_핵심로그/decision-log.md`
- 필요 시 `.agent/system/logs/evidence-gate-log.md`
- 필요 시 `.agent/skills/obsidian-workspace/SKILL.md` 기준으로 MOC/운영 note도 함께 갱신

## 절대 규칙

- 변경 범위를 모른 채 `git add .` 하지 않는다.
- `.env`, `runtime/`, local profile, token file을 추적 상태로 올리지 않는다.
- 사용자가 요청하지 않은 release를 만들지 않는다.
- 증빙이 필요한 GitHub 작업을 로그 없이 끝내지 않는다.
- 브랜치/PR/이슈/릴리즈 설명을 빈 상태로 두지 않는다.

## 결과물

- GitHub 상태가 명확해진다
- commit / push / PR / issue / release가 요청 범위와 일치한다
- 증빙 로그와 GitHub 작업이 서로 연결된다
