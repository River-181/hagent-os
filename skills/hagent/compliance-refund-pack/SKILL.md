---
name: compliance-refund-pack
description: 환불 문의와 학원 운영 규정 검토를 법령 조회, 환불 계산, 근거 정리 흐름으로 묶는 pack입니다.
---

# 교육 법령/환불 검토 Pack

## 목적

- 환불/정책 관련 case에서 법령 근거와 환불 계산을 함께 다룹니다.
- 운영자가 승인 가능한 형태의 근거 포함 초안을 생성합니다.

## 구성

- refund-calculator
- k-education-law-lookup
- korean-tone-guide
- korean-law-mcp

## 실행 가이드

- 먼저 `korean-law-mcp` 조회 가능 여부를 확인합니다.
- 법령/약관/기관 정책의 충돌 여부를 분리해서 기록합니다.
- 답변은 요약, 근거, 계산, operator action으로 나눠 반환합니다.

## 추천 진입점

- Refund case
- Policy project
- Onboarding compliance setup
