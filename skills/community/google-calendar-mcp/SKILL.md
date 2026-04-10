---
name: google-calendar-mcp
description: 일정 생성과 동기화를 위한 Google Calendar wrapper skill입니다.
---

# Google Calendar MCP

## 목적

학원 일정 데이터를 Google Calendar 이벤트로 연결할 때 사용할 wrapper skill입니다.

## 사용할 때

- 보강 수업을 일정에 등록할 때
- 상담 예약을 캘린더에 만들 때
- 강사 변경으로 이벤트 시간을 수정할 때

## 실행 규칙

- 기존 캘린더 이벤트가 있는지 먼저 확인합니다.
- 같은 학생/강사/시간 조합의 중복 이벤트를 만들지 않습니다.
- 외부 전송 전에는 한국어 제목과 메모를 정리합니다.

## 의존성

- `google-calendar-mcp`
