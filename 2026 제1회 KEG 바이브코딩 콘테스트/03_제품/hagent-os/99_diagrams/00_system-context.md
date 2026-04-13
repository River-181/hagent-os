---
tags: [area/product, type/diagram, status/active]
date: 2026-04-09
up: "[[hagent-os/INDEX]]"
aliases: [system-context, 시스템-컨텍스트]
---
# System Context — HagentOS C4 Level 1

> 시스템 경계, 사용자, 외부 의존성을 한눈에 파악하는 컨텍스트 다이어그램.
> 기준 문서: [[02_product/prd]], [[07_integrations/integrations]]

## MVP 구현 경계

- `MVP Core`: Board, Agent Runtime, PostgreSQL, Claude API, in-app/email 알림
- `Optional in MVP demo`: Google Calendar
- `Deferred / v2`: Solapi Kakao/SMS, 기타 외부 MCP 실연

```mermaid
flowchart TD
    subgraph Users["사용자"]
        원장["🧑‍💼 원장 / 실장\n(사교육 운영자)"]
        강사["👩‍🏫 강사\n(수업 담당)"]
        학부모["👪 학부모\n(민원 제기자)"]
    end

    subgraph HagentOS["HagentOS 시스템"]
        Board["📋 Board (Web UI)\nReact 19 + Vite + Tailwind\n승인 대시보드 · 케이스 관리"]
        AgentRuntime["⚙️ Agent Runtime\nExpress v5 + TypeScript\nOrchestrator · 에이전트 실행 엔진"]
        DB["🗄️ PostgreSQL\nDrizzle ORM\nembedded-postgres (로컬)"]
    end

    subgraph External["외부 시스템"]
        ClaudeAPI["🤖 Claude API\nAnthropic Sonnet 4.6\nLLM 추론 엔진"]
        Korean["📜 korean-law-mcp\n학원법·개인정보보호법\n규정 검색 스킬"]
        Email["✉️ Email Provider\n승인/상태 알림\nMVP 알림 채널"]
        GCal["📅 Google Calendar\ngoogle-calendar-mcp\n선택적 MVP 연동"]
        Solapi["💬 @solapi/mcp-server\nKakao 알림톡 · SMS\nDeferred / v2"]
    end

    원장 -->|"케이스 등록 · 승인 · 모니터링"| Board
    강사 -->|"일정 확인"| Board
    학부모 -->|"민원 접수 (간접)"| Board

    Board -->|"REST API"| AgentRuntime
    AgentRuntime <-->|"Drizzle ORM"| DB

    AgentRuntime -->|"LLM 호출"| ClaudeAPI
    AgentRuntime -->|"MCP 스킬 실행"| Korean
    AgentRuntime -->|"승인/상태 알림"| Email
    AgentRuntime -.->|"일정 동기화 (선택)"| GCal
    AgentRuntime -.->|"카카오/SMS 발송 (v2)"| Solapi
```

---

## 시스템 경계 요약

| 영역 | 기술 | 역할 |
|------|------|------|
| Board (UI) | React 19 + Vite + Tailwind | 원장 인터페이스, 4존 레이아웃 |
| Agent Runtime | Express v5 + TypeScript (ESM) | 에이전트 실행, WakeupRequest dedup, k-skill 주입 |
| DB | PostgreSQL + Drizzle ORM | 모든 상태 영속화, 감사 추적 |
| LLM | Claude Sonnet 4.6 | 초안 생성, 분류, 계획 |
| 알림 | in-app + email | MVP 기본 알림 채널 |
| k-skill MCP | korean-law-mcp, gcal(optional), solapi(v2) | 한국형 외부 기능 확장 |
| 배포 | GitHub 오픈소스 설치형 + 랜딩 페이지 | Paperclip 배포 모델 |

## MVP 범위 (D5~D8)

```
In Scope:  Board + AgentRuntime + DB + Claude API + in-app/email
Optional:  Google Calendar 연동
Deferred:  Solapi Kakao/SMS, 기타 외부 메시징
```
