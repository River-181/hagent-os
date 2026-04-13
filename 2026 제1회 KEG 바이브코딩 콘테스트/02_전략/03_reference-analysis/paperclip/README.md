---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[_02_전략_MOC]]"
aliases:
  - paperclip-analysis
  - paperclip 해체분석
---
# Paperclip Analysis Workspace

> `EduPaperclip`를 만들기 위해 `paperclip`을 분해 분석하는 작업 공간.
> 목적은 clone이 아니라 `UI`, `entrypoint`, `data/context`, `agent orchestration`, `skill/package` 구조를 한국형 학원 운영에 맞게 재해석하는 것이다.

> [!note]
> 상위에서 직접 읽을 정본은 `03_제품/hagent-os/_research/` 아래의 비교·적용 문서다.
> raw mirror와 초기 복제 메모는 [[02_전략/98_archive/paperclip-reference/README|archive]]로 옮겼다.

## 이 폴더의 역할

- `paperclip`에서 가져올 것과 버릴 것을 구분한다.
- 한국식 학원/교육 운영에 맞는 변형 포인트를 찾는다.
- 구현 전에 `어떤 로컬 파일 구조가 필요한지`를 리서치로 확정한다.

## 현재 분석 축

- UI와 첫 진입 경험
- 사용자의 한 줄 지시가 어떻게 분해되는지
- 어떤 데이터/컨텍스트를 에이전트가 읽는지
- `k-skill`처럼 배포 가능한 skill 구조를 어떻게 넣을지
- 한국식 학원 운영에 맞는 도메인 변형 포인트가 무엇인지

## 파일 가이드

- [[00-paperclip-ai]] — Paperclip 소개 영상 원문 트랜스크립트 (1차 출처)
- [[01-ui-entrypoints]] — UI 구조, 진입점, 첫 화면 흐름
- [[02-data-context-model]] — 데이터 구조, 컨텍스트, 원본 데이터 접근 방식
- [[03-agent-skill-structure]] — 에이전트 역할, skill/package, orchestration 구조
- [[04-k-education-fit-gaps]] — 한국형 학원/교육 운영으로 바꿀 때의 차이와 빈칸
- [[05-open-questions]] — 분석 후에도 남는 질문과 로컬 디렉토리 확정 전 체크리스트
- [[06-runtime-control-plane-map]] — 실제 monorepo, runtime layer, deployment mode, control-plane surface
- [[07-plugin-adapter-extensibility]] — plugin SDK, adapter model, skill 배포/확장 포인트
- [[03_제품/hagent-os/_research/paperclip-ui-reference]] — 상위 노출용 UI 참고 정리
- [[03_제품/hagent-os/_research/gap-analysis-paperclip-vs-hagent]] — 제품 비교/갭 분석 정본
- [[03_제품/hagent-os/_research/paperclip-readme-agents-application]] — 제출용 README/AGENTS 적용 정리

## 분석 원칙

- `paperclip`의 기능을 그대로 나열하지 않는다.
- 우리 프로젝트에 필요한 구조만 추린다.
- 구현보다 먼저 `왜 필요한가`, `어디에 쓰는가`, `무엇을 대체하는가`를 적는다.
- 학원 운영자가 실제로 쓸 핵심 skill 후보와 데이터 자산화 포인트를 놓치지 않는다.
- 코드에서 확인된 사실과 해석을 구분한다.
- raw mirror는 `98_archive/paperclip-reference/` 아래에 보관한다.
- 실제 파일 근거 없이 “그럴 것 같다” 수준의 구조 가정은 줄인다.

## 이번 코드 분석에서 추가로 확인된 것

- `paperclip`은 README 문구 수준이 아니라 실제로 `ui/`, `server/`, `packages/`, `skills/`, `cli/`를 가진 monorepo다.
- UI 라우트는 `dashboard`, `agents`, `projects`, `issues`, `goals`, `approvals`, `costs`, `activity`, `inbox`, `skills`, `plugins`, `adapters`, `instance settings`까지 넓게 펼쳐진다.
- API도 `company-scoped REST`를 강하게 전제하며, audit header와 auth mode가 분리돼 있다.
- skill만 있는 시스템이 아니라 `plugin + adapter + company-scoped control plane + embedded deployment`가 합쳐진 운영 플랫폼이다.

## 우리에게 중요한 해석

- 목표가 “비슷한 프로그램”이라면 chat UX 흉내보다 `운영판`, `상태 모델`, `확장 구조`, `로컬 배포 경험`을 먼저 가져와야 한다.
- 특히 한국형 학원 운영에서는 `plugin/skill pack`, `domain pack`, `local_trusted deployment`, `감사 가능한 activity/case 흐름`이 핵심 후보가 된다.
