---
tags:
  - area/strategy
  - type/reference
  - status/active
date: 2026-04-09
up: "[[paperclip-analysis]]"
---
# Data And Context Model

## Facts

- `paperclip`은 단순 prompt relay가 아니라 `goal hierarchy + org structure + task state + budget + activity log`를 묶는 control plane이다.
- agent는 독립 실행되지만, 어떤 goal 아래 어떤 task를 처리 중인지가 추적된다.
- 즉 `context`는 대화문맥보다 `업무 상태`에 더 가깝다.
- 이 구조 때문에 `paperclip`은 chatbot이 아니라 `stateful operations system`처럼 보인다.
- `docs/api/overview.md` 기준 API path 자체가 company-scoped이고, mutating request에는 `X-Paperclip-Run-Id`가 권장된다.
- 이는 상태 모델이 “대화 내용”보다 “누가 어떤 run에서 어떤 오브젝트를 바꿨는가”를 더 중시한다는 뜻이다.
- `404`, `409`, `422` 에러 설계도 각각 company boundary, single ownership, invalid state transition을 전제한다.

## What Makes EduPaperclip More Than A Chatbot

- `민원`은 메시지 한 줄이 아니라 사람, 시간, 반, 강사, 이전 약속, 현재 상태와 연결된 케이스여야 한다.
- `강사 일정 조정`은 텍스트 생성이 아니라 반편성, workload, 보강 규칙을 읽어야 한다.
- `재등록 위험`은 상담 기록, 출결, 시험 결과, 불만 키워드가 연결되어야 한다.
- 따라서 핵심은 답변 품질보다 `지속 컨텍스트 모델`이다.

## Borrowed From `paperclip`

- goal/task ancestry를 가진 상태 모델
- activity log와 trace를 중심으로 움직이는 구조
- agent별 responsibility와 budget을 따로 가지는 방식
- runtime과 control plane을 분리하는 시각
- company boundary를 기반으로 모든 개체를 분리하는 시각
- “누가 바꿨는지”를 run-level audit로 남기는 방식

## Transformed For Korean Academy Operations

- 최상위 object는 `company`보다 `조직`, `지점`, `반`, `학생/학부모`, `강사`, `운영 케이스`가 되어야 한다.
- `goal hierarchy`도 아래처럼 바뀔 가능성이 높다.
  - 운영 목표
  - 케이스
  - 담당 역할
  - 액션
- 첫 MVP에서는 `company-scoped`를 그대로 두기보다 `academy / branch / class` 3층 중 무엇이 최상위 tenant인지 먼저 정해야 한다.
- `issue` 개념은 교육 운영에서는 `case`가 더 가까울 수 있다.
- 한국 교육 운영에서는 아래 데이터가 first-class일 가능성이 크다.
  - 학생/수강생 프로필
  - 학부모/보호자 프로필
  - 출결/재등록/이탈 징후
  - 상담/민원 이력
  - 강사 정보와 일정
  - 환불/정산/약관
  - 차량/시설/안전 기록
  - 규정/정책/컴플라이언스 문서

## Korean Domain Signals

- 학부모 민원은 감정 이력과 약속 이력이 중요하다.
- 재등록/이탈은 성과 설명과 상담 구조까지 같이 봐야 한다.
- 강사 스케줄은 단순 달력보다 workload와 이탈 위험이 중요하다.
- 운전면허/태권도/피트니스는 차량/시설/안전 문맥이 별도 층으로 필요하다.
- 공교육은 개인정보, 학생부, 공문/민원 절차 문맥이 강하다.

## Not Suitable / Discard

- company schema를 그대로 들여오는 것
- chat history만으로 `운영 시스템`처럼 보이게 만드는 것
- 모든 학원 유형을 같은 entity model로 억지로 맞추는 것

## Recommended Local Analysis Update

- 로컬 파일 구조도 `agents/`보다 먼저 `entities/`, `cases/`, `policies/`, `logs/` 관점으로 봐야 한다.
- 특히 `민원`, `상담`, `이탈`, `보강`, `정산`을 어떤 단위로 저장할지 리서치가 더 필요하다.
- 아래 저장 단위를 분리해서 보는 편이 좋다.
  - master data: 학생, 학부모, 강사, 반, 지점
  - operational case: 민원, 상담, 보강, 환불, 결석 대응
  - policy/compliance: 약관, 규정, 법무 체크 기준
  - audit/activity: 누가 언제 무엇을 바꿨는지

## Open Questions

- 어떤 데이터가 있어야 “운영 시스템”이라고 부를 수 있는가
- 어떤 데이터부터 MVP에 넣어야 하는가
- 데이터 자산화 스토리를 어떻게 만들 것인가
- `민원`을 conversation, ticket, case 중 어떤 개념으로 고정할지 아직 불명확하다
