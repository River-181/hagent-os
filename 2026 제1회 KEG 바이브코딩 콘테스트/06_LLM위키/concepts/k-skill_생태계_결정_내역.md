---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-13
up: "[[index]]"
status: active
aliases:
  - k-skill decision record
  - k-skill ecosystem decisions
---
# k-skill 생태계 결정 내역

## Summary First

HagentOS는 “모든 기능을 코어에 직접 넣는 제품”이 아니라 “범용 agent 위에 한국형 skill을 장착하는 플랫폼”으로 방향을 고정했다. 이 결정 때문에 `Not Now` 항목은 버린 기능이 아니라 [[k-skill_생태계_결정_내역|k-skill 생태계]]로 넘긴 확장 슬롯이 된다.

## 이번 프로젝트의 결정

### 1. agent 코드는 범용, skill은 한국형

[[03_제품/hagent-os/04_ai-agents/agent-design]]의 설계 원칙은 명확하다.

- 에이전트 코드에 비즈니스 로직을 직접 넣지 않는다.
- 조직이 설치한 `skills[]`를 런타임에 주입한다.
- 새 도메인 확장은 agent 코드 수정보다 skill 추가로 푼다.

즉 차별점은 “에이전트 수”보다 “어떤 한국형 capability를 어떤 묶음으로 주입하느냐”에 있다.

### 2. 공급 구조를 4층으로 나눈다

[[03_제품/hagent-os/02_product/prd]]의 카탈로그 구조는 아래 4층이다.

1. 공식 스킬
2. 외부 MCP 서버 연동
3. `NomaDamas/k-skill` 생태계
4. 커뮤니티 스킬

이 구조는 HagentOS가 모든 도구를 직접 만들지 않아도 된다는 뜻이다. 오히려 “이미 존재하는 한국형 도구를 교육 운영 문맥으로 재포장하는 능력”이 핵심이다.

### 3. 외부 도구를 적극 활용한다

현재 문서에서 반복 확인되는 외부 연동 우선 전략은 아래다.

- `korean-law-mcp`
- `south-korea-law-mcp`
- `kakao-bot-mcp-server`
- `aligo-sms-mcp-server`
- `@portone/mcp-server`
- `@tosspayments/integration-guide-mcp`
- `py-mcp-naver`
- Google Calendar MCP
- Weather MCP
- 공공데이터 API
- HWP 처리 도구

이 결정은 “내부에서 다 새로 구현”보다 빠르고, KEG 심사에서 “실제 한국형 생태계를 읽고 붙일 줄 안다”는 인상을 준다.

### 4. `Not Now`는 제품 포기가 아니라 skill backlog다

[[03_제품/hagent-os/02_product/prd]]와 [[03_제품/hagent-os/02_product/mvp-scope]]는 공통적으로 아래 원칙을 갖는다.

- 출결/수납 자동화
- 생기부
- 차량 관리
- NEIS
- 세무/환불
- 법규 조회
- 엑셀
- HWP

이 항목들은 “이번 MVP에서 안 함”이 아니라 “코어 loop를 먼저 만들고 skill로 붙일 영역”으로 재분류됐다.

## “4번째 핵심 차별점” 표현 정리

이 표현은 문서마다 의미가 다르다. 혼용하면 헷갈린다.

### 비전 문서 기준 4대 차별점

[[03_제품/hagent-os/00_vision/core-bet]] 기준 4대 차별점은 아래다.

1. 역할 기반 AI 에이전트 오케스트레이션
2. k-skill 생태계
3. 데이터 자산화
4. 오픈소스 + 로컬 배포 옵션

즉 `k-skill`은 비전 문서 기준으로는 **2번째 차별점**이다.

### 검증 메모 기준 강점 4번

`_research/final-validation-opus.md`에서는 강점 4번이 `k-skill 생태계 설계 완성도`다. 여기서는 “번호 4번 강점”이지 “4대 차별점의 4번째 항목”이 아니다.

이 위키에서는 앞으로 아래처럼 구분해서 쓴다.

- 비전 차별점 4개 중 `k-skill`은 2번
- 검증 강점 목록에서는 `k-skill 설계 완성도`가 4번으로 등장

## 현재 제품 해석

- 심사에서 `k-skill 레지스트리`는 “앱이 아니라 플랫폼”이라는 증명 포인트다.
- agent는 범용 orchestrator/team 구조를 유지하고, 한국 교육 현장의 특수성은 skill/MCP로 흡수한다.
- 외부 도구 적극 활용은 구현 회피가 아니라 product leverage 전략이다.

## Related Pages

- [[학원_운영_k-skill_및_MCP_후보_맵]]
- [[역할기반_agent_skill_구조]]
- [[HagentOS_현재_아키텍처_상태]]
- [[멀티에이전트_운영_모델]]

## Source Trace

- [[03_제품/hagent-os/02_product/prd]]
- [[03_제품/hagent-os/02_product/mvp-scope]]
- [[03_제품/hagent-os/04_ai-agents/agent-design]]
- [[.agent/system/ops/PROGRESS]]
- [[.agent/system/memory/long-term-memory]]
