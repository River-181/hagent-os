---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-13
up: "[[HagentOS]]"
---

# MVP Scope

> 7일 대회 MVP: Must / Should / Could / Not Now

> **원칙**: MVP는 빌드 우선순위이지, 인프라의 한계가 아니다. 아키텍처는 모든 영역으로 확장 가능하게 설계한다.
> Must = 반드시 빌드 · Should = 있으면 점수 상승 · Could = 시간 남으면 · Not Now = k-skill/MCP로 확장

> 구현 검증은 두 층으로 본다. 로컬 회귀 기록은 [[../10_execution/runtime-docs/handoff/2026-04-13-full-regression|2026-04-13 Full Regression]], 제출 직전 라이브 실동작 정본은 [[../../../05_제출/live-final-verification|live-final-verification]] 이다. 이 문서는 그 결과를 반영한 범위 정리다.

---

## Must (이것 없으면 MVP 아님)

| # | 기능 | 에이전트 | 레벨 | 근거 |
|---|------|---------|:----:|------|
| M1 | **기관 온보딩** | — | — | 진입점. Paperclip Company 생성에 대응 |
| M2 | **오케스트레이터** | Orchestrator | — | 한 줄 지시/이벤트를 case-run-approval 흐름으로 묶는 중심 축 |
| M3 | **Complaint Agent** | Complaint | 1 | 민원 분류+응답 초안. TALIS 56.9%, 28점 1순위 |
| M4 | **Retention Agent** | Retention | 0~1 | 이탈 징후 감지. bati.ai 월 300만원 |
| M5 | **승인 대시보드** | — | — | 결과물 카드+원클릭 승인. "챗봇 아님" 증명. 모바일 반응형 |
| M6 | **통합 스케줄러** | Scheduler | — | 강사/상담/법정기한 캘린더. 승인 결과로 일정 생성, Google Calendar sync path 포함 |
| M7 | **알림 시스템** | Notification | — | 민원 승인 대기, 스케줄 변경, 채널 발송 준비. 앱 내 알림 + Telegram/Kakao 경로 |
| M8 | **Mock 데이터 세트** | — | — | 민원 3~5건+학생 20명+강사 3명+스케줄 데이터 |

### 현재 shipped baseline

- **활성 팀**: `orchestrator`, `complaint`, `retention`, `scheduler`, `notification`
- **검증된 루프**: onboarding, quick-ask → case/run, approval → schedule side effect, documents/knowledge base, notifications dedupe, Telegram inbound/outbound
- **env 의존**:
  - Google Calendar 실제 sync는 `GOOGLE_CALENDAR_ACCESS_TOKEN` 필요
  - Kakao auto send는 `KAKAO_OUTBOUND_PROVIDER_URL` 필요
  - 법령 조회는 `LAW_OC` 없으면 degraded

### M1 기관 온보딩 MVP 범위

7일 안에 전체 온보딩 11항목을 다 구현하지 않는다. **MVP 최소 온보딩**:

| 필수 | 선택 |
|------|------|
| 기관명 | 운영 방식 |
| 기관 유형 (드롭다운) | AI 활용 수준 |
| 기관 규모 (드롭다운) | 사용 중 도구 |
| 현재 가장 중요한 목표 (복수 선택) | 운영 철학/톤 |

→ 이 4개로 **추천 에이전트 팀 제안** → 원장이 선택/수정 → Launch

---

## Should (있으면 더 좋지만 없어도 데모 됨)

| # | 기능 | 근거 |
|---|------|------|
| S1 | **Heartbeat 자동 브리핑** | 매일 오전 자동 실행. Paperclip 핵심 개념 |
| S2 | **에이전트 실행 상태 실시간 표시** | "AI 팀이 일하고 있다" 시각화 |
| S3 | **감사 로그 뷰** | 모든 AI 처리 내역 타임라인 |
| S4 | **민원 유형별 통계** | 데이터 자산화 가시화 |
| S5 | **k-skill 레지스트리 UI** | 스킬 카탈로그 탐색 + 에이전트에 장착. "왜 플랫폼인가" 답 |
| S6 | **실제 동작 스킬 5~8개** | 자체 빌드(`refund-calculator`, `complaint-classifier`) + 외부 MCP 연동 경로(✅ `korean-law-mcp`, ✅ Google Calendar MCP, ✅ `aligo-sms-mcp`) |
| S7 | **엑셀 import/export** | 기존 수강생·강사 데이터 즉시 활용 + 운영 데이터 내보내기 |
| S8 | **외부 MCP 라이브 연동** | `korean-law-mcp`로 학원법 실시간 조회 시연 — "생태계가 이미 있다" 증명 |

---

## Could (시간 남으면)

| # | 기능 | 근거 |
|---|------|------|
| C1 | **Intake Agent** (신규 상담) | 세 번째 에이전트 추가 → 데모 임팩트 |
| C2 | **모드 전환** (사교육↔공교육) | 확장성 데모. 디자인만이라도 |
| C3 | **에이전트 토큰 사용량 표시** | AI 활용 심사 점수 |
| C4 | **데이터 자산화 대시보드** | 케이스 누적 시각화 |

---

## Not Now → k-skill 생태계로 확장

> 아래 항목은 "버리는 것"이 아니라 **k-skill 스킬 패키지로 제공될 것**이다.
> 코어 에이전트만 빌드하고, 도메인 기능은 스킬로 장착하는 구조.

| 기능 | MVP 미포함 이유 | k-skill / MCP 확장 경로 | 실존 도구 |
|------|----------------|------------------------|:--------:|
| 출결·수납 자동화 | 클래스업/온하이 이미 커버 | `classup-sync` 연동 어댑터 | |
| 생기부 | LGU+/왓퀴즈 존재 | `school-record-draft` 스킬 | |
| 차량 관리 | IoT 필요 | `shuttle-bus-compliance` | ✅ `korean-law-mcp` |
| NEIS 연동 | 개인정보 규제 | `neis-data-bridge` (v2) | |
| 카카오 i / 공식 채널 직접 연동 | 대회 범위 초과 | `kakao-channel-adapter` | ✅ `kakao-bot-mcp-server` |
| SMS/알림톡 | 7일 내 구현 난이도 | `sms-notification` | ✅ `aligo-sms-mcp-server` |
| 결제·수납 | PG 연동 복잡도 | `payment-adapter` | ✅ `@portone/mcp-server` |
| 세무·환불 | 도메인 깊이 | `refund-calculator`, `tax-filing-prep` | |
| 법규 조회 | Should에서 시연 가능 | `k-education-law-lookup` | ✅ `korean-law-mcp` |
| 강사 관리 전체 | v2 | `k-labor-wage-api`, `instructor-performance` | |
| 시설·소방 | v2 | `fire-safety-checklist` | ✅ `korean-law-mcp` |
| 지역 분석 | v2 | `local-market-intel` | ✅ `py-mcp-naver` |
| 날씨·미세먼지 | 편의 기능 | `weather-alert` | ✅ Weather MCP + k-skill |
| 교육 공공데이터 | API 연동 | `k-edu-opendata-api` | ✅ data.go.kr |
| HWP 문서 처리 | 외부 도구 | `hwp-processor` | ✅ 오픈소스 존재 |
| 다지점 관리 | v2 | 멀티 org 확장 | |
| 강사·교사 모드 | v2 | 모드 전환 + 전용 에이전트 팩 | |

> **✅ 표시 = 이미 GitHub/NPM에 존재하는 MCP/도구**. 단, 대회 정본은 "연동 가능"과 "실제 env가 채워져 완전 동작"을 구분해 본다.

---

## 7일 타임라인 매핑

| 날짜 | Day | 작업 | 산출물 |
|------|-----|------|--------|
| 4/7(월) | D2 | 리서치 + 아이디어 확정 | 회의록, 리서치 결과 |
| 4/8(화) | D3 | 문제 정의 + 전략 문서 | decision-sprint, bet-memo |
| **4/9(수)** | **D4** | **기획 문서 완성 + spec** | **hagent-os/ 문서 세트** |
| **4/10(목)** | **D5** | **boilerplate + 핵심 개발 시작** | React+Vite+Express+embedded-postgres |
| **4/11(금)** | **D6** | **핵심 개발** | 오케스트레이터 + 4~5개 운영 에이전트 팀 |
| **4/12(토)** | **D7** | **핵심 개발 2 + 테스트** | 승인 대시보드 + 통합 + runtime docs |
| 4/13(일) | D8 | 테스트 + 배포 + 제출 | 최종 제출물 |

---

## 데모 크리티컬 패스 (2분)

### 4개 Demo Blocker

이것들이 완성되지 않으면 데모 불가:

| # | Blocker | 설명 |
|---|---------|------|
| B1 | **오케스트레이터 분배** | 한 줄 지시/이벤트가 case-run-approval 흐름으로 이어져야 함 |
| B2 | **Complaint Agent 출력** | 민원 분류+초안이 카드로 나와야 함 |
| B3 | **Retention Agent 출력** | 이탈 위험 학생 카드가 나와야 함 |
| B4 | **카드 UI + 승인 버튼** | 원클릭 승인이 동작해야 함 |

### 데모 시나리오

```
Step 0: 기관 온보딩 (30초)
  → 기관명: "탄자니아 영어학원"
  → 유형: 영어, 규모: 소규모
  → 목표: 민원 자동화 + 이탈 방지
  → 추천 팀: Orchestrator + Complaint + Retention + Scheduler + Notification
  → [이 추천으로 시작하기] 클릭

Step 1: 원장 한 줄 지시 (10초)
  "오늘 민원 처리하고 이번 주 이탈 위험 학생 알려줘"

Step 2: 에이전트 실행/위임 (20초)
  → Complaint Agent: 처리 중...
  → Retention Agent: 처리 중...
  → Scheduler/Notification 후속 준비
  → 실시간 상태 표시

Step 3: 결과 카드 표시 (30초)
  → 민원 3건 분류 + 응답 초안
  → 이탈 위험 학생 2명 + 근거

Step 4: 원장 승인 (20초)
  → 민원 초안 확인 → [전송] 클릭
  → 이탈 위험 → [상담 일정 생성] 클릭

Step 5: 스케줄러 (15초)
  → 통합 캘린더 뷰: 강사 시간표 + 상담 일정 + 법정 기한
  → 승인 후 상담 일정 [자동 생성]
  → Google Calendar 연동 경로 또는 pending_credentials 표시

Step 6: k-skill 레지스트리 (15초)
  → "이 에이전트들이 사용하는 스킬은 이런 것들입니다"
  → 스킬 카탈로그 UI: refund-calculator, k-education-law-lookup, schedule-optimizer...
  → "커뮤니티가 계속 추가합니다. korean-law-mcp, 공공데이터 API, HWP 처리..."

Step 7: 임팩트 (10초)
  "기존: 2시간 → HagentOS: 5분"
  "그리고 이건 시작일 뿐입니다 — 법무, 세무, 강사관리, 시설안전까지"

Step 8 (보너스): 모드 전환 (보여주기만)
  → "이 구조는 공교육 교사에게도 그대로 적용됩니다"
  → 교사 모드 대시보드 스크린샷
```

---

## Mock 데이터 세트

### 민원 데이터 (5건) — 탄자니아 영어학원

```json
[
  {
    "id": "C-001",
    "parent": "홍길동 어머니",
    "student": "홍길동 (중2)",
    "channel": "카카오톡",
    "timestamp": "2026-04-08 22:30",
    "content": "이번 주 영어 단어 시험 점수가 많이 떨어졌는데 보충수업은 없나요?",
    "type": "성적불만",
    "severity": "당일"
  },
  {
    "id": "C-002",
    "parent": "김서준 어머니",
    "student": "김서준 (중3)",
    "channel": "전화",
    "timestamp": "2026-04-08 21:15",
    "content": "아이가 반 친구와 다퉈서 학원에 가기 싫다고 합니다. 반 변경이 가능한가요?",
    "type": "행동지적",
    "severity": "즉시"
  },
  {
    "id": "C-003",
    "parent": "박민준 아버지",
    "student": "박민준 (고1)",
    "channel": "카카오톡",
    "timestamp": "2026-04-09 08:00",
    "content": "다음 달부터 고등부로 올라가는데 수강료 차액 환불이 가능한가요? 이번 달만 쉬려고요.",
    "type": "환불요청",
    "severity": "당일"
  },
  {
    "id": "C-004",
    "parent": "시스템",
    "student": "이수아 (중2)",
    "channel": "자동감지",
    "timestamp": "2026-04-09 07:00",
    "content": "이탈 위험 감지: 결석 4회, 지각 3회, 단어시험 성적 하락",
    "type": "이탈위험",
    "severity": "일반"
  },
  {
    "id": "C-005",
    "parent": "정토익 강사",
    "student": "-",
    "channel": "카카오톡",
    "timestamp": "2026-04-09 18:00",
    "content": "내일 성인반 수업 대체 강사가 필요합니다. 급한 개인 사정입니다.",
    "type": "강사대타",
    "severity": "당일"
  }
]
```

### 이탈 위험 학생 (2명)

```json
[
  {
    "student": "이수아 (중2)",
    "risk_score": 0.82,
    "signals": ["이번달 결석 4회", "지각 3회 연속", "단어시험 성적 하락"],
    "recommended_action": "학부모 상담 일정 즉시 잡기"
  },
  {
    "student": "박민준 (고1)",
    "risk_score": 0.65,
    "signals": ["환불 문의", "수업 참여도 저하"],
    "recommended_action": "담임 강사 면담 후 동기 부여"
  }
]
```
