---
tags:
  - area/home
  - type/reference
  - status/active
  - type/moc
date: 2026-04-13
up: "[[_MOC_HOME]]"
aliases:
  - HOME
  - 홈
---
# KEG 바이브코딩 콘테스트 홈

> HagentOS contest workspace package home

## 패키지 목적

- 이 공간은 **HagentOS 대회용 문서·증빙·제출 패키지**다.
- 최신 구현 정본은 별도 제품 저장소 `River-181/hagent-os`를 기준으로 본다.
- `03_제품/app/`은 대회 시점 코드 스냅샷이며, 제품 문서 정본은 `03_제품/hagent-os/`에 있다.

## 빠른 진입

- [[README]] — 외부 공유용 대표 진입점
- [[SHARE-PACKAGE]] — 패키지 범위와 읽는 순서
- [[03_제품/hagent-os/README|제품 README]] — 제품 개요
- [[05_제출/live-final-verification|라이브 최종 검증]] — 제출 시점 실동작 기준
- [[05_제출/ai-report-final|AI report final]] — 제출용 AI 리포트 정본
- [[03_제품/hagent-os/diagrams/99_comprehensive-architecture|종합 구조도]]

## 섹션

- [[_01_대회정보_MOC|01 대회정보]] — 규칙, 일정, 심사, 팀 프로필
- [[_02_전략_MOC|02 전략]] — 플레이북, 포지셔닝, 의사결정
- [[_03_제품_MOC|03 제품]] — 문제정의, 페르소나, 아키텍처, 데모
- [[_04_증빙_MOC|04 증빙]] — AI 사용 로그, 결정 기록, 프롬프트
- [[_05_제출_MOC|05 제출]] — AI 리포트, 체크리스트, 회고
- [[_06_LLM위키_MOC|06 LLM 위키]] — Karpathy 스타일 persistent knowledge layer
- [[_system_tools_MOC|System Tools]] — Obsidian, Excalidraw, Figma, NLM, 팀 셋업

## 탐색 방식

- 일반 Markdown 사용자: `README` → `SHARE-PACKAGE` → `03_제품/hagent-os/README` → `05_제출`
- Obsidian 사용자: `00 HOME` → `_MOC/` → 섹션별 문서

## MOC 공간

- 모든 MOC 정본: [[_MOC_HOME]]
- MOC 파일 물리 위치: `_MOC/`

## 에이전트 진입점

- [[.agent/AGENTS|.agent/AGENTS]] — 모든 AI 에이전트가 첫 번째로 읽는 문서
- [[.claude/CLAUDE|.claude/CLAUDE]] — Claude Code 전용 지시서
- [[.agent/system/README|.agent/system/README]] — 운영 시스템 정본 인덱스
- [[.agent/skills/obsidian-workspace/SKILL|obsidian-workspace skill]] — Obsidian vault 작업 기준
- [[_system/team-setup/team-computer-setup-guide|팀 컴퓨터 셋업 가이드]] — 팀원 환경 적용 가이드

## 패키지 기준선

- 패키지 스냅샷 기준일: `2026-04-13`
- 라이브 실동작 기준: [[05_제출/live-final-verification|live-final-verification]]
- 제출/포함 상태 기준: [[05_제출/submission-checklist|submission-checklist]]
- 공유 범위 기준: [[SHARE-PACKAGE]]
