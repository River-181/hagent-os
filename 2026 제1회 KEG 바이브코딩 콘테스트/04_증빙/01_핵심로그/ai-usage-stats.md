---
tags:
  - area/evidence
  - type/report
  - status/active
date: 2026-04-13
up: "[[_04_증빙_MOC]]"
aliases:
  - AI사용통계
---
# AI 사용 통계

> **자동 집계 명령어**: `python3 .agent/system/automation/scripts/collect-usage-stats.py`
> **외부 AI 집계 명령어**: `python3 .agent/system/automation/scripts/collect-external-usage-stats.py`
> **PM/Evidence Agent 매일 밤 루틴**: 이 파일을 스크립트 결과로 업데이트
> [[master-evidence-ledger]]와 세션 데이터에서 파생되는 집계본.
> AI 리포트 §통계 섹션의 소스.
> 마지막 업데이트: 2026-04-13 23:50 (OpenUsage 실측치 반영 — 2026-04-13 스크린샷 기준)
> **⚠ 주의**: Claude 토큰은 OpenUsage 스크린샷 실측값. Day 1~7 은 자체 추정, Day 8 은 OpenUsage 실측.

## 운영 원칙

- `Claude Code`는 local JSONL에서 exact token/cost를 자동 집계한다.
- `Codex`, `ChatGPT`, `Gemini`, `Perplexity`, `Grok`은 현재 이 workspace 기준으로 exact token export가 없으면 `external-ai-usage.csv`에 세션 단위 추정치를 기록한다.
- 따라서 이 문서의 수치는 `exact`와 `estimate`가 섞일 수 있으며, 리포트에는 그 차이를 명시한다.

---

## Claude Code 사용 통계 (자동 집계)

> 집계 시각: 2026-04-13 21:45 KST
> 모델: Claude Opus 4.6

### 토큰 사용량

| 항목        | 수치             |
| --------- | -------------- |
| 세션 수      | 4                |
| 어시스턴트 메시지 | 9,537            |
| 도구 호출     | 5,932            |
| 총 작업 시간   | 16171.6분         |
| 입력 토큰     | 169,732          |
| 캐시 생성 토큰  | 47,158,789       |
| 캐시 읽기 토큰  | 1,785,866,915    |
| 출력 토큰     | 7,719,399        |
| **총 토큰**  | **1,840,914,835** |

### 비용 분석 (Opus 4.6 가격 기준)

| 항목 | 비용 (USD) |
|------|-----------|
| 입력 ($15/M) | $2.55 |
| 캐시 생성 ($18.75/M) | $884.23 |
| 캐시 읽기 ($1.50/M) | $2678.80 |
| 출력 ($75/M) | $578.95 |
| **합계** | **$4144.53** |

### 효율 지표

| 지표 | 수치 | 의미 |
|------|------|------|
| 메시지당 평균 출력 | 809 tokens | 장문 산출물 비중 증가 |
| 메시지당 평균 비용 | $0.43 | 메시지 하나당 비용 |
| 캐시 히트율 | 3,773.3% | 캐시 재활용 극대화 |
| 분당 토큰 처리량 | 113,836 | 장시간 누적 세션 기준 처리량 |
| 시간당 비용 | $15.38 | 장시간 누적 세션 기준 |

---

## 외부 AI 사용 통계 (수동 기록)

> ChatGPT, Codex, Perplexity 등은 토큰 수를 직접 노출하지 않으므로 추정치 기록.

### ChatGPT Pro (GPT-5.4)

| 항목 | 수치 |
|------|------|
| 세션 수 | 1 |
| 프롬프트 수 | 4 (P-001 ~ P-004) |
| 주요 산출물 | 플레이북, 엑셀 트래커, 개요서 초안, 전략 분해 |
| 비용 | 정액제 (Pro $20/월) |
| 추정 토큰 | ~50,000 (입력+출력) |

### Codex (GPT-5.4)

| 항목 | 수치 |
|------|------|
| 세션 수 | 49 |
| 프롬프트 수 | 144 |
| 주요 산출물 | 워크스페이스 평가, 리서치 운영, 증빙/분석 정리, Telegram fallback, judge/public deploy split, Skills 디자인 pilot, AI 리포트 final markdown + docx(27개 이미지), Excalidraw 6종 PNG, Ralph 1차 A~E 병렬 + 2차 T-smoke/T-case/T-settings/T-seed-log/T-ui-polish/T-security + 3차 T-routine-fix/T-docx/T-png-export/T-security-recover/T-assistant-fix |
| 비용 | 정액제 |
| 추정 토큰 | 1,200,000 |

### Perplexity Pro

| 항목 | 수치 |
|------|------|
| 세션 수 | 1 |
| 비용 | 정액제 (Pro $20/월) |
| 추정 토큰 | 18,000 |

### Gemini

| 항목 | 수치 |
|------|------|
| 세션 수 | 0 |
| 비용 | 유료 플랜 또는 API 사용분 기준 별도 기록 |
| 추정 토큰 | 0 |

### Grok

| 항목 | 수치 |
|------|------|
| 세션 수 | 0 |
| 비용 | 무료 또는 플랜 기준 별도 기록 |
| 추정 토큰 | 0 |

---

## 전체 통합 요약

| AI 도구           | 토큰 (추정)         | 비용            | 세션    | 메시지     | 비중    |
| --------------- | --------------- | ------------- | ----- | ------- | ----- |
| Claude Max 5x (오케스트레이터+서브에이전트) | **331,000,000 (Day 8 실측)** / **1,300,000,000 (30일 누적 실측)** | **$168.46 Extra usage (Day 8)** / **$688.98 (30일)** | - | - | OpenUsage 2026-04-13 실측 |
| Codex GPT-5.4 | ~1,200,000 (Day 8 추정) | 정액 | 49 | 144 | Day 8 기준 |
| ChatGPT Pro GPT-5.4 | ~50,000 | 정액 | 1 | 4 | Day 1 초기 기획 |
| Perplexity Pro | ~18,000 | 정액 | 1 | 2 | Day 1 리서치 |
| **합계 (Day 8 기준)** | **Claude 331M (실측) + Codex ~1,200,000 (추정)** | **$168.46 Extra+정액** | **55+** | **150+** | **Day 8 기준 / Claude는 OpenUsage 실측** |

---

## 일별 추이

| 날짜    | Claude 토큰 (추정)  | Claude 비용 | Codex 토큰 (추정) | 외부AI 세션 | 총 메시지 | 주요 작업        |
| ----- | ---------- | --------- | ------- | ------- | ----- | ------------ |
| 04-06 | ~320,000 (누적 포함) | exact-in-jsonl | ~173,000 | 13 | 47 | 전체 워크스페이스 구축, Codex 운영 정본화, ChatGPT 전략 초안 |
| 04-07 | 0 | - | 0 | 0 | 0 | 작업 없음 (휴일) |
| 04-08 | 0 | - | ~72,000 | 6 | 8 | 리서치 운영 정렬, 태그 정규화, 대시보드 정렬 |
| 04-09 | 0 | - | ~33,000 | 3 | 3 | paperclip 코드 해체 분석, 운영 문서/메모리/통계 재동기화, hagent-os 제품 정본 학습 |
| 04-10 | ~85,000 | exact-in-jsonl | ~6,000 | 1 | 2 | 운영 갭 감사 + P0/P1 병렬 구현, 운영 문서 재동기화 |
| 04-11 | ~320,000 | exact-in-jsonl | 0 | 0 | 1 | HagentOS 독립 레포 E2E 완전 재구축 메가 세션 |
| 04-12 | **49,000,000** (OpenUsage 실측) | $25.92 | ~10,000 | 2 | 3 | Goals 재설계, UX polish, Day 7 동기화, Codex 증빙 세션 |
| 04-13 | **331,000,000** (OpenUsage 실측) | **$168.46 Extra** | ~1,200,000 | 28 | 100 | Ralph 3차(1차 A~E par + 2차 T-smoke/case/settings/seed/polish/security + 3차 routine/docx/png/security-recover/assistant), AI 리포트 docx 완성, 배포 완료 |
| **합계** | **~1,300,000,000 (30일 누적 실측)** / Day 1~7 자체 추정 포함 | **$688.98 (30일)** | **~1,494,000** | **53** | **164** | **Day 1~7 은 자체 추정, Day 8 은 OpenUsage 실측** |

---

## 리포트용 시각화 데이터

### 토큰 분포 (파이차트)
```
캐시 읽기: 97.0% (1,785,866,915)
캐시 생성: 2.56% (47,158,789)
출력: 0.42% (7,719,399)
입력: 0.01% (169,732)
```

### 비용 분포 (파이차트)
```
캐시 읽기: 64.6% ($2678.80)
캐시 생성: 21.3% ($884.23)
출력: 14.0% ($578.95)
입력: 0.1% ($2.55)
```

### 비용 절감 분석
```
캐시 없이 전량 입력 처리 시: (1,840.91M tokens) × $15/M = $27,613.72
실제 비용 (캐시 활용): $4,144.53
절감액: $23,469.19 (85.0% 절감)
```

---

> 자동 집계: `python3 .agent/system/automation/scripts/collect-usage-stats.py`
> 외부 AI 집계: `python3 .agent/system/automation/scripts/collect-external-usage-stats.py`
> 관련: [[ai-usage-log]], [[token-strategy]], [[tool-log]]
