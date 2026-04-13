---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# UI And Entrypoints

## Facts

- `paperclip`의 real entrypoint는 `chat`보다 `company control plane`에 가깝다.
- 공식 기준 첫 흐름은 `goal 설정 -> 팀 구성 -> 승인/실행 -> 모니터링`이다.
- 사용자가 처음 보는 핵심 오브젝트는 대화창보다 `goal`, `org chart`, `task`, `budget`, `activity`, `approval`이다.
- 사용자는 agent와 계속 수다를 주고받는 사람이 아니라, `운영자`, `관리자`, `승인자`에 가깝다.
- 따라서 `paperclip`의 핵심 UI는 `assistant shell`이 아니라 `operations board`라고 보는 편이 맞다.
- 실제 `ui/src/App.tsx` 라우트를 보면 `dashboard`, `agents`, `projects`, `issues`, `goals`, `approvals`, `costs`, `activity`, `inbox`, `routines`, `skills`, `plugins`, `instance settings`가 주요 화면이다.
- onboarding도 chat 시작이 아니라 `company 생성 -> agent 추가 -> starter task seed` 흐름으로 설계돼 있다.
- `BoardClaimPage`, `AuthPage`, `CliAuthPage`가 별도 라우트라는 점은 board operator와 runtime agent를 구분한다는 신호다.

## Hypotheses For EduPaperclip

- 한국 학원 운영자도 첫 진입점은 `프롬프트 입력창`보다 `오늘의 운영 브리핑`일 가능성이 높다.
- 운영자 모드에서는 `민원`, `재등록 위험`, `강사 일정 충돌`, `승인 대기`가 첫 카드가 되어야 한다.
- 교사/강사 모드는 같은 shell을 쓰더라도 `내 반/내 수업 운영 보드`처럼 더 좁은 진입이 자연스러울 수 있다.
- 따라서 `운영자 첫 진입`과 `교사 첫 진입`은 분리해서 분석해야 한다.

## Borrowed From `paperclip`

- 대화창보다 `대시보드/보드`를 첫 진입점으로 두는 발상
- `브리핑 -> 지시 -> 병렬 처리 -> 승인` 흐름
- 역할명과 org chart로 AI 팀을 인식시키는 구조
- 결과만이 아니라 `진행 중`, `대기`, `승인 필요`를 같이 보여주는 control plane UI
- `issues`, `goals`, `approvals`, `activity`, `inbox`처럼 다른 관점의 운영 리스트를 병렬로 두는 정보 구조
- onboarding 이후 곧바로 operational object를 만지게 하는 흐름

## Transformed For Korean Academy Operations

- `company goal`은 `오늘의 운영 브리핑` 또는 `이번 주 운영 상태`로 번역해야 한다.
- `CEO hires a team` 같은 서사는 `원장이 운영팀에 지시`, `담임이 반 운영팀에 지시`로 바꿔야 한다.
- budget card도 초기에는 돈보다 `민원 지연`, `미응답`, `이탈 위험`, `강사 과부하` 같은 운영 리스크에 더 가까울 수 있다.
- 운영자 모드와 교사 모드는 같은 제품이어도 entrypoint가 다를 가능성이 높다.
- `issues`는 학원에서는 `민원`, `상담 후속`, `재등록 위험`, `환불 처리`, `보강 조정`, `차량 이슈`처럼 번역될 가능성이 높다.
- `inbox`는 단순 알림이 아니라 `운영자 승인 필요`, `강사 응답 필요`, `증빙 검토 필요`를 모으는 화면으로 바뀔 수 있다.

## Not Suitable / Discard

- `AI 회사를 만든다`는 framing을 한국 교육 현장에 그대로 들여오는 것
- 스타트업 KPI를 첫 화면 중심에 놓는 것
- 너무 많은 agent를 첫 화면에 동시에 노출하는 것
- 초기부터 `all-in-one chat`으로 보이게 만드는 것

## Recommended Local Analysis Update

- 로컬 분석은 `screen spec`보다 `entrypoint`와 `approval flow`를 먼저 고정해야 한다.
- 후속으로는 `운영자 첫 화면`, `교사 첫 화면`, `cross-role approval` 세 갈래 문서가 필요할 수 있다.
- 특히 아래 질문을 UI 기준 문서로 더 쪼개야 한다.
  - 첫 화면의 핵심 카드 4개는 무엇인가
  - 운영자용 `issues/goals/approvals/activity`에 해당하는 한국형 오브젝트는 무엇인가
  - `inbox`와 `activity`를 따로 둘지 합칠지

## Open Questions

- 학원 운영자는 첫 화면에서 무엇을 가장 먼저 봐야 하는가
- `브리핑 -> 지시 -> 병렬 처리 -> 승인` 흐름이 실제로 자연스러운가
- UI가 “단일 챗봇”이 아니라 “운영팀”처럼 느껴지는가
- 운영자 모드와 교사 모드가 같은 dashboard shell을 공유할 수 있는가
