---
tags:
  - area/product
  - type/context-brief
  - status/active
date: 2026-04-09
up: "[[_03_제품_MOC]]"
aliases:
  - HagentOS-Master-Brief
  - 마스터컨텍스트브리프
related:
  - "[[03_제품/hagent-os/README]]"
  - "[[03_제품/hagent-os/02_product/prd]]"
  - "[[03_제품/hagent-os/04_ai-agents/agent-design]]"
  - "[[03_제품/hagent-os/10_execution/roadmap]]"
---
# HagentOS 마스터 컨텍스트 브리프

> **이 문서는 HagentOS 프로젝트에 처음 합류하는 AI 에이전트 또는 사람이 읽는 단일 맥락 문서다.**
> 5분 안에 프로젝트 전체를 파악하고, 바로 기여할 수 있도록 설계했다.

---

## TL;DR (30초 요약)

- **무엇**: HagentOS — 한국 학원(사교육)의 비교육 업무를 AI 에이전트 팀이 대신 처리하는 오픈소스 플랫폼
- **왜**: 학원 원장은 하루 3시간(월 300만원)을 민원/이탈/강사 관리에 쓴다. 출결/수납은 자동화됐지만 예외 처리는 100% 수동
- **어떻게**: Orchestrator가 전문 에이전트(민원, 이탈, 스케줄 등)를 조율하고, 원장은 대시보드에서 승인만 한다
- **현재**: 기획 문서 57개 완성 (v0.1.2-brand), 코드 개발 D5(4/10)부터 시작
- **다음**: D5-D8(4/10-4/13) 4일 스프린트로 MVP 빌드 → 대회 제출

---

## 우리가 만드는 것

**HagentOS는 챗봇이 아니다. 학원을 운영하는 AI 조직이다.**

Paperclip("If OpenClaw is an employee, Paperclip is the company")의 'company as AI' 개념을 한국 교육에 이식한다. 기존 에듀테크가 개별 도구(출결 앱, 수납 앱)를 제공한다면, HagentOS는 교육 기관 전체를 운영하는 AI 팀을 제공한다.

```
기존:   출결 앱 + 수납 앱 + 카카오톡 + 엑셀 + 구글 캘린더 (분절, 수동)
HagentOS: 오케스트레이터 → [민원팀] [이탈방어팀] [스케줄러] [강사관리팀]
```

**태그라인**: "학원의 AI 팀을 고용하세요. 원장님은 승인만 하면 됩니다."

---

## 왜 만드는가 (Pain)

### 사교육 운영자 (학원 원장) — MVP 타겟

- 하루 **3시간** 행정 = **월 300만원** 기회비용 (bati.ai)
- 업무의 **70%가 비정형 예외 처리**: 심야 민원, 보강, 환불, 강사 대타
- 출결/수납은 자동화됐지만 **민원/이탈/강사 관리는 100% 수동**
- 학령인구 **500만 붕괴**(2026) → 학원 생존 경쟁 극심화

### 시장 규모

- 전국 학원 **94,485개** (2025)
- 사교육비 총액 **29.2조원** (2024)
- 한국 EdTech 시장 **USD 6.2B → 10.4B** (2024-2030, CAGR 9%)

### 공교육 교사 (Phase 2 타겟)

- 주당 행정 **6-8시간** = **OECD 1위** (TALIS 2024)
- 학부모 민원 스트레스 **56.9%** (세계 2위), 악성 민원 경험 **46.8%**
- 생기부 주당 **5-8시간**, 정서적 소진 **68%** (OECD 최상위)

---

## 어떻게 작동하는가 (Architecture)

### 시스템 전체 구조

```
사람 (원장)
    │  한 줄 지시 또는 스케줄 트리거
    ▼
Orchestrator Agent  ←── 목표 + 컨텍스트 + 예산
    │
    ├──▶ Complaint Agent     (민원 분류 + 응답 초안)
    ├──▶ Retention Agent     (이탈 징후 감지)
    ├──▶ Scheduler Agent     (일정 관리)
    ├──▶ Intake Agent        (신규 상담)
    ├──▶ Staff Agent         (강사 관리)
    ├──▶ Finance Agent       (환불/수납)
    ├──▶ Compliance Agent    (규제/공문)
    ├──▶ Notification Agent  (알림 발송)
    └──▶ Analytics Agent     (운영 분석)
    │
    ▼
승인 대시보드 (Paperclip 4-zone Board UI)
    → 원장이 원클릭 승인 or 편집 후 발송
    │
    ▼
감사 로거 → 모든 AI 처리 내역 자동 저장
```

### 인증 구조 (local_trusted)

- **MVP**: local_trusted 모드 — 인증 없이 단일 원장 세션 고정
- **Agent JWT**: 에이전트 간 통신용 토큰 (내부 API 보안, 추후)

### 제로 휴먼 레벨 (케이스별 결정)

| Level | 인간 개입 | 예시 |
|:-----:|:---------:|------|
| **0** | ~0% | 일일 브리핑 자동 생성, 출결 집계 |
| **1** | ~10% | 민원 응답 초안 → 원클릭 승인 |
| **2** | ~30% | 복잡한 민원 → 편집 후 발송 |
| **3** | ~50% | 이탈 위험 학생 → 원장이 개입 여부 결정 |
| **4** | ~90% | 법적/감성 판단 → AI는 정보 제공만 |

**MVP 목표**: Level 0-1 완전 구현

---

## 무엇을 만들었는가 (Current State)

### 완료된 것: 기획 문서 57개

```
hagent-os/
├── 00_vision/       ← core-bet, success-metrics
├── 01_strategy/     ← 시장/고객/경쟁/GTM
├── 02_product/      ← PRD(정본), MVP 범위, 페르소나, 저니
├── 03_domain/       ← 학원 운영 도메인 지식
├── 04_ai-agents/    ← 에이전트 설계 + 역할별 상세
├── 05_workflows/    ← 핵심 워크플로우
├── 06_policies/     ← 커뮤니케이션/데이터/AI 안전 정책
├── 07_integrations/ ← 외부 연동 (카카오, NEIS 등)
├── 08_data/         ← 도메인 모델, 리포팅 메트릭
├── 09_ux/           ← IA, UX 컨셉
├── 10_execution/    ← 로드맵, 미해결 질문
└── brand/           ← 로고, 디자인 시스템
```

### 릴리스 히스토리

| 태그 | 내용 |
|------|------|
| v0.1.0-planning | 기획 문서 세트 완성 |
| v0.1.1-design | 디자인 시스템 + UI 참조 |
| v0.1.2-brand | 브랜드 에셋 + Toss 스타일 UI |

### 코드: 아직 없음

D5(4/10)부터 개발 시작. `03_제품/app/` 디렉토리에 생성 예정.

---

## 무엇을 만들어야 하는가 (MVP Build, D5-D8)

### 일별 목표

| Day | 날짜 | 목표 | 담당 |
|-----|------|------|------|
| **D5** | 4/10 목 | 스켈레톤 & 인프라 — Vite + React 19 + Express v5 + embedded-postgres + Drizzle + Mock 데이터 | 승(에이전트)+용(인프라) |
| **D6** | 4/11 금 | 에이전트 코어 — Orchestrator + Complaint Agent + Retention Agent | 승(에이전트)+용(API) |
| **D7** | 4/12 토 | Approval Dashboard UI + Heartbeat cron + 온보딩 | 용(UI)+승(cron) |
| **D8** | 4/13 일 | 데모 테스트 + 자체 검수 + 최종 배포 제출 | 승+용 |

### Must-have (대회 제출 필수)

- Orchestrator Agent (task routing)
- Complaint Agent (민원 분류 + 초안 응답)
- Retention Agent (이탈 신호 감지)
- Approval Dashboard (승인/편집/반려 원클릭)
- Heartbeat cron (매일 07:00 자동 실행)

### Should-have (시간 허용 시)

- Scheduler UI (캘린더 뷰, 에이전트 로직 없이 UI만)
- k-skill 레지스트리 UI (기본 에이전트 목록)
- Google Calendar 단방향 동기화 (읽기 전용)

---

## 기술 스택 (확정)

| Layer | Tech | 비고                          |
| --------- | ----------------------------------------------------- | --------------------------- |
| Frontend | React 19 + Vite + React Router v7 + Tailwind CSS | 4존 레이아웃, SPA               |
| Backend | Express v5 + TypeScript (ESM) | 에이전트 런타임 포함               |
| DB | PostgreSQL + Drizzle ORM | embedded-postgres(로컬) / 외부 PG URL(클라우드) |
| AI | Claude API (Sonnet 4.6) | Orchestrator + 전문 에이전트      |
| Auth | local_trusted (인증 없음) | MVP: 단일 원장, 세션 고정           |
| Scheduler | node-cron | heartbeat 방식 자동 실행          |
| Deploy | GitHub 오픈소스 설치형 + 별도 랜딩 페이지 | Paperclip 배포 모델             |
| Design | "Toss Product Sans" / "Noto Sans KR", Lucide icons | 모바일 반응형                     |

---

## 에이전트 팀 구조

```
원장 (Board — 사람)
    │ 전략 승인 / 예산 설정 / 에이전트 고용
    ▼
Orchestrator (CEO Agent)     ← Must
    │
    ├── Complaint Agent      ← Must  : 민원 분류 + 응답 초안
    ├── Retention Agent      ← Must  : 이탈 징후 감지 + 상담 권고
    ├── Scheduler Agent      ← Must  : 일정 관리 + 자동 알림
    │
    ├── Intake Agent         ← Should: 신규 문의 → 레벨 진단 → 반배정
    ├── Staff Agent          ← Should: 강사 스케줄 + 성과 + 번아웃 감지
    ├── Finance Agent        ← Should: 수납 현황 + 환불 계산 + 수익 예측
    ├── Compliance Agent     ← Should: 교육청 공문 요약 + 체크리스트
    ├── Notification Agent   ← Should: 알림 발송 채널 관리
    └── Analytics Agent      ← Should: 운영 리포트 + KPI 대시보드
```

각 에이전트는 Claude Sonnet 4.6로 구동되며, k-skill을 장착해 한국 교육 도메인 특화 기능을 수행한다.

---

## k-skill 생태계

HagentOS의 4번째 핵심 차별점. 에이전트가 한국 서비스 생태계를 직접 활용하도록 스킬을 모듈화한다.

### 구조

```
에이전트 + k-skill = 한국 교육 특화 AI 직원

예: Complaint Agent + complaint-draft 스킬
    → 민원 분류 프롬프트 + 학부모 톤 응답 생성 + 에스컬레이션 판단
```

### 실존하는 외부 MCP/스킬 (연동 예정)

| MCP/스킬 | 용도 |
|----------|------|
| `korean-law-mcp` | 한국 법률 검색 (학원법, 환불 규정) |
| `@solapi/mcp-server` | SMS/알림톡 발송 |
| `@portone/mcp` | 결제/수납 연동 |
| `py-mcp-naver` | 네이버 검색 API |
| `gcal-mcp` | Google Calendar 동기화 |
| `hwp-processor` | 한글 문서 처리 |

---

## 네가 이 프로젝트에서 해줘야 할 것

### 개발자로 합류한다면

1. `03_제품/hagent-os/README.md` — 프로젝트 개요 + 디렉토리 구조
2. `03_제품/hagent-os/10_execution/open-questions.md` — 미결 이슈 확인
3. `03_제품/hagent-os/10_execution/roadmap.md` — 일별 태스크 확인
4. `03_제품/hagent-os/02_product/prd.md` — 제품 상세 요구사항 (정본)

### 리뷰어/검증자로 합류한다면

1. `03_제품/hagent-os/10_execution/open-questions.md` — 미결 질문
2. `03_제품/hagent-os/_research/` — Paperclip 분석, 경쟁사 리서치

### 디자이너로 합류한다면

1. `03_제품/hagent-os/design.md` — 디자인 시스템 (색상/타이포/컴포넌트)
2. `03_제품/hagent-os/09_ux/` — IA, UX 컨셉

### AI 활용 보고서를 작성한다면

1. `04_증빙/` 폴더 전체 — 세션 로그, 프롬프트 카탈로그, 사용 통계
2. `04_증빙/01_핵심로그/master-evidence-ledger.md` — 증빙 정본

---

## 결정된 것 vs 미결인 것

### 확정 (변경 불가)

| 항목        | 결정 내용                                                               |
| --------- | ------------------------------------------------------------------- |
| 제품명       | HagentOS                                                            |
| MVP 타겟    | 학원 원장 (사교육)                                                         |
| 기술 스택     | React 19 + Vite + Express v5 + PostgreSQL + Drizzle + Claude API + node-cron |
| 디자인       | Toss 스타일, primary teal `#0ea5b0`, shadcn/ui                         |
| Must 에이전트 | Orchestrator, Complaint, Retention, Scheduler                       |
| 인증        | local_trusted (인증 없음, 단일 원장 세션 고정)                                  |
| 배포        | GitHub 오픈소스 설치형 + 별도 랜딩 페이지                                        |
| 제출 마감     | 2026-04-13 24:00 (D-4)                                              |

### 미결 (D5 이후 결정)

| 항목 | 상태 | 결정 시점 |
|------|------|-----------|
| 스프린트 범위 축소 여부 | 민원 단일 흐름 먼저 완성 권고됨 | D5 |
| Approval-Case-AgentRun FK 방향 | Option A 권장 (Case 선생성) | D5 저녁 |
| Claude API 병렬 비용 실측 | 미측정 | D6 |
| Google Calendar OAuth | 로컬 테스트만, 도메인 검증 생략 | D7 |
| 오픈소스 라이선스 | Apache 2.0 / MIT / GPL 미결 | 대회 후 |

---

## 핵심 파일 색인

| 파일 | 설명 |
|------|------|
| `03_제품/hagent-os/README.md` | 프로젝트 개요 + 기술 스택 + 디렉토리 구조 |
| `03_제품/hagent-os/00_vision/core-bet.md` | 핵심 베팅 — 왜 이걸 만드는가 |
| `03_제품/hagent-os/02_product/prd.md` | 제품 요구사항 정본 (단일 진실 원본) |
| `03_제품/hagent-os/02_product/mvp-scope.md` | 7일 MVP 범위 + 우선순위 |
| `03_제품/hagent-os/04_ai-agents/agent-design.md` | 에이전트 설계 + 제로휴먼 레벨 정본 |
| `03_제품/hagent-os/10_execution/roadmap.md` | D5-D8 일별 태스크 + Phase 1-3 로드맵 |
| `03_제품/hagent-os/10_execution/open-questions.md` | 미결 이슈 15개 + 우선순위 매트릭스 |
| `03_제품/hagent-os/design.md` | 디자인 시스템 (Toss 스타일, 색상/타이포/컴포넌트) |
| `03_제품/hagent-os/01_strategy/market-and-customer.md` | TAM/SAM/SOM + 고객 세그먼트 |
| `03_제품/k-edu-zero-human.md` | **이 문서** — 마스터 컨텍스트 브리프 |

---

## 팀

| 이름 | 역할 | 담당 |
|------|------|------|
| 이승보(승) | CEO, AI 설계 | 에이전트/오케스트레이터 설계 및 구현, Claude API, 대회 전략 |
| 김주용(용) | COO, 프론트엔드 | UI/프론트엔드, 인프라/배포, DB 스키마, 유저 플로우 |
| AI 에이전트 | 코드 생성, 문서화, 테스트 | Claude, GPT, Codex, Perplexity 등 멀티 에이전트 협업 |

**대회**: 2026 제1회 KEG 바이브코딩 콘테스트 (500팀 경쟁, 4/13 마감)
