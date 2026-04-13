---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-13
up: "[[hagent-os/README]]"
---
# Agent Design (에이전트 설계)

> HagentOS 에이전트 아키텍처 정본. 에이전트가 어떻게 정의되고, 실행되고, 협력하는지 설명한다.
> 개별 에이전트 역할 상세는 `agent-roles/` 하위 문서에서 이 문서를 참조한다.
>
> 현재 shipped/verified 기준 기본 팀은 `orchestrator`, `complaint`, `retention`, `scheduler`, `notification` 5개다.

---

## 핵심 개념: Paperclip에서 차용한 것

Paperclip은 "Company as AI" — 회사 전체를 에이전트 조직으로 모델링한다. HagentOS는 이 철학을 한국 교육 도메인에 이식하되, 다음과 같이 차용과 적응을 구분한다.

### 차용 (Borrow as-is)

| 메커니즘 | Paperclip 원본 | HagentOS 적용 |
|----------|---------------|--------------|
| Explicit Assignment | `assigneeAgentId`로 태스크 직접 할당 | 동일 — 자동 라우팅 없음, 오케스트레이터가 명시 배정 |
| Approval Gate | `pending_approval` 상태 + `approvals` 테이블 | 동일 — 제로휴먼 레벨로 세분화 |
| Heartbeat | `lastHeartbeatAt`으로 에이전트 생존 확인 | 동일 |
| Budget Tracking | `budgetMonthlyCents` / `spentMonthlyCents` | 동일 — 에이전트별 월 예산 |
| Wakeup Queue | `agentWakeupRequests` + 중복 제거(`coalescedCount`) | 동일 |
| Org Hierarchy | `reportsTo` self-reference | 동일 — 원장이 최상위 |

### 적응 (Adapt for Korea Education)

| Paperclip | HagentOS 변경 |
|-----------|--------------|
| Company-wide skill pool | **k-skill 생태계** — 한국 교육 특화 스킬 패키지, 조직별 선택 장착 |
| Generic adapter | 학원 운영 맥락 주입 (원비, 시간표, 학부모 민원 등) |
| English-first | 한국어 우선 — 프롬프트, UI, 알림 모두 한국어 |
| SaaS 고객 | **원장(학원장)**이 human-in-the-loop의 주체 |

---

## 에이전트란 무엇인가

에이전트는 **챗봇 세션이 아니다.** 조직 내 역할을 가진 영속적 엔티티(persistent entity)다.

- **DB 레코드** — id, 역할, 상태, 설정이 PostgreSQL에 저장 (Drizzle ORM)
- **실행 예산** — 월별 토큰/비용 한도가 있고, 초과 시 자동 중지
- **권한 범위** — 접근 가능한 데이터와 실행 가능한 액션이 제한됨
- **상태 지속성** — 세션 간에도 `agent_runtime_state`가 유지됨
- **조직도 위치** — `reportsTo`로 상위 에이전트 또는 사람에게 보고

비유하면: **에이전트 = 신입 직원**. 역할이 있고, 예산이 있고, 상사에게 보고하고, 권한 밖의 일은 못 한다.

---

## HagentOS 에이전트 구조 (DB Schema)

```
Agent {
  id              UUID PRIMARY KEY
  organizationId  UUID → Organization
  name            TEXT           -- "민원 담당 에이전트"
  slug            TEXT UNIQUE    -- "complaint-agent"
  agentType       ENUM           -- orchestrator | complaint | retention
                                    scheduler | intake | staff | finance
                                    compliance | notification | analytics
  status          ENUM           -- idle | running | pending_approval | paused | error
  reportsTo       UUID → Agent   -- NULL이면 사람(원장)에게 직보

  -- 실행 설정
  adapterType     TEXT           -- "claude" | "openai" | ...
  adapterConfig   JSONB          -- { model, systemPrompt, temperature, ... }
  skills          TEXT[]         -- 장착된 k-skill slug 목록

  -- 예산
  budgetMonthlyCents   INT       -- 월 예산 (센트)
  spentMonthlyCents    INT       -- 이번 달 사용액

  -- 상태
  lastHeartbeatAt      TIMESTAMP
  lastRunStatus        TEXT
  runtimeState         JSONB     -- 세션 간 지속되는 상태

  -- 감사
  createdAt, updatedAt TIMESTAMP
}
```

### 관련 테이블

```
WakeupRequest {
  id, agentId, triggerType, triggerPayload
  coalescedCount INT DEFAULT 1  -- 중복 요청 병합 횟수
  claimedAt TIMESTAMP           -- 처리 시작 시점
  createdAt TIMESTAMP
}

AgentRun {
  id, agentId, wakeupRequestId
  status        ENUM  -- running | completed | failed | pending_approval
  input         JSONB
  output        JSONB
  tokensUsed    INT
  costCents     INT
  approvalLevel INT   -- 제로휴먼 레벨 (0-4)
  approvedBy    UUID  -- 승인자 (사람 or 상위 에이전트)
  startedAt, completedAt TIMESTAMP
}

Routine {
  id, agentId, name
  cronExpression TEXT  -- "0 8 * * 1-5" (평일 오전 8시)
  enabled        BOOL
  lastTriggeredAt TIMESTAMP
}
```

---

## 실행 흐름 (Execution Flow)

```
┌─────────────────────────────────────────────────────────┐
│  1. TRIGGER                                             │
│     타이머 / 사람 지시 / 이벤트 할당 / 크론                     │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  2. WAKEUP REQUEST 생성                                  │
│     중복 제거: 같은 agentId + triggerType → coalesce       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  3. AGENT CLAIM                                         │
│     status → running, runtimeState 로드                  │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  4. CONTEXT INJECTION                                    │
│     systemPrompt + k-skill instructions + org context    │
│     + 이전 런 상태 + 할당된 태스크 데이터                       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  5. LLM CALL                                            │
│     Adapter Runtime (`codex_local` default,             │
│     OpenAI/Anthropic interchangeable)                   │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│  6. OUTPUT 처리                                          │
│     태스크/케이스 생성, 알림 초안, 데이터 업데이트                 │
└──────────────────────┬──────────────────────────────────┘
                       ▼
              ┌────────┴────────┐
              │ approvalLevel?  │
              └────────┬────────┘
         level 0       │        level 1-4
      ┌────────────────┤────────────────┐
      ▼                                 ▼
  자동 실행                      pending_approval 전환
  (결과 즉시 적용)               (대시보드에 승인 요청 노출)
      │                                 │
      └────────────┬────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│  7. AUDIT LOG                                           │
│     AgentRun 레코드: input, output, tokens, cost, 승인자   │
└─────────────────────────────────────────────────────────┘
```

---

## 트리거 유형 4가지

| 트리거 | 메커니즘 | HagentOS 예시 |
|--------|---------|--------------|
| **Timer / Heartbeat** | 주기적 간격으로 에이전트 깨움 | 매일 오전 8시 브리핑 생성, 이탈 징후 일일 스캔 |
| **Assignment** | 이벤트 발생 → 특정 에이전트에 할당 | Telegram/Kakao inbound → Complaint 또는 Scheduler 할당 |
| **On-demand** | 사람이 직접 지시 | 원장: "이번 달 환불 현황 정리해줘" → Orchestrator |
| **Cron / Routine** | `cronExpression`으로 정기 실행 | 월말 정산 리포트 (`0 9 L * *`), 주간 강사 성과 요약 |

트리거 → `WakeupRequest` 생성 → 에이전트가 claim → 실행. 같은 에이전트에 대한 중복 트리거는 `coalescedCount`로 병합되어 불필요한 실행을 방지한다.

---

## Human-in-the-Loop: 제로휴먼 레벨

모든 에이전트 출력은 **제로휴먼 레벨**(approval level)을 가진다. 레벨이 높을수록 사람의 개입이 커진다.

| Level | 이름 | 인간 개입 | 예시 | 승인 UI |
|:-----:|------|:---------:|------|---------|
| 0 | 완전 자동 | 0% | 일일 브리핑 생성, 데이터 집계 | 없음 (로그만) |
| 1 | 초안 + 원클릭 승인 | ~10% | 민원 응답 초안 → [전송] 버튼 | 승인/반려 |
| 2 | 초안 + 편집 후 발송 | ~30% | 복잡한 민원, 환불 안내문 | 편집기 + 발송 |
| 3 | 분석 + 사람 결정 | ~50% | 이탈 위험 학생 → 상담 여부 판단 | 분석 리포트 + 액션 선택 |
| 4 | 정보 제공만 | ~90% | 법적 분쟁, 감성적 판단 필요 케이스 | 참고 자료만 제공 |

레벨은 에이전트 고정이 아니라 **케이스별로 결정**된다. 같은 Complaint Agent라도 단순 문의는 Level 1, 법적 민원은 Level 4로 분기한다.

---

## 에이전트 조직도 (Org Chart)

```
원장 (Human)  ─────────────────────────────── 최종 의사결정권자
    │
    └── Orchestrator ────────────────────────── 지시 해석, 태스크 라우팅
            │
            ├── Complaint Agent ──────────────── 민원 분류 + 응답 초안
            ├── Retention Agent ──────────────── 이탈 징후 감지 + 방어 전략
            ├── Scheduler Agent ──────────────── 통합 스케줄 관리
            │
            ├── Intake Agent ────────────────── 신규 상담 자동화
            ├── Staff Agent ─────────────────── 강사 관리·성과 분석
            ├── Finance Agent ───────────────── 환불·수납·세무
            ├── Compliance Agent ─────────────── 규제·공문 대응
            │
            ├── Notification Agent ───────────── 알림 엔진 (cross-cutting)
            └── Analytics Agent ──────────────── 데이터·리포팅 (cross-cutting)
```

**Cross-cutting 에이전트**: Notification과 Analytics는 다른 에이전트의 요청을 받아 동작한다. Complaint Agent가 응답을 생성하면 Notification Agent가 카카오톡으로 발송하는 식이다.

---

## 현재 실행 모드 (대회 기준)

현재 프로그램은 복잡한 account/auth 모델보다 `기관 컨텍스트 + board UI + agent runtime`을 우선 검증한다.

| 축 | 현재 기준 |
|----|-----------|
| board 접근 | `local_trusted` 중심 |
| agent 실행 | organization adapter + mounted skills + instruction files |
| channel | webhook / outbound provider 경로 |
| degraded 처리 | env 미설정 시 crash 대신 `degraded` 또는 `pending_credentials` |

즉, 이 문서는 최종 플랫폼 설계를 설명하지만, 실제 shipped baseline은 `runtime-docs/handoff/2026-04-13-full-regression.md`의 실행 결과를 함께 봐야 정확하다.

---

## k-skill 주입 메커니즘

스킬은 에이전트에 하드코딩되지 않는다. 런타임에 조직이 설치한 k-skill이 에이전트 컨텍스트에 주입된다.

### k-skill의 구성

```
k-skill package {
  slug         "refund-calc"
  name         "환불 계산기"
  type         prompt | tool | policy | composite
  instructions TEXT     -- LLM에 주입되는 프롬프트/규칙
  tools        []       -- MCP tool definitions (있으면)
  policies     []       -- 비즈니스 규칙, 법적 제약
  metadata     { domain, version, author, ... }
}
```

### 주입 흐름

1. 조직이 k-skill 설치: `refund-calc`, `complaint-clf`, `kakao-bot-mcp`
2. 에이전트 런타임 시작 시, 해당 에이전트의 `skills[]`에 매칭되는 k-skill 로드
3. k-skill의 `instructions` + `tools` + `policies`가 system context에 병합
4. LLM은 에이전트 역할 + 스킬 지식을 결합하여 응답 생성

### 이것이 중요한 이유

- **같은 Complaint Agent + 다른 스킬 = 다른 행동**: 영어 학원과 수학 학원은 민원 유형이 다르다. 스킬만 바꾸면 된다.
- **커뮤니티 확장**: 에이전트 코드 변경 없이 스킬 추가로 도메인 확장
- **외부 MCP 활용**: `kakao-bot-mcp`, `korean-law-mcp`, `@portone/mcp` 등 실존 MCP를 k-skill로 래핑

---

## 에이전트 간 협력 패턴

### 1. Sequential (순차)

```
Orchestrator → Complaint Agent → Notification Agent
```

민원 접수 → 분류·응답 초안 → 승인 후 채널 발송. 각 단계의 출력이 다음 단계의 입력이 된다.

### 2. Parallel (병렬)

```
Orchestrator → ┬── Complaint Agent    (어제 민원 요약)
               ├── Retention Agent    (이탈 위험 학생 목록)
               └── Scheduler Agent    (오늘 일정 충돌 확인)
```

오전 브리핑: 세 에이전트가 동시에 실행되고, 결과가 하나의 브리핑으로 합쳐진다.

### 3. Escalation (에스컬레이션)

```
Complaint Agent ──(법적 민원 감지)──→ Compliance Agent
                                         │
                                         ▼
                                    Level 4로 격상
                                    (원장에게 법적 자문 권고)
```

전문 에이전트가 자기 권한 밖의 문제를 감지하면, 상위/전문 에이전트로 에스컬레이션한다.

---

## 실행 예산 & 비용 관리

모든 에이전트는 월별 예산(`budgetMonthlyCents`)을 가진다.

### 예산 모델 예시 (소규모 학원 기준)

| 에이전트            | 월 예산       | 일 평균 런 | 런당 토큰  | 비고           |
| --------------- | ---------- | :----: | :----: | ------------ |
| Orchestrator    | $10        |  10회   | ~2,000 | 라우팅 위주, 경량   |
| Complaint Agent | $15        |   5회   | ~4,000 | 분류 + 응답 생성   |
| Retention Agent | $8         |   1회   | ~5,000 | 일일 배치 분석     |
| Scheduler Agent | $5         |   3회   | ~1,500 | 충돌 확인 위주     |
| **합계**          | **~$38/월** |        |        | 학원 1개 MVP 기준 |

### 예산 초과 시 동작

1. `spentMonthlyCents >= budgetMonthlyCents * 0.8` → 원장에게 경고 알림
2. `spentMonthlyCents >= budgetMonthlyCents` → 에이전트 `paused` 전환
3. 원장이 예산 증액 또는 다음 달까지 대기

---

## 에이전트 목록 및 배포 우선순위

| 에이전트 | 역할 | MVP 티어 | 기본 레벨 | 주요 k-skill | 트리거 |
|---------|------|:--------:|:---------:|-------------|--------|
| Orchestrator | 지시 해석, 라우팅 | **Must** | 0 | — | on_demand |
| Complaint Agent | 민원 분류 + 응답 | **Must** | 1-2 | `complaint-clf`, `message-template-pack` | assignment |
| Retention Agent | 이탈 감지 | **Must** | 3 | `churn-detection` | timer (daily) |
| Scheduler Agent | 스케줄 관리 | **Must** | 0-1 | `schedule-manager`, `schedule-optimizer` | cron, on_demand |
| Intake Agent | 신규 상담 | Should | 1 | `intake-form` | assignment |
| Staff Agent | 강사 관리 | Should | 3 | `performance-eval` | cron (weekly) |
| Finance Agent | 환불·수납 | Should | 2 | `refund-calc`, `@portone/mcp` | assignment, cron |
| Compliance Agent | 규제·공문 | Could | 4 | `korean-law-mcp` | assignment |
| Notification Agent | 알림 발송 | **Must** | 0 | `message-template-pack`, `sms-notification`, channel adapters | assignment |
| Analytics Agent | 데이터·리포트 | Could | 0 | — | cron, on_demand |

---

## 설계 원칙

1. **에이전트는 직원처럼** — 역할, 예산, 권한, 보고 체계가 있다. 무한정 실행되지 않는다.
2. **스킬은 도메인 지식** — 에이전트 코드에 비즈니스 로직을 넣지 않는다. k-skill로 컨텍스트에 주입한다.
3. **인간이 항상 루프 안에** — 승인 게이트는 비활성화할 수 없다. Level 0도 감사 로그는 남긴다.
4. **확장은 스킬 추가로** — 새 도메인(태권도 도장, 미술 학원)은 에이전트 코드 변경 없이 k-skill 패키지 추가로 대응한다.
5. **감사 추적 필수** — 모든 AI 결정은 `AgentRun`에 기록된다. 학부모 민원 대응의 근거가 된다.
6. **비용 예측 가능** — 에이전트별 예산 상한으로 AI 비용이 통제된다. 학원 운영자는 월 고정비를 예측할 수 있다.
7. **명시적 할당** — 자동 라우팅(auto-routing) 없이, Orchestrator가 명시적으로 배정한다. 디버깅과 감사가 쉽다.

---

## 참고

- [[_research/gap-analysis-paperclip-vs-hagent|Paperclip 비교 분석]] — 제품 구조 차이와 가져올 요소 정리
- [[00_vision/core-bet|Core Bet]] — HagentOS 핵심 차별점
- `agent-roles/` — 개별 에이전트 역할 상세 문서
