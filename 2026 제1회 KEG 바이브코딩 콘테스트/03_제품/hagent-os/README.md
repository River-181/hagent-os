---
tags:
  - area/product
  - type/index
  - status/active
date: 2026-04-09
up: "[[_03_제품_MOC]]"
aliases:
  - HagentOS
  - hagent-os
---

# HagentOS

> **Open-source AI agent orchestration platform for Korean education**
> **This folder is the product-docs root inside the contest workspace package**

---

## What is HagentOS?

HagentOS는 한국 교육 기관의 운영자와 교사가 AI 에이전트 팀을 구성하여 비교육 업무를 위임하고, 교육 본업에 집중할 수 있게 하는 오픈소스 플랫폼이다.

챗봇이 아니다. **역할 기반 AI 에이전트들이 조직처럼 움직이며, 사람은 대시보드에서 승인만 한다.** 통합 스케줄러로 강사·상담·차량·법정기한을 한 눈에 보고, 모바일에서도 알림과 승인이 가능하다.

> "If OpenClaw is an employee, Paperclip is the company."
> — Paperclip

HagentOS는 이 철학을 한국 교육 운영 맥락으로 재해석한다.
핵심은 `chatbot`이 아니라 `운영 control plane`이다.

---

## About This Folder

이 폴더는 `03_제품/hagent-os/` 기준 제품 문서 정본이다.

- 문서 탐색 시작: [[INDEX]]
- 현재 상태 요약: [[PROGRESS]]
- 구현/검증 동기화 문서: [[11_execution/runtime-docs/README]]
- 최신 구현 source of truth: 별도 제품 저장소 `River-181/hagent-os`

---

## Target Users

| 사용자         | 역할             | 핵심 Pain                            |
| ----------- | -------------- | ---------------------------------- |
| **사교육 운영자** | 학원 원장/실장       | 민원·예외·이탈 관리에 하루 3시간, 월 300만원 기회비용  |
| **공교육 교사**  | 담임교사           | 행정 주 6-8시간(OECD 1위), 민원 스트레스 56.9% |
| **강사/교수자**  | 학원 강사, 학교 교과교사 | 교육 품질 향상에 집중하고 싶지만 운영 잡무에 묶임       |

**MVP (대회)**: 사교육 운영자(학원 원장) — 민원·예외 처리 OS

---

## Market

- 전국 학원 **94,485개** (2025, 매년 증가 추세)
- 초중고 교원 **506,100명** (2025)
- 사교육비 총액 **29.2조원** (2024)
- 한국 EdTech 시장 **USD 6.2B → 10.4B** (2024→2030, CAGR 9%)

---

## Core Architecture

```
사람 (원장 or 교사)
    │  한 줄 지시 또는 스케줄 트리거
    ▼
오케스트레이터 Agent  ←── 목표 + 컨텍스트 + 예산
    │
    ├──▶ Complaint Agent     (민원 분류 + 응답 초안)
    ├──▶ Retention Agent     (이탈 징후 감지)
    ├──▶ Intake Agent        (신규 상담 자동화)
    ├──▶ Staff Agent         (강사 관리·성과)
    ├──▶ Compliance Agent    (규제·공문 대응)
    ├──▶ Finance Agent       (환불·수납·세무)
    └──▶ ...domain packs
    │
    │  각 에이전트가 k-skill 장착
    ▼
┌──────────────────────────────────────────────────┐
│  k-skill Registry (한국 교육 특화 스킬)              │
│  ┌─ 공식: refund-calc │ complaint-clf │ churn-det │
│  ├─ 외부 MCP (✅ 실존):                            │
│  │   korean-law-mcp │ kakao-bot-mcp │ aligo-sms  │
│  │   @portone/mcp │ py-mcp-naver │ gcal-mcp      │
│  │   weather-mcp │ 공공데이터API │ hwp-processor    │
│  ├─ k-skill: 카카오톡 │ 미세먼지 │ 블루리본 │ 우편번호    │
│  └─ 커뮤니티: 학원별 커스텀 규칙, 도메인 팩               │
└──────────────────────────────────────────────────┘
    ▼
승인 대시보드  →  원클릭 승인 or 편집
    │
    ▼
감사 로거  →  모든 AI 처리 내역 자동 저장
    │
    ▼
데이터 자산  →  엑셀 import/export + 운영 리포트
```

---

## Directory Structure

```
hagent-os/
├── README.md            ← 제품 개요
├── INDEX.md             ← 폴더 기준 문서 인덱스
├── PROGRESS.md          ← 현재 상태 스냅샷
├── APP.md               ← 앱 구조/구현 메모
├── 00_vision/          ← 비전, 베팅, 성공 지표
├── 01_strategy/        ← 시장, 고객, 경쟁, GTM
├── 02_product/         ← PRD, MVP 범위, 페르소나, 저니
├── 03_domain/          ← 학원 운영 도메인 지식
├── 04_ai-agents/       ← 에이전트 설계 + 역할별 상세
├── 05_workflows/       ← 핵심 워크플로우
├── 06_policies/        ← 커뮤니케이션, 데이터, AI 안전
├── 07_integrations/    ← 외부 연동 (카카오, NEIS 등)
├── 08_data/            ← 도메인 모델, 리포팅 메트릭
├── 09_brand/           ← 브랜드 문서
├── 09_uxui/            ← IA, UX, 디자인 시스템
├── 11_execution/       ← 로드맵, 실행/검증 문서
├── 99_diagrams/        ← 공유용 구조/플로우 다이어그램
├── 99_templates/       ← 템플릿
├── _research/          ← Paperclip 분석, 경쟁사 리서치
└── k-edu-zero-human.md ← Zero Human 방향 메모
```

### 핵심 문서 바로가기

- [[INDEX]] — 폴더 기준 빠른 탐색
- [[PROGRESS]] — 현재 상태 스냅샷
- [[APP]] — 앱 구조/구현 메모
- [[00_vision/core-bet|Core Bet]] — 핵심 베팅과 차별점
- [[02_product/prd|PRD]] — 제품 전체 설명서 (단일 진실 원본)
- [[02_product/mvp-scope|MVP Scope]] — 7일 빌드 우선순위 (정본)
- [[01_strategy/market-and-customer|시장·고객]] — TAM/SAM/SOM + 고객 세그먼트
- [[11_execution/runtime-docs/README|Runtime Docs]] — 제품 저장소에서 동기화한 실행/검증 문서 묶음
- [[09_uxui/domain-ux-paperclip-gap|Domain UX Gap]] — Paperclip 대비 UX 차이
- [[99_diagrams/99_comprehensive-architecture|Comprehensive Architecture]] — 종합 구조도
- [[_research/paperclip-readme-agents-application|README/AGENTS 적용 전략]] — 참고 구조를 우리식 제출 구조로 바꾼 메모

## Current Snapshot

2026-04-13 기준 문서/검증 기준은 아래를 함께 본다.

- 제품 정본: [[02_product/prd]]
- 구현/회귀: [[11_execution/runtime-docs/handoff/2026-04-13-full-regression]]
- 제출 직전 라이브 검증: `05_제출/live-final-verification.md` in contest package

현재 검증된 핵심 루프:

- onboarding
- quick-ask -> case/run
- approval
- schedule side effect
- documents / knowledge base
- notifications dedupe
- Telegram inbound / outbound

현재 검증된 핵심 화면:

- dashboard
- inbox
- cases
- approvals
- students
- schedules
- documents
- agents
- settings
- skills

---

## Tech Stack

| Layer | Tech | Note |
|-------|------|------|
| Backend | Node.js + TypeScript | Paperclip 동일 스택, 에이전트 런타임 |
| AI | Claude API (Sonnet 4.6) | 오케스트레이터 + 전문 에이전트 |
| DB | PostgreSQL + Drizzle ORM | Docker (로컬) / 클라우드 PostgreSQL 호환 |
| Migrations | Drizzle Kit | TypeScript 기반 버저닝 |
| UI | React 19 + Vite + Tailwind | 승인 대시보드 (SPA) |
| Router | React Router v7 | 클라이언트 라우팅 |
| Scheduler | node-cron | heartbeat 자동 실행 |
| Auth | local_trusted (MVP) | 단일 원장, 인증 없이 시작 |

---

## Key References

- [Paperclip](https://github.com/paperclipai/paperclip) — control-plane 구조와 README/AGENTS 표현 참고 사례
- [k-skill](https://github.com/NomaDamas/k-skill) — Korean service skill packages
- OECD TALIS 2024 — 교사 행정업무·민원 스트레스 데이터
- bati.ai — 학원 운영 비용 분석

---

## License
