---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-12
up: "[[index]]"
aliases:
  - board_first_ui
  - entrypoint_ui_principle
---
# 운영보드 우선 UI 원칙

## Summary First

이 제품의 첫 화면은 채팅창이 아니라 운영 보드여야 한다. 중요한 오브젝트는 프롬프트가 아니라 `브리핑`, `케이스`, `승인`, `활동`, `리스크`다.

## Core Reading

- Paperclip의 진짜 entrypoint는 chat보다 control plane에 가깝다.
- 첫 흐름은 `goal 설정 -> 팀 구성 -> 승인/실행 -> 모니터링`이다.
- 사용자는 대화 상대보다 운영자/관리자/승인자에 가깝다.

## Local Translation

- 운영자 첫 화면:
  - 오늘의 운영 브리핑
  - 민원 카드
  - 재등록 위험
  - 강사 일정 충돌
  - 승인 대기
- 교사/강사 첫 화면:
  - 내 반/내 수업 운영 보드
  - 상담 후속
  - 학생 요약
  - 일정/보강 처리

## Borrowed Structure

- dashboard-first entry
- 브리핑 -> 지시 -> 병렬 처리 -> 승인 흐름
- 역할명과 org chart로 AI 팀을 인식시키는 구조
- `issues/goals/approvals/activity/inbox`를 병렬로 보는 정보 구조

## What Not To Copy

- 스타트업 KPI 중심 첫 화면
- all-in-one chat처럼 보이는 UX
- agent를 너무 많이 동시에 노출하는 것
- 미국 SaaS 관리자 서사를 그대로 쓰는 것

## Design Questions

- 첫 화면의 핵심 카드 4개는 무엇인가
- `issues`에 대응하는 한국형 오브젝트는 무엇인가
- `inbox`와 `activity`를 분리할 것인가
- 운영자 모드와 교사 모드가 같은 shell을 공유할 것인가

## Linked Sources

- [[01-ui-entrypoints]]
- [[운영_Control_Plane_모델]]

## Related Pages

- [[학원_운영의_승인지점과_approval_flow]]
- [[Paperclip_vs_HagentOS_설계_갭]]
- [[학원_운영_루프_지도]]
