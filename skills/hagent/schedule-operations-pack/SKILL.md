---
name: schedule-operations-pack
description: 보강, 상담 예약, 시간표 조정을 캘린더 연동과 일정 최적화 흐름으로 묶는 운영 pack입니다.
---

# 보강/일정 조정 Pack

## 목적

- 보강, 결석, 상담 예약, 시간표 변경 요청을 한 흐름으로 정리합니다.
- 일정 생성과 수정 가능 여부를 캘린더 연동 상태와 함께 판단합니다.

## 구성

- schedule-manager
- schedule-optimizer
- google-calendar-mcp

## 실행 가이드

- 기존 학생/강사/교실 제약을 먼저 확인합니다.
- 캘린더 연동이 없으면 degraded 제안 모드로 동작합니다.
- 제안 결과는 후보 시간, 충돌, 추천안, 후속 메시지 초안을 함께 반환합니다.

## 추천 진입점

- Schedule case
- Schedule project
- Onboarding channel/calendar setup
