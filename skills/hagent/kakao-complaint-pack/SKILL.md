---
name: kakao-complaint-pack
description: 카카오 채널 민원을 분류하고 답변 초안, 승인, 발송까지 한 흐름으로 묶는 운영 pack입니다.
---

# 카카오 민원 처리 Pack

## 목적

- 카카오 채널에서 유입된 민원/상담/보강 문의를 한 흐름으로 처리합니다.
- complaint agent가 초안을 만들고, approval과 outbound까지 이어지도록 안내합니다.

## 구성

- complaint-classifier
- korean-tone-guide
- message-template-pack
- kakao-channel
- kakao-outbound

## 실행 가이드

- 카카오 채널 연결과 outbound provider 상태를 먼저 확인합니다.
- 케이스의 민원 유형, 긴급도, 학부모 맥락을 분류합니다.
- 답변은 항상 초안과 근거를 함께 반환합니다.
- 승인 단계가 필요한 경우 `approval/send flow`를 우선합니다.

## 추천 진입점

- Case detail
- New case
- Onboarding
