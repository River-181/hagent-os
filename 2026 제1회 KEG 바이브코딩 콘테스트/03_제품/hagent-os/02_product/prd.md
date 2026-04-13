---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-13
up: "[[HagentOS]]"
---

# Product Requirements Document (PRD)

> HagentOS — 제품 전체 설명서 (비전 + 설계 정본)
>
> 현재 구현/검증 기준은 [[10_execution/runtime-docs/handoff/2026-04-13-full-regression|2026-04-13 Full Regression]]과 [[README]]를 함께 본다.

---

## 제품 개요

| 항목 | 내용 |
|------|------|
| **제품명** | HagentOS |
| **한 줄 설명** | Open-source AI case operations control plane for Korean education |
| **핵심 개념** | Paperclip의 "company as AI"를 한국 교육에 이식 — 챗봇이 아니라 AI 팀 |
| **MVP 사용자** | 학원 원장 (보습/IT 학원, 10~100명 규모) |
| **비전 사용자** | 사교육 운영자 + 공교육 교사 + 강사/교수자 |
| **핵심 가치** | 비교육 운영 업무를 케이스·승인 중심으로 줄이고, 운영 판단을 데이터 자산으로 남긴다 |

---

## 현재 구현 기준 (2026-04-13)

현재 프로그램은 아래를 기준으로 읽는 것이 맞다.

- **활성 데모 팀**: `orchestrator`, `complaint`, `retention`, `scheduler`, `notification`
- **검증된 핵심 루프**: onboarding, quick-ask → case/run, approval, document/knowledge base, schedule 생성, notifications dedupe, Telegram inbound/outbound
- **운영 화면**: dashboard, inbox, cases, approvals, students, schedules, documents, agents, settings, skills
- **외부 연동 상태**:
  - Google Calendar: schedule side effect는 생성되나 실제 sync는 `GOOGLE_CALENDAR_ACCESS_TOKEN` 필요
  - 법령 조회: `LAW_OC` 없으면 degraded
  - Kakao outbound auto send: `KAKAO_OUTBOUND_PROVIDER_URL` 필요
  - Telegram outbound: 조직 설정 또는 process env 기준으로 동작

---

## 제품 목표

### 이번 대회 (7일)
1. **오케스트레이션 + 케이스 운영** — 한 줄 지시 또는 inbound 이벤트 → case/run/approval로 추적
2. **민원·운영 문의 처리** — 학부모 민원/운영 질문 분류 + 응답 초안 + 문서 브리프 생성
3. **이탈·학생 운영 신호** — 출결/상담 기반 위험 신호를 케이스와 액션으로 연결
4. **승인 대시보드** — 결과물 카드 + 원클릭 승인 + activity/audit 기록
5. **스케줄·알림 후속 처리** — 승인 결과를 일정 생성과 채널 발송 경로로 연결
6. **k-skill 레지스트리** — 한국형 스킬 카탈로그 + agent mounted skills 시각화

### 비목표 (MVP에서 직접 빌드하지 않는 것)

> 아래 항목은 "안 하는 것"이 아니라 **k-skill 생태계로 확장되는 것**이다.
> 에이전트 코어를 먼저 만들고, 도메인 스킬로 붙여나가는 구조.

| 항목 | MVP에서 안 하는 이유 | k-skill 확장 경로 |
|------|----------------------|-------------------|
| 출결·수납 자동화 | 클래스업/온하이 이미 커버 | `classup-sync` 연동 어댑터 |
| 생기부 | LGU+/왓퀴즈 존재 | `school-record-draft` 스킬 |
| 차량 관리 | IoT 필요 | `shuttle-bus-compliance` + `shuttle-operations-log` |
| NEIS 연동 | 규제 | `neis-data-bridge` (v2) |
| 세무·환불 계산 | 도메인 복잡 | `tax-filing-prep`, `refund-calculator` 스킬 |
| 법규 조회 | 외부 MCP 연동 | `k-education-law-lookup` ([korean-law-mcp](https://github.com/pyhub-kr/korean-law-mcp)) |
| 엑셀 데이터 관리 | 코어 아님 | `excel-import-export` 스킬 |
| HWP 문서 처리 | 외부 도구 | `hwp-processor` 스킬 |
| 수강생 향 B2C 앱 | 운영자에 집중 | — |
| 학습 콘텐츠 추천 | 다른 팀이 잘 함 | — |

---

## 핵심 개념: Company → Agent → Task → Launch

> Paperclip 진입점 철학을 한국 교육에 맞게 변환

```
Paperclip:                     HagentOS:
─────────                      ─────────
1. Company 생성                 1. 기관 생성 (온보딩 진단)
2. Agent 정의 (역할+adapter)     2. 추천 에이전트 팀 제안 → 원장 선택
3. Task 부여                    3. 첫 업무 설정 (or heartbeat 자동)
4. Launch (→ Issue 생성)        4. 실행 → 승인 대시보드
```

**핵심 차이**: Paperclip은 개발자 도구. HagentOS는 **학원 원장이 쓰는 운영 OS**.
따라서 GitHub Issue가 아니라 **대시보드 카드 + 원클릭 승인**이 실행 인터페이스다.

---

## 기관 온보딩 흐름

### 단계 1: 기관 프로필 (필수 — 3분 이내)

| # | 항목 | 형태 | 목적 |
|---|------|------|------|
| 1 | **기관명** | 텍스트 | 조직 식별 |
| 2 | **기관 유형** | 선택 (입시/보습/어학/IT/예체능/성인/기타) | 추천 에이전트 조합 결정 |
| 3 | **주요 수강생** | 선택 (초/중/고/N수/대학/성인/직장인/혼합) | 커뮤니케이션 톤·우선순위 |
| 4 | **기관 규모** | 선택 (1인/소규모2-5/중간6-20/다지점) | 에이전트 수준 결정 |
| 5 | **현재 가장 중요한 운영 목표** | 복수 선택 | 추천 팀 구성의 핵심 기준 |
| 6 | **현재 가장 큰 문제** | 선택+자유입력 | 첫 해결 병목 탐지 |

### 단계 2: 운영 컨텍스트 (선택 — 있으면 추천 정확도 향상)

| # | 항목 | 형태 | 목적 |
|---|------|------|------|
| 7 | **운영 방식** | 선택 (원장 중심/분담/강사 자율/다지점/체계 없음) | 에이전트 중앙집중도 결정 |
| 8 | **AI 활용 수준** | 선택 (처음/ChatGPT정도/일부사용/활발/워크플로운영) | UX 난이도 조절 |
| 9 | **주요 업무 우선순위** | 복수 선택 (상담/수업/학생/학부모/강사/마케팅/행정/리포트) | 에이전트 정렬 순서 |
| 10 | **사용 중인 디지털 도구** | 복수 선택 (카카오/네이버/구글/CRM/LMS/노션/기타) | 연동 가능 워크플로 |
| 11 | **운영 철학/톤** | 선택 (성과중심/돌봄/프리미엄/대규모표준/친근/엄격) | 에이전트 말투·행동 강도 |

### 단계 3: 추천 AI 팀 제안

온보딩 정보를 바탕으로 시스템이 추천:

```
────────────────────────────────────────────────
  📋 당신의 기관 분석 결과

  기관 유형: IT 교육 학원 (성인 대상)
  현재 목표: 등록 전환 + 행정 자동화
  현재 문제: 상담은 많은데 등록이 안 됨

  🤖 추천 에이전트 팀:
  1. 원장 에이전트 (Orchestrator) — 지시 해석 + 다른 에이전트에 위임
  2. 민원 담당 (Complaint Agent) — 학부모/수강생 민원 처리
  3. 이탈 방어 (Retention Agent) — 출결/상담 기반 위험 신호 감지
  4. 스케줄러 (Scheduler Agent) — 일정 생성/변경 후속 처리
  5. 알림 담당 (Notification Agent) — 발송 준비/채널 전달

  ℹ️ 이 추천 이유:
  → 현재 병목이 상담 전환과 운영 분산에 있기 때문

  [ 이 추천으로 시작하기 ]    [ 내가 직접 팀 구성하기 ]
────────────────────────────────────────────────
```

**원칙**: 추천은 해주되, 원장이 자기 학원에 맞게 선택하게 한다.
학원마다 특성이 다르므로 **정답형 추천이 아니라 맞춤형 출발점**.

---

## HagentOS가 커버하는 학원 운영 전체 맵

> 아래는 HagentOS가 최종적으로 다룰 수 있는 **전체 업무 범위**다.
> ★ = MVP 데모에서 시연 가능 (외부 MCP/스킬 포함). **빌드 우선순위는 mvp-scope.md의 Must 목록이 정본.**
> 인프라는 모든 영역으로 확장 가능하게 설계하되, 7일 안에 빌드하는 것은 Must 항목뿐이다.

| 영역 | 업무 예시 | 담당 에이전트 | MVP | k-skill / MCP 예시 (✅=실존 도구) |
|------|-----------|-------------|:---:|-------------------------------|
| **학부모 커뮤니케이션** | 민원 분류·응답, 상담 기록 통합, 야간 접수, 카카오톡 자동 발송 | Complaint | ★ | `complaint-classifier`, `parent-sentiment-tracker`, ✅ `kakao-bot-mcp-server`, ✅ `aligo-sms-mcp-server` |
| **수강생 관리** | 이탈 감지, 출결 이상, 학생 프로필, 재등록 퍼널, 엑셀 가져오기 | Retention | ★ | `churn-signal-detector`, `student-360-view`, `excel-import-export` |
| **강사·인력 관리** | 스케줄 조정, 성과 분석, 최저임금 조회, 근로자성 판단, 채용 체크리스트 | Staff | ★ | `k-labor-wage-api`, `labor-classification-guide`, ✅ `korean-law-mcp` (근로기준법 조회) |
| **재무·회계** | 수납 추적, 환불 계산, 영수증 관리, 세무 신고, 급여 정산 | Finance | ★ | `refund-calculator`, `tax-filing-prep`, ✅ `@portone/mcp-server`, ✅ `@tosspayments/integration-guide-mcp` |
| **법무·규제** | 학원법 조회, 교육청 공문 요약, 소방 점검, 차량 규정, 개인정보 | Compliance | ★ | ✅ `korean-law-mcp` (학원법·시행령 체인 탐색), ✅ `south-korea-law-mcp` (개인정보보호법), `fire-safety-checklist` |
| **시설·안전** | 시설 점검, 차량 운행, 안전 사고 대응, 소방 | Facility | | `safety-incident-protocol`, ✅ `korean-law-mcp` (소방시설법·통학버스 규정) |
| **마케팅·모집** | 신규 문의 응대, 등록 전환, 지역 분석, 콘텐츠 초안 | Intake | ★ | `lead-conversion-tracker`, ✅ `py-mcp-naver` (지역 검색·경쟁 학원 분석) |
| **스케줄링** | 강사 시간표, 보강/대체, 차량 운행, 상담 일정, 원장 일정, 법정 기한 | Scheduler | ★ | ✅ Google Calendar MCP (다수 존재), `schedule-optimizer`, `substitute-matcher` |
| **알림·메시지** | 민원 알림, 스케줄 변경, 기한 알림, 보강 안내, 결석 알림 | Notification | ★ | ✅ `aligo-sms-mcp-server`, ✅ `kakao-bot-mcp-server`, `message-template-pack` |
| **수업·교육 품질** | 수업 요약, 학생 피드백, 문항 생성, 시험 일정 연동 | Teaching | | `quiz-generator`, `school-record-draft`, `exam-schedule-sync` (수능·자격증·어학 등 유형별), 수능/모의고사 일정 API (data.go.kr) |
| **데이터·리포팅** | 운영 대시보드, 주간 보고, 교육 통계, 벤치마크 | Analytics | ★ | `weekly-report-gen`, ✅ 공공데이터API (사교육 통계·학원 현황) |
| **외부 연동** | 구글 캘린더, 카카오톡, 네이버, 법률 MCP, 결제, 공공데이터 | Integration | ★ | ✅ Google Calendar MCP, ✅ `korean-law-mcp`, ✅ `py-mcp-naver`, ✅ `@portone/mcp-server`, ✅ HWP 처리 도구 |
| **생활 편의** | 주변 맛집·카페, 날씨·미세먼지, 교사 생일, 주차 정보 | Utility | | ✅ `py-mcp-naver` (맛집·주차), ✅ Weather MCP, ✅ k-skill (미세먼지·블루리본), ✅ Remindlo MCP |

> **현재 검증된 핵심은 학부모 커뮤니케이션, 수강생 관리, 스케줄링, 알림, 문서/지식베이스, 외부 채널 연동이다.** 나머지 영역은 데이터 모델과 k-skill/MCP 인터페이스 수준으로 준비되어 있으며, Must 빌드는 `mvp-scope.md`를 기준으로 본다.

---

## k-skill 아키텍처

### 스킬이란

k-skill은 에이전트가 장착하는 **한국 교육 도메인 특화 능력 패키지**다. 에이전트는 범용이지만, 스킬은 한국형 법규·문화·데이터를 담는다.

### 스킬 공급 구조

```
HagentOS k-skill Registry
    │
    ├── 1️⃣ 공식 스킬 (HagentOS 팀 빌드)
    │     환불계산, 민원분류, 이탈감지, 온보딩진단, 메시지 템플릿...
    │
    ├── 2️⃣ 외부 MCP 서버 연동 (이미 존재하는 오픈소스)
    │     ┌─ 법률: korean-law-mcp, south-korea-law-mcp
    │     ├─ 메시징: kakao-bot-mcp-server, aligo-sms-mcp-server
    │     ├─ 결제: @portone/mcp-server, @tosspayments/integration-guide-mcp
    │     ├─ 지도/검색: py-mcp-naver, naver-directions-mcp
    │     ├─ 캘린더: google-calendar-mcp (다수)
    │     ├─ 날씨: weather-mcp-server + k-skill 미세먼지
    │     └─ 공공데이터: data.go.kr (수능 일정, 학원 현황, 사교육 통계)
    │
    ├── 3️⃣ k-skill 생태계 (NomaDamas/k-skill)
    │     카카오톡, 미세먼지, 우편번호, 블루리본, KTX/SRT...
    │     → 학원 맥락으로 재포장하여 장착
    │
    └── 4️⃣ 커뮤니티 스킬 (원장·개발자 기여)
          학원별 커스텀 규칙, 도메인 팩...
    │
    ▼
HagentOS 스킬 레지스트리 UI
    → 검색 → 설치 → 에이전트에 장착 → 실행
```

### 실존하는 외부 MCP/도구 (R-010 조사 결과)

| 카테고리 | 도구 | GitHub/NPM | 상태 |
|----------|------|------------|:----:|
| 법령 검색 | `korean-law-mcp` | [pyhub-kr/korean-law-mcp](https://github.com/pyhub-kr/korean-law-mcp) | 활성 |
| 개인정보법 | `south-korea-law-mcp` | LightNow 등록 | 활성 |
| 카카오톡 | `kakao-bot-mcp-server` | [inspirit941/kakao-bot-mcp-server](https://github.com/inspirit941/kakao-bot-mcp-server) | PoC |
| SMS 발송 | `aligo-sms-mcp-server` | [hongsw/aligo-sms-mcp-server](https://github.com/hongsw/aligo-sms-mcp-server) | 활성 |
| 결제 (PG) | `@portone/mcp-server` | Portone 공식 | 활성 |
| 결제 가이드 | `@tosspayments/integration-guide-mcp` | NPM 공식 | 활성 |
| 네이버 검색 | `py-mcp-naver` | [pfldy2850/py-mcp-naver](https://github.com/pfldy2850/py-mcp-naver) | 활성 |
| 네이버 길찾기 | `naver-directions-mcp` | LobeHub 등록 | 활성 |
| 구글 캘린더 | `google-calendar-mcp` | 다수 (TypeScript/Python) | 활성 |
| 날씨 | `weather-mcp-server` | 다수 (OpenWeatherMap) | 활성 |
| 미세먼지 | k-skill 미세먼지 | [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) | 활성 |
| 생일 알림 | `@remindlo/mcp-server` | NPM | 활성 |
| 결제 (Bootpay) | Bootpay MCP | Conare 마켓플레이스 | 활성 |

### 에이전트별 스킬 장착 맵 (Paperclip 방식)

> Paperclip처럼 각 에이전트는 자기 역할에 맞는 스킬을 장착한다.

| 에이전트 | 장착 스킬 (공식 + 외부 MCP) |
|----------|---------------------------|
| **Complaint** | `complaint-classifier`, `parent-sentiment-tracker`, `message-template-pack`, ✅ `kakao-bot-mcp`, ✅ `aligo-sms-mcp` |
| **Retention** | `churn-signal-detector`, `student-360-view`, `excel-import-export` |
| **Staff** | `substitute-matcher`, `k-labor-wage-api`, `labor-classification-guide`, ✅ `korean-law-mcp` |
| **Finance** | `refund-calculator`, `tax-filing-prep`, `receipt-manager`, ✅ `@portone/mcp-server` |
| **Compliance** | ✅ `korean-law-mcp`, ✅ `south-korea-law-mcp`, `fire-safety-checklist` |
| **Scheduler** | `schedule-optimizer`, `exam-schedule-sync`, ✅ Google Calendar MCP, `substitute-matcher` |
| **Intake** | `lead-conversion-tracker`, ✅ `py-mcp-naver` (지역 분석), ✅ `aligo-sms-mcp` |
| **Notification** | ✅ `kakao-bot-mcp`, ✅ `aligo-sms-mcp`, ✅ Weather MCP, `message-template-pack` |
| **Analytics** | `weekly-report-gen`, ✅ 공공데이터API, `excel-import-export` |

### MVP에서 보여줄 것

1. **스킬 레지스트리 UI** — 사용 가능한 스킬 카탈로그 탐색 (공식 + 외부 MCP + k-skill)
2. **실제 동작 스킬** — 외부 MCP 연동 포함 5~8개 시연
3. **에이전트 + 스킬 조합** — "이 에이전트는 이 스킬들을 사용합니다" 시각화
4. **외부 MCP 연동 데모** — `korean-law-mcp`와 Google Calendar 연동 경로를 시연하되, env 미설정 시 degraded/fallback을 명시

---

## 핵심 기능

### F1: 오케스트레이터

| 항목 | 내용 |
|------|------|
| **역할** | 한 줄 지시 해석 → 관련 에이전트에 병렬 분배 |
| **트리거** | 사용자 지시 (텍스트) OR heartbeat (스케줄) |
| **입력** | 자연어 지시 + 기관 컨텍스트 + 에이전트 목록 |
| **출력** | 에이전트별 태스크 분배 + 실행 상태 추적 |
| **제로휴먼 레벨** | — (메타 에이전트) |

```
원장: "오늘 민원 처리하고 이번 주 이탈 위험 학생 알려줘"
  ↓
오케스트레이터:
  → Complaint Agent에 "민원 처리" 태스크 분배
  → Retention Agent에 "이탈 위험 감지" 태스크 분배
  → 병렬 실행 → 결과 대시보드에 카드로 표시
```

### F2: Complaint Agent (민원 처리)

| 항목 | 내용 |
|------|------|
| **역할** | 학부모 민원 분류 + 응답 초안 생성 |
| **트리거** | 새 민원 접수 OR 오케스트레이터 지시 |
| **입력** | 민원 원문 텍스트 + 학생/학부모 컨텍스트 |
| **출력** | 민원 유형, 긴급도, 응답 초안, 에스컬레이션 여부 |
| **제로휴먼 레벨** | Level 1 (초안 → 원클릭 승인) |

**민원 유형 분류**: 성적불만 / 행동지적 / 시설불만 / 환불요청 / 스케줄조정 / 기타
**긴급도**: 즉시 / 당일 / 주간

### F3: Retention Agent (이탈 감지)

| 항목 | 내용 |
|------|------|
| **역할** | 재원생 이탈 징후 감지 + 개입 권고 |
| **트리거** | heartbeat (매일) OR 오케스트레이터 지시 |
| **입력** | 출결 패턴 + 상담 이력 + 결제 상태 |
| **출력** | 위험 학생 목록 + 위험 요인 + 권고 액션 |
| **제로휴먼 레벨** | Level 0~1 (자동 감지 + 권고) |

### F4: 승인 대시보드

| 항목 | 내용 |
|------|------|
| **역할** | 에이전트 결과물을 카드로 표시 → 원클릭 승인/편집/반려 |
| **핵심 카드** | 민원 응답 초안 / 이탈 위험 알림 / 브리핑 요약 |
| **상태** | 승인 대기 / 승인됨 / 편집 후 발송 / 반려 |
| **감사 로그** | 모든 승인/편집/반려 자동 기록 |

### F5: Heartbeat (자동 실행)

| 항목 | 내용 |
|------|------|
| **역할** | 매일 스케줄에 따라 에이전트 자동 실행 |
| **Paperclip 대응** | heartbeat 기반 agent wake |
| **실행 주기** | 매일 오전 (설정 가능) |
| **결과** | 오늘의 브리핑 카드 생성 → 승인 대시보드에 표시 |

### F6: 통합 스케줄러

> 학원은 스케줄로 돌아가는 곳이다. AI 에이전트가 스케줄 맥락을 모르면 "운영 OS"가 아니라 "분석 도구"에 불과하다.

| 항목 | 내용 |
|------|------|
| **역할** | 학원 전체 스케줄을 하나의 뷰에서 관리 + 에이전트가 맥락으로 참조 |
| **핵심**: | 에이전트가 스케줄을 **알고 있다** — 민원 처리 시 강사 스케줄 참조, 상담 제안 시 빈 시간 탐색 |

| 스케줄 유형 | 예시 | 에이전트 활용 |
|-------------|------|-------------|
| **강사 시간표** | 월~금 수업 배정, 반별 강사 | 대체 강사 자동 매칭, workload 분석 |
| **보강/대체** | 강사 공결 → 대체 수업 | Staff Agent가 가용 강사 탐색 + 학부모 안내 |
| **차량 운행** | 출발·도착 시간, 루트, 탑승 학생 | Facility Agent가 지연·변경 시 학부모 알림 |
| **상담 일정** | 학부모 면담, 학생 상담, 등록 상담 | Retention/Intake Agent가 빈 시간에 자동 잡기 |
| **원장/실장 일정** | 원장 하루 전체 일정 | 오케스트레이터가 일정 충돌 방지 |
| **법정 기한** | 세무 신고, 소방 점검, 안전교육 | Compliance Agent가 D-day 알림 |
| **시설 예약** | 강의실, 체육관, 상담실 | 예약 충돌 방지 |

**외부 연동**: 일정 생성과 Google Calendar sync 경로는 구현되어 있고, 실제 캘린더 반영은 access token이 있을 때 활성
**k-skill**: `google-calendar-sync`, `schedule-optimizer`, `substitute-matcher`

### F7: 알림 시스템 (Notification)

| 항목 | 내용 |
|------|------|
| **역할** | 에이전트 결과물·긴급 상황·기한을 적시에 전달 |
| **채널** | 앱 내 알림 + Telegram/Kakao outbound path + grouped notifications |
| **모바일** | 원장은 모바일 브라우저에서 알림 확인, 승인/반려, 일정 확인이 가능해야 함 |

| 알림 유형 | 트리거 | 긴급도 |
|-----------|--------|:------:|
| 민원 승인 대기 | Complaint Agent 초안 완료 | 높음 |
| 이탈 위험 경고 | Retention Agent 감지 | 높음 |
| 스케줄 변경 | 강사 공결, 차량 지연 | 높음 |
| 법정 기한 D-7, D-1 | Compliance Agent | 중간 |
| 일일 브리핑 | Heartbeat 완료 | 낮음 |
| 주간 리포트 | Analytics Agent | 낮음 |

### F8: 메시지 템플릿 + 자동 발송

| 항목 | 내용 |
|------|------|
| **역할** | 반복되는 메시지를 템플릿화 + AI가 맥락에 맞게 커스터마이즈 |
| **예시** | 보강 안내, 휴강 공지, 상담 일정 안내, 환불 안내, 결석 알림 |
| **차별점** | 단순 템플릿이 아니라 에이전트가 학생·학부모 맥락에 맞게 **개인화** |
| **k-skill** | `message-template-pack`, `personalized-notification` |

### F9: 데이터 브릿지 (Import/Export)

| 항목 | 내용 |
|------|------|
| **역할** | 기존 학원 데이터를 즉시 활용 + 운영 데이터를 외부로 내보내기 |
| **Import** | 엑셀(.xlsx) — 수강생 목록, 강사 정보, 출결 기록, 상담 이력 |
| **Export** | 운영 리포트, 민원 통계, 재무 데이터를 엑셀/PDF로 내보내기 |
| **k-skill** | `excel-import-export`, `hwp-processor`, `pdf-report-gen` |

---

## 기술 아키텍처

### 전체 구조 (Paperclip 참고)

```
┌──────────────────────────────────────────────────┐
│  UI Layer (React 19 + Vite) — 반응형 (데스크톱 + 모바일) │
│  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐ │
│  │Onboarding│ │Dashboard│ │Approval│ │Schedule │ │
│  │          │ │+브리핑    │ │Cards   │ │Calendar │ │
│  └──────────┘ └─────────┘ └────────┘ └─────────┘ │
│  ┌──────────┐ ┌─────────┐ ┌────────────────────┐ │
│  │k-skill   │ │Search   │ │ Notification       │ │
│  │Registry  │ │+조회    │ │ Center              │ │
│  └──────────┘ └─────────┘ └────────────────────┘ │
├──────────────────────────────────────────────────┤
│  API Layer (Node.js + TypeScript)                │
│  ┌──────────────┐ ┌────────────────────────────┐ │
│  │ Orchestrator │ │ Agent Runtime              │ │
│  │ (Task Router)│ │ (Complaint, Retention ...) │ │
│  └──────────────┘ └────────────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Heartbeat │ │Scheduler │ │ Notification     │  │
│  │(auto-run)│ │(calendar)│ │ Engine           │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Audit Log │ │Data      │ │ k-skill          │  │
│  │(immutable│ │Bridge    │ │ Runtime          │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│  Data Layer                                      │
│  ┌──────────────┐ ┌────────────────────────────┐ │
│  │ PostgreSQL + │ │ Adapter Runtime            │ │
│  │ Drizzle ORM  │ │ (`codex_local` default,    │ │
│  │ (embedded/  │ │  OpenAI/Anthropic slot)    │ │
│  │  외부 PG)   │ │                            │ │
│  └──────────────┘ └────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  Integration Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Google    │ │korean-   │ │ 공공데이터API       │  │
│  │Calendar  │ │law-mcp   │ │ + HWP + Excel    │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 기술 스택

| Layer     | Tech                       | Rationale                 |
| --------- | -------------------------- | ------------------------- |
| Frontend  | React 19 + Vite + Tailwind | 승인 대시보드, 온보딩 UI (SPA)      |
| Router    | React Router v7            | 클라이언트 라우팅                   |
| Backend   | Express v5 (TypeScript ESM)| Paperclip 동일 스택, 에이전트 런타임 |
| AI        | Adapter-based LLM runtime (`codex_local` default) | 오케스트레이터 + 전문 에이전트         |
| DB        | PostgreSQL + Drizzle ORM   | embedded-postgres (로컬) / 외부 PG URL (배포) |
| Migrations| Drizzle Kit                | TypeScript 마이그레이션, 스키마 버저닝 |
| Scheduler | node-cron                  | heartbeat 자동 실행           |
| Auth      | local_trusted (MVP)        | 단일 원장, 인증 없이 시작           |

---

## 실행/인증 모드 (현재 기준)

대회 기준 운영 모드는 `local_trusted`가 기본이다. 즉, 심사/데모에서는 복잡한 계정 시스템보다 `기관 컨텍스트 + board UI + agent runtime`을 우선한다.

| 주체 | 방식 | 스코프 | 용도 |
|------|------|--------|------|
| **Board** (원장/운영자) | `local_trusted` 보드 접근 | 기관 전체 | 대시보드 UI, 승인, 설정 |
| **Agent Runtime** | adapter 설정 + 기관별 instruction/memory | 단일 에이전트 또는 케이스 | run 실행, approval 생성, 후속 처리 |
| **Channel** | webhook / outbound provider | 채널 단위 | Telegram/Kakao inbound/outbound |

**현재 shipped 기준**
1. 로컬/심사 환경은 `local_trusted`로 시작
2. agent는 조직의 adapter 설정과 mounted skills를 사용해 실행
3. 공개 배포에서 필요한 인증/초대 모델은 차기 배치의 확장 영역으로 둔다

**배포 모드**:
- `local_trusted`: localhost 바인딩, 로그인 불필요 (개발용)
- `authenticated`: 공개 배포용 후보 모드. 현재 문서상 설계만 존재하고 대회 정본은 `local_trusted`

---

## 데이터 모델 (핵심)

```
Organization (기관)
├── profile (유형, 규모, 목표, 톤...)
├── agents[] (활성화된 에이전트 목록)
├── skills[] (설치된 k-skill 목록)
├── members[] (원장, 실장, 강사...)
│
├── Students[]
│   ├── attendance[]
│   ├── consultations[]
│   └── payments[]
│
├── Parents[]
│   └── complaints[]
│
├── Instructors[]
│   ├── schedule[] (수업 시간표)
│   ├── performance[]
│   └── availability[] (가용 시간)
│
├── Schedule[] ← 통합 스케줄러
│   ├── type (수업/상담/차량/점검/법정기한/기타)
│   ├── participants[] (강사/학생/학부모)
│   ├── recurrence (반복 규칙)
│   ├── location (강의실/온라인)
│   └── external_sync (Google Calendar ID)
│
├── Cases[] (민원, 환불, 보강...)
│   ├── type, severity, status
│   ├── agent_draft
│   ├── approval_status
│   └── audit_log[]
│
├── Notifications[]
│   ├── type, channel, status
│   ├── recipient, message
│   └── sent_at
│
├── Templates[]
│   ├── type (민원응답/보강안내/휴강공지/결석알림...)
│   ├── content (변수 포함 텍스트)
│   └── personalization_rule
│
└── AgentRuns[]
    ├── agent_type, trigger
    ├── skills_used[]
    ├── input, output
    ├── tokens_used
    └── approval_result
```

---

## 제약 조건

| 제약 | 내용 |
|------|------|
| **시간** | 7일 (4/7~4/13), 실질 개발 3~4일 |
| **팀** | 2명 (이승보 + 김주용) + AI 에이전트 |
| **데이터** | Mock 데이터 (실제 학원 데이터 없음) |
| **외부 연동** | Google Calendar/Telegram/Kakao path는 존재하나 일부 env 의존 |
| **비용** | adapter별 토큰/비용 예산 관리 필요 |
| **심사 기준** | 기술적합성 30%, 창의성 25%, 완성도 20%, AI활용 15%, 팀워크 10% |

---

## 우선순위 결정 원칙

1. **데모 임팩트 우선**: 2분 데모에서 "와" 소리가 나는 기능 먼저
2. **병렬 실행 가시화**: 에이전트 3개가 동시에 돌아가는 장면이 핵심
3. **스케줄 = 운영 OS의 증명**: 통합 캘린더가 있어야 "이건 진짜 OS다" 인식
4. **승인 UX**: 카드 + 원클릭 승인 + 모바일 반응형 → 원장은 휴대폰으로 승인
5. **k-skill = 플랫폼의 증명**: 스킬 레지스트리가 있어야 "이건 앱이 아니라 플랫폼"
6. **사소한 것도 중요**: 설치 가이드, 모바일 접근 안내, 구글 캘린더 연동 가이드 → 진입 장벽 낮추기
7. **확장성 힌트**: 모드 전환(사교육↔공교육) + k-skill 확장을 데모 마지막에 삽입
8. **인프라 ≠ MVP**: 아키텍처는 14개 영역 전체를 수용하도록 설계. 7일 안에 빌드하는 것은 Must뿐이지만, 데이터 모델·에이전트 구조·k-skill 인터페이스는 확장을 막지 않는다

---

## 모바일 접근성

| 항목            | 내용                                       |
| ------------- | ---------------------------------------- |
| **대상**        | 원장은 컴퓨터 앞에 항상 있지 않다. 휴대폰이 주 기기           |
| **구현**        | React 19 + Vite 반응형 — 데스크톱과 모바일 동일 기능    |
| **핵심 모바일 기능** | 알림 확인, 승인/반려, 스케줄 확인, 민원 초안 검토           |
| **설치**        | PWA (Progressive Web App) — 홈 화면에 아이콘 추가 |
| **사용 가이드**    | 설치 및 사용 스킬을 제공하여 원장이 즉시 시작 가능            |
