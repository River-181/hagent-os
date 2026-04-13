---
tags: [area/product, type/diagram, status/active]
date: 2026-04-09
up: "[[hagent-os/INDEX]]"
aliases: [ia-screen-map, 화면구조-맵]
---
# IA / Screen Map — 정보 아키텍처

> 22개 라우트 계층 구조 + 4존 레이아웃 요약.
> 기준 문서: [[information-architecture]], [[_research/paperclip-ui-reference]]

## 라우트 계층 맵 (MVP Core 우선)

```mermaid
graph TD
    Root["/"] --> OrgRoot["/학원명\n기관 루트"]
    Root --> Login["/auth\n인증\nMVP 단일 원장 계정"]
    Root --> Onboarding["/[org]/onboarding\n기관 온보딩\n기관 정보 + 추천 팀 구성"]

    OrgRoot --> Dashboard["/dashboard\n📊 대시보드\n에이전트 현황 + 4개 지표 차트"]
    OrgRoot --> Inbox["/inbox\n🔔 알림함\nunread count 배지"]
    OrgRoot --> Cases["/cases\n📋 케이스 목록\n상태별 그룹핑 (IN PROGRESS / TODO / BLOCKED)"]
    OrgRoot --> Approvals["/approvals\n✅ 승인 큐\n대기 중 (N) / 전체 탭"]
    OrgRoot --> Schedule["/schedule\n📅 통합 스케줄러\n상담/강사/법정기한"]
    OrgRoot --> Agents["/agents\n🤖 에이전트 팀\n목록"]
    OrgRoot --> Settings["/settings\n⚙️ 설정\n기관 프로필 / 연동 / 멤버"]

    Cases --> CaseDetail["/cases/:id\n케이스 상세\nZone2 본문 + Zone3 속성 패널"]
    CaseDetail --> RunDetail["/cases/:id/runs/:runId\n에이전트 실행 상세\n로그 + 출력 + 토큰 사용량"]
    Approvals --> ApprovalDetail["/approvals/:id\n승인 상세\n승인 / 편집 / 반려"]

    Agents --> AgentDetail["/agents/:id\n에이전트 상세\n4개 차트 + 실행 이력 + 지시사항"]

    subgraph Later["Should / v2"]
        OrgRoot --> OrgChart["/org-chart\n🌳 에이전트 조직도\n계층 카드 트리"]
        OrgRoot --> Goals["/goals\n🎯 운영 목표\nOpsGoal 계층"]
        OrgRoot --> Skills["/skills\n🔧 k-skill 레지스트리\n공식 / 외부 MCP / 커뮤니티"]
        OrgRoot --> Routines["/auto-runs\n⏰ 자동 실행\nHeartbeat 크론 스케줄"]
        OrgRoot --> Budget["/budget\n💰 API 예산\n에이전트별 토큰 예산"]
        OrgRoot --> Activity["/activity\n📜 처리 이력\n감사 로그 타임라인"]
        Agents --> AgentNew["/agents/new\n에이전트 생성"]
        Settings --> SecretsSettings["/settings/secrets\n기관 시크릿 / 환경변수"]
        Settings --> MemberSettings["/settings/members\n멤버 관리 (v2)"]
    end
```

---

## 4존 레이아웃

```mermaid
graph LR
    subgraph Layout["브라우저 뷰포트"]
        Z0["Zone 0\n72px\n기관 레일\n기관 스위처\n내비게이션 아이콘"]
        Z1["Zone 1\n240px\n사이드바\n기관명 + 검색\n+ 새 케이스 버튼\n섹션별 nav"]
        Z2["Zone 2\nflex-1\n메인 콘텐츠\nBreadcrumbBar sticky\nmain p-4/p-6\nOutlet"]
        Z3["Zone 3\n320px\n속성 패널\n케이스/에이전트 상세\nhidden on mobile"]
    end

    Z0 --- Z1 --- Z2 --- Z3
```

**모바일**: Zone 0+1 → z-50 fixed overlay (스와이프). Zone 3 → 숨김. 하단 탭바 5개 고정.

---

## 사이드바 섹션 구조

```
기관명 [로고]          [🔍]
[+ 새 케이스 등록]    ← 최상단 CTA

대시보드              [• 1 live]
알림함                [3]

─ WORK ──────────────────────────
  케이스
  자동 실행           [Beta]
  운영 목표

─ 운영 영역 ────────────────── [+]
  • 학부모 커뮤니케이션
  • 이탈 방어
  • 일정 관리

─ 에이전트 팀 ──────────────── [+]
  ○ 오케스트레이터    [• 1 live]
  ○ 민원 담당
  ○ 이탈 방어
  ○ 스케줄 담당

─ 기관 관리 ─────────────────────
  조직도
  k-skill 레지스트리
  API 예산
  처리 이력
  설정

─ (footer) ──────────────────────
  v0.1.0  [docs]  [⚙️]  [🌙/☀️]
```

---

## MVP 화면 우선순위

| 우선순위     | 라우트                    | 이유                  |
| -------- | ---------------------- | ------------------- |
| **Must** | `/[org]/onboarding`    | 기관 생성 + 추천 팀 선택     |
| **Must** | `/dashboard`           | 진입점 + 에이전트 현황       |
| **Must** | `/cases`               | 케이스 목록              |
| **Must** | `/cases/:id`           | 케이스 상세 + 에이전트 실행 결과 |
| **Must** | `/approvals`           | 원클릭 승인 흐름           |
| **Must** | `/approvals/:id`       | 편집 후 승인 / 반려        |
| **Must** | `/schedule`            | 통합 스케줄러             |
| **Must** | `/agents/:id`          | 에이전트 상태 모니터링        |
| Should   | `/org-chart`           | 데모 임팩트              |
| Should   | `/skills`              | k-skill 생태계 시연      |
| Later    | `/budget`, `/activity` | v1.1                |
