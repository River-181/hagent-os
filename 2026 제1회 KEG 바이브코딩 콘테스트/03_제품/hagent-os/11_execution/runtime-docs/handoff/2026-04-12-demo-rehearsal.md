---
tags: [area/product, type/handoff, status/active, workflow/execution]
date: 2026-04-12
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/handoff/2026-04-12-demo-rehearsal.md"
synced_at: 2026-04-13
---
# HagentOS Demo Rehearsal

기준 조직
- `탄자니아 영어학원 데모 7`
- URL prefix: `/탄자니아-영어학원-데모-7`

현재 고정 판단
- `직원/강사`는 이번 제출 범위에서는 새 `staff` 테이블을 만들지 않는다.
- 대신 기존 `instructors` 모델에 `role = teacher | staff | hybrid`를 강하게 쓰고, 화면과 일정 연결을 그 기준으로 정리한다.
- 이유: 새 테이블을 만들면 migration, API, seed, UI, 일정/케이스 연결을 모두 다시 건드려야 해서 제출 범위를 불필요하게 키운다.

## Scenario 1. 카카오 민원 접수

시작 URL
- `http://localhost:5174/탄자니아-영어학원-데모-7/inbox`

목표
- 채널 인입이 케이스가 되고, 승인과 발송 준비까지 이어지는 흐름을 보여준다.

클릭 순서
1. `알림함` 진입
2. `Replay Kakao 민원` 클릭
3. `마지막 생성 항목` 또는 `최근 생성 결과`에서 방금 생성된 케이스 `보기`
4. `검토 중` 초안 확인
5. `승인` 화면 또는 케이스 내 approval 카드에서 승인
6. `운영자 발송 브리지` 상태 확인

기대 결과
- `in_review` 케이스 생성
- approval 생성
- `ready_to_send` 또는 `sent` 상태 표시
- 문서 탭에 민원 초안/브리프 확인 가능

fallback
- auto provider가 없으면 `운영자 발송 브리지`로 설명

## Scenario 2. 보강/결석 문의

시작 URL
- `http://localhost:5174/탄자니아-영어학원-데모-7/inbox`

목표
- 외부 문의가 일정 제안과 안내 초안으로 이어지고, `Schedule`에서 실제 블록 조정까지 연결되는 흐름을 보여준다.

클릭 순서
1. `알림함` 진입
2. `Replay Telegram 상담` 클릭
3. `마지막 생성 항목` 또는 `최근 생성 결과`에서 방금 생성된 케이스 `보기`
4. 일정 제안과 안내문 초안 확인
5. 필요하면 `일정` 화면으로 이동해 30분 단위로 블록 이동

기대 결과
- 관련 케이스 생성
- 일정 제안 또는 상담 일정 문안 생성
- `Schedule`에서 실제 블록 이동 반영 가능

fallback
- Google Calendar 실연동이 없으면 `pending / local schedule` 기준으로 설명

## Scenario 3. 상반기 프로모션 준비

시작 URL
- `http://localhost:5174/탄자니아-영어학원-데모-7/assistant`

목표
- instruction이 project와 child cases, outputs로 분해되는 것을 보여준다.

클릭 순서
1. `Assistant` 진입
2. `프로모션 프로젝트` shortcut 클릭
3. 생성된 프로젝트 상세로 자동 이동
3. `프로모션 실행` track 확인
4. child cases 확인
5. outputs와 추천 역할 확인

기대 결과
- 프로젝트 생성
- `프로모션 컨셉안`, `프로모션 일정표`, `학부모 안내문`, `메시지 초안`, `랜딩/홍보 텍스트` 생성

fallback
- 추천 role은 approval/운영 안내로 설명

## Scenario 4. 법률/운영 정책 질문

시작 URL
- `http://localhost:5174/탄자니아-영어학원-데모-7/assistant`

목표
- chat처럼 보이는 입력이 휘발되지 않고 inquiry case와 document artifact로 남는 점을 보여준다.

클릭 순서
1. `Assistant` 진입
2. `정책·법률 질문` shortcut 클릭
3. 왼쪽 질문 세션 목록에서 방금 생성된 최신 세션 선택
4. `문서` 탭에서 `운영 질문 브리프` 또는 `법률 질문 브리프` 확인
5. `AI 실행 컨텍스트`에서 `used skills`, `skill context`, `legal basis` 확인

기대 결과
- inquiry case 생성
- 문서 산출물 생성
- 후속 질문 시 같은 세션 append 가능

fallback
- `LAW_OC` 미설정 시 `법령 근거는 degraded`라고 명시

## 운영 체크포인트

- `케이스 삭제`
  - 자식 케이스가 없으면 삭제 가능
  - 자식 케이스가 있으면 `서브 케이스 N건을 먼저 삭제` 메시지 노출
- `일정 이동`
  - 주간 뷰에서 30분 단위 슬롯으로 드래그 이동 가능
- `문서함`
  - 기본 scope는 `지식베이스`
  - 케이스 산출물은 필요할 때만 노출
- `조직도`
  - 가로/세로 스크롤 가능

## 제출 전 마지막 확인

1. `Settings`에서 adapter/integration 상태 확인
2. `Assistant` 4개 시나리오 shortcut 동작 확인
3. `Inbox`, `Cases`, `Projects`, `Schedule`, `AgentDetail`, `Settings` 렌더 확인
4. `탄자니아 영어학원 데모 7` 하나만 남아 있는지 확인
