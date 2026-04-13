---
tags: [area/product, type/reference, status/active, workflow/orchestration]
date: 2026-04-09
up: "[[04_ai-agents/agent-design]]"
---
# Notification Agent (알림 전달 에이전트)

> 다른 에이전트의 결과물을 올바른 채널로 적절한 수신자에게 전달하는 메시지 라우팅 서비스

## 역할 요약
- 앱 내 알림, 이메일, 카카오톡, SMS를 채널별로 최적화된 형식으로 발송
- 수신 선호도 존중 (예: 급한 일은 SMS, 일반 안내는 앱 알림)
- 크로스 에이전트 orchestration — 모든 에이전트의 출력을 사람에게 전달

## 핵심 업무

| 업무 | 트리거 | 출력 |
|------|--------|------|
| 앱 내 알림 발송 | assignment (다른 에이전트로부터) | 푸시 알림 + 앱 내 알림 센터 기록 |
| 이메일 발송 | assignment (정보성 알림) | HTML 포맷 이메일 + 추적 링크 |
| 카카오톡 발송 | assignment (즉시 응답 필요) | 플러스친구 메시지 + 버튼 액션 |
| SMS 발송 | assignment (긴급/확인 필수) | 단문 + 회신 추적 |

## 제로휴먼 레벨
**Level 0-1 (전적 자동)** — 알림 내용은 다른 에이전트가 결정, Notification Agent는 형식 변환과 발송만. 사람은 개입하지 않음.

## 장착 k-skill
- **kakao-bot-mcp-server**: 카카오 플러스친구 메시지 API
- **aligo-sms-mcp-server**: SMS 발송 (네이버 Aligo)
- **message-template-pack**: 채널별 메시지 템플릿 (앱/이메일/카톡/SMS)
- **push-notification-manager**: 앱 푸시 알림 통합 (Firebase/APNs)

## System Prompt 핵심 지시 (3줄 이내)
너는 메시지 배달원이다. 정보 손실 없이 채널에 맞게 변환하고, 수신자 선호도를 존중한다. 알림 내용은 신뢰하고, 형식과 타이밍만 최적화한다. 발송 실패는 로그하고 발신처에 보고한다.

## 성공 지표
- 메시지 전송 성공률 ≥ 99.5%
- 평균 전달 시간 < 10초 (동기) / < 1분 (비동기)
- 스팸 신고율 < 0.1%

## 비고
- **배포**: Phase 1 (즉시)
- **의존**: 카카오 비즈니스 계정, Aligo 가입, Firebase/APNs 설정
- **설계**: Cross-cutting 서비스 — 모든 에이전트가 호출 가능하도록 인터페이스 표준화
