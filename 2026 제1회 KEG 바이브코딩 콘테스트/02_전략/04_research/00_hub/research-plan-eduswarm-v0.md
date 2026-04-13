---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-08
up: "[[02_전략/04_research/00_hub/research-hub]]"
aliases:
  - eduswarm-research-plan
  - 에듀스웜리서치계획
---
# EduSwarm 리서치 계획 v0

## 목적

개발 착수 전에 `무엇을 만들까`보다 `어떤 문제를 지금 버리고 어떤 문제를 남길까`를 결정한다.

## 현재 가설

- `한국형 Paperclip for Education`은 가능성이 있다.
- 하지만 `학원 운영 전체 자동화`는 너무 넓다.
- 초기 MVP는 `역할 1개 + 문제 1개 + 핵심 장면 1개`로 잘라야 한다.

## 리서치 축

### 1. 사용자 축

- 사교육 운영자
- 사교육 강사
- 공교육 담임/교사
- 학부모

### 2. 문제 축

- 민원/커뮤니케이션
- 운영/스케줄링
- 학생 관리/프로파일
- 보고/기록/행정
- 시설/차량/현장 운영

### 3. 검증 축

- 현장성: 실제로 반복되는가
- AI 적합성: agent delegation이 필요한가
- 구현 가능성: 7일 MVP가 가능한가
- 데모 전달력: 2분 안에 와닿는가
- 심사 적합성: 실무성과 확장성을 설명 가능한가

## 이번 라운드 산출물

1. `problem-bank.md`
2. `problem-scorecard.md`
3. `Top 10 pain points` 요약
4. 최종 후보 3개

## 우선순위

### P0

- `학원 원장/운영자`의 실제 반복 업무 파악
- `담임/교사`의 행정/민원/반 운영 병목 파악
- `X + 기사 + 보고서`를 섞어서 현장성과 수치를 동시에 확보

### P1

- 태권도/운전면허/IT 학원 등 도메인 차이를 확인
- 공교육/사교육 공통 문제와 분기 문제를 분리

### P2

- `Paperclip/OpenClaw` 유사 사례를 교육 도메인에 매핑
- 제품 서사와 심사 스토리 연결

## 작업 순서

1. `X`에서 현장 발화 수집
2. `Perplexity`로 최신 기사와 통계 보강
3. `Gemini Deep Research`로 구조화된 비교표 작성
4. `NotebookLM`으로 업로드 자료 합성
5. `problem-bank` 입력
6. `problem-scorecard` 채점

## 컷 기준

- 현장 출처가 약하면 보류
- 문제는 크지만 MVP가 무거우면 탈락
- AI 없이도 되는 자동화면 후순위
- 데모 장면이 탁월하지 않으면 탈락

## 1차 후보 방향

- 학원 원장용 `운영 보조 swarm`
- 담임/교사용 `반 운영 swarm`
- 학부모 민원/보고용 `communication swarm`
