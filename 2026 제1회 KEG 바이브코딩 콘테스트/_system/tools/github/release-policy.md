---
tags:
  - area/system
  - type/guide
  - status/active
date: 2026-04-08
up: "[[_system_tools_MOC]]"
aliases:
  - github-release-policy
  - 릴리즈정책
---
# GitHub Release Policy

이 워크스페이스에서 `release`는 단순 배포 태그가 아니라 `의미 있는 운영 상태 변화의 기록`이다.

## 역할 구분

- `commit` = 세부 작업 기록
- `PR` = 검토/병합 단위
- `release` = 팀과 AI가 다시 참조할 수 있는 상태 스냅샷
- `[[master-evidence-ledger]]` = AI 리포트 재료 원장
- `06_LLM위키/` = 지속 지식 정리

즉, `release`는 "무언가 배포했다"보다 "운영 상태가 한 단계 넘어갔다"를 기록한다.

## 언제 release를 만드는가

다음 중 하나를 만족하면 release 후보로 본다.

1. 워크스페이스 구조가 바뀌었다
2. 운영 규칙이나 프로토콜이 바뀌었다
3. 도구 체계가 추가되거나 확정됐다
4. 문제 정의/전략이 한 버전으로 고정됐다
5. MVP 범위가 동결됐다
6. 제출 직전 기준선이 생겼다

## release를 만들지 말아야 할 때

- 사소한 문구 수정만 있을 때
- 상태 변화 없이 파일 몇 개만 늘었을 때
- evidence 가치가 약한 중간 저장일 때
- 나중에 되돌아봐도 버전 이름이 붙을 정도의 의미가 없을 때

## release 제목 규칙

권장 형식:

- `Workspace V2 Expansion (2026-04-08)`
- `Research System Baseline (2026-04-09)`
- `Problem Definition Freeze (2026-04-10)`
- `MVP Scope Freeze (2026-04-11)`
- `Submission Freeze (2026-04-13)`

제목 원칙:

- 상태 변화가 드러나야 한다
- 날짜를 붙여야 한다
- 너무 세부 구현 이름보다 운영/제품 상태를 우선한다

## release note 필수 항목

1. 무엇이 바뀌었는가
2. 왜 바뀌었는가
3. 지금 무엇이 정본인가
4. 다음 단계는 무엇인가
5. AI 리포트에서 재사용할 포인트는 무엇인가

## evidence 연결 규칙

release를 만들거나 수정했다면 아래를 확인한다.

- `[[master-evidence-ledger]]`에 세션 기록이 있는가
- 필요 시 `[[decision-log]]`에 구조 결정이 승격됐는가
- release note와 `PLAN/PROGRESS`가 모순되지 않는가
- 공개 release note에 API key, token, 개인 계정 식별자, private URL, local path dump가 없는가

## security preflight

release 전에는 아래를 통과한다.

1. `bash _system/tools/github/pre-push-safety-check.sh`
2. staged file 목록 수동 확인
3. `runtime/`, `.env`, browser profile, auth file이 tracked가 아닌지 확인
4. note 본문에 개인 정보나 민감 식별자가 없는지 확인

## 운영 기본값

- 기본은 `draft release`
- 사용자가 명시적으로 원할 때만 publish
- 기존 release를 계속 보강해 `업데이트 기록`으로 써도 된다
- 단, 제목과 note는 현재 상태를 반영하도록 갱신한다

## 릴리즈 노트 소스

- `[[.agent/system/ops/PLAN]]`
- `[[.agent/system/ops/PROGRESS]]`
- `[[master-evidence-ledger]]`
- `[[decision-log]]`
- `[[workspace-atlas]]`
- `[[ai-report-draft]]`

## done definition

release 작업은 아래를 만족해야 끝난다.

- tag 또는 기존 release target이 명확하다
- 제목이 현재 상태를 설명한다
- note에 변화/의미/다음 단계가 들어 있다
- 증빙 원장과 충돌하지 않는다
