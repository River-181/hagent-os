---
name: agent-runtime-checker
description: 에이전트 실행 전 runtime readiness를 점검하는 시스템 스킬입니다.
---

# 에이전트 런타임 점검기

## 목적

- 실행 전 adapter, model, env, integration 준비 상태를 검토합니다.
- 실패 가능성이 높은 원인을 먼저 알려줍니다.

## 실행 가이드

- adapter 연결 상태를 먼저 확인합니다.
- 필요한 integration과 env 누락 여부를 정리합니다.
- 즉시 실행 가능, 제한 실행, 실행 금지로 상태를 나눕니다.
- 사용자에게는 조치 우선순위를 3개 이하로 제안합니다.

