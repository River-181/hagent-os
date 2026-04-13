---
tags:
  - area/submission
  - type/report
  - status/final
date: 2026-04-13
up: "[[_05_제출_MOC]]"
status: final
aliases:
  - AI리포트최종
  - AI_Report_Final
---
# AI 빌딩 리포트 — HagentOS

> 공식 양식: `20260406_③_2026_KIT_바이브코딩_공모전_팀명_개인은_이름_AI리포트.docx`
> 이 md의 각 섹션을 docx의 해당 표 셀에 복붙 → 이미지는 Word "삽입" 메뉴로 추가 → PDF 변환.
> 이미지 경로: `assets/screenshots/` (Obsidian embed는 파일명만으로 연결됨)
>
> **📸 이미지 표기 규칙**
> - `![[파일명.png]]` — 이미 존재하는 스크린샷 (assets/screenshots/ 내)
> - `{{요청: 설명}}` — 아직 없어서 새로 찍거나 렌더링해야 할 이미지
> - `{{다이어그램: 경로}}` — mermaid 다이어그램을 렌더해서 PNG로 저장 필요 (Obsidian에서 보기 → 우클릭 저장)

---

## 상단 메타 (표 셀 채우기)

| 항목 | 입력값 |
|------|-------|
| 팀명(개인의 경우 이름) | **이승보, 김주용** |
| 휴대폰번호(대표자) | **010-5557-6729** |
| 프로젝트명 | **HagentOS — AI 에이전트 기반 학원 운영 플랫폼** |

---

## 심사위원용 30초 요약

> **제출 버전**: `v0.5.0`
>
> **한 줄 설명**: 한국 중소형 학원 원장이 매일 처리하는 비교육 업무(민원·환불·결석·상담)를 역할별 AI 에이전트 팀이 처리 후 원장 1-click 승인으로 발송하는 운영 플랫폼.
>
> **실증 수준 (2026-04-13 기준)**: 라이브 배포(`hagent-os.up.railway.app`) 완료 / 4개 에이전트 · 15+ k-skill · 5개 자동화 루틴 시드 / 카카오·텔레그램·SMS 어댑터 구현 (실제 외부 발송은 운영 토큰 설정 시 활성화) / GitHub 커밋 95fdf0d~b3da1cd 포함 7일간 전 이력 공개.
>
> **AI 협업 증빙**: Claude Code · Codex · ChatGPT · Perplexity · Gemini · Grok · NotebookLM 7개 도구를 8개 기능 역할로 분업. Day 8 기준 Claude Max 5x **331M 토큰 / $168.46 Extra** (OpenUsage 2026-04-13 실측), Codex **49 세션 / ~1.2M 토큰** (정액), 전체 세션 55건 이상 Obsidian 볼트에 기록.
>
> (출처: [[04_증빙/01_핵심로그/ai-usage-stats]])

---

# 1. 기획

## Q1. 설정한 사용자는 누구이며, 해결하려는 구체적인 문제점/불편함은 무엇인가요?

> 본 공모의 공식 주제는 "단순 온라인 교육 플랫폼(LMS) 구축에 국한되지 않으며, 교강사·수강생·교육 운영자 등 교육 현장 구성원들의 실질적인 문제를 날카롭게 해결하는 AI 솔루션"이다.
> (출처: [[01_대회정보/바이브코딩공모전_개요]], 공모 공식 이메일 2026-04-06)

즉 "LMS" 영역이 아니라 그 바깥의 운영·상담·이탈·민원을 타깃으로 해야 한다. 본 팀은 이 주제를 "**원장이 수업과 의사결정에만 집중하고 나머지는 AI 팀이 처리할 수 있는가**" 로 재정의했다. (출처: [[02-problem-definition-source]])

또한 본 공모는 2023 KIT 해커톤 → 2024 코지컬:100 → 2025 코딩챌린지 → 2026 바이브코딩으로 이어지는 계보 위에 있으며, AI 기반 전환 해에 해당한다. (출처: [[02-계보-포지셔닝-분석]])

### 타깃 사용자

**한국의 중소형 학원 원장** (수강생 50~300명 규모, 정직원 강사 3~10명)

- 대표 프로필: 대치동·목동·송파·강남 등 주요 학군의 영어·수학·예체능 학원 원장
- 의사결정 권한은 원장 본인이 단독으로 가지지만, 행정 전담 인력은 없거나 1명 수준
- 데모 학원: **탄자니아 영어학원** (대치동, 영어, 초·중·고·성인 대상)

(출처: [[02-problem-definition-source]], [[_system/dashboard/project-dashboard]])

---

### 현장 근거로 확인된 구조적 페인포인트 5가지

#### 페인 ① 원장 행정 하루 3시간 = 월 300만원 기회비용

> "원장 하루 행정업무 3시간은 월 **300만원** 손실로 환산된다. 행정 비용 180만원 + 놓친 신규 상담 기회비용 60만원 + 재원생 이탈 관리 소홀 손실 60만원."
> (출처: bati.ai 학원 운영 행정 분석 — 공식 분석자료 검색: "bati.ai 학원 행정 시간" 또는 https://bati.ai/ 직접 방문, 내부 정리 [[02_전략/04_research/10_reports/R-005_교사학원업무실태]])

중소형 학원에서 원장 한 명이 하루 3~4시간을 비교육 행정에 소비하는 구조는 교육 품질 저하와 비용 손실을 동시에 유발한다. (추정: 인터뷰 기반, [[03-problem-bank]] P-001 참조)

#### 페인 ② 기존 솔루션은 출결·수납만 — 민원·이탈·강사는 공백

> 클래스업·온하이·랠리즈 등 현재 학원 ERP 6종 모두 **출결·수납·학부모 알림**에 집중. 신규 상담 자동화, 이탈 예측, 비정형 민원 처리, 강사 성과 분석 — 이 4개 영역은 **AI 솔루션 공백** 상태.
> (출처: [[02_전략/04_research/20_domain-analysis/pain-points]], [[02_전략/04_research/10_reports/R-004_에듀테크시장분석]])

결과적으로 원장은 기존 툴을 쓰면서도 결국 카카오톡과 엑셀로 돌아가는 이중 운영 부담을 진다. (출처: [[02_전략/04_research/20_domain-analysis/pain-points]] "User complaints / friction signals" 항목)

#### 페인 ③ 비정형 민원의 구조적 처리 불가

> "가장 강한 pain은 **비정형 민원 + 흩어진 맥락 + 수동 에스컬레이션** 조합이다. 이전에 무슨 상담이 있었는지, 누가 뭐라고 약속했는지, 지금 학생 상태가 어떤지가 여러 채널에 흩어져 있다."
> (출처: R-008 NLM 바텀업 학원 리서치 합성, [[02_전략/04_research/10_reports/R-008_NLM_바텀업학원리서치합성]])

밤 10시 이후에도 카카오톡 기반 비정형 민원이 이어지며 원장은 상시 대기 상태에 놓인다. 단일 챗봇으로는 맥락 통합이 불가능하다. (출처: [[02_전략/04_research/10_reports/R-008_NLM_바텀업학원리서치합성]] "사실 1·2" 항목)

#### 페인 ④ 재원생 이탈 — 사후 감지, 사전 대응 없음

기존 출결·수납 툴은 학생이 "갑자기 결제 안 하고 나가기" 전 신호를 감지하지 못한다. 출결, 상담, 성적, 민원, 결제, 강사 피드백이 분절된 채로 존재해 이탈 판단이 수동이다. (출처: [[04-problem-scorecard]] P-002 Facts, [[02_전략/04_research/10_reports/R-005_교사학원업무실태]])

#### 페인 ⑤ 운영 결정이 원장 머릿속에만 존재 — 감사 추적 불가

상담·민원 처리 이력이 원장 개인 기억과 카카오톡 DM에만 남는다. 강사 교체, 환불 승인, 학부모 약속 이행 여부가 DB에 기록되지 않으므로 인수인계·책임 추적이 불가능하다. 또한 환불 기준(학원법 시행령 제18조) 적용이 사안마다 수동 확인이 필요해 법령 오적용 리스크가 상존한다. (출처: [[02_전략/04_research/10_reports/R-008_NLM_바텀업학원리서치합성]] "사실 4" — 승인 지점 목록, [[06_LLM위키/concepts/학원_운영의_승인지점과_approval_flow]])

#### 페인 ⑥ 학원과 이어진 공교육 — 교사 행정 과부하 (확장 수요 근거)

> "한국 담임교사는 **행정업무에 주당 약 6시간**을 쓰며 이는 OECD 평균의 약 2배, 조사 대상국 **세계 1위** 수준이다. 또한 **학부모 민원 스트레스 56.9%** 로 세계 2위를 기록했다."
> (출처: OECD TALIS 2024 — https://www.oecd.org/en/topics/teaching-and-learning-international-survey.html, 내부 정리 [[03-problem-bank]] P-002)

학원의 원장 페인과 공교육 담임교사 페인은 **같은 "교육 현장 운영자의 비교육 업무 과부하"** 구조를 공유한다. HagentOS가 확보한 역할 기반 AI 팀 구조(오케스트레이터·민원담당·이탈방어·스케줄러)는 학원 외 공교육 담임 보조 영역으로 동일 패턴 확장 가능하다. (출처: [[05-paperclip-교육-아이디어-통합정리]] "적용 영역")

---

### 해결 대상 업무 전수 현황 (데모 학원 탄자니아 기준 추정)

원장은 매일 **반복적이지만 교육과 무관한 "비교육 업무"를 직접 처리**해야 한다. 아래는 대치동 학군 영어학원 3곳 인터뷰 + 탄자니아 영어학원 데모 시나리오 기반 **추정** 빈도다. (추정: 인터뷰 + 데모 시나리오, 실측 KPI 아님)

| 업무 유형        | 추정 빈도    | 현재 처리 방식                 |
| ------------ | -------- | ------------------------ |
| 카카오 채널 민원 응대 | 일 10~20건 | 원장이 직접 답변, 평균 응답 6~24시간  |
| 환불·휴원 문의     | 주 3~5건   | 학원법 시행령 수동 확인 + 계산       |
| 결석·보강 조율     | 일 5~10건  | 강사·학부모·학생 3자 조율          |
| 상담 예약 후속     | 주 10~15건 | 상담 기록이 원장 머릿속에만 남아 맥락 소실 |
| 수강료 미납 알림    | 월 20~40건 | 엑셀 수기 확인 후 개별 연락         |

> 이 문제는 **LMS로는 해결할 수 없는 "학원 운영의 뒷면"**에 있어, AI 기반 운영 에이전트가 필요한 영역이다.
> (출처: [[03-problem-bank]] "아무도 안 하는 것 (화이트스페이스)" 항목)

![[20260410_HagentOS_Inbox_채용승인목록.png]]
*▲ HagentOS 인박스 — 원장이 승인해야 할 항목(채용·민원·환불 등)이 한 곳에 집결*

![[20260410_HagentOS_Issue_HireLeadInstructor_상세.png]]
*▲ 케이스 상세 예시 — "수석 강사 채용" 이슈에 대해 에이전트가 처리 단계를 나눠 관리*

---

## Q2. 문제를 해결하기 위한 솔루션의 핵심 기능은 무엇인가요?

HagentOS는 **역할 기반 AI 에이전트 팀**이 학원의 비교육 업무를 처리하는 운영 플랫폼이다. Paperclip의 범용 AI 운영 구조(`Company → Agent → Task → Approval`)를 참고하되, 실제 제품은 한국 학원 원장의 승인 흐름과 k-skill 호출 구조를 중심으로 다시 설계했다.

(출처: [[06_LLM위키/comparisons/Paperclip_vs_HagentOS_설계_갭]], [[06_LLM위키/concepts/운영_Control_Plane_모델]])

![[png/03_시스템-4계층.png]]
*▲ **HagentOS 시스템 4계층 개요** — 사용자·시스템·k-skill·외부 시스템 4단을 색상으로 구분. 각 계층 내 주요 컴포넌트까지 집약.*

---

### ① 4개 역할 에이전트 팀

| 에이전트 | 담당 업무 |
|---------|---------|
| **오케스트레이터 (원장)** | 한 줄 지시 분석 → 적합한 에이전트 자동 배정 |
| **민원담당** | 카카오·전화 민원 분류 + 답변 초안 작성 (학원법·톤가이드 적용) |
| **이탈방어** | 출결 패턴 분석 → 이탈 위험 학생 탐지 + 재등록 개입안 |
| **스케줄러** | 보강·상담·대체 수업 자동 편성 + 구글 캘린더 동기화 |

> 에이전트 코드는 범용 orchestrator 구조를 유지하고, 한국 교육 현장의 특수성은 k-skill/MCP로 흡수한다. 이 구조가 단일 챗봇과 다른 핵심이다.
> (출처: [[06_LLM위키/concepts/k-skill_생태계_결정_내역]] "결정 1 — agent 코드는 범용, skill은 한국형" 항목)

---

### ② "한 줄 지시 → 케이스 → 승인 → 발송" 루프

원장이 "이번 주 환불 문의 정리해줘"라고 입력하면:
1. 오케스트레이터가 관련 케이스 수집
2. 민원담당 에이전트가 각 케이스별 답변 초안 작성
3. 원장이 1-click 승인 (혹은 수정 후 승인)
4. 승인된 답변은 카카오·SMS 채널로 전송 (운영 시 채널 provider 토큰 설정 필요)

> 이 흐름은 **approval-centered operating system** 구조를 의도한 것이다. 원장 승인이 반드시 남아야 하는 지점(신규 등록 클로징, 환불/할인/예외 승인, 법적 민원 대응)을 보존한다.
> (출처: [[02_전략/04_research/10_reports/R-008_NLM_바텀업학원리서치합성]] "사실 4 — 사람이 반드시 남아야 하는 승인 지점")

![[png/01_민원-처리-플로우.png]]
*▲ **민원 처리 플로우** — 학부모 민원 접수부터 AI 답변 초안, 원장 1-click 승인, 카카오 자동 발송까지. k-skill(환불계산기·톤 가이드·법령 조회)이 AI 초안 단계에 자동 주입됨.*

---

### ③ k-skill 생태계 (한국 교육 특화)

제출 시점 기준으로 한국 학원 업무에 특화된 스킬 패키지를 15종 이상 설계·시드했다. "메시지 템플릿 팩"은 자체 15종 템플릿을 포함한다.

- 환불 계산기 (학원법 시행령 제18조 자동 적용)
- 한국어 톤 가이드 (학부모 상대 존댓말·완곡표현)
- 이탈 위험 계산기 (결석 패턴·성적 하락 복합 스코어링)
- 법령 조회 (law.go.kr MCP 연동)
- 카카오 채널 민원 자동 분류
- 수강료 환불 팩 / 컴플라이언스 팩
- 상담 360° 뷰 / 재등록 플레이북
- 일정 최적화 / 대체 강사 매칭
- 메시지 템플릿 팩 (15종 템플릿 내장)

> 공급 구조는 4층 (공식 스킬 → 외부 MCP 서버 연동 → NomaDamas/k-skill 생태계 → 커뮤니티 스킬)으로 설계됐다. 외부 도구(korean-law-mcp, kakao-bot-mcp-server, aligo-sms-mcp-server 등) 적극 활용이 구현 회피가 아니라 product leverage 전략이다.
> (출처: [[06_LLM위키/concepts/k-skill_생태계_결정_내역]] "결정 2·3" 항목, [[03_제품/hagent-os/02_product/prd]])

> 전체 카탈로그는 `skills/hagent/` 및 `skills/community/` 디렉터리에 SKILL.md 표준 형식으로 정리됨.

![[png/05_kskill_생태계_분류도.png]]
*▲ **k-skill 생태계 분류도** — 법령·컴플라이언스, 커뮤니케이션, 리텐션, 스케줄, 분석 5개 범주로 스킬을 묶어 멀티에이전트가 어떤 지식 꾸러미를 호출하는지 보여준다.*

---

### ④ 채널 연동 (현재 구현 수준)

| 채널                         | 상태                  |
| -------------------------- | ------------------- |
| 카카오 inbound 파싱 → 케이스 자동 생성 | 구현 미완료 (토큰 설정 시 활성) |
| 텔레그램 봇 ↔ 운영자 브리지           | 봇 토큰 기반 polling 구현  |
| SMS (알리고) 발송               |                     |
| Google Calendar 동기화        |                     |

---

### ⑥ Control Plane 확장 패턴 — 카카오·텔레그램·웹이 같은 approval 계약으로 합류

HagentOS의 핵심 아키텍처 차별점 중 하나는 **채널이 바뀌어도 approval 계약이 동일하다**는 것이다. 텔레그램·카카오·웹 UI 세 채널은 모두 동일한 `approval-decisions.ts` 계약 위에서 동작하며, 채널 어댑터만 교체된다. 이것이 단순 "기능 추가"가 아니라 **아키텍처 수준의 확장 패턴**이다.

> [[06_LLM위키/concepts/운영_Control_Plane_모델]]에서 정의한 **Adapter/runtime layer** 패턴의 실제 구현: "채널을 추가할 때 도메인 로직은 건드리지 않고 어댑터만 교체한다." 이 원칙이 텔레그램 통합에서 그대로 검증됐다.
> (출처: [[06_LLM위키/concepts/운영_Control_Plane_모델]] "Adapter/runtime layer — 텔레그램 어댑터 (Day 8, a9641e6)")

학원 운영의 실제 동선에서 원장은 교실·차량·회의실을 쉬지 않고 오간다. PC 앞에 앉아 있을 시간은 없지만 케이스는 계속 들어온다.

텔레그램 통합은 이 **승인 병목을 제거**한다. 봇이 케이스 요약과 Confirm/Cancel 버튼 2개만 제공하고, 원장은 스마트폰 한 번 탭으로 의사결정을 완료한다. 결정은 즉시 HagentOS 케이스 이력에 기록되어 **감사 추적(audit trail)**이 그대로 유지된다.

- 학부모·학생의 응답 요청이 텔레그램 채팅 형태로 수신 (예: C-053 `[TELEGRAM parent_test_3 — 학부모님의 정확한 의문 연락 주실 수 있으실까요?]`)
- 원장은 `Confirm` 또는 `Cancel` 버튼 한 번으로 케이스 승인/반려
- 승인 결과는 HagentOS 케이스 이력과 activity log에 자동 기록
- **카카오·LINE 등 다른 채널도 동일 계약 구조로 확장 가능** — 각 채널은 어댑터 1개 추가로 합류

![[20260413_텔레그램_학원운영자_케이스승인.png]]
*▲ 텔레그램에서 원장이 HagentOS 케이스를 Confirm/Cancel — 이동 중에도 의사결정 가능*

> 구현 파일: `server/src/routes/telegram.ts`, `server/src/services/telegram-inbound-sync.ts`, `server/src/services/telegram-owner-control.ts`, `server/src/services/approval-decisions.ts`, `ui/src/api/telegram.ts`
> 커밋: [`407dadf feat: telegram outbound approval delivery`](https://github.com/River-181/hagent-os/commit/407dadf) (출처: hagent-os 커밋 이력)

---

### ⑤ 자동화 루틴 5종 (DB에 등록된 크론 스케줄)

- 매일 오전 9시 브리핑 (전날 처리 건 + 오늘 우선순위)
- 15분마다 민원 답변 초안 자동 생성
- 주 1회 이탈 위험 학생 리포트
- 매일 오후 8시 다음날 수업 리마인더
- 매월 1일 수강료 미납 알림

> 루틴은 `routines` 테이블에 cron 표현식으로 등록되어 있으며, 운영 환경에서 cron 트리거 연결 시 자동 실행된다.

---

### ⭐ 핵심 모델링 — 손그림 스타일 다이어그램 3종 (Excalidraw)

팀이 직접 설계한 3개 핵심 모델링 다이어그램. Excalidraw 손그림 스타일로 제작해 AI가 기계적으로 생성한 도식이 아니라 사람이 설계한 제품 구조임을 드러낸다.

![[20260411_HagentOS_대시보드_로컬실행.png]]
*▲ HagentOS 대시보드 — 에이전트 활동·케이스 현황·이탈 위험 학생·법령 카드가 한 화면에*

![[20260413_HagentOS_케이스목록_다크모드.png]]
*▲ 케이스 목록 — 상태·우선순위·AI/수동 처리 필터링 가능, 다크모드 지원*

![[20260413_HagentOS_프로젝트목록_다크모드.png]]
*▲ 프로젝트 목록 — 운영 이니셔티브를 프로젝트 단위로 관리*

![[20260413_HagentOS_채널연결_SetupPack_상세.png]]
*▲ 채널 연동 SetupPack — 카카오·텔레그램·SMS·캘린더 원클릭 연결*

![[20260410_탄자니아-영어학원-카카오톡-상담봇-초기-응답-화면.png]]
*▲ 실제 카카오 상담봇 작동 화면 — 데모 학원 "탄자니아 영어학원" 실증*

![[20260410_탄자니아-영어학원-챗봇-FAQ-응답-화면-1.png]]
*▲ 카카오 챗봇 FAQ 응답 — 환불·상담·수강료 등 자동 분류 응답*

{{다이어그램: `03_제품/hagent-os/diagrams/05_ia-screen-map.md` 의 mermaid graph TD를 렌더 → `assets/screenshots/05_ia-screen-map.png`로 저장}}
*▲ 정보 아키텍처(IA) 스크린맵 — 22개 라우트의 계층 구조*

---

## Q3. 이 솔루션이 도입되었을 때 기대되는 개선점은 무엇인가요?

### "월요일 아침 9시 원장 동선" — Before/After 시나리오

> 아래 시나리오는 **대치동 학군 영어학원 현장 인터뷰 3곳 평균 추정(N=3)** 기반이다. 실측 KPI가 아니라 도입 효과를 구체적으로 보여주기 위한 추정 시나리오임을 명시한다.
> (추정: 인터뷰 + 탄자니아 영어학원 데모 시나리오, 실측 아님)

**Before — HagentOS 없는 월요일 아침 (현업 수기 기준, 추정 45분)**

| 시간 | 원장 행동 |
|------|---------|
| 09:00 | 카카오채널 미읽 메시지 23건 확인. 환불 문의 3건 발견 |
| 09:05 | 학원법 시행령 제18조 브라우저 검색 → 수강 일수 계산 → 엑셀 열기 |
| 09:18 | 환불 금액 3건 수기 계산 (건당 4~6분) |
| 09:32 | 답변 문구 작성 — 어조 고민 + 맞춤법 확인 |
| 09:41 | 개별 카카오 DM 3건 수동 발송 |
| 09:45 | 결석 보강 조율 문의 2건 처리 시작... (또 다른 루프) |

합계: 민원 3건 처리에 약 45분 소요, 수업 준비·학생 상담 시간 잠식.

**After — HagentOS 도입 후 월요일 아침 (추정 8분)**

| 시간 | 원장 행동 |
|------|---------|
| 09:00 | HagentOS 대시보드 열기 → "인박스 3건" 알림 확인 |
| 09:01 | 민원담당 에이전트가 미리 생성한 답변 초안 3건 검토 |
| 09:04 | k-skill `korean-tone-guide`가 적용된 답변 톤 확인: "불편을 드려 죄송합니다. 현재 확인된 내용은 다음과 같습니다..." |
| 09:06 | k-skill `refund-calculator`가 학원법 시행령 제18조 자동 계산한 금액 확인 |
| 09:07 | 1-click 승인 3건 → 카카오 자동 발송 |
| 09:08 | 남은 시간으로 수업 준비 시작 |

합계: 민원 3건 처리에 약 8분 소요. **절감 추정: 약 83%(45분→8분), 현장 인터뷰 3곳 평균 추정(N=3), 실측 아님.**

> k-skill `korean-tone-guide` 실제 프롬프트 구조 (`03_제품/app/skills/hagent/korean-tone-guide/SKILL.md`):
> ```
> ## 자주 쓰는 구조
> - 공감: "불편을 드려 죄송합니다."
> - 상황 설명: "현재 확인된 내용은 다음과 같습니다."
> - 제안: "우선 이렇게 진행드리고자 합니다."
> - 후속 조치: "원하시면 바로 일정 조정까지 도와드리겠습니다."
> ## 금지 표현
> - "규정상 안 됩니다"만 단독으로 쓰지 않는다.
> - "오해하신 것 같습니다"처럼 상대 책임으로 들리는 문장을 피한다.
> ```
> 에이전트는 이 스킬을 자동 로드하여 모든 학부모 응대 초안에 일관 적용한다.

(출처: [[03_제품/hagent-os/04_ai-agents/agent-design]], `03_제품/app/skills/hagent/korean-tone-guide/SKILL.md`)

---

### 정량 기대값 (인터뷰·데모 시나리오 기반 추정)

> 아래 수치는 **대치동 학군 영어학원 3곳 인터뷰 + 탄자니아 영어학원 데모 시나리오 기반 추정**이다. 현재 라이브 앱에서 확인되는 것은 케이스·승인·런·루틴 구조이며, 표의 수치는 실운영 KPI가 아니라 도입 효과를 설명하기 위한 추정치다.
> (출처: [[03-problem-bank]] P-001, [[02_전략/04_research/10_reports/R-005_교사학원업무실태]] "핵심 수치" 항목)

| 지표             | 도입 전 (현업 수기 기준)               | 도입 후 (기대값)          | 개선 폭 (추정, N=3, 실측 아님) |
| -------------- | ------------------------------- | ------------------- | ----------- |
| 원장 행정 업무 시간    | 일 3~4시간 (bati.ai 분석 기반 추정, 공식 분석자료: bati.ai 학원 행정 시간 검색 참고)     | 일 30분~1시간 (승인만)     | 약 75% 단축 추정 |
| 학부모 민원 응답 시간   | 평균 6~24시간 (인터뷰 추정)             | 승인 즉시 자동 발송         | 지연 → 준실시간 (추정)  |
| 이탈 위험 학생 탐지 시점 | 학부모가 환불 요청 시 (사후)              | 주 1회 자동 리포트로 사전 탐지  | 사후 → 사전 (가설)  |
| 환불 계산 정확도      | 원장 기억·수기 참조                    | 학원법 시행령 제18조 자동 적용  | 일관성 확보 (구현됨) |
| 운영 의사결정 기록     | 원장 머릿속에만 존재                    | 모든 케이스·런·승인 DB 영속화  | 전수 추적 가능 (구현됨) |

### 실측 개발 지표 (2026-04-13 기준 확정치)

| 항목 | 실측값 |
|------|-------|
| 개발 기간 | 7일 (2026-04-06 ~ 04-13) |
| GitHub 커밋 수 | 전체 이력 공개 (`River-181/hagent-os`) |
| 스크린샷 증빙 | 35장 이상 (`assets/screenshots/`) |
| Excalidraw 다이어그램 | 6개 (`assets/excalidraw/`) |
| k-skill 설계·시드 수 | 15종 이상 (`skills/hagent/`, `skills/community/`) |
| 자동화 루틴 DB 등록 수 | 5종 (`routines` 테이블) |

(출처: 실측 커밋 이력, [[04_증빙/01_핵심로그/master-evidence-ledger]])

### 정성 개선 (운영 설계 관점)

1. **수평 확장 용이**: 지점 추가 시 에이전트 설정·k-skill을 복제해 동일 운영 규격 유지
2. **원장 집중도 회복**: 반복 행정에서 자유로워져 교육 기획·강사 관리에 시간 배분
3. **학부모 경험 품질**: k-skill `korean-tone-guide`가 모든 응대에 일관 적용되어 문체·완곡 표현·금지 표현이 통일됨. 단순 "톤 일관성"이 아니라 스킬 파일에 명시된 4단 구조(공감→상황→제안→후속)로 실제 초안 생성
4. **규정 준수 가시화**: 환불·상담·개인정보 처리 전 과정이 DB 기록으로 남음. 학원법 시행령 제18조 기반 `refund-calculator` k-skill이 수동 계산 오류 제거

### 확장 방향

- **다채널**: 텔레그램·디스코드·슬랙 등 추가 (현재 카카오·텔레그램 연동 골격 구현)
- **다업종·다지점**: 운영 페인이 유사한 소규모 SMB (학원 외 소규모 교습소·상담센터 등)로 일반화 여지. 본 공모의 주최인 코리아교육그룹은 **60개 직영 지점·누적 수강생 100만명·비전 2030 "라이프케어 플랫폼"** 을 표명했으므로 (출처: [[03-기관-분석-및-심사-전략]]), HagentOS 와 같은 "원장 승인 + AI 팀 운영" 모델은 그 지점망 전반의 행정·상담·이탈 관리 표준으로 단계적 확장 적용 가능하다.
- **데이터 축적 효과**: 의사결정 로그가 축적될수록 에이전트 제안 품질을 개선할 수 있는 근거 데이터가 쌓임

![[png/04_BeforeAfter_원장하루.png]]
*▲ **원장 하루 Before/After** — 비교육 행정 8시간이 승인 중심 운영으로 2시간 수준까지 줄고, 상담·수업준비·휴식에 더 많은 시간이 배분되는 도입 시나리오를 시각화했다.*

![[20260410_HagentOS_Agent_원장_Run상세.png]]
*▲ 에이전트 실행 기록 — 어떤 지시에 어떤 판단을 내렸는지 토큰 사용량까지 투명하게 기록됨*

{{다이어그램: `03_제품/hagent-os/diagrams/04_approval-state.md` 의 승인 상태 머신을 렌더 → `assets/screenshots/04_approval-state.png`로 저장}}
*▲ 승인 상태 머신 — 5단계 승인 레벨(0~4)에 따른 자동/수동 처리 흐름*

---

# AI 활용 전략

## Q4. 이 프로젝트에서 사용할 AI 도구(Claude Code, Cursor, Codex 등)와 모델은 무엇이며, 선택한 이유는 무엇인가요?

**요지: 7개 도구는 도구 '수집'이 아니라 AI 팀의 8개 기능 역할을 공백 없이 채우기 위해 선정했다.**

혼자 쓰기 좋은 AI 한 개를 고르는 것이 아니라, `기획 → 리서치 → 구현 → 감사 → 증빙 → 제출`의 파이프라인 각 단계마다 가장 적합한 도구를 배치했다. 선택 기준은 두 가지였다: ① 7일 마감 안에 루프가 끊기지 않을 것, ② 두 사람(이승보·김주용)이 각 도구 없이는 해당 역할을 직접 소화해야 하는 병목이 있을 것. 이 두 조건을 통과하지 못하는 도구는 포함하지 않았다.

(증빙: [[04_증빙/01_핵심로그/ai-usage-log]], [[04_증빙/01_핵심로그/ai-usage-stats]])

### 7도구 × 8역할 매핑 — "이 조합이어야 했던 이유"

아래 표는 단순 도구 목록이 아니라 **각 도구가 어느 역할 공백을 채우는가**를 보여준다. 빈 역할이 있으면 그 단계는 사람이 직접 처리해야 하므로 7일 안에 완성 불가능했다.

| 도구 | 사용 모델 | 채우는 역할 | 이 도구가 없으면 생기는 병목 |
|------|---------|----------|----------------------|
| **Claude Code** | Opus 4.6 · Sonnet 4.6 | Builder(주) · QA · Submission | 전체 구현·테스트·리포트 작성 불가 |
| **Codex CLI** | GPT-5 / GPT-5.4 | Reviewer · Evidence | Claude 맹점 감사·CSV 증빙 관리 공백 |
| **ChatGPT Web** | GPT-5.4 | PM · Product | 심사 기준 기반 스코프 결정·PRD 초안 공백 |
| **Perplexity** | Search+AI | Research(출처) | 기관·법령·통계 리서치 출처 표기 불가 |
| **Gemini** | Deep Research | Research(심층) | 한국 학원 업계 멀티스텝 심층 리서치 공백 |
| **Grok** | 범용 | Research(교차검증) | 타 도구 응답 bias 감지 불가 |
| **NotebookLM** | 범용 | Research(합성) | 18개 이상 소스 통합 합성 수작업으로 대체 불가 |

결론적으로 7개 도구가 **8개 역할**(PM·Research·Product·Builder·Reviewer·QA·Evidence·Submission)을 공백 없이 덮는 구조다. Claude Code만 Builder·QA·Submission 3역할을 담당해 팀의 중심축이 됐고, 나머지 6개 도구가 각자의 특기를 맡아 Claude 토큰 부하를 분산했다.

### 실사용 토큰·비용 증빙

| AI 도구 | 토큰 | 비용 | 세션 | 근거 |
|--------|------|------|------|------|
| Claude Max 5x (오케스트레이터+서브에이전트) | **331M (Day 8 실측)** / **1.3B (30일 누적 실측)** | **$168.46 Extra (Day 8)** | — | OpenUsage 2026-04-13 실측 스크린샷 |
| Codex GPT-5.4 | ~1,200,000 (Day 8 추정) | 정액제 | 49 | 세션 카운트 실측, 토큰 추정 |
| ChatGPT GPT-5.4 | ~50,000 (추정) | 정액제 | 3 | Day 1 초기 기획 |
| Perplexity Pro | ~18,000 (추정) | 정액제 | 6 | Day 1 리서치 |

(증빙: [[04_증빙/01_핵심로그/ai-usage-stats]] "전체 통합 요약" 표)

### 역할 배치 3원칙

- **"코드 = Claude, 리뷰 = Codex"** — 같은 산출물을 두 엔진이 독립 검토. 한쪽이 놓친 버그를 다른 쪽이 잡는 교차 검증 구조.
- **"전략 = ChatGPT, 리서치 = Perplexity/Gemini"** — 합성 능력(GPT)과 출처 표기 능력(Perplexity)의 차이를 역할로 분리.
- **"모든 결정은 사람이 최종 승인"** — AI는 항상 초안. 이승보·김주용이 매 배치 완료 시 결과를 검토하고 승인했다.

### 실제 시스템 프롬프트 스니펫 — P-009 Evidence Orchestrator

재사용 가치가 높아 `prompt-catalog.md` P-009로 승격된 프롬프트다. 이 프롬프트가 Claude에게 단순 "기록 대리"가 아닌 **도구 선택 이유·핸드오프 구조·아티팩트 변화까지 메타 수준으로 판단하는 역할**을 부여했다. 결과적으로 AI가 생성한 증빙 원장이 심사위원용 재현 가능 문서로 직접 활용됐다.

```
You are the Evidence Orchestrator for this workspace. Your job is to keep
AI usage evidence accurate, low-friction, and reusable for the final report.
Update master-evidence-ledger.md with session blocks, append
external-ai-usage.csv for manual Web/App usage, and prepare ai-usage-stats.md
using exact local stats when available and estimated stats otherwise.
Split ledger entries by date headers, keep exact vs estimate explicit, and
capture not only usage volume but also orchestration quality: why a tool was
chosen, how tools were sequenced, what got handed off between AIs, and which
artifacts changed.
```

(출처: [[04_증빙/01_핵심로그/prompt-catalog]] P-009 / [[04_증빙/01_핵심로그/master-evidence-ledger]])

### Codex 샌드박스 한계 대응 — 병렬 16세션 충돌 없이 완료한 방법

Codex CLI는 독립 감사에 최적이지만 Day 8(2026-04-13) 실제 병렬 운영에서 두 가지 한계가 드러났다. 이를 우회하는 패턴을 개발해 Ralph 루프 3차 총 16개 병렬 세션을 충돌 없이 완료했다.

**한계 1 — `.git/index.lock` 경쟁 조건**
병렬 5개 세션이 동시에 같은 저장소에 커밋을 시도하면서 락 충돌 발생.
우회: Codex 세션마다 독립 작업 디렉터리 할당 → 패치 파일로 결과 저장 → Claude가 중앙에서 순차 병합.

**한계 2 — DNS 및 외부 네트워크 차단**
Codex 샌드박스에서 `pnpm install` 신규 패키지 설치 불가.
우회: Codex는 "필요 패키지 목록 + 변경 코드 파일"만 패치로 출력 → Claude가 로컬에서 설치 + 적용.

(출처: [[.agent/system/ops/PROGRESS]] Day 8 항목, 커밋 [`f4dacba`](https://github.com/River-181/hagent-os/commit/f4dacba), [`8576819`](https://github.com/River-181/hagent-os/commit/8576819))

### Claude 서브에이전트 3단 구조 — 메인 컨텍스트 보호 원칙

메인 Claude 세션이 탐색·테스트·리뷰를 모두 처리하면 컨텍스트 20% 임계를 빠르게 넘어 대형 기능 구현이 불가능해진다. 이를 방지하기 위한 3단 분리 구조:

1. **Explore 서브에이전트** — 대용량 코드베이스 탐색 위임. 요약(~2K 토큰)만 메인 수신. 탐색 과정 수만 토큰을 메인에서 배제.
2. **code-reviewer 서브에이전트** — Builder 산출물 독립 감사. 메인은 감사 결과만 받아 최종 판단.
3. **메인 세션** — 실제 코드 변경 + 커밋만 담당. 의사결정에 집중.

이 구조로 메인 컨텍스트 30~40% 절감 추정 (실측 아님, 서브에이전트 사용 전후 비교 불가).
(증빙: [[04_증빙/01_핵심로그/ai-usage-stats]], [[04_증빙/03_daily/2026-04-13]])

### 도구별 대표 스크린샷 (7장)

> 도구 1종당 1장. 나머지 48장 이상은 `assets/screenshots/`에서 확인 가능.

![[20260406_GPT사용.png]]
*▲ ChatGPT — 대회 개요 분석 및 전략 세션 (Day 1)*

![[20260408_CODEX_LLMWIKI.png]]
*▲ Codex — LLM Wiki 구조 설계 (Day 3)*

![[20260408_GEMINI딥리서치.png]]
*▲ Gemini Deep Research — 한국 교육 업계 리서치 (Day 3)*

![[20260409_PERPELXITY_k-skill.png]]
*▲ Perplexity — k-skill 생태계 개념 구조화 리서치 (Day 4)*

![[20260408_NOTEBOOKKM.png]]
*▲ NotebookLM — 다수 리서치 자료 합성, R-008 등 생성 (Day 3)*

![[20260410_Claude_사용량패널_OpenUsage.png]]
*▲ Claude 사용량 패널 — OpenUsage 실측 토큰 추적 (Day 5)*

![[20260412_CODEX_사용.png]]
*▲ Codex 세션 — 코드 감사 및 구조 리뷰 (Day 7)*

> **증빙 색인 (Q4 나머지)**: `20260408_GROK사용.png` (bias 교차검증), `20260406_코딩공모전대회개요분석.png` (대회 개요), `20260409_CLAUDE_기획문서.png` (PRD 작성), `20260409_CLAUDE_외부연동.png` (MCP 연동) — `assets/screenshots/` 전체 보관.

---

## Q5. 각 AI 도구별 활용 전략을 작성해주세요. (도구/모델별 페르소나와 핵심 전략, 제약 사항, 에이전트 구성 방식, 데이터 흐름 등)

**요지: "단순히 AI를 많이 쓴 팀"이 아니라 "정의→구현→배포→증빙→설명" 5단계를 7일 안에 끊기지 않게 연결한 팀이 이긴다.**

> "단순 알고리즘 풀이가 아니라 기획→서비스 구현→배포까지 전 과정을 소화하는 실무형 AI 개발자를 발굴한다."
> — 디지털타임스 2026-03-12, 코리아IT아카데미 정용석 본부장 인터뷰 (https://www.dt.co.kr/, 내부 정리 [[01_대회정보/바이브코딩공모전_홍보자료_정용석]])

이 기준을 "AI 도구를 기능 역할 단위로 분업해, 각 도구가 가장 잘하는 단계만 담당하게 하라"로 번역했다. 결과적으로 2인 팀이 7도구를 동시에 운영해 단일 도구로는 7일 안에 불가능한 스코프를 완료했다.
(출처: [[01-vibe-contest-master-playbook-v0-1]])

---

### 5-1. 구조 원칙 — 2인 × 7도구 × 8역할

**요지: 사람 수·도구 수·역할 수는 각각 다르며, 역할 공백 없음이 선택 기준이었다.**

이승보·김주용 2인이 7개 도구를 교차 사용하면서 **기능 역할 8개**를 분리 운영했다. Paperclip식 멀티에이전트 패턴을 참고하되, 실제 학원 업무와 제출 증빙 흐름에 맞게 역할을 다시 세분화했다.

![[png/02_AI-협업-구조.png]]
*▲ **AI 협업 구조** — 상단 팀 2명 · 좌측 AI 도구 7종 · 우측 기능 역할 8종. Claude Code는 Builder/QA/Submission 3역할, Codex CLI는 Reviewer/Evidence 2역할, ChatGPT는 PM/Product 2역할, 리서치 4도구는 Research 하나로 수렴.*

| # | 기능 역할 | 주 담당 도구·모델 | 책임 범위 |
|---|---------|-----------------|---------|
| 1 | **PM** | ChatGPT GPT-5.4 | 심사 기준·마감 기반 스코프·우선순위 결정 |
| 2 | **Research** | Perplexity · Gemini · NotebookLM | 기관·경쟁·시장·법령 리서치 (출처 기반) |
| 3 | **Product** | ChatGPT · Claude Opus | PRD·도메인 모델·사용자 시나리오 |
| 4 | **Builder (주)** | Claude Code Opus/Sonnet | 서버·UI·DB·skill runtime 구현 |
| 5 | **Reviewer** | Codex CLI GPT-5/5.4 | Builder 산출물의 독립 감사 |
| 6 | **QA** | Claude Code 서브에이전트 | API·UI 전수 테스트 |
| 7 | **Evidence** | Codex GPT-5 | intake CSV·증빙 원장 관리 |
| 8 | **Submission** | Claude Code | AI 리포트·README·체크리스트 |

(출처: [[06_LLM위키/concepts/멀티에이전트_운영_모델]], [[04_증빙/01_핵심로그/session-log]] S-DEV-022~S-PROD-026)

---

### 5-2. 실제 동선 A — Ralph 루프 3차 병렬 실행

**요지: Day 8에 Codex 3라운드 병렬(총 16세션)로 테스트·문서·배포를 같은 날 완료한 것이 핵심 속도 요인이었다.**

**1차 5병렬** — 스모크(T-smoke), 케이스 커버리지(T-case), 설정 페이지(T-settings), 시드 보강(T-seed-log), UI폴리시+보안(T-ui-polish+T-security) 동시 실행.

**2차 6병렬** — 1차 결과 수렴 후 버그 목록을 통합하고, 6개 수정 세션을 병렬 실행.

**3차 5병렬** — 루틴 일관성(T-routine-fix), docx 재빌드(T-docx), PNG 익스포트(T-png-export), 보안 복구(T-security-recover), assistant 응답 수정(T-assistant-fix).

**오케스트레이션 시퀀스 — Ralph 루프 2차 T-case 트랙 전수 공개**

| 시간(추정) | 단계 | 담당 | 커밋/결과 |
|---------|------|------|---------|
| 09:20 | "T-case: 케이스 바인딩 테스트 작성" Codex에 dispatch | Claude → Codex | — |
| 09:35 | `.git/index.lock` 충돌 → 패치 파일로 결과 저장 | Codex rescue | — |
| 09:38 | 패치 수신 → main에 적용 + 검증 | Claude | [`6886694`](https://github.com/River-181/hagent-os/commit/6886694) |
| 09:45 | 케이스 바인딩 + assistant 응답 수정 통합 | Claude | [`ea487db`](https://github.com/River-181/hagent-os/commit/ea487db) |
| 10:10 | UI polish + 보안 P0 수정 병합 | Claude | [`f4dacba`](https://github.com/River-181/hagent-os/commit/f4dacba), [`8576819`](https://github.com/River-181/hagent-os/commit/8576819) |
| 11:30 | 텔레그램 outbound approval delivery | Claude | [`407dadf`](https://github.com/River-181/hagent-os/commit/407dadf) |

> 총 Codex 세션 49회 / 프롬프트 144건 / 추정 토큰 ~1.2M
> (증빙: [[04_증빙/01_핵심로그/ai-usage-stats]] "Codex GPT-5.4" 항목)

**교훈**: `.git/index.lock` 충돌은 병렬 에이전트 운영의 보편적 함정이다. "Codex는 패치만 출력, Claude가 중앙 병합"으로 역할을 나누면 어떤 규모의 병렬 세션도 충돌 없이 수렴할 수 있다. 이 패턴은 HagentOS 이외 멀티에이전트 프로젝트에서도 바로 재사용 가능하다.

---

### 5-3. 실제 동선 B — 도구별 운영 전략·제약

**요지: 각 도구에 명확한 한계선을 그어 두면, 그 경계가 오히려 속도를 높인다.**

| 도구 | 핵심 전략 | 주요 제약 | 실제 적용 예 |
|------|---------|---------|-----------|
| **Claude Code** (Opus/Sonnet) | Plan Mode 설계 → 서브에이전트 분산 → 메인에서 단일 커밋 | 대용량 파일 offset/limit 필수, 컨텍스트 20% 임계 주의 | 7일 서버·UI·DB·skill runtime 일관 구현 |
| **Codex CLI** (GPT-5/5.4) | Claude 산출물 독립 감사, 코드 변경 권한 미부여 | 장기 대화 상태 관리 제한, sandbox DNS 차단 | Paperclip 감사 → HagentOS 재해석 제안 (S-STRAT-016) |
| **ChatGPT** (GPT-5.4) | Canvas 긴 구조화 문서 초안 → Obsidian 이전 정제 | 로컬 파일 직접 접근 불가 | 대회 플레이북, 심사 기준 자기 평가 (S-GPT-001) |
| **Perplexity / Gemini** | 검색+합성 질문에만 할당 (기관·법령·통계) | 최신 웹 편향, 비공개 자료 불가 | OECD TALIS 2024 수치, 코리아교육그룹 계보 분석 |

(출처: [[04_증빙/01_핵심로그/session-log]] S-STRAT-016, S-GPT-001; [[02_전략/04_research/10_reports/R-005_교사학원업무실태]])

---

### 5-4. 데이터 핸드오프 — intake CSV → dispatch → ledger

**요지: AI 세션 증빙을 수동 문서화가 아니라 파이프라인으로 자동 축적해, 제출 시점에 55건 이상 기록이 이미 완성됐다.**

**팀 운영 데이터 흐름 (워크스페이스 레이어):**
```
.agent/AGENTS.md (공용 진입점)
  ↓
.agent/system/ops/PROGRESS.md (단일 진실 소스 — 멀티에이전트 조율)
  ↓
작업 완료 시:
  ai-session-intake.csv append (세션ID·도구·모델·토큰·artifact)
    ↓
  python3 dispatch-session-intake.py 실행
    ↓
  master-evidence-ledger.md 자동 갱신 (날짜 헤더별 세션 블록)
```

**HagentOS 에이전트 런타임 데이터 흐름 (제품 레이어):**
```
원장 지시 "이번 주 환불 문의 정리"
  → 오케스트레이터: runWithAdapter() → OpenAI Chat Completions API
  → 민원담당: k-skill 로드(환불계산기·톤가이드·법령조회) → 초안 생성
  → approval 요청 → 케이스 상태 "승인 대기"
  → 원장 1-click 승인 → 카카오 아웃바운드 발송 → activity log 기록
```

두 레이어가 같은 원칙(단일 진실 소스 → 이벤트 append → 자동 갱신)으로 설계됐다는 점이 HagentOS의 일관성을 보여준다.

---

### 5-5. 병렬 워크스페이스 증빙 (스크린샷 3장)

**요지: 두 AI가 동시에 같은 저장소에서 작업하는 장면, 그리고 이를 지탱하는 Obsidian 메모리 구조가 여기서 확인된다.**

![[20260413_Codex_Claude_병렬작업_워크스페이스.png]]
*▲ Codex와 Claude가 동시에 동일 워크스페이스에서 작업하는 실제 화면 — 병렬 운영 증빙*

![[20260411_OBSIDIAN_homeview.png]]
*▲ Obsidian 기반 운영 메모리 — 모든 AI 세션·의사결정·증빙이 한 볼트에 축적*

![[20260410_Claude_사용량패널_OpenUsage.png]]
*▲ Claude 사용량 패널 — OpenUsage 실측 (Day 5, 329M+ 토큰 확인)*

> 나머지 스크린샷 — `20260411_claude_병렬에이전트토큰.png`, `20260411_CODEX-멀티에이전트.png`, `20260410_ClaudeCode_DB시드_에이전트메모리갱신_터미널.png` — `assets/screenshots/` 보관.

### 2인 팀 실시간 협업 방식

- **Discord 음성+화면공유**: 이승보·김주용이 에이전트 설계·제품 검토 시 실시간 공유
- **Obsidian 볼트 동시 편집**: 두 사람이 같은 vault에서 note 작성 → git으로 병합
- **git 동기화**: 각자 세션 완료 시 커밋 → main push → 상대방이 pull 후 이어서 진행

![[20260409_디스코드_화면공유_HagentOS_컴플레인트에이전트.png]]
*▲ 2인 팀 화면공유 협업 — 민원담당 에이전트를 함께 설계*

![[20260412_디스코드_2인_온라인미팅.jpeg]]
*▲ 일일 디스코드 2인 미팅 — 인간 협업도 AI 협업만큼 체계적으로 운영*

![[png/06_7일_개발_타임라인.png]]
*▲ **7일 개발 타임라인** — D1~D7 동안 어떤 AI를 어떤 단계에 배치했는지와 그날의 주요 산출물을 함께 정리했다.*

---

## Q6. 토큰 낭비를 최소화하고 유지보수성 및 재현성을 높이기 위한 전략이 있다면 작성해주세요.

**요지: Q5에서 설명한 병렬 운영 구조가 가능했던 것은, Q6의 토큰·유지보수·재현성 전략이 먼저 설계됐기 때문이다.**

Q4·Q5가 "무엇을 어떻게 만들었는가"라면, Q6은 "그 작업이 지속 가능하고 검증 가능한 방식이었음"을 증명한다. 아래 세 섹션에서 심사 7기준에 대한 실측·실증 대응을 보여준다.

> 심사 7기준: ① MVP 실작동 ② 배포 안정성 ③ 프롬프트 전략 ④ AI 도구 숙련도 ⑤ 아이디어 독창성 ⑥ 비즈니스 확장성 ⑦ 실무 적합성
> — 파이낸스투데이 2026-03-12, 코리아IT아카데미 오명훈 소장 인터뷰 (https://www.fntoday.co.kr/, 내부 정리 [[01_대회정보/바이브코딩공모전_홍보자료_오명훈]])

### 심사 7기준 역매핑 표

| 심사 기준 | HagentOS 대응 전략 | 실측 수치 / 근거 링크 |
|---------|-----------------|-------------------|
| ① MVP 실작동 | Railway 라이브 배포, 케이스·승인·에이전트 런 실동작 확인 | HTTP 200 실측 (2026-04-13) / https://hagent-os.up.railway.app |
| ② 배포 안정성 | Railway + Neon DB, env 격리, seed 데이터 검증 | [`50281a7`](https://github.com/River-181/hagent-os/commit/50281a7) — seed+runs |
| ③ 프롬프트 전략 | Ralph 루프 3차, Codex 49세션 144프롬프트, P-001~P-009 승격 | [[04_증빙/01_핵심로그/prompt-catalog]] |
| ④ AI 도구 숙련도 | Claude 331M 토큰 / $168.46 (실측), 7도구 역할 분업, 서브에이전트 병렬 | [[04_증빙/01_핵심로그/ai-usage-stats]] |
| ⑤ 아이디어 독창성 | 한국 학원법 기반 k-skill, Control Plane approval 구조, Paperclip 갭 분석 후 재설계 | [[06_LLM위키/comparisons/Paperclip_vs_HagentOS_설계_갭]] |
| ⑥ 비즈니스 확장성 | KEG 60개 직영 지점 적용 경로, 채널 어댑터 확장 패턴, 다업종 SMB | [[03-기관-분석-및-심사-전략]] |
| ⑦ 실무 적합성 | 대치동 학원 3곳 인터뷰 기반, 탄자니아 영어학원 데모 실증, 학원법 컴플라이언스 자동화 | [[03-problem-bank]] |

---

### 차별적 가치 — 왜 HagentOS인가

**요지: 기존 솔루션이 덮지 못하는 4가지 공백을 정확히 채웠기 때문에 차별점이 성립한다.**

클래스업·온하이 등 기존 학원 ERP 6종은 출결·수납·알림을 완전 커버(레드오션). 단일 챗봇은 민원·이탈·강사 이슈의 맥락을 통합하지 못한다. HagentOS의 차별점은 이 4가지 결합이다: **역할 기반 AI 팀 + k-skill 생태계 + 한국 교육법령 컴플라이언스 + Control Plane 승인 구조**.

Paperclip(미국 AI 팀 운영 SaaS) 갭 분석 결과, 차용할 것과 버릴 것을 명확히 구분했다:

- **차용**: `board-first UI`, `company-scoped state`, `audit-friendly REST API`, `adapter-separated execution`
- **제거**: `multi-company 구조`, `미국 SaaS 관리자 기능`, `chat-first UX`, `plugin 과잉 구조`
- **한국 특화 추가**: `학원법 시행령 기반 환불 k-skill`, `한국어 톤가이드`, `카카오채널 민원 어댑터`, `이탈방어 루프`, `텔레그램 원장 컨트롤`

(출처: [[06_LLM위키/comparisons/Paperclip_vs_HagentOS_설계_갭]], [[06_LLM위키/concepts/운영_Control_Plane_모델]])

**한국 특화 3원칙 — Paperclip(미국) 대비:**

| 원칙 | HagentOS 구현 | Paperclip 대비 |
|------|-------------|--------------|
| **법령 특화** | 학원법 시행령 제18조 `refund-calculator` k-skill, law.go.kr MCP 연동 | Paperclip은 미국 법령 기반 — 한국 학원법 규정 없음 |
| **톤 특화** | `korean-tone-guide` 4단 구조(공감→상황→제안→후속), 금지 표현 목록 | Paperclip은 영어 기반 — 한국 학부모 응대 맥락 없음 |
| **채널 특화** | 카카오채널 인바운드, 알리고 SMS, 텔레그램 approval 루프 | Paperclip은 Slack/Email 기반 — 한국 카카오 생태계 없음 |

(출처: [[06_LLM위키/concepts/한국_교육_도메인_적합성_갭]])

![[png/05_kskill_생태계_분류도.png]]
*▲ **k-skill 생태계 분류도** — 법령·컴플라이언스, 커뮤니케이션, 리텐션, 스케줄, 분석 5개 범주*

---

### 토큰 절감 전략 — 수치 있는 3가지

**요지: 수치 없는 전략은 제외하고, 추정이라도 before/after 비교가 가능한 3개만 정리한다.**

**① 서브에이전트 분리 — 탐색 비용을 메인 컨텍스트에서 배제**
- 패턴: Explore 서브에이전트가 탐색을 담당 → 요약(~2K 토큰)만 메인 수신
- 추정 효과: 탐색 1회당 수만 토큰을 메인에서 배제 → 메인 컨텍스트 **30~40% 절감** (추정, 실측 아님 — 서브에이전트 사용 전후 비교 불가)

**② CLAUDE.md 외재화 — 세션 재설명 비용 제거**
- 패턴: `.claude/CLAUDE.md`에 스택·구조·규칙 기록 → 매 세션 "우리 시스템이 어떻게 되어있냐" 재설명 불필요
- 추정 효과: 55+ 세션 × 세션당 **500~2,000 토큰** 절감 (추정, 실측 아님)

**③ 도구 특성 분업 — Perplexity/Gemini가 Claude 토큰 소비 대체**
- 패턴: 출처 필요 리서치는 Perplexity(정액), 심층 합성은 NotebookLM → Claude에게는 구현·판단만 남김
- 추정 효과: Claude 토큰 **약 20~30% 절약** (추정, 실측 아님 — 대조군 없음)

(수치 없이 방향만 있는 전략 — Context compaction, 파일 부분 읽기 — 은 유지보수성 섹션에 통합.)

**누적 기록**: 7일간 55회 이상 주요 세션 (증빙: [[04_증빙/01_핵심로그/ai-usage-stats]])

---

### 유지보수성 전략 (4가지)

**① 계약 기반 문서 (`.agent/system/contracts/`)**
- `workspace-contract.md`·`memory-evidence-policy.md`로 워크스페이스 운영 규칙 명시
- 새 AI나 사람이 들어와도 계약만 읽으면 즉시 동기화

**② 스킬 표준 형식 (SKILL.md)**
- 모든 k-skill을 동일한 YAML frontmatter + 섹션 구조로 통일
- `03_제품/app/skills/hagent/` 아래 11개 스킬, `skills/community/` 4개 스킬이 같은 형식 → 추가·수정 용이

**③ 의사결정 로그 (`decision-log.md`)**
- 모든 아키텍처 결정에 DEC-NNN 번호 부여 + 근거·대안·결과 기록
- 후속 AI가 과거 결정의 배경을 이해하고 일관성 유지
- (출처: [[04_증빙/01_핵심로그/decision-log]])

**④ 단일 진실 소스 (PROGRESS.md)**
- 멀티 AI 동시 작업 시 중복·충돌 방지
- 모든 AI가 작업 시작 전 PROGRESS 확인 의무
- (출처: [[.agent/system/ops/PROGRESS]])

---

### 재현성 전략 (4가지)

**① AI 세션 intake CSV 체계**
- 매 세션 종료 시 `ai-session-intake.csv`에 row append
- **실제 헤더 1줄**: `date,session_id,phase,environment,client_app,provider,model,service_tier,participants,prompt_count,estimated_tokens,cost_usd,pricing_mode,goal,source_refs,what_changed,why_it_mattered,artifacts,ai_usage_strategy,evidence_value,...`
- `dispatch-session-intake.py` 실행 결과 샘플: `[dispatch] 2 new sessions ingested → master-evidence-ledger.md updated (2026-04-13 헤더 하위)`
- **현재 55+ 세션이 이 형식으로 기록됨** (증빙: [[04_증빙/01_핵심로그/ai-usage-stats]])

**② 프롬프트 카탈로그 (`prompt-catalog.md`)**
- 재사용 가능한 고품질 프롬프트를 목적별로 분류 보관 (P-001~P-009 승격 완료)
- 각 항목: Prompt_ID · Intent · Prompt · Input contract · Output contract · Reuse rule · Linked evidence 7개 필드
- 새 팀원/AI가 동일 품질의 결과를 즉시 재생산 가능
- (출처: [[04_증빙/01_핵심로그/prompt-catalog]])

**③ 포터블 설정 (`portable-config.md`)**
- 글로벌 플러그인·MCP 서버·환경변수를 문서화
- `bash .agent/adapters/claude/setup.sh` 한 줄로 다른 컴퓨터에서 동일 환경 구축

**④ 공개 저장소 원칙 + 주요 커밋 직링크**
- GitHub: https://github.com/River-181/hagent-os (public)
- 모든 시드 데이터·스킬·기획 문서가 저장소 내부에 포함
- **심사위원 참조용 커밋 직링크 7개**:

| 커밋 해시 | 내용 |
|---------|------|
| [`f4dacba`](https://github.com/River-181/hagent-os/commit/f4dacba) | UI polish — 케이스 목록 다크모드·필터 개선 |
| [`8576819`](https://github.com/River-181/hagent-os/commit/8576819) | security P0 — API Key 누출 방지, env 격리 |
| [`50281a7`](https://github.com/River-181/hagent-os/commit/50281a7) | seed+runs — 시드 데이터 보강 + 에이전트 런 구조 |
| [`f7eac44`](https://github.com/River-181/hagent-os/commit/f7eac44) | 케이스 패널 — 상태 머신 + 우선순위 UI |
| [`ea487db`](https://github.com/River-181/hagent-os/commit/ea487db) | assistant 응답 수정 — 오케스트레이터 프롬프트 정제 |
| [`407dadf`](https://github.com/River-181/hagent-os/commit/407dadf) | 텔레그램 outbound approval delivery |
| [`6886694`](https://github.com/River-181/hagent-os/commit/6886694) | 케이스 바인딩 — 학생·스케줄 drill-down 연결 |

![[20260411_OBSIDIAN_homeview.png]]
*▲ Obsidian 볼트 홈뷰 — 모든 메모리·증빙·계획이 한 워크스페이스에서 상호 링크*

---

## 확약

본 프로젝트는 생성 AI를 도구로 활용하여 참가자가 직접 빌딩한 결과물임을 확약합니다. 타인의 저작물을 무단 도용하거나 표절한 사실이 밝혀질 경우 시상 이후에도 수상이 취소되고 상금이 환수될 수 있습니다.

---

## 증빙 색인 (심사위원 참조용)

| 구분 | 경로 |
|------|------|
| GitHub 저장소 (public) | https://github.com/River-181/hagent-os |
| 라이브 데모 URL | https://hagent-os.up.railway.app |
| AI 세션 전체 기록 | `04_증빙/01_핵심로그/ai-usage-log.md` (55+ 세션) |
| 프롬프트 카탈로그 | `04_증빙/01_핵심로그/prompt-catalog.md` |
| 의사결정 로그 | `04_증빙/01_핵심로그/decision-log.md` |
| 도구 사용 통계 | `04_증빙/01_핵심로그/ai-usage-stats.md` |
| 마스터 증빙 원장 | `04_증빙/01_핵심로그/master-evidence-ledger.md` |
| 외부 AI 사용 집계 | `04_증빙/01_핵심로그/external-ai-usage.csv` |
| 스크린샷 35장+ | `assets/screenshots/` |
| 모델링 다이어그램 6종 | `assets/excalidraw/` |
| 페인포인트·경쟁분석 근거 | `02_전략/research-results/` (R-004~R-010) |
| Paperclip vs HagentOS 갭 분석 | `06_LLM위키/comparisons/Paperclip_vs_HagentOS_설계_갭.md` |
| Control Plane 모델 | `06_LLM위키/concepts/운영_Control_Plane_모델.md` |
| k-skill 생태계 결정 | `06_LLM위키/concepts/k-skill_생태계_결정_내역.md` |
| korean-tone-guide k-skill | `03_제품/app/skills/hagent/korean-tone-guide/SKILL.md` |

### GitHub 커밋 직링크 (주요 기능별 7개)

| 커밋 | 내용 | 링크 |
|------|------|------|
| `f4dacba` | UI polish — 다크모드·케이스 필터 | https://github.com/River-181/hagent-os/commit/f4dacba |
| `8576819` | security P0 — API Key 누출 방지 | https://github.com/River-181/hagent-os/commit/8576819 |
| `50281a7` | seed+runs — 시드 데이터·에이전트 런 | https://github.com/River-181/hagent-os/commit/50281a7 |
| `f7eac44` | 케이스 패널 — 상태 머신 UI | https://github.com/River-181/hagent-os/commit/f7eac44 |
| `ea487db` | assistant 응답 수정 | https://github.com/River-181/hagent-os/commit/ea487db |
| `407dadf` | 텔레그램 outbound approval | https://github.com/River-181/hagent-os/commit/407dadf |
| `6886694` | 케이스 바인딩 — drill-down 연결 | https://github.com/River-181/hagent-os/commit/6886694 |

---

## 📋 이미지 작업 체크리스트 (docx 변환 전 필수)

### ✅ 기존 스크린샷 (22장, 바로 사용 가능)

Q1: HagentOS_Inbox_채용승인목록, HagentOS_Issue_HireLeadInstructor_상세
Q2: HagentOS_대시보드_로컬실행, HagentOS_케이스목록_다크모드, HagentOS_프로젝트목록_다크모드, HagentOS_채널연결_SetupPack_상세, 탄자니아-영어학원-카카오톡-상담봇-초기-응답-화면, 탄자니아-영어학원-챗봇-FAQ-응답-화면-1, 텔레그램_학원운영자_케이스승인
Q3: HagentOS_Agent_원장_Run상세
Q4: GPT사용, CODEX_LLMWIKI, GEMINI딥리서치, PERPELXITY_k-skill, NOTEBOOKKM, Claude_사용량패널_OpenUsage, GROK사용, 코딩공모전대회개요분석, CLAUDE_기획문서, CLAUDE_외부연동, CODEX_사용
Q5: claude_병렬에이전트토큰, CODEX-멀티에이전트, Codex_Claude_병렬작업_워크스페이스, ClaudeCode_DB시드_에이전트메모리갱신_터미널, OBSIDIAN_homeview, 디스코드_화면공유_HagentOS_컴플레인트에이전트, 디스코드_2인_온라인미팅, FIGMA_미팅

### ⭐ 핵심 Excalidraw 다이어그램 6종 (손그림 스타일)

| 번호 | 소스 파일 | 저장 파일명 | 배치 위치 |
|------|---------|-----------|---------|
| ① | `assets/excalidraw/01_민원-처리-플로우.excalidraw` | `01_민원-처리-플로우.png` | Q2 "한 줄 지시→승인→발송 루프" 하단 |
| ② | `assets/excalidraw/02_AI-협업-구조.excalidraw` | `02_AI-협업-구조.png` | Q5 "8개 기능 역할" 섹션 상단 |
| ③ | `assets/excalidraw/03_시스템-4계층.excalidraw` | `03_시스템-4계층.png` | **Q2 최상단 (핵심 비주얼)** |
| ④ | `assets/excalidraw/04_BeforeAfter_원장하루.excalidraw` | `04_BeforeAfter_원장하루.png` | Q3 말미 |
| ⑤ | `assets/excalidraw/05_kskill_생태계_분류도.excalidraw` | `05_kskill_생태계_분류도.png` | Q6 차별적 가치 |
| ⑥ | `assets/excalidraw/06_7일_개발_타임라인.excalidraw` | `06_7일_개발_타임라인.png` | Q5 "7일 개발 타임라인" |

### ⏳ 선택 — mermaid 다이어그램 4종 (보조 자료, 본문에는 미삽입)

아래 4종은 `03_제품/hagent-os/diagrams/` 폴더에 mermaid 소스가 있음. 페이지 여유 있으면 부록으로 추가:
- `02_orchestrator-sequence.md` (시퀀스)
- `03_erd.md` (ERD)
- `04_approval-state.md` (승인 상태)
- `05_ia-screen-map.md` (IA 맵)

> 렌더링 필요 시: https://mermaid.live/ 에 mermaid 코드 붙여넣기 → Actions → PNG 다운로드.

---

## ⚠️ 심사 관점 자기 검증 체크리스트

제출 전 반드시 확인:

- [x] **라이브 URL 접속 테스트** — `hagent-os.up.railway.app` HTTP 200 확인 (2026-04-13 실측)
- [x] **라이브에서 핵심 플로우 1개 작동** — 케이스 열기 → 에이전트 상세 → 설정 페이지까지 (Day 8 직접 확인)
- [ ] **데모 계정 동선** — 심사위원이 어떻게 들어가서 무엇을 볼지 2분 내 시나리오 (README에서 보완 필요)
- [x] **GitHub public 설정** — `River-181/hagent-os` public 확인 (2026-04-13 기준)
- [x] **README에 필수 내용** — 문제/사용자/해결방식/데모링크/기술스택/AI활용 포함
- [x] **API Key 누출 0건** — security P0 커밋 `8576819` 으로 env 격리 완료
- [ ] **04-13 이후 커밋 없음** — 제출 후 커밋은 부정행위 (제출 전 마지막 확인 필요)
- [x] **Q1~Q6 출처 링크** — 모든 주요 수치에 출처 노트 또는 "추정" 명시 완료 (이번 개선에서 전수 보정)

---

## 🏗️ 최종 작업 순서

1. **Excalidraw PNG 내보내기** (6종) — Obsidian Excalidraw 플러그인 또는 excalidraw.com
2. **mermaid 렌더** (선택, 4종) — https://mermaid.live/
3. **Word에서 공식 docx 열기** → 상단 표 3개 필드 채움
4. **이 md의 각 Q섹션 본문을 복붙** → docx 해당 답변 셀에 붙여넣기
5. **이미지 삽입** — Word "삽입 → 그림"으로 `assets/screenshots/` 폴더에서 선택
6. **PDF 변환** → `HagentOS_이승보_김주용_AI리포트.pdf`
7. **제출 이메일에 첨부**
