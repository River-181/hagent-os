---
tags: [area/product, type/analysis, status/complete]
date: 2026-04-09
up: "[[hagent-os/README]]"
---

# 최종 검증 보고서 (Opus)

> Paperclip Clone Spec 대비 HagentOS 설계 문서 교차 검증. Gap Analysis 이후 보강된 문서 기준.

---

## 종합 판정

**조건부 통과** — 데이터 모델과 에이전트 실행 모델은 gap analysis 이후 충실히 보강됨. 그러나 실시간 이벤트 캐시 무효화 전략과 D5-D8 스프린트의 기술 스택 불일치(Supabase vs Docker+Drizzle)가 개발 착수 전 반드시 정리되어야 함.

---

## 검증 항목별 결과

| 항목 | 판정 | 비고 |
|------|:----:|------|
| 데이터 모델 | ✅ | C1~C5 모두 반영됨. Case에 parentId/goalId/checkoutRunId/labels/blockedBy 추가, OpsGoal/OrganizationSecret/AgentKey 테이블 신설 |
| 에이전트 실행 모델 | ✅ | 7단계 실행 흐름(Trigger→Wakeup→Claim→Context Injection→LLM→Output→Audit) 명확. 4종 트리거, coalesce 중복 제거 포함 |
| 승인 흐름 | ✅ | 제로휴먼 레벨 0~4 체계, 케이스별 동적 레벨 결정, Approval 테이블과 AgentRun.approvalLevel 연결 완료 |
| k-skill 주입 | ✅ | 4종 타입(prompt/tool/policy/composite), 런타임 context 병합 흐름, MCP 래핑 전략 설계 완료 |
| 실시간 이벤트 | ⚠️ | WebSocket 엔드포인트, 5종 이벤트, 재연결 정책은 IA에 추가됨. 그러나 **React Query 캐시 무효화 전략**과 **토스트 rate-limit** 미정의 |
| 인증 아키텍처 | ⚠️ | AgentKey 테이블은 정의됨. 그러나 **인간 인증 방식이 불명확** — PRD에 Supabase Auth, 로드맵에 next-auth(JWT). 정본 결정 필요 |
| MVP 실현 가능성 | ⚠️ | 아래 별도 분석 참조 |
| 한국 교육 맥락 적합성 | ✅ | Student/Parent/Instructor/Schedule 등 한국 학원 도메인 엔티티가 풍부. 카카오/SMS 채널, 학년 체계, 학원 유형별 온보딩 잘 설계됨 |

---

## 남은 위험 요소 (개발 전 주의)

### R1. 기술 스택 정본 불일치 (CRITICAL)

- **위험**: PRD는 "Supabase + Prisma", 로드맵 D5는 "PostgreSQL(Docker) + Drizzle ORM + next-auth". ORM이 Prisma vs Drizzle로 분열.
- **근거**: `domain-model.md` line 10 "ORM: Prisma (예정)", `roadmap.md` line 23 "Drizzle ORM" + "Drizzle 마이그레이션"
- **권고**: D5 시작 전 **ORM 정본을 Drizzle로 확정**하고 domain-model.md 수정. Supabase를 사용하면 Docker Compose PostgreSQL은 불필요 — 둘 중 하나로 통일.

### R2. D5-D8 스프린트 과부하 (HIGH)

- **위험**: 4일에 인프라 세팅 + DB 스키마 + 인증 + Mock 데이터 + 3개 에이전트(Orchestrator/Complaint/Retention) + Approval Dashboard + Heartbeat cron + Calendar 연동 + 온보딩 UI + Scheduler UI + k-skill UI + 데모 + 배포. 2인 팀으로 비현실적.
- **근거**: Paperclip은 모노레포 6개 패키지에 수만 줄. HagentOS MVP에서도 최소 15개 테이블, 11개 API 모듈, 10개 라우트가 필요.
- **권고**: **D5-D6에서 에이전트 코어 1개(Complaint)와 Approval Dashboard에 집중**. Retention/Scheduler/Calendar/k-skill UI는 데모 mock으로 대체. "동작하는 1개 흐름"이 "흔들리는 6개 흐름"보다 심사에 유리.

### R3. Routine 테이블 간소화 위험 (MEDIUM)

- **위험**: Routine에 `concurrencyPolicy`, `catchupPolicy`, `variables`, `RoutineTrigger` 분리가 gap analysis에서 권고되었으나 domain-model.md에 미반영. 보조 테이블에 `cronExpression, enabled`만 존재.
- **근거**: `domain-model.md` line 339 vs gap analysis H3
- **권고**: MVP에서는 현재 간소 구조로 충분하나, **cron이 실패했을 때 catchup 정책**(skip vs run_once)은 D7 Heartbeat 구현 시 코드 레벨에서 결정 필요.

### R4. API 레이어 설계서 부재 (MEDIUM)

- **위험**: gap analysis H7에서 API 모듈 구조 정의를 권고했으나 별도 문서 미작성. 엔드포인트 목록, 요청/응답 스키마, 에러 코드가 없음.
- **권고**: D5에 Next.js API Routes 파일 구조를 확정하면 자동으로 해결. 별도 문서보다 코드가 정본.

### R5. WebSocket 구현 경로 미확정 (LOW for MVP)

- **위험**: IA에 WebSocket 이벤트 5종을 정의했으나, Vercel 배포 시 WebSocket 지원이 제한적(Edge Runtime 필요 또는 별도 서버).
- **권고**: MVP에서는 **polling(5초 간격) 또는 Supabase Realtime**으로 대체. WebSocket은 Phase 1.

---

## 개발 착수 권고사항

### D5 시작 전 반드시 확인할 3가지

1. **ORM 정본 확정**: Drizzle vs Prisma 중 택일. DB 호스팅은 Supabase vs Docker-local 중 택일. 로드맵과 domain-model.md를 동기화.

2. **MVP 스코프 재확인**: D5-D8 4일간 **실제로 동작시킬 흐름 1개**를 명확히 — 추천: "민원 접수 → Complaint Agent 초안 생성 → Approval Dashboard 승인 → 완료". 이 흐름이 end-to-end로 동작하면 나머지는 UI shell로 충분.

3. **인증 방식 확정**: next-auth(JWT) vs Supabase Auth. MVP가 단일 원장 계정이므로 Supabase Auth가 더 빠름(RLS 자동 연동). next-auth는 Supabase 없이 Docker 로컬 운영 시에만 의미 있음.

---

## 강점 (잘 된 부분)

1. **Gap Analysis 반영도 높음**: C1~C5 Critical 항목이 모두 domain-model.md에 반영됨. Case 필드 확장, OpsGoal, OrganizationSecret, AgentKey 신설.

2. **에이전트 실행 모델이 Paperclip과 정확히 정렬**: Wakeup→Claim→Context Injection→LLM→Approval Gate 흐름이 Paperclip의 HeartbeatRun 패턴을 충실히 이식. coalesce 중복 제거까지 포함.

3. **제로휴먼 레벨 체계 독창적**: Paperclip의 단순 Approval 게이트를 5단계 레벨(0~4)로 세분화한 것은 한국 학원 맥락에 맞는 좋은 적응. 원장이 개입 수준을 직관적으로 이해 가능.

4. **k-skill 생태계 설계 완성도**: prompt/tool/policy/composite 4종 타입 분류, MCP 래핑 전략, 조직별 선택 장착. Paperclip의 Skill 시스템보다 도메인 특화 확장성이 높음.

5. **한국 교육 도메인 모델**: Student(학년/과목/이탈점수), Parent(카카오연동/선호채널), Instructor(가용시간/급여), Schedule(7종 타입) 등 Paperclip에 없는 도메인 엔티티가 풍부하고 실용적.

6. **온보딩 설계**: 11개 진단 항목 → 추천 에이전트 팀 제안은 Paperclip의 단순 회사 생성보다 훨씬 사용자 친화적.

7. **IA 보강 완료**: Agent 상세 6탭, CommandPalette, 케이스 칸반 뷰, WebSocket 이벤트 정의가 gap analysis 이후 information-architecture.md에 추가됨.
