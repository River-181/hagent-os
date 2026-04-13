---
tags: [area/product, type/reference, status/active, workflow/execution]
date: 2026-04-09
up: "[[hagent-os/README]]"
---
# Open Questions

## 기술

### 🚨 스프린트 범위 조정
**상태**: ⏳ D5 Opus 검증 권고
- **이슈**: D5-D8 4일 안에 DB 15개 테이블 + 에이전트 3개 + 대시보드 + 배포는 2명에게 과부하.
- **권장**: **민원 처리 단일 흐름**(케이스 생성→Complaint Agent 실행→승인 카드→발송) 완성 후 확장.
- **결정**: D5 목표를 이것으로 좁혀야 하는가? 승이 Opus로 재검증.

### 🚨 member/auth 모델 — MVP 단일 계정 확정
**상태**: ✅ MVP 결정 완료
- **결정**: MVP는 원장 단일 계정. 실장/강사 멀티 계정은 Phase 1.
- **MVP 구현**: local_trusted 모드 (인증 없이 시작), academy_id 기반 데이터 격리
- **영향**: 온보딩 단순화, RLS 불필요 (앱 레벨 필터), D5 스키마 설계 반영 필수

### 🚨 Approval-Case-AgentRun 연결 스키마
**상태**: ⏳ D5 스키마 확정 시 결정
- **질문**: Case가 생성될 때 AgentRun ID를 어떻게 연결하는가?
  - Option A: Case 생성 → AgentRun 동기 생성, `case_id` FK로 연결
  - Option B: AgentRun 완료 후 Case 생성, `agent_run_id` FK로 역참조
- **권장**: Option A (Complaint Agent가 Case를 먼저 만들고, AgentRun은 Case에 종속)
- **결정**: D5 저녁 승+용 협의, DB 마이그레이션 파일에 반영

### 🚨 GCal webhook 보안
**상태**: ⏳ D7 구현 전 결정
- **질문**: Google Calendar 단방향 동기화 MVP에서 webhook secret 검증 방식?
  - push channel 등록: `events.watch()` API 호출, `token` 파라미터로 secret 설정
  - 갱신: push channel 만료(기본 7일) 시 재등록 필요 — MVP는 수동 갱신 허용
- **대회 범위**: 로컬 테스트만, OAuth 도메인 검증 생략
- **결정**: D7 착수 전 승이 GCal API 문서 확인 후 확정

### 🚨 MVP 알림 채널 단일화
**상태**: ✅ 결정 완료 (PRD 기준)
- **MVP**: in-app 알림 + 이메일만
- **제외 (v2+)**: 카카오톡 / SMS
- **근거**: 대회 일정(D-4) 내 카카오/SMS 연동 불가, PRD 우선순위 반영
- **영향**: Approval Dashboard 알림 아이콘, 이메일 발송 Node.js 백엔드 API로 구현 (Nodemailer/SendGrid)

### Claude API 병렬 에이전트 비용 실측
**상태**: ⏳ D6에 결정
- 학원 1곳 기준: Orchestrator + Complaint Agent + Retention Agent 3개 동시 실행
- 예상: 한국 학원(월 50~200학생) 기준 월 토큰 X → 비용 Y
- **결정점**: 에이전트 간 순차/병렬 전환, 배치 크기 최적화
- 영향: 수익화 모델, 초기 가격 책정

### 🚨 DB 로컬 개발 환경 설정
**상태**: ✅ PostgreSQL + Drizzle ORM + embedded-postgres 확정
- **로컬 개발**: embedded-postgres로 자동 시작 (별도 Docker 불필요)
- **연결**: `.env`에 `DATABASE_URL=postgresql://...` 설정 (embedded-postgres가 자동 생성)
- **스키마 초기화**: `npm run db:migrate` (Drizzle Kit 마이그레이션)
- **Mock 데이터**: `npm run db:seed` 스크립트로 투입
- **배포**: 외부 PostgreSQL URL 지정 (Neon, AWS RDS, Railway 등 유연)

### 데이터 격리 및 권한 관리
**상태**: ⏳ MVP는 애플리케이션 레벨 (기본)
- **로컬 개발**: RLS (Row Level Security) 불필요
- **프로덕션**: `academy_id` 기반 쿼리 필터 (세션 정보 사용)
- **결정**: MVP에서는 JWT 기반 세션 검증으로 충분, RLS는 Phase 1

### Google Calendar 단방향 동기화 MVP
**상태**: ⓘ 선택사항, D7에 시도
- **범위**: 읽기 전용 (학원 일정 → 캘린더 뷰 표시), 양방향 동기화는 Phase 1
- OAuth 동의화면 도메인 검증: 대회 제출은 로컬 테스트만 허용
- **결정**: D7 Scheduler UI와 함께 구현 시도, 시간 부족 시 Phase 1으로 이동

---

## 제품 & 기능

### 온보딩 최소 입력 필드 확정
**상태**: ⓘ 설계 중
- **MVP 버전**: 학원명, 운영자명, 학생 1명 추가 (3개 필드)
- **현재 고민**:
  - 학원 카테고리 (태권도/영어/수학) → 대회는 일반화, Phase 1에서 추가
  - 환불 정책 템플릿 → MVP에서 하드코딩 vs 선택지 제공
  - 신청비 vs 수강료 → 최소 몇 개 항목 관리
- **결정**: D5 저녁, 이승보 + 김주용 협의

### Approval Dashboard 카드 UI 우선순위
**상태**: ⓘ D7 구현
- **구현 범위**: 카드 레이아웃 (Case 요약, 분류 태그, AI 초안), 승인/편집/반려 원클릭, 모바일 반응형
- **제외**: 보호자 서명, 거절 사유 멀티스텝 (v2 고려)
- **기준**: 심사자가 모바일에서 15초 이내 한 건 처리 가능

### k-skill 레지스트리 MVP 범위
**상태**: ⓘ 대회에서 최소화
- **대회 MVP**: HagentOS 기본 에이전트 목록 표시 UI (Complaint, Retention, Orchestrator)
- **제외**: 학원이 에이전트 패키징/업로드하는 마켓플레이스 → Phase 2
- **결정**: D8에 단순 목록 UI만 구현

---

## 도메인 & 비즈니스 규칙

### 학원 유형별 Mock 데이터 현실성
**상태**: ⏳ D5 데이터셋 투입 시 검증
- **기준**: 학생 20명, 민원 5건, 강사 3명, 수업 일정 (영어학원 기준)
- **검증 필요**:
  - 민원 유형 다양성 (수강료, 환불, 일정 변경, 강사 교체)
  - 이탈 신호 패턴 (결석 3회 이상, 미납, 상담 요청)
- **영향**: 대회 심사 시 도메인 신뢰성 평가

### 환불 계산 공식 법적 검토
**상태**: ⓘ 미검토 (대회 가정 사용)
- **현재 로직**: 선납금: `잔여일 × 일일비용`, 환불 수수료: 일괄 10% (가정)
- **법적 이슈**: 학원법 시행령 환불 수수료 상한선, 지역별/유형별 상이한 규정
- **결정**: Phase 1 법률 자문 필요, 대회는 "일반적 사례" 가정

---

## 비즈니스 & 운영

### 대회 후 오픈소스 라이선스 결정
**상태**: ⏳ 대회 제출 후 협의
- **선택지**: Apache 2.0 / GPL-3.0 / MIT / Proprietary (k-skill 생태계만 공개)
- **영향**: Phase 1 베타 모집 방식, 개발자 커뮤니티 형성 속도

### 첫 베타 학원 모집 전략
**상태**: ⓘ 미정
- **후보**: 이승보/김주용 개인 네트워크 (3~5곳), K-venture 커뮤니티, edtech 커뮤니티
- **결정**: 대회 결과 후 (4/15 이후) 수립

---

## 우선순위 결정 트리

| 질문 | 대회 전 필수? | 언제 | 담당 |
|------|-------------|------|------|
| member/auth MVP 단일 계정 | ✅ 확정 | D5 스키마 반영 | 용 |
| Approval-Case-AgentRun 스키마 | ✅ 예 | D5 저녁 | 승+용 |
| GCal webhook 보안 방식 | ⚠️ D7 전 | D7 착수 전 | 승 |
| MVP 알림 채널 (in-app+이메일만) | ✅ 확정 | D6 구현 반영 | 용 |
| Claude API 비용 | ✅ 예 | D6 | 승 |
| RLS 정책 수준 | ⚠️ 기본만 | D5 | 용 |
| Google Calendar (단방향 MVP) | ⚠️ 선택 | D7 | 용 |
| 온보딩 필드 | ✅ 예 | D5 저녁 | 승+용 |
| Approval Dashboard UI | ✅ 예 | D7 | 용 |
| k-skill 레지스트리 UI | ⚠️ 최소만 | D8 | 용 |
| 환불 공식 | ⚠️ 가정만 | D5 | 승 |
| 오픈소스 라이선스 | ❌ 아니오 | 4/15 | 승+용 |
| 베타 모집 전략 | ❌ 아니오 | 4/15 | 승+용 |
