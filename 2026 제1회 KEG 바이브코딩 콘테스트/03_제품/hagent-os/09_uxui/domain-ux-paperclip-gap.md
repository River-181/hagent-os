---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-12
up: "[[information-architecture]]"
aliases:
  - 도메인 UX 개선 계획
  - paperclip 비교
---
# 도메인 UX — Paperclip 비교 및 개선 계획

> 작성일: 2026-04-12 (D-1)
> 참조: [[_research/gap-analysis-paperclip-vs-hagent]], [[2026-04-11-handoff]]
> Paperclip 라이브: `http://127.0.0.1:3101/CMP/dashboard`

---

## 핵심 진단: 왜 Paperclip이 더 깔끔한가

### Paperclip의 정보 모델 — 단순하다

```
Issues (이슈)
  └── Project에 속함
  └── Agent에 할당됨
  └── Approval 생성 가능
  └── Comment로 지시

Agents (에이전트)
  └── reportsTo 계층
  └── Instructions (SOUL/HEARTBEAT/AGENTS/TOOLS)
  └── Memory (일일 + 장기)
  └── Runs (실행 이력)
```

**Paperclip 사이드바는 4~5개 항목이다.**
Issues, Projects, Agents, Settings. 끝.

모든 흐름이 `이슈 → 에이전트 → 처리 결과`라는 단일 루프로 귀결된다.

---

### HagentOS의 정보 모델 — 흩어져 있다

```
Cases / Projects / Approvals / Routines / Goals
  + Students / Instructors / Schedule / Documents
  + Skills / Plugins / Adapters / Costs / Activity
  + Settings
```

**현재 nav 항목: 16개.**

각 페이지가 독립적으로 존재하고, 흐름이 연결되지 않는다.
사용자가 케이스를 보다가 에이전트를 확인하려면 nav를 두 번 거쳐야 한다.

---

## Paperclip vs HagentOS — 주요 도메인 차이

| 영역 | Paperclip | HagentOS 현재 | 갭 |
|------|-----------|--------------|-----|
| **정보 모델** | Issue가 모든 작업의 중심 | Cases/Projects/Routines/Goals 분산 | 중심 객체 불명확 |
| **케이스 상세** | Markdown 본문 + 내부 링크 (`[CMP-1](...)`) + 에이전트 댓글 + Approval + sub-issue | plain text + 댓글 + Approval 탭 | 문서형 결과물 부재 |
| **에이전트 결과** | RunChatSurface — 채팅 버블로 실제 대화 표시 | `<pre>` JSON 출력 또는 ChatBubble (구조 없음) | transcript 가독성 낮음 |
| **승인 흐름** | 이슈 상세 안에 Approval 인라인 표시 + 클릭 한 번 처리 | 별도 Approvals 페이지로 이동 필요 | 컨텍스트 전환 발생 |
| **사이드바 밀도** | 4~5개 항목 | 16개 항목 | 인지 부하 4배 |
| **에이전트 상태** | 사이드바에 실시간 상태 점 (running/idle/paused) | live list 있지만 상태 업데이트 불안정 | 체감 "살아있음" 약함 |
| **온보딩 후 경험** | starter project + cases 즉시 생성, AI팀이 바로 일 시작 | 온보딩 후 빈 화면 또는 불완전한 데이터 | "AI팀이 일하고 있다"는 느낌 없음 |
| **네비게이션** | 이슈에서 에이전트로, 에이전트에서 이슈로 단방향 클릭 | 페이지 간 연결 링크 부족 | 흐름이 끊김 |

---

## 개선 계획

### Phase 1 — 정보 밀도 줄이기 (D-1, 코드 변경 없음)

> 지금 당장 할 수 있는 것: 네이밍과 구조 정리

- [ ] 사이드바 섹션을 4개로 줄임 (업무 / AI팀 / 학원 / 시스템)
- [ ] 항목 수: 16개 → 12개 (어댑터 제거, 항목 리네이밍)
- [ ] 섹션 레이블 한 단어로 통일
- [ ] 상세 내용: [[sidebar-restructure]] 참조

### Phase 2 — 케이스가 중심이 되도록 (코드 변경)

> 목표: "케이스 상세"가 모든 작업의 허브가 되어야 함

#### 2-1. CaseDetail — 문서형 결과물 렌더링

현재 에이전트 실행 결과가 JSON 텍스트로만 표시됨.

```
목표 UX:
Case 상세 → Tabs [개요 | 에이전트 작업 | 승인 | 활동]
에이전트 작업 탭:
  - 각 Run을 카드로 표시
  - 카드 안에 ChatBubble (에이전트가 한 말)
  - 첨부 문서, 분석 결과, 권고사항 섹션

구현:
  AgentRun.output → messages[] 파싱
  → <ChatBubble role="assistant"> 렌더링
```

#### 2-2. CaseDetail — 인라인 승인 처리

현재 승인 처리하려면 Approvals 페이지로 이동해야 함.

```
목표 UX:
Case 상세 → 에이전트 작업 탭 → 승인 대기 카드
  → [승인] [거절] 버튼 인라인 표시
  → 클릭 시 즉시 처리 (페이지 이동 없음)

구현:
  CaseDetail에 pending approvals 쿼리 추가
  → ApprovalInlineCard 컴포넌트
  → approvalsApi.decide() 직접 호출
```

#### 2-3. CaseDetail — 후속 지시 코멘트

```
목표 UX:
Case 상세 하단 → 코멘트 입력창
  → 코멘트 작성 후 [지시 전송] 클릭
  → 담당 에이전트 자동 wakeup
  → 에이전트가 코멘트를 읽고 후속 작업 수행

구현:
  POST /cases/:id/comments (이미 있음)
  + assignedAgent wakeup 트리거 추가
```

### Phase 3 — 에이전트 살아있음 체감 (코드 변경)

> 목표: 에이전트가 실제로 일하고 있다는 시각적 증거

#### 3-1. 대시보드 — 실시간 에이전트 활동 피드

```
목표 UX:
Dashboard 우측 패널:
  "지금 일어나고 있는 일"
  ▸ [에이전트명] [케이스명] 처리 중 (2분 전)
  ▸ [에이전트명] [케이스명] 승인 요청 생성
  ▸ [에이전트명] 하트비트 실행 완료

구현:
  ActivityEvents SSE 스트림 → 대시보드 패널
```

#### 3-2. 에이전트 사이드바 — 상태 실시간 반영

```
목표 UX:
AI팀 섹션의 live agent list
  ● running (teal pulse)
  ○ idle (gray)
  ◐ paused (amber)

구현:
  SSE /api/events → agent status 업데이트
  → useSSE 훅에서 agents query invalidate
```

### Phase 4 — 도메인 언어 정리 (네이밍 정책)

> 목표: 학원 운영자가 이해하는 용어 + 기술 용어 혼재 제거

| 현재 | 개선 | 노출 위치 |
|------|------|----------|
| Case | **이슈** 또는 **케이스** (통일 필요) | 전체 UI |
| AgentRun | **에이전트 작업** | CaseDetail |
| Approval | **승인 요청** | 전체 UI |
| Routine | **자동화** | 사이드바, 페이지 제목 |
| Adapter | (사용자에게 노출 최소화) | 설정 탭으로 이동 |
| Skill | **스킬** | 사이드바 |
| dispatch | **지시** 또는 **실행 요청** | Dashboard |

> ==한국어 학원 운영자 입장에서 "케이스"는 자연스러운 단어다. "이슈"는 IT 냄새가 남. 유지 권장.==

---

## Paperclip이 잘하는 것 — 배울 점

1. **이슈 상세가 작업 허브** — 이슈 안에서 모든 게 처리됨 (코멘트, 승인, 에이전트 결과, 서브이슈)
2. **사이드바가 짧다** — 5개 항목. 무엇이 중요한지 즉시 보임
3. **에이전트 결과가 읽힌다** — ChatBubble + 구조화된 섹션. JSON 덩어리가 아님
4. **내부 링크** — `[CMP-1](/CMP/issues/CMP-1)` 형태로 이슈 간 연결이 자연스러움
5. **행동이 바로 가능** — 이슈 보다가 승인도 하고, 코멘트도 치고, 에이전트도 깨움

---

## 우리가 더 잘할 수 있는 것

| 항목 | HagentOS 고유 강점 |
|------|-------------------|
| **학원 도메인** | 학생/강사/일정/출석/반배정 — Paperclip에 없음 |
| **카카오 채널** | 상담/민원 inbound → 케이스 자동 생성 |
| **k-skill** | 한국 학원 특화 스킬 패키지 생태계 |
| **한국어 UX** | 학원 운영 용어로 완전 한국어화 |

---

## 실행 우선순위 (현실적)

> D-1 기준. 배포 전 할 수 있는 것만.

| 우선순위 | 작업 | 소요 예상 |
|---------|------|----------|
| ★★★ | 사이드바 리네이밍 + 구조 조정 | 30분 |
| ★★★ | CaseDetail 에이전트 작업 탭 개선 (ChatBubble 구조화) | 2~3시간 |
| ★★ | 대시보드 활동 피드 패널 | 2시간 |
| ★★ | CaseDetail 인라인 승인 처리 | 1~2시간 |
| ★ | 도메인 용어 전면 통일 | 별도 스프린트 |

---

## 관련 문서

- [[sidebar-restructure]] — 사이드바 네이밍/구조 상세
- [[_research/gap-analysis-paperclip-vs-hagent]] — 기능 갭 분석 정본
- [[information-architecture]] — 전체 라우트 맵
- [[2026-04-11-handoff]] — 현재 제품 상태 인수인계
