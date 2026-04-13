---
tags: [area/product, type/reference, status/active]
date: 2026-04-09
up: "[[hagent-os/README]]"
---

# Domain Model (데이터 도메인 모델)

> prd.md 데이터 모델 + agent-design.md DB Schema를 통합한 정본 레퍼런스.
> DB: PostgreSQL + embedded-postgres (로컬) / 외부 PG URL (배포). ORM: Drizzle ORM. Auth: local_trusted (MVP).

---

## 전체 엔티티 관계도 (ERD)

```
Organization
  ├─── Agent[]               (1:N)
  ├─── Student[]             (1:N)
  ├─── Instructor[]          (1:N)
  ├─── Schedule[]            (1:N)
  ├─── Case[]                (1:N)
  ├─── Notification[]        (1:N)
  ├─── Template[]            (1:N)
  ├─── OpsGoal[]             (1:N)
  ├─── OrganizationSecret[]  (1:N)
  └─── AgentKey[]            (1:N, via Agent)

Agent
  ├─── WakeupRequest[]  (1:N)
  ├─── AgentRun[]       (1:N)
  ├─── Routine[]        (1:N)
  ├─── AgentKey[]       (1:N)
  └─── reportsTo → Agent (self-ref, nullable)

Student
  ├─── Parent[]         (N:M via StudentParent)
  ├─── Attendance[]     (1:N)
  ├─── Payment[]        (1:N)
  └─── Case[]           (1:N, 학생 관련 민원)

Parent
  └─── Case[]           (1:N, 민원 제기자)

Instructor
  ├─── Schedule[]       (N:M via ScheduleParticipant)
  └─── Performance[]    (1:N)

Schedule
  ├─── ScheduleParticipant[] (강사/학생/학부모)
  └─── external_sync → Google Calendar event ID

Case
  ├─── AuditLog[]       (1:N, 불변)
  ├─── CaseComment[]    (1:N)
  ├─── CaseAttachment[] (1:N)
  ├─── CaseDocument[]   (1:N)
  ├─── approval_status → Approval
  ├─── parentId → Case  (self-ref, 하위 케이스 계층)
  ├─── goalId → OpsGoal (운영 목표 연결, nullable)
  └─── checkoutRunId → AgentRun (원자적 체크아웃, nullable)

OpsGoal
  └─── parentId → OpsGoal (self-ref, 목표 계층)

AgentRun
  └─── WakeupRequest    (N:1)
```

---

## 핵심 테이블 상세

### Organization (기관)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| name | TEXT | 학원명 |
| type | ENUM | `academy` \| `tutoring` \| `public` |
| profile | JSONB | 규모, 목표, 톤, 지역 등 |
| agents | TEXT[] | 활성화된 에이전트 slug 목록 |
| skills | TEXT[] | 설치된 k-skill slug 목록 |
| members[] | ref → User | (원장/실장/강사 — MVP는 단일 원장 계정, v2에서 멀티 계정 확장) |
| createdAt | TIMESTAMP | |

**관계:** 모든 엔티티의 루트. `organizationId`로 멀티테넌시 격리.

---

### Agent (에이전트)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID → Organization | |
| name | TEXT | "민원 담당 에이전트" |
| slug | TEXT UNIQUE | "complaint-agent" |
| urlKey | TEXT UNIQUE | URL 슬러그 (`/agents/:urlKey`) |
| agentType | ENUM | `orchestrator` \| `complaint` \| `retention` \| `scheduler` \| `intake` \| `staff` \| `finance` \| `compliance` \| `notification` \| `analytics` |
| status | ENUM | `idle` \| `running` \| `pending_approval` \| `paused` \| `error` |
| reportsTo | UUID → Agent | NULL이면 원장에게 직보 |
| instructions | TEXT | 시스템 프롬프트 / 에이전트 지시사항 (nullable) |
| adapterType | TEXT | `"claude"` \| `"openai"` |
| adapterConfig | JSONB | `{ model, systemPrompt, temperature }` |
| skills | TEXT[] | 장착된 k-skill slug |
| budgetMonthlyCents | INT | 월 예산 (센트) |
| spentMonthlyCents | INT | 이번 달 누적 사용액 |
| lastHeartbeatAt | TIMESTAMP | |
| lastRunStatus | TEXT | nullable, 최근 실행 상태 |
| runtimeState | JSONB | 세션 간 지속 상태 |
| createdAt | TIMESTAMPTZ | |
| updatedAt | TIMESTAMPTZ | |

---

### Student (학생)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID | |
| name | TEXT | |
| grade | TEXT | 학년 (중2, 고1 등) |
| subjects | TEXT[] | 수강 과목 |
| riskScore | FLOAT | 이탈 위험 점수 (0-1, Retention Agent 갱신) |
| enrolledAt | DATE | 등록일 |
| attendance | Attendance[] | |
| payments | Payment[] | |

**관계:** `StudentParent` 조인 테이블로 부모와 N:M.

---

### Parent (학부모)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID | |
| name | TEXT | |
| phone | TEXT | 알림 수신 번호 |
| kakaoLinked | BOOL | 카카오 알림 연동 여부 |
| preferredChannel | ENUM | `kakao` \| `sms` \| `email` |

---

### Instructor (강사)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID | |
| name | TEXT | |
| subjects | TEXT[] | 담당 과목 |
| availability | JSONB | 가용 시간대 (요일×시간) |
| monthlySalaryCents | INT | 월 급여 |

---

### Schedule (통합 스케줄)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID | |
| type | ENUM | `class` \| `consult` \| `bus` \| `inspection` \| `legal_deadline` \| `other` |
| title | TEXT | |
| startAt | TIMESTAMP | |
| endAt | TIMESTAMP | |
| participants | UUID[] | 강사/학생/학부모 ID |
| recurrence | JSONB | iCal RRULE 포맷 |
| location | TEXT | 강의실 번호 또는 온라인 URL |
| external_sync | TEXT | Google Calendar event ID |
| status | ENUM | `scheduled` \| `completed` \| `cancelled` \| `rescheduled` |

---

### Case (민원·환불·보강 케이스)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID | |
| type | ENUM | `complaint` \| `refund` \| `makeup` \| `inquiry` |
| severity | ENUM | `low` \| `medium` \| `high` \| `critical` |
| status | ENUM | `open` \| `draft_ready` \| `pending_approval` \| `resolved` \| `escalated` |
| reporterId | UUID → Parent | 민원 제기자 |
| studentId | UUID → Student | 해당 학생 |
| agentDraft | TEXT | Complaint Agent가 생성한 답변 초안 |
| approvalStatus | ENUM | `none` \| `approved` \| `rejected` |
| approvedBy | UUID | 승인한 사람 or 상위 에이전트 |
| auditLog | AuditLog[] | 불변 이력 |
| parentId | UUID → Case | 하위 케이스 계층 (nullable) |
| goalId | UUID → OpsGoal | 연결된 운영 목표 (nullable) |
| checkoutRunId | UUID → AgentRun | 원자적 체크아웃 — 중복 작업 방지 (nullable) |
| priority | ENUM | `urgent` \| `high` \| `medium` \| `low` |
| labels | TEXT[] | 분류 태그 (예: ["환불", "고학년"]) |
| blockedBy | UUID[] → Case[] | 차단 관계 (이 케이스를 블로킹하는 케이스 ID 목록) |
| planDocument | TEXT | 에이전트 작업 계획 (nullable) |

#### CaseComment (케이스 댓글)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| caseId | UUID → Case | |
| authorId | UUID | 작성자 ID (User 또는 Agent) |
| authorType | ENUM | `user` \| `agent` |
| body | TEXT | 댓글 본문 |
| createdAt | TIMESTAMPTZ | |

#### CaseAttachment (케이스 첨부파일)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| caseId | UUID → Case | |
| fileName | TEXT | 원본 파일명 |
| fileUrl | TEXT | 스토리지 URL |
| mimeType | TEXT | 파일 MIME 타입 |
| createdAt | TIMESTAMPTZ | |

#### CaseDocument (케이스 문서)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| caseId | UUID → Case | |
| title | TEXT | 문서 제목 |
| content | TEXT | 문서 본문 (마크다운) |
| revision | INT | 버전 번호 (1부터 시작) |
| createdAt | TIMESTAMPTZ | |

---

### Notification (알림)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID | |
| type | TEXT | `absence` \| `makeup` \| `payment_due` \| `case_reply` 등 |
| channel | ENUM | `kakao` \| `sms` \| `email` \| `push` |
| status | ENUM | `pending` \| `sent` \| `failed` |
| recipientId | UUID | Parent or Instructor |
| message | TEXT | 발송 본문 (변수 치환 완료) |
| sentAt | TIMESTAMP | |

---

### AgentRun (에이전트 실행 로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| agentId | UUID → Agent | |
| wakeupRequestId | UUID → WakeupRequest | |
| status | ENUM | `running` \| `completed` \| `failed` \| `pending_approval` |
| input | JSONB | 트리거 데이터 |
| output | JSONB | 에이전트 결과 |
| tokensUsed | INT | |
| costCents | INT | |
| approvalLevel | INT | 제로휴먼 레벨 0~4 |
| approvedBy | UUID | 승인자 |
| startedAt | TIMESTAMP | |
| completedAt | TIMESTAMP | |
| invocationSource | ENUM | `timer` \| `assignment` \| `on_demand` \| `automation` (실행 트리거 출처) |
| sessionIdBefore | TEXT | 이전 세션 ID (Claude 세션 재개용, nullable) |
| sessionIdAfter | TEXT | 실행 후 세션 ID (nullable) |
| logRef | TEXT | 로그 스토리지 경로 (nullable) |
| usageJson | JSONB | 토큰 상세 (prompt / completion / total 등, nullable) |

**용도:** 모든 AI 결정의 감사 추적 근거. 학부모 민원 대응 시 원장이 조회.

---

### OpsGoal (운영 목표)

> 기관 미션 → 프로젝트 목표 → 개별 목표의 계층 구조로 운영 목표를 관리. Case.goalId로 연결.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID → Organization | |
| title | TEXT | 목표 제목 |
| description | TEXT | 목표 상세 설명 (nullable) |
| status | ENUM | `active` \| `completed` \| `cancelled` |
| parentId | UUID → OpsGoal | 상위 목표 (nullable, self-ref) |
| targetDate | DATE | 목표 달성 예정일 (nullable) |
| createdAt | TIMESTAMPTZ | |
| updatedAt | TIMESTAMPTZ | |

**관계:** 계층 구조 (기관 미션 → 프로젝트 목표 → 개별 목표). `Case.goalId`로 케이스와 연결.

---

### OrganizationSecret (기관 시크릿 / 환경변수)

> 에이전트가 사용하는 API 키 및 환경변수를 암호화하여 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organizationId | UUID → Organization | |
| key | TEXT | 변수명 (예: `CLAUDE_API_KEY`) |
| value | TEXT | 암호화 저장된 값 |
| description | TEXT | 용도 설명 (nullable) |
| createdAt | TIMESTAMPTZ | |
| updatedAt | TIMESTAMPTZ | |

**보안:** `value`는 AES-256 암호화. 평문은 조회 불가, 에이전트 런타임에서만 복호화.

---

### AgentKey (에이전트 JWT 인증 키)

> 에이전트가 외부 서비스나 API에 인증할 때 사용하는 키 관리.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| agentId | UUID → Agent | |
| organizationId | UUID → Organization | |
| keyHash | TEXT | API 키 해시 (원본은 생성 시 1회만 노출) |
| label | TEXT | 키 식별 레이블 (예: "Claude Code local") |
| lastUsedAt | TIMESTAMPTZ | 마지막 사용 시각 (nullable) |
| createdAt | TIMESTAMPTZ | |

**보안:** 원본 키는 생성 즉시 단 1회만 응답. 이후에는 `keyHash`만 저장.

---

### 보조 테이블 (간략)

| 테이블 | 핵심 컬럼 | 용도 |
|--------|-----------|------|
| WakeupRequest | agentId, triggerType, coalescedCount | 중복 제거된 에이전트 깨우기 요청 |
| Routine | agentId, cronExpression, enabled | 정기 실행 크론 규칙 |
| Template | type, content, personalization_rule | 알림/답변 메시지 템플릿 |
| AuditLog | caseId, action, actor, before, after | 불변 이력 (append-only) |
| Approval | agentRunId, level, status, approvedBy | 승인 게이트 상태 |
| Attendance | studentId, date, status, note | 출석 기록 |
| Payment | studentId, amount, dueDate, paidAt, method | 결제 기록 |
| StudentParent | studentId, parentId | 학생-학부모 조인 테이블 |
| ScheduleParticipant | scheduleId, participantId, role | 일정 참가자 (강사/학생/학부모) |
| Performance | instructorId, period, rating, note | 강사 성과 평가 |

---

### 운영 그룹 (Project 대응)

```
OpsGroup {
  id, organizationId
  name, description, color
  status: active | archived
  leadAgentId → Agent (담당 에이전트)
  createdAt, updatedAt
}
-- Cases can link to OpsGroup via groupId
```

### 활동 로그 (Activity / Audit Log)

```
ActivityEvent {
  id, organizationId
  entityType: case | agent | approval | skill | schedule
  entityId
  action: created | updated | deleted | approved | rejected | run_started | run_completed
  actorId, actorType: user | agent
  payload: jsonb
  createdAt
}
```

### API 토큰 예산 (Cost / Budget)

```
TokenBudget {
  id, organizationId, agentId (nullable — org-level or agent-level)
  budgetMonthlyCents
  spentMonthlyCents
  warningThresholdPct: default 80
  hardStop: boolean
  resetAt: timestamp
}

TokenUsageEvent {
  id, organizationId, agentId, agentRunId
  inputTokens, outputTokens, cacheTokens
  costCents
  model
  createdAt
}
```

### AgentRun 독립 참조용 (HeartbeatRun 대응)

> AgentRun 스키마 확인: `invocationSource`, `sessionIdBefore`, `sessionIdAfter`, `logRef`, `usageJson` 컬럼이 이미 존재함 (위 AgentRun 테이블 참조). 추가 마이그레이션 불필요.

---

### 승인 레벨 정본 (Approval Level Semantics)

레벨은 **에이전트 단위가 아니라 행동(Action) 단위**로 결정된다.
같은 에이전트가 케이스마다 다른 레벨로 동작할 수 있다.

| 에이전트 | 행동 | 레벨 |
|----------|------|:----:|
| Retention | 위험 점수 산출 + 대시보드 표시 | 0 |
| Retention | 학부모 안내 메시지 발송 | 1 |
| Retention | 상담 예약 / 개입 결정 | 3 |
| Complaint | 민원 분류 + 로그 기록 | 0 |
| Complaint | 일반 민원 응답 초안 발송 | 1 |
| Complaint | 복잡/환불/법적 민원 | 2 |
| Scheduler | 일정 자동 업데이트 | 0 |
| Scheduler | 강사 대체 제안 | 1 |

---

## 확장 고려사항

### 멀티 지점

- `Organization`에 `parentOrgId` 컬럼 추가 (본원-지점 계층)
- 모든 쿼리에 `organizationId IN (...)` 조건으로 지점별 격리 유지
- 에이전트는 지점 단위로 독립 실행, 본원 Analytics Agent가 집계

### 공교육 모드

- `Organization.type = 'public'`일 때 `Case.type`에 `neis_report` 추가
- NEIS 연동 어댑터는 별도 `DataBridge` 컬럼으로 확장 (`externalSource: 'neis'`)
- 학생 개인정보 처리 동의 컬럼 (`Student.consentAt`) 필수화
