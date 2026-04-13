---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-09
up: "[[index]]"
status: active
aliases:
  - 학원운영_skill_map
  - kskill_mcp_map
---
# 학원 운영 k-skill 및 MCP 후보 맵

## Summary First

학원 운영 AI는 단일 모델 성능보다 `어떤 루틴을 어떤 도구와 연결하느냐`가 더 중요하다. 따라서 제품 기획 단계에서부터 한국형 채널, 결제, 법령, 일정, 장소 검색을 skill/MCP 단위로 쪼개 보는 편이 맞다.

## High-value Integration Areas

- 카카오톡/알림톡: 공지, 출결, 미납, 상담 follow-up
- 국내 SMS: 카카오 실패시 fallback 발송
- 결제/청구: 청구서, 결제 링크, 미납 추적
- 법령 검색: 학원법, 개인정보, 환불/교습비 기준 검토
- 일정/캘린더: 수능, 모의고사, 학원 자체 시험 일정 동기화
- 로컬 검색: 근처 식당, 주차, 카페, 편의시설 안내

## Candidate Skill Packs

- Parent Communication Skill
  - 상담 요약, 공지 초안, 발송 전 approval, 발송 로그 저장
- Attendance & Billing Skill
  - 출결 확인, 미납자 조회, 알림 발송 대상 생성
- Exam Calendar Sync Skill
  - 수능/모평 일정 수집, 반별 일정판 생성, 학부모 공지 초안
- Law & Policy Check Skill
  - 환불/교습비/개인정보 관련 조항 검색과 체크리스트 생성
- Staff Convenience Skill
  - 주변 맛집, 카페, 주차, 날씨 기반 운영 편의 기능

## Product Reading

- `민원 대응`과 `재등록/이탈 방어`는 skill orchestration 관점에서 설계하는 편이 자연하다.
- `k-skill`류 아이디어는 데모의 부가 재미 포인트일 수 있지만, 본 MVP의 코어는 운영 루틴 자동화다.
- 실사용 후보는 "메시지 발송 + 상태 조회 + 승인 + 로그 저장" 4단을 묶어서 봐야 한다.

## Current Decision Link

이 문서는 후보 맵이다. 현재 제품 결정은 [[k-skill_생태계_결정_내역]]에서 읽는 편이 정확하다.

## Implementation Caution

- 공개 MCP가 존재해도 실제 서비스 연동 안정성은 별도 검증이 필요하다.
- 결제/법령/민원 대응은 데모와 실제 운영의 안전 기준을 분리해서 봐야 한다.
- 너무 많은 integration을 동시에 잡으면 MVP 초점이 무너진다.

## Linked Sources

- [[02_전략/04_research/10_reports/R-010_한국_학원반복업무행정_관련스킬]]
- [[학원_운영의_승인지점과_approval_flow]]
- [[민원_대응은_첫_MVP_후보다]]

## Related Pages

- [[운영_케이스_OS가_화이트스페이스다]]
- [[학원_운영_데이터_자산화_우선순위]]
- [[재등록과_이탈_방어는_두번째_강한_MVP_후보다]]
- [[k-skill_생태계_결정_내역]]
