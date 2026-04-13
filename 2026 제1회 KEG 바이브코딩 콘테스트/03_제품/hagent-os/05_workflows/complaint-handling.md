---
tags: [area/product, type/workflow, status/active]
date: 2026-04-09
up: "[[hagent-os/README]]"
---
# Workflow: 민원 처리 (Complaint Handling)

> 학부모/수강생 민원이 접수되어 처리 완료까지의 전체 흐름

---

## 트리거 & 선행 조건

| 항목 | 값 |
|------|-----|
| **트리거 유형** | `on_demand` — 민원 접수 시 즉시 실행 |
| **입력 채널** | 카카오톡 봇 / 대시보드 직접 입력 / 전화 메모 전환 |
| **선행 조건** | 학부모-학생 매핑 존재, Complaint Agent 활성 상태 |
| **담당 에이전트** | `complaint` (Paperclip 패턴으로 Orchestrator가 할당) |
| **장착 k-skill** | `complaint-classifier`, `message-template-pack`, `parent-context-loader`, `kakao-bot-mcp-server`, `parent-sentiment-tracker` |

---

## 전체 흐름도

```
민원 접수 (카카오톡/전화/앱)
  │
  ▼
Step 1: 채널별 수신 → 정규화
  │
  ▼
Step 2: Complaint Agent 분류 (7종 유형 + 긴급도)
  │
  ├─ escalate=true ──→ Step 7: 에스컬레이션
  │
  ▼
Step 3: 응답 초안 생성 (k-skill 활용)
  │
  ▼
Step 4: 승인 대기 (대시보드 카드)
  │
  ▼
Step 5: 원장 승인 / 편집 / 반려
  │
  ├─ 반려 ──→ Step 3 재생성 (사유 반영)
  │
  ▼
Step 6: 발송 + 케이스 기록
  │
  ▼
Step 7: 후속 조치 (필요 시)
```

---

## 단계별 상세

### Step 1: 민원 접수 (채널별)

| 채널 | 처리 방식 |
|------|-----------|
| 카카오톡 봇 | `kakao-bot-mcp-server`가 메시지 수신 → `complaintText` 추출 → Orchestrator에 이벤트 발행 |
| 전화 | 원장/실장이 대시보드에 통화 메모 입력 → 수동 접수 |
| 앱 내 메시지 | 앱 API → 동일 이벤트 발행 |

**출력**: `{ channel, complaintText, parentId, studentId, receivedAt }`

### Step 2: Complaint Agent 분류

Orchestrator가 Paperclip 패턴으로 Complaint Agent에 태스크 할당.

**에이전트 처리**:
1. `complaint-classifier` k-skill로 7종 유형 분류
2. `parent-sentiment-tracker`로 감정 강도 측정 (냉정/불만/분노/위기)
3. `parent-context-loader`로 학부모 이력 조회 (기존 민원 횟수, 출결, 납부)
4. 긴급도 결정: 즉시 / 당일 / 주간

**긴급도 판단 기준**:

| 긴급도 | 조건 | 목표 응답 시간 |
|--------|------|--------------|
| 즉시 | 환불+강한 감정 / 강사 교체+"바로" / 안전 키워드 | 2시간 |
| 당일 | 성적 불만 / 강사 교체(일반) / 행동 지적 | 업무시간 내 |
| 주간 | 스케줄 조정 / 공지 오류 / 시설(비긴급) | 3영업일 |

**상향 규칙**: 동일 학부모 3회 이상 민원 → 자동 한 단계 상향.

### Step 3: 응답 초안 생성 + k-skill 활용

1. `message-template-pack`에서 유형별 템플릿 로드
2. 학부모 컨텍스트 + 민원 내용 → LLM 초안 생성
3. 초안 구조: 공감 표현 → 사실 확인/조치 약속 → 추가 문의 안내
4. 환불/강사 교체 등 의사결정 건: "확인 후 연락" 표현 사용

**출력 JSON**:
```json
{
  "type": "complaint.grade",
  "urgency": "today",
  "escalate": false,
  "summary": "수학 점수 하락 불만 (30자 이내)",
  "draft": "학부모 발송용 초안 (5문장 이내)",
  "internalNote": "원장 전용 처리 메모"
}
```

### Step 4: 승인 대기 (원장 대시보드 카드)

대시보드에 카드 형태로 표시:

```
┌─────────────────────────────────┐
│ [긴급] complaint.refund          │
│ 환불 요청 - 김OO 학부모             │
│ "수업 효과가 없어서 퇴원..."          │
│                                 │
│  [승인]  [편집 후 발송]  [반려]      │
└─────────────────────────────────┘
```

- 긴급도=즉시: 원장에게 **푸시 알림** 동시 발송
- 카드 미응답 시 리마인더: 즉시(30분), 당일(2시간), 주간(24시간)

### Step 5: 원장 승인/편집/반려

| 액션 | 후속 처리 |
|------|-----------|
| **승인** | Step 6으로 즉시 진행 |
| **편집 후 발송** | 원장이 초안 수정 → 수정본으로 Step 6 진행. 수정 diff 저장 (초안 품질 학습용) |
| **반려** | 원장 반려 사유 입력 → Step 3 재실행 (사유를 컨텍스트에 포함) |

### Step 6: 발송 + 케이스 기록

1. `kakao-bot-mcp-server`로 학부모에게 승인된 메시지 발송 (또는 이메일 대체)
2. `complaint_log` 테이블에 케이스 저장

### Step 7: 후속 조치

필요 시 아래 분기 처리 실행 후, Retention Agent에 민원 이력 전달 (위험 점수 연동).

---

## 분기 처리

| 조건 | 분기 처리 |
|------|-----------|
| **환불 요청** | Finance Agent에 환불 규정 검토 태스크 할당 → 금액 산정 → 원장 최종 승인 |
| **법적 키워드** ("교육청", "신고", "변호사") | Compliance Agent 에스컬레이션. 민원 원문+분류+이력 전달. 원장 직접 개입 유도 |
| **아동 안전/폭력 키워드** | 즉시 에스컬레이션 + 법적 보고 의무 안내 |
| **야간 접수** (22시~08시) | 자동 접수 확인 메시지 발송 ("접수되었습니다. 내일 오전 중 답변드리겠습니다.") → 다음 근무일 우선 처리 큐 |
| **동일 학부모 5회 이상** (30일 내) | 반복 민원 → 관계 관리 전환. 원장 직접 전화 상담 권고 |

---

## 제로휴먼 레벨별 동작 차이

| Level | 적용 범위 | 에이전트 행동 | 원장 개입 |
|-------|-----------|-------------|-----------|
| **Level 0** | 긴급 민원 (즉시) | 즉시 푸시 알림 + 초안 동시 제공 | 원장 직접 처리 필수 |
| **Level 1** | 정형 민원 (schedule, info, facility 저심각도) | 초안 생성 → 원클릭 승인 → 자동 발송 | 승인 1회 탭 |
| **Level 2** | 복잡 민원 (refund, teacher, behavior 고심각도) | 초안 + 에스컬레이션 플래그 | 원장 직접 수정 후 발송 |

---

## 실패 / 예외 처리

| 상황 | 처리 |
|------|------|
| 분류 신뢰도 낮음 (<0.6) | `type: "unknown"` 태깅 → 원장 수동 분류 요청 카드 |
| 카카오 발송 실패 | 3회 재시도 (30초 간격) → 실패 시 SMS 대체 발송 → 대시보드 오류 표시 |
| 학부모 매핑 불가 | 미등록 학부모 → 원장에게 수동 매핑 요청 카드 |
| 에이전트 타임아웃 (3분 초과) | Orchestrator가 원장에게 수동 처리 요청 + 장애 로그 기록 |
| 원장 72시간 미응답 | 에스컬레이션: 부원장/실장에게 알림 전달 |

---

## 관련 데이터 (complaint_log 테이블)

| 필드 | 타입 | 설명 |
|------|------|------|
| `case_id` | UUID | 케이스 고유 ID |
| `org_id` | UUID | 학원 ID |
| `parent_id` | UUID | 학부모 ID |
| `student_id` | UUID | 학생 ID |
| `channel` | enum | kakao / phone / app |
| `complaint_text` | text | 민원 원문 |
| `type` | enum | 7종 분류 코드 |
| `urgency` | enum | immediate / today / weekly |
| `sentiment` | enum | calm / unhappy / angry / crisis |
| `escalated` | boolean | 에스컬레이션 여부 |
| `draft` | text | 에이전트 초안 |
| `final_message` | text | 실제 발송 메시지 |
| `approval_action` | enum | approved / edited / rejected |
| `received_at` | timestamp | 접수 시각 |
| `draft_at` | timestamp | 초안 생성 시각 |
| `approved_at` | timestamp | 승인 시각 |
| `sent_at` | timestamp | 발송 시각 |
| `resolved` | boolean | 종결 여부 |

---

## 성공 지표

| 지표 | 목표 | 측정 |
|------|------|------|
| 초안 생성 소요 시간 | 접수 후 **3분 이내** | `draft_at - received_at` |
| 원장 초안 수용률 (무편집 승인) | **60% 이상** | `approved / total` |
| 민원 응답 발송 시간 | 긴급 2시간 / 당일 8시간 | `sent_at - received_at` |
| 에스컬레이션 정확도 | false positive **< 20%** | 원장 에스컬레이션 취소 비율 |
| 민원 재발률 (동일 학부모 30일 내) | **15% 이하** | complaint_log 집계 |

---

*연관: [[complaint]] (에이전트 역할), [[retention]] (민원 → 이탈 위험 연동), [[communication-model]] (도메인)*
