---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# Runtime And Control Plane Map

## Code Facts

- `docs/start/architecture.md` 기준 `paperclip`은 `React UI -> Express API -> PostgreSQL -> Adapters` 4층 구조다.
- 실제 repo도 `ui/`, `server/`, `packages/`, `skills/`, `cli/`로 나뉘어 있다.
- `ui/src/App.tsx` 라우트는 chat app보다 `dashboard`, `agents`, `projects`, `issues`, `goals`, `approvals`, `costs`, `activity`, `inbox`, `company skills`, `plugins`, `adapters`, `instance settings` 쪽에 무게가 있다.
- `docs/deploy/deployment-modes.md` 기준 runtime mode는 `local_trusted`와 `authenticated`로 명시적으로 갈린다.
- `docs/api/overview.md` 기준 모든 control-plane 조작은 REST JSON API와 company-scoped path를 통해 흐른다.

## What This Means

- `paperclip`의 본질은 “AI가 붙은 SaaS”가 아니라 `운영 control plane`이다.
- chat은 worker runtime 내부에서 일어나는 일일 수 있지만, 제품 껍데기는 `운영 보드 + 상태 추적 + 승인 + 비용 + 활동 기록`이다.
- 즉 유사한 프로그램을 만들려면 먼저 아래 층이 필요하다.
  - 운영자가 보는 control plane
  - 상태를 기록하는 API/DB
  - 여러 runtime을 연결하는 adapter layer
  - 배포 mode에 따라 보안 모델이 달라지는 local-first 구조

## Layer-By-Layer Decomposition

### UI layer

- `ui/src/App.tsx`를 보면 첫-class page가 아래처럼 구성된다.
  - `Dashboard`
  - `Companies`
  - `Agents`, `AgentDetail`
  - `Projects`, `ProjectDetail`, `ProjectWorkspaceDetail`
  - `Issues`, `IssueDetail`
  - `Goals`, `GoalDetail`
  - `Approvals`, `ApprovalDetail`
  - `Costs`
  - `Activity`
  - `Inbox`
  - `Routines`
  - `CompanySkills`
  - `PluginManager`
  - `AdapterManager`
  - `InstanceSettings`
- 이건 곧 첫 UI 설계가 “채팅 화면”이 아니라 “운영 개체들을 관리하는 board”여야 한다는 뜻이다.

### API layer

- `docs/api/overview.md`는 인증 헤더 예시와 company-scoped path를 강하게 전제한다.
- mutating request에는 `X-Paperclip-Run-Id` audit header가 권장된다.
- 즉 paperclip은 tool call 실행 결과만 남기는 게 아니라 “누가, 어떤 run에서, 어떤 개체를 바꿨는지”를 추적한다.

### Data/state layer

- `paperclip`의 context는 chat transcript보다 `issue`, `goal`, `approval`, `cost event`, `activity`, `company` 상태에 가깝다.
- “세션 지속성”과 “single-assignee task checkout”은 운영 충돌을 막기 위한 시스템 규칙이다.

### Adapter/runtime layer

- agent runtime은 Paperclip 내부가 아니라 adapter 뒤에 있다.
- built-in adapter가 `claude_local`, `codex_local`, `process`, `http`라는 점은 `bring your own runtime` 철학을 분명히 보여준다.

## Deployment Model Matters

### `local_trusted`

- localhost 바인딩
- 로그인 없이 local board user 자동 생성
- 혼자 쓰는 운영자용 실험과 로컬 운영에 매우 강함

### `authenticated`

- private/public 분기
- board claim flow 존재
- 여러 인간 운영자와 더 엄격한 보안 경계가 필요할 때 사용

## Translation For EduPaperclip

- 한국형 학원 운영 시스템도 초기에는 `local_trusted`가 강한 차별점이 될 수 있다.
- 이유는 기존 학원 솔루션이 보통 SaaS 잠금 구조인데, 우리는 `로컬 설치 + 원본 데이터 통제 + 높은 AI 자유도`를 내세우려 하기 때문이다.
- 반대로 지점장/원장/실장/강사 협업까지 가면 `authenticated`와 권한 모델이 필요해질 수 있다.

## Recommended Borrow

- `board-first UI`
- `company-scoped state`
- `audit-friendly REST API`
- `local-first deployment`
- `adapter-separated execution`

## Not Suitable / Discard

- 미국식 `company portfolio` 서사를 그대로 가져오는 것
- multi-company를 첫 MVP 핵심으로 두는 것
- 제품 초기에 모든 관리자 기능을 다 구현하려는 것

## Immediate Design Implication

- 우리도 지금부터 `frontend`, `backend`보다 먼저 아래 문서를 고정해야 한다.
  - 운영 보드의 핵심 오브젝트
  - local-first 배포 가정
  - audit log가 필요한 조작 종류
  - runtime을 분리할지 내장할지에 대한 방침
