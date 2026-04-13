---
tags: [area/product, type/workflow, status/active]
date: 2026-04-09
up: "[[hagent-os/README]]"
---
# Workflow: 이탈 감지 & 개입 (Churn Detection & Intervention)

> 매일 heartbeat로 이탈 위험 학생을 감지하고 개입 조치까지의 흐름

---

## 트리거 & 주기

| 항목 | 값 |
|------|-----|
| **트리거 유형** | `cron` (heartbeat) — 매일 오전 08:00 자동 실행 |
| **보조 트리거** | `on_demand` — Orchestrator가 특정 학생 ID 또는 "전체 점검" 직접 호출 |
| **담당 에이전트** | `retention` (Paperclip 패턴으로 Orchestrator가 할당) |
| **선행 조건** | 출결/결제/상담/성적 DB 접근 가능, 재원생 1명 이상 |
| **장착 k-skill** | `churn-signal-detector`, `student-360-view`, `excel-import-export` |

---

## 전체 흐름도

```
[Cron: 매일 08:00]
  │
  ▼
Step 1: 데이터 수집 (4스트림 스냅샷)
  │
  ▼
Step 2: 위험 점수 산출 (0~100)
  │
  ├─ 9점 이하 ──→ 정상 (스킵)
  │
  ▼
Step 3: 위험도 분류 (High / Medium / Low)
  │
  ├─ 환불 문의 단건 ──→ 즉시 High 처리
  │
  ▼
Step 4: 대시보드에 위험 카드 표시
  │
  ▼
Step 5: 원장이 개입 권고 액션 선택
  │
  ▼
Step 6: 실행 (상담 예약 / 강사 면담 / 학부모 메시지)
  │
  ▼
Step 7: 후속 모니터링 (개입 후 2주 추적)
```

---

## 단계별 상세

### Step 1: 데이터 수집 (4스트림)

`student-360-view` k-skill로 전체 재원생의 스냅샷을 로드한다.

| 스트림 | 데이터 소스 | 수집 항목 |
|--------|------------|-----------|
| **출결** | attendance 테이블 | 연속 결석 횟수, 당월 결석률, 전월 대비 지각 변화 |
| **결제** | payment 테이블 | 당월 수납 상태, 납기 지연 일수, 환불 문의 이력 |
| **상담** | counseling 테이블 + complaint_log | 최근 상담 일자, 민원 분류 결과, 강사 교체 요구 이력 |
| **성적** | grade 테이블 | 최근 2회 시험 점수 변화율, 목표 점수 달성 여부 |

### Step 2: 위험 점수 산출 (0~100)

`churn-signal-detector` k-skill이 아래 가중치로 점수를 산출한다.

**출결 패턴**:
- 연속 결석 2회 이상 → +30점
- 당월 결석률 30% 초과 → +25점
- 전월 대비 지각 횟수 2배 이상 → +10점

**결제/수납 상태**:
- 당월 수납 미완료 (D+5 이상) → +20점
- 전월 납기 지연 이력 → +10점
- 환불 문의 접수 기록 → **+35점** (즉시 High)

**상담 이력 신호**:
- 최근 30일 상담 기록 없음 (평소 월 1회 이상 학생) → +15점
- 불만 민원 연동 (Complaint Agent 분류 결과) → +20점
- 강사 교체 요구 기록 → +15점

**성적 추이**:
- 최근 2회 시험 점수 하락 15% 이상 → +20점
- 목표 점수 미달 2회 연속 → +10점

> 복수 신호는 가중 합산. 단일 최대 이벤트(환불 문의 +35)는 즉시 High 분류.

### Step 3: 위험도 분류

| 등급 | 점수 | 의미 | 권고 응답 시간 |
|------|------|------|--------------|
| **High** | 60점 이상 | 2주 내 이탈 가능성 높음 | 당일 |
| **Medium** | 30~59점 | 징후 있음, 모니터링 필요 | 주 내 |
| **Low** | 10~29점 | 초기 신호, 주의 관찰 | 월 내 |
| 정상 | 9점 이하 | 이탈 신호 없음 | — (대시보드 미표시) |

### Step 4: 원장 대시보드에 위험 카드 표시

High/Medium/Low 학생별 카드 생성:

```
┌──────────────────────────────────────┐
│ 🔴 High (82점) — 김OO (중3 수학반)   │
│ 주요 요인: 연속 결석 3회, 수납 D+7   │
│ 권고: 학부모 전화 상담 + 수납 확인    │
│                                      │
│  [상담 예약]  [강사 면담]  [메시지]   │
└──────────────────────────────────────┘
```

- High: 대시보드 상단 고정 + 푸시 알림
- Medium: 대시보드 "주의" 섹션
- Low: 대시보드 "관찰" 섹션 (접기 가능)

**일일 브리핑 요약**: "High 3명, Medium 7명 감지. 주요 요인: 결석 누적(5명), 수납 지연(3명)."

### Step 5: 개입 권고 액션 선택 (원장)

원장이 카드에서 액션을 선택한다. **실행은 승인 후에만 진행** (Level 3).

| 액션 | 대상 등급 | 실행 주체 | 연계 에이전트 |
|------|-----------|-----------|-------------|
| 담임 강사 면담 요청 | Medium / High | 강사 | — (알림만) |
| 상담 예약 자동 생성 | Medium / High | 상담실장 | Scheduler Agent |
| 학부모 안내 메시지 초안 | High | 원장 승인 후 발송 | Notification Agent |
| 성적 리포트 긴급 발송 | High (성적 요인) | 원장 승인 | Report Agent |
| 수납 담당자 알림 | High (수납 요인) | 행정 직원 | — (알림만) |
| 재등록 혜택 안내 초안 | 전체 (재등록 시즌) | 원장 승인 후 발송 | Notification Agent |

### Step 6: 실행

원장 승인 후 Orchestrator가 해당 에이전트에 Paperclip 패턴으로 태스크 할당:

1. **상담 예약** → Scheduler Agent: 학부모-원장 상담 슬롯 생성 + 카카오 알림톡 발송
2. **강사 면담** → 강사에게 대시보드 알림 + 학생 상태 요약 카드 전달
3. **학부모 메시지** → Notification Agent: 초안 생성 → 원장 승인 → 카카오 발송

### Step 7: 후속 모니터링 (개입 후 2주 추적)

개입 실행된 학생은 `intervention_tracking` 상태로 전환:

- 매일 heartbeat에서 해당 학생의 위험 점수 변화 추적
- 2주 후 결과 판정:
  - 점수 하락 → **개입 성공** (카드 종결)
  - 점수 유지/상승 → **추가 개입 권고** 카드 재생성
  - 실제 이탈 발생 → **이탈 기록** + 원인 분석 로그 저장

---

## 즉시 High 처리 케이스

환불 문의 단건은 점수 계산을 건너뛰고 즉시 High로 처리한다.

```
Complaint Agent에서 type=complaint.refund 감지
  │
  ▼
Retention Agent에 이벤트 전달 (on_demand 트리거)
  │
  ▼
해당 학생 즉시 High 등급 부여 (+35점 기본)
  │
  ▼
원장 대시보드에 긴급 카드 표시 + 푸시 알림
```

---

## Retention → Scheduler 연계

상담 예약 액션 선택 시:

1. Retention Agent가 `{ studentId, parentId, reason, urgency }` 페이로드 생성
2. Orchestrator가 Scheduler Agent에 Paperclip 할당
3. Scheduler Agent: 원장/상담실장 빈 슬롯 조회 → 예약 생성 → 학부모에 알림톡 발송
4. 예약 완료 시 Retention Agent 카드에 "상담 예약 완료 (4/11 14:00)" 반영

---

## Retention → Notification 연계

학부모 안내 메시지 액션 선택 시:

1. Retention Agent가 학생 상태 요약 + 메시지 목적을 페이로드로 전달
2. Notification Agent가 학부모 톤에 맞는 메시지 초안 생성
3. 원장 승인 후 `kakao-bot-mcp`로 발송
4. 발송 결과를 Retention Agent 카드에 반영

> ==재등록 설득, 정서적 개입은 사람이 직접 수행. 에이전트는 판단 근거와 초안만 제공.==

---

## 실패 / 예외 처리

| 상황 | 처리 |
|------|------|
| 데이터 불완전 (출결 미입력 학원) | 사용 가능한 스트림만으로 점수 산출 + "데이터 부족" 경고 표시 |
| heartbeat 실행 실패 | Orchestrator가 10분 후 재시도 → 실패 시 원장에게 "오늘 이탈 감지 미실행" 알림 |
| Scheduler Agent 슬롯 없음 | "빈 슬롯 없음" 카드 표시 → 원장이 수동 일정 조율 |
| 원장 7일 미응답 (High 카드) | 부원장/실장에게 에스컬레이션 알림 |
| 오탐 피드백 (원장이 "이 학생은 괜찮음" 표시) | 해당 학생 30일간 감지 임계값 상향 (+20점 버퍼). 모델 학습 데이터로 수집 |

---

## 관련 데이터

### churn_risk 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| `risk_id` | UUID | 위험 기록 ID |
| `org_id` | UUID | 학원 ID |
| `student_id` | UUID | 학생 ID |
| `run_date` | date | heartbeat 실행일 |
| `score` | int | 위험 점수 (0~100) |
| `grade` | enum | high / medium / low / normal |
| `factors` | jsonb | 위험 요인 배열 `[{ signal, points, detail }]` |
| `recommended_actions` | jsonb | 권고 액션 배열 |
| `intervention_status` | enum | pending / approved / executed / tracking / closed |
| `approved_action` | text | 원장이 선택한 액션 |
| `approved_at` | timestamp | 승인 시각 |
| `tracking_end` | date | 후속 모니터링 종료일 (승인+14일) |
| `outcome` | enum | improved / unchanged / churned / null |

---

## 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 2주 전 감지율 | 이탈 학생 중 **70% 이상**을 이탈 14일 전에 High/Medium 탐지 | 실제 이탈 날짜 역산 비교 |
| 개입 후 잔류율 | High 개입 승인 건 중 **60% 이상** 다음 달 재등록 | 재등록 DB 추적 |
| 오탐률 (False Positive) | High 분류 중 실제 이탈 아닌 비율 **30% 이하** | 월말 결과 리뷰 |
| 카드 응답 시간 | High 카드 생성 후 원장 확인까지 평균 **4시간 이내** | 대시보드 로그 |
| heartbeat 안정성 | 월간 실행 성공률 **99% 이상** | cron 실행 로그 |

---

*연관: [[retention]] (에이전트 역할), [[complaint]] (민원 → 위험 점수 연동), [[scheduler]] (상담 예약), [[analytics]] (리포팅), [[communication-model]] (도메인)*
