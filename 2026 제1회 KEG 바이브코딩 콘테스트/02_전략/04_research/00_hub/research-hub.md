---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[_02_전략_MOC]]"
aliases:
  - research-hub
  - 리서치허브
---
# 리서치 허브

> 개발 전 문제 정의를 좁히기 위한 리서치 작업의 단일 진입점.

## 목표

- 공교육/사교육, 운영자/교사 축을 분리해서 현장 문제를 파악한다.
- `Paperclip/OpenClaw 스타일 교육 에이전트` 아이디어를 현실 운영 문제와 연결한다.
- `problem-bank`와 `problem-scorecard`에 바로 넣을 수 있는 근거를 수집한다.

## 현재 리서치 질문

- 어떤 사용자군이 가장 강한 페인 포인트를 갖고 있는가
- 어떤 문제는 `AI agent team` 구조가 아니면 해결 가치가 약한가
- 어떤 문제는 7일 MVP와 2분 데모에 맞지 않는가
- 어떤 문제는 KEG 심사 기준에서 실무 접합성과 확장성을 동시에 설명할 수 있는가

## 작업 문서

- [[01-bottom-up-academy-research-source]] — 한국 학원 생태계 바텀업 조사 기준
- [[01-notebooklm-bottom-up-prompts]] — NotebookLM 전용 바텀업 프롬프트 세트
- [[02_전략/04_research/00_hub/research-plan-eduswarm-v0]] — 이번 라운드 리서치 범위와 우선순위
- [[02_전략/04_research/00_hub/research-prompts-by-tool]] — `Gemini Deep Research`, `Perplexity`, `NotebookLM`, `X`용 프롬프트
- [[02_전략/04_research/00_hub/research-log]] — 수집 기록과 다음 액션
- [[02_전략/04_research/00_hub/research-folder-guide]] — `04_research` 내부 구조와 읽는 순서
- [[03-problem-bank]] — 리서치에서 살아남은 문제 후보 저장소
- [[04-problem-scorecard]] — 후보 비교표

## 심화 도메인 분석

- [[02_전략/04_research/20_domain-analysis/domain-research-hub]] — 한국 학원 운영 도메인 분석 허브
- [[02_전략/04_research/20_domain-analysis/hagwon-operations]] — 원장/실장 업무 전체 맵
- [[02_전략/04_research/20_domain-analysis/pain-points]] — 기존 솔루션 기능과 현장 불만
- [[02_전략/04_research/20_domain-analysis/legal-requirements]] — 학원 운영 법적 의무
- [[02_전략/04_research/20_domain-analysis/data-assets]] — 데이터 자산화 가능 영역

## 현재 폴더 구조

- `00_hub/` — 허브, 계획, 프롬프트, 로그, 가이드
- `10_reports/` — 합성 보고서와 핵심 리서치 산출물
- `20_domain-analysis/` — 한국 학원 운영 도메인 분석 노트
- `30_external-ai/` — `gemini`, `grok`, `perplexity` raw 결과 아카이브

## 지금 기준 정리 상태

- `02_전략/04_research/`는 전략 리서치의 단일 정본 루트로 사용한다.
- 허브 문서는 모두 `00_hub/`에서 시작한다.
- 외부 AI의 raw 결과는 더 이상 루트에 두지 않고 `30_external-ai/<tool>/`에만 둔다.
- 제품 판단에 직접 쓰는 합성 결과만 `10_reports/`와 `20_domain-analysis/`로 끌어올린다.

## 입력 소스

- [[05-paperclip-교육-아이디어-통합정리]]
- [[06_LLM위키/sources/01 Paperclip이나 opencalw같은 사례도 있을까?]]
- [[06_LLM위키/sources/02 페이퍼클립을 한국식 학원에 맞추어서 바꿔보면 어떨까? 학부모나 강사 관리, 차량 관리 와 같은 자잘한 요소들도 많단 말이지]]
- [[06_LLM위키/sources/03 그럼 학교 선생님들도 사용할 수 있잖아?]]
- [[06_LLM위키/sources/04 그러면 이 프로젝트에 들어가기 전에 리서치할 요소들이 좀 보인다.|04 그러면 이 프로젝트에 들어가기 전에 리서치할 요소들이 좀 보인다.]]
- [[06_LLM위키/sources/05 내가 사용하고자 하는 리서치 툴은 제니나이 딥 립서치 + 퍼플렉시티, 노트북LM, 그리고 X임]]

## 운영 원칙

- 바텀업 70, 탑다운 30으로 진행한다.
- `현장 발화`, `운영 흐름`, `규제/시스템`, `도메인 특성`을 분리 기록한다.
- 출처 없는 주장과 바이럴 서사는 `problem-bank`에 바로 올리지 않는다.
- 의미 있는 발견만 `06_LLM위키/`나 `04_증빙/`로 승격한다.
- NotebookLM은 `운영 흐름`, `반복 업무`, `예외 처리`, `승인 지점`, `데이터 자산화`를 우선 합성한다.
