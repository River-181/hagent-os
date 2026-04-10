---
name: kakao-channel
description: 카카오 채널 문의 흐름을 연결하는 wrapper skill입니다.
---

# 카카오 채널 연동

## 목적

카카오 채널로 들어온 문의를 HagentOS 케이스와 민원 대응 흐름에 연결합니다.

## 처리 흐름

- 수신 메시지 수집
- 발화자/채널 메타데이터 정리
- Complaint 또는 Intake 케이스로 분기
- 초안 응답 생성 후 승인 대기

## 의존성

- `kakao-channel`
