---
tags: [area/product, type/reference, status/active]
date: 2026-04-09
up: "[[hagent-os/README]]"
---

# Integrations (외부 연동)

> HagentOS가 연동하는 외부 서비스·API·MCP 서버 목록과 연동 방식.

---

## 연동 우선순위 매트릭스

| 연동 항목 | MVP 필수 | 난이도 | 실존 도구 |
|-----------|----------|--------|-----------|
| Google Calendar 양방향 동기화 | ✅ | 중 | `google-calendar-mcp` (TypeScript) |
| 알림톡 (학부모 대량 발송) | ✅ | 하 | `@solapi/mcp-server` (공식) |
| SMS 단문 발송 | ✅ | 하 | `aligo-sms-mcp-server` |
| 법령 검색 (학원법 등) | ✅ | 하 | `korean-law-mcp` (uvx) |
| 결제 PG 연동 | Phase 2 | 중 | `@portone/mcp-server` |
| 수능·모의고사 일정 | Phase 2 | 중 | data.go.kr API → 직접 래퍼 |
| 네이버 지역 검색 | Phase 2 | 하 | `kimcp` 또는 `py-mcp-naver` |
| 날씨·미세먼지 알림 | Phase 2 | 하 | `weather-mcp-server` |
| NEIS 학생 데이터 | v2 | 상 | open.neis.go.kr (개인정보 규제) |

---

## MVP 연동

**MVP 알림 채널**: in-app 알림 + 이메일만. 카카오/SMS는 v2. UX 문서의 카카오 중심 묘사는 v2 기준.

### Google Calendar (양방향 동기화)

| 항목 | 내용 |
|------|------|
| 인증 | OAuth 2.0 (refresh token 저장) |
| 연동 방향 | HagentOS → GCal (생성·수정·삭제), GCal → HagentOS (webhook push) |
| 사용 MCP | `nspady/google-calendar-mcp` (TypeScript, 가장 활성 유지) |
| 환경변수 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_WEBHOOK_SECRET`, `GOOGLE_CALENDAR_PUSH_CHANNEL_ID`, `GOOGLE_CALENDAR_CHANNEL_EXPIRY`, `GOOGLE_REFRESH_TOKEN` |

**연동 흐름:**
```
HagentOS Scheduler
  → Schedule 레코드 저장
  → google-calendar-mcp.createEvent()
  → GCal event ID 반환 → external_sync 업데이트
  → GCal webhook → /api/calendar/webhook → Schedule 상태 동기화
```

### 알림톡 (Solapi MCP — 공식)

> ==알림톡은 학부모 채널에서 SMS보다 열람률이 3배 높다. MVP에서 일반 카카오톡 대신 알림톡을 우선 구현한다.==

| 항목 | 내용 |
|------|------|
| MCP 패키지 | `@solapi/mcp-server` (Solapi 공식 배포, 2025년 출시) |
| 설치 | `npx --latest -y @solapi/mcp-server` |
| 지원 채널 | SMS, LMS, **카카오 알림톡**, 친구톡 |
| 선제 조건 | 카카오 비즈니스 채널 등록 + 알림톡 템플릿 사전 승인 |
| 환경변수 | `SOLAPI_API_KEY`, `SOLAPI_API_SECRET` |

**알림톡 vs 일반 카카오톡:**
- **알림톡**: 비즈니스 채널 기반, 템플릿 필수, 거래성 정보에 적합 (결석 알림·수업료 납부 안내 등)
- **일반 카카오톡(친구톡)**: 광고성 메시지, 채널 친구 추가 필요, 수신거부 위험
- 학원 실무에서는 알림톡이 표준 — Solapi MCP가 두 채널 모두 지원

**`claude_desktop_config.json` 등록:**
```json
{
  "mcpServers": {
    "solapi": {
      "command": "npx",
      "args": ["--latest", "-y", "@solapi/mcp-server"],
      "env": {
        "SOLAPI_API_KEY": "${SOLAPI_API_KEY}",
        "SOLAPI_API_SECRET": "${SOLAPI_API_SECRET}"
      }
    }
  }
}
```

---

## Phase 2 연동

### 법령 검색 (k-skill 에이전트용)

| MCP | 설치 | 용도 |
|-----|------|------|
| `korean-law-mcp` (chrisryugj) | `uvx korean-law-mcp` | 학원법·근로기준법·소방시설법 조문 체인 탐색, 89개 도구 |
| `south-korea-law-mcp` | npm | 개인정보보호법·PIPA 조항 검색 |

> `korean-law-mcp`는 `OPEN_LAW_ID` (law.go.kr OpenAPI 키) 필요.

### 결제 PG

| MCP | 용도 |
|-----|------|
| `@portone/mcp-server` | KG이니시스·카카오페이·토스페이먼츠 멀티 PG, 채널 조회·결제 내역 조회 |
| `@tosspayments/integration-guide-mcp` | 토스페이먼츠 문서 검색 → 코드 생성 보조 |

### 한국 통합 API — kimcp

`zeikar/kimcp`: Naver(블로그·뉴스·쇼핑·**지역검색**) + Kakao Maps + TMAP(대중교통 경로)를 단일 MCP로 통합. API 키 미설정 시 해당 도구 자동 비활성화.

```bash
npx -y kimcp
# 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, KAKAO_REST_API_KEY, TMAP_APP_KEY
```

> 기존 `py-mcp-naver` 대신 `kimcp` 우선 검토 — 카카오 지도·TMAP까지 포괄.

### 수능·모의고사 일정 (KICE)

전용 MCP 서버 없음. 아래 두 경로 중 선택:

1. **data.go.kr REST API** — 한국교육과정평가원 수능 기본정보 오픈 API 직접 호출 → Express API로 래핑
2. **정적 캘린더 시드** — 연초 1회 KICE 공식 일정(suneung.re.kr) 파싱 → `exam_schedule` 테이블에 적재, GCal로 자동 등록

권장: 옵션 2 (연간 시험 일정은 고정적 → API 호출 비용 불필요).

### 날씨·미세먼지

| MCP | 용도 |
|-----|------|
| `weather-mcp-server` | OpenWeatherMap 기반 5일 예보·AQI — 등원 복장 안내 자동 발송 트리거 |

---

## 향후 연동 (v2)

| 서비스 | 이유 |
|--------|------|
| NEIS (open.neis.go.kr) | 학교 기본정보·학사일정 — 개인정보 규제로 v2 이월 |
| 클래스업 어댑터 | 기존 학원의 데이터 마이그레이션 |
| HWP 처리 도구 | 가정통신문·공문서 파싱 |
| `dartpoint-mcp` | 운영법인 공시 정보 조회 (다점포 법인 학원 대상) |

---

## 환경변수 목록 (.env)

```env
# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Solapi (알림톡·SMS)
SOLAPI_API_KEY=
SOLAPI_API_SECRET=

# 한국 통합 API (kimcp)
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
KAKAO_REST_API_KEY=
TMAP_APP_KEY=

# 법령 검색
OPEN_LAW_ID=

# Claude API
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hagent_os_dev
```

> 런타임 MCP 등록 전체 목록: `[[.agent/system/registry/mcp-registry]]`
