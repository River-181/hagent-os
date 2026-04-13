---
tags:
  - area/submission
  - type/verification
  - status/active
date: 2026-04-13
up: "[[_05_제출_MOC]]"
status: active
aliases:
  - live-final-verification
  - 제출직전실검증
---
# 제출 직전 라이브 최종 검증

> 기준 시각: `2026-04-13 23:23 KST`
> 기준 환경: `https://hagent-os.up.railway.app`
> 제출 버전: `v0.5.0`
> 이 문서는 **라이브 제품의 런타임 검증 기록**만 다룬다. 패키지 포함 상태는 [[05_제출/submission-checklist|submission-checklist]]와 [[SHARE-PACKAGE]]에서 관리한다.

## 정본 확인

- GitHub 저장소: `https://github.com/River-181/hagent-os`
  - `HTTP 200` 확인
- 라이브 URL: `https://hagent-os.up.railway.app`
  - `HTTP 200` 확인
- 제출 정본 문서:
  - [[05_제출/ai-report-final|AI 리포트 최종본]]
  - [[05_제출/submission-checklist|제출 체크리스트]]
  - [[04_증빙/01_핵심로그/master-evidence-ledger|증빙 원장]]

## 심사 시나리오 기준 통과 항목

- 고객 bot `@TANZANIA_ENGLISH_ACADEMY_bot`
  - 문의 수신 → case 생성 경로 확인
- 운영 bot `@hagent_os_ops_bot`
  - `미승인 보여줘`
  - `케이스 C-xxx 승인`
  - `Confirm / Cancel`
  - 승인 후 최신 artifact 본문 재전송
- 웹 UI
  - `Approvals` 반영
  - `Case detail` 상태 반영
  - `결과 문서` 반영
- Telegram owner-control
  - 중복 pending approval 정리
  - 같은 case 반복 노출 제거

## 현재 알려진 제한

- `LAW_OC`는 아직 실시간 `law.go.kr` 조회가 아니라 `cached fallback`으로 보일 수 있다.
- Google Calendar 실제 sync는 `GOOGLE_CALENDAR_ACCESS_TOKEN`이 없으면 `pending_credentials`로 남는다.

## 심사 직전 마지막 확인 순서

1. 라이브 URL 접속
2. 고객 bot 문의 1건
3. 운영 bot 승인 1건
4. 웹에서 case / approval / document 반영 확인
5. 제출/패키지 문서 상태는 [[05_제출/submission-checklist|제출 체크리스트]]에서 별도 확인
