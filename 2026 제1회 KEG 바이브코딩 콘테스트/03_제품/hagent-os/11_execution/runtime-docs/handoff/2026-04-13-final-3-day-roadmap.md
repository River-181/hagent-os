---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/2026-04-13-final-3-day-roadmap.md"
synced_at: 2026-04-13
---
# HagentOS 최종 3일 로드맵

- 작성일: 2026-04-13
- 기준 repo: `hagent-os`
- 기준 workspace: `/Users/river/workspace/active/hagent-os`
- 목표: `심사 리허설 통과 -> 배포 -> 제출 패키징`

## 현재 상태 요약

- 핵심 기능은 이미 연결되어 있다.
  - 온보딩
  - 학생 / 케이스 / 승인 / 일정 / 문서 / 아웃바운드
  - Telegram inbound / outbound
  - approval 후 schedule 생성
  - stale run recovery
  - notifications dedupe
  - SSE reconnect
- `server typecheck`, `ui typecheck`는 현재 통과 상태다.
- 남은 일의 본질은 새 기능 개발이 아니라 아래 4개다.
  - 심사 리허설 기준 전체 상호작용 검증
  - 프론트엔드 디자인과 UX 통일
  - 외부 연동 / 배포 마감
  - 제출 패키징

## 최우선 원칙

1. 심사에서 실제로 보여줄 흐름을 먼저 고정한다.
2. 보기 좋은 기능보다 끊기지 않는 흐름을 우선한다.
3. 배포와 패키징은 마지막이 아니라 Day 2부터 병행한다.
4. 리허설에서 한 번이라도 흔들린 흐름은 Day 3 전에 반드시 수정한다.

## Day 1. 전체 워크플로 검증과 blocker 제거

### 목표

- 심사 시나리오 전 구간을 실제로 한 번씩 끝까지 탄다.
- 데이터 흐름, 에이전트 실행, 승인 후 side effect, 객체 연결성을 확인한다.
- 치명적인 blocker를 모두 제거한다.

### 할 일

- 온보딩 -> 대시보드 진입 전체 확인
  - org 생성
  - starter 상태
  - 첫 화면 진입
- 학생 관리 흐름 확인
  - 목록
  - 상세
  - 보호자 / 결제 / 관련 케이스
  - 수정 저장
- 케이스 생성 / 처리 흐름 확인
  - 수동 생성
  - Telegram inbound 생성
  - append / reopen / child case
  - hidden / archived 후 재등장 금지
- 승인 / 일정 / 발송 확인
  - approval 생성
  - approve / reject / revision
  - schedule side effect
  - outbound ready / sent / failed
- 에이전트 팀 작동 확인
  - orchestrator
  - complaint
  - scheduler
  - retention
  - run / approval / activity / artifact / cost 흔적 일치
- 운영 기능 확인
  - create / edit / delete / archive
  - routine trigger
  - heartbeat
  - wakeup / stop
  - stale run recovery

### 검증 포인트

- `approval -> schedule/outbound/document/activity`가 빠짐없이 남는가
- 같은 사건이 중복 case / 중복 approval / 중복 notification으로 보이지 않는가
- Telegram 문의가 message 단위가 아니라 context 단위로 묶이는가
- 학생 / 케이스 / 문서 / 프로젝트 / 일정이 서로 연결되어 읽히는가
- operator가 한 번에 이해할 수 있는가

### Day 1 종료 조건

- 심사 시나리오별 `통과 / 실패 / 수정 필요` 표가 완성된다.
- P0 / P1 blocker 목록이 10개 이하로 줄어든다.
- 치명적 데이터 손실 / 중복 생성 / 재실행 꼬임이 남아 있지 않다.

## Day 2. UI/디자인 통일과 live integration/배포 준비

### 목표

- 전반적인 화면 톤과 UX를 통일한다.
- 실연동 환경 값을 채우고 배포 가능한 상태까지 올린다.

### 할 일

- 디자인 통일
  - `Cases`
  - `Inbox`
  - `Approvals`
  - `Schedule`
  - `Documents`
  - `Students`
  - `Settings`
- UX 세부 조정
  - empty / loading / error
  - 긴 텍스트
  - 상태 배지 규칙
  - card density
  - 중복 정보 제거
  - 다크 / 라이트 균형
- SSE / live 검증
  - reconnect
  - refresh
  - multi-tab
  - 서버 재시작 후 영향 확인
- 외부 연동 마감
  - Telegram webhook public HTTPS URL
  - `KAKAO_OUTBOUND_PROVIDER_URL`
  - `GOOGLE_CALENDAR_ACCESS_TOKEN`
  - `GET /api/adapters` 상태 확인
- 배포 준비
  - build / start / migrate 절차 확정
  - 호스팅 방식 확정
  - env 목록 정리
  - fallback 설명 준비

### 검증 포인트

- 페이지 간 시각 언어가 통일되는가
- 심사자가 화면만 봐도 객체 관계를 이해할 수 있는가
- live event가 끊겨도 화면이 멈추지 않는가
- 연동 미설정 시 degraded/fallback이 설명 가능하게 보이는가

### Day 2 종료 조건

- 핵심 화면 6개 이상이 시각적으로 같은 제품처럼 보인다.
- 외부 연동 상태가 `실제 가능 / fallback / 미완료`로 명확히 구분된다.
- 배포 실행 절차가 문서화된다.

## Day 3. 배포, 최종 리허설, 제출 패키징

### 목표

- 실제 배포본을 확보한다.
- 심사 시연을 2~3회 반복해 안정화한다.
- 제출 문서를 정리한다.

### 할 일

- 배포 실행
  - build
  - start
  - env 주입
  - live URL 확인
- 최종 리허설
  - Scenario 1. 채널 문의 -> 케이스 -> 승인 -> 발송
  - Scenario 2. 보강/결석 -> 일정 제안 -> schedule 반영
  - Scenario 3. instruction -> project / child case / outputs
  - Scenario 4. 운영/법률 질문 -> inquiry case / document artifact
- 리허설 방식
  - 새로고침 포함
  - 다른 화면 전환 포함
  - fallback 멘트 포함
  - 예상 질문 대응 포함
- 제출 패키징
  - README
  - 실행 방법
  - 심사 시나리오 문서
  - known limits
  - live / fallback 구분표
  - 스크린샷 / 증빙 링크

### 검증 포인트

- 로컬이 아니라 배포본에서도 동일하게 동작하는가
- 심사자 앞에서 1회가 아니라 반복 시연에도 흔들리지 않는가
- live가 아닌 부분도 fallback 설명이 자연스러운가
- 제출 문서만 읽어도 구조와 가치가 이해되는가

### Day 3 종료 조건

- live URL 확보
- 최종 리허설 2회 이상 통과
- 제출 패키지 완성

## 필수 체크리스트

### 기능

- [ ] 온보딩 정상
- [ ] Dashboard 정상
- [ ] Students create / edit / detail 정상
- [ ] Case create / append / reopen / child case 정상
- [ ] Approvals approve / reject / revision 정상
- [ ] Schedule side effect 정상
- [ ] Outbound ready / sent / failed 정상
- [ ] Archive / delete / hide 정상

### 데이터 / 로그

- [ ] activity trail 일관성
- [ ] run / approval / artifact 연결 일관성
- [ ] token / cost 기록 일관성
- [ ] notification dedupe 정상
- [ ] archived object 재등장 없음

### 에이전트

- [ ] orchestrator dispatch 정상
- [ ] complaint 정상
- [ ] scheduler 정상
- [ ] retention 정상
- [ ] heartbeat 정상
- [ ] wakeup / stop 정상
- [ ] stale run recovery 정상

### UX/UI

- [ ] 다크 / 라이트
- [ ] empty / loading / error
- [ ] 긴 텍스트
- [ ] duplicate visibility
- [ ] 테이블 / 카드 / 디테일 뷰 통일감

### 연동 / 배포

- [ ] Telegram inbound 정상
- [ ] Telegram webhook 또는 poll 전략 확정
- [ ] Kakao outbound 전략 확정
- [ ] Google Calendar sync 또는 fallback 설명 가능
- [ ] 배포 URL 확보
- [ ] env 목록 정리

## 현재 가장 큰 남은 리스크

1. `SSE replay/backlog`는 아직 없다.
2. 외부 연동은 credential / public URL 여부에 따라 live/fallback이 갈린다.
3. UI는 기능은 많지만 페이지 간 완성도 편차가 남아 있다.
4. 심사 시나리오를 실제 반복 실행하며 생기는 작은 불안정이 아직 숨어 있을 수 있다.

## 추천 실행 순서

1. Day 1 오전: 전체 E2E 리허설과 blocker 수집
2. Day 1 오후: 워크플로 / 데이터 / 에이전트 blocker 수정
3. Day 2 오전: UI/디자인 통일
4. Day 2 오후: 외부 연동 / 배포 준비
5. Day 3 오전: 배포 + 실배포 smoke test
6. Day 3 오후: 최종 리허설 + 제출 패키징

## 한 줄 결론

지금부터 3일은 `무엇을 더 만들까`가 아니라 `어떤 흐름을 끊김 없이, 보기 좋게, 설명 가능하게, 배포된 상태로 보여줄까`의 단계다.
