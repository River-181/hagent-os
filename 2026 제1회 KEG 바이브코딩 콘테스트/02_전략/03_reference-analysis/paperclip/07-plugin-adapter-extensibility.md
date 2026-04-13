---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# Plugin And Adapter Extensibility

## Code Facts

- `packages/plugins/sdk/README.md` 기준 `paperclip`은 plugin worker, plugin UI, testing harness, bundler preset, dev server까지 제공한다.
- plugin은 단순 API webhook이 아니라 `worker entrypoint`와 `ui entrypoint`를 모두 가질 수 있다.
- UI plugin은 `page`, `sidebar`, `dashboardWidget`, `detailTab`, `settingsPage`, `toolbarButton` 같은 slot에 들어갈 수 있다.
- plugin worker는 `events`, `jobs`, `actions`, `data`, `tools`, `streams`, `state`, `agents` API를 capability-gated 방식으로 받는다.
- adapter는 plugin과 별개로 agent runtime을 연결하는 브리지이며, server/UI/CLI 모듈을 함께 가진다.

## Why This Matters More Than It First Looks

- `paperclip`의 확장성은 “새 agent를 붙일 수 있다” 수준이 아니다.
- 실제로는 아래 두 축이 분리돼 있다.
  - `adapter`: Claude Code, Codex, shell process처럼 실행 엔진을 연결
  - `plugin`: 운영 화면, 데이터 브리지, scheduled job, custom tool을 확장
- 즉 비슷한 프로그램을 만들려면 “어떤 모델을 붙일까”보다 “확장 단위를 어디에 둘까”를 먼저 정해야 한다.

## Borrowed Structure

### adapter as runtime bridge

- 역할:
  - 외부 agent 실행
  - stdout / usage / session state 파싱
  - 실행 진단과 config schema 제공
- 의미:
  - AI 모델 교체, 로컬 CLI 교체, provider 교체가 core product를 덜 흔들게 한다.

### plugin as product extension

- 역할:
  - 새 페이지/위젯/탭 추가
  - scheduled job 추가
  - custom tool/action/data endpoint 추가
  - plugin-specific state와 event 흐름 구성
- 의미:
  - 특정 산업 pack이나 운영 pack을 product core 밖으로 밀어낼 수 있다.

## Translation For EduPaperclip

### adapter interpretation

- 학원 운영 시스템에서도 runtime adapter는 유효하다.
- 후보:
  - local `Codex` / `Claude Code`
  - local shell/process worker
  - `HTTP` agent
  - 향후 `NotebookLM` 같은 리서치 보조 계층은 직접 adapter라기보다 외부 synthesis tool일 수 있다.

### plugin interpretation

- 우리에게 더 중요한 것은 plugin 구조일 수 있다.
- 이유:
  - 학원 유형마다 필요한 운영 기능이 다르다.
  - 법무/세무/차량/시설/민원/상담은 공통 코어라기보다 domain pack일 가능성이 높다.
  - `k-skill`도 단순 prompt 모음이 아니라 plugin/pack처럼 다뤄야 재사용과 배포가 쉬워진다.

## Strong Product Hypothesis

- EduPaperclip의 core는 아래 정도로 좁혀질 가능성이 높다.
  - 운영 보드
  - 케이스/업무 상태 모델
  - approval / activity / audit
  - 기본 agent orchestration
- 그 위에 아래가 확장 레이어가 된다.
  - `parent complaint pack`
  - `re-enrollment pack`
  - `instructor scheduling pack`
  - `refund / finance pack`
  - `legal / policy check pack`
  - `vehicle / facility pack`

## What To Copy Carefully

- plugin UI slot 개념
- scheduled job 개념
- capability-gated host API
- runtime adapter 분리

## What Not To Copy Blindly

- plugin 설치가 `npm`과 writable filesystem을 강하게 가정하는 현재 방식
- same-origin trusted UI model을 그대로 받아들이는 것
- 초기 MVP부터 marketplace처럼 확장 생태계를 제품 핵심으로 미는 것

## Immediate Design Implication

- 우리도 문서 구조에서 `core`와 `pack`을 분리해서 사고해야 한다.
- 특히 아래 구분이 중요하다.
  - core system
  - domain pack
  - skill bundle
  - runtime adapter
- 이 구분이 있어야 한국형 학원 운영 도메인의 다양성을 억지로 한 schema에 밀어 넣지 않게 된다.
