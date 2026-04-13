---
tags:
  - area/moc
  - type/moc
  - status/active
date: 2026-04-13
up: "[[_MOC_HOME]]"
aliases:
  - 증빙
---
# 04 증빙

> AI 사용 기록, 결정 로그, 일일 기록, 미팅 노트를 모아 두는 증빙 허브.

## 먼저 볼 문서

- [[04_증빙/01_핵심로그/master-evidence-ledger|master-evidence-ledger]] — 직접 입력하는 단일 증빙 원장
- [[04_증빙/01_핵심로그/decision-log|decision-log]] — 중요한 결정만 추린 로그
- [[04_증빙/01_핵심로그/prompt-catalog|prompt-catalog]] — 재사용 가치가 있는 프롬프트 정리
- [[04_증빙/01_핵심로그/tool-log|tool-log]] — 사용 도구와 운영 원칙
- [[03_제품/hagent-os/11_execution/runtime-docs/handoff/2026-04-13-full-regression|2026-04-13-full-regression]] — 최신 회귀 검증 정본

## 핵심 로그

- [[04_증빙/01_핵심로그/master-evidence-ledger|master-evidence-ledger]]
- [[04_증빙/01_핵심로그/session-intake-dispatch-report|session-intake-dispatch-report]]
- [[04_증빙/01_핵심로그/ai-usage-log|ai-usage-log]]
- [[04_증빙/01_핵심로그/session-log|session-log]]
- [[04_증빙/01_핵심로그/evolution-log|evolution-log]]

## 분석 자료

- `04_증빙/02_분석자료/` — 라이브 스모크 테스트, 토큰 전략, 보안/구조 점검 메모

## Daily

- [[04_증빙/03_daily/2026-04-06|2026-04-06]]
- [[04_증빙/03_daily/2026-04-07|2026-04-07]]
- [[04_증빙/03_daily/2026-04-08|2026-04-08]]
- [[04_증빙/03_daily/2026-04-09|2026-04-09]]
- [[04_증빙/03_daily/2026-04-10|2026-04-10]]
- [[04_증빙/03_daily/2026-04-11|2026-04-11]]
- [[04_증빙/03_daily/2026-04-12|2026-04-12]]
- [[04_증빙/03_daily/2026-04-13|2026-04-13]]

## Meetings

- [[04_증빙/04_meetings/2026-04-07_1차-아이디어-미팅|1차 아이디어 미팅]]
- [[04_증빙/04_meetings/2026-04-08_2차-아이디어-문제정의-확정-미팅|2차 문제정의 확정 미팅]]
- [[04_증빙/04_meetings/2026-04-12_3차-배포전-점검-미팅|3차 배포 전 점검 미팅]]
- [[04_증빙/04_meetings/2026-04-13_제출-패키징-정합화-미팅|제출 패키징 정합화 미팅]]

## 운영 원칙

- 직접 입력은 `ai-session-intake.csv` → `dispatch-session-intake.py` → `master-evidence-ledger.md` 흐름을 기본값으로 둔다.
- 세션 종료 후 별도 승격이 필요하면 `decision-log`, `prompt-catalog`만 추가로 갱신한다.
- 제출 직전 기준 검증은 제품 회귀 문서와 이 섹션 로그를 함께 본다.

## 연결

- [[_03_제품_MOC|03 제품]] — 구현/회귀 정본
- [[_05_제출_MOC|05 제출]] — 증빙이 실제 제출물로 이어지는 구간
- [[01_대회정보/team_profiles|team_profiles]] — 팀 정보 참조
