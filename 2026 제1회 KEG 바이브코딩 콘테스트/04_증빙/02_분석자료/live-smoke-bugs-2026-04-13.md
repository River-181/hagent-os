---
tags:
  - area/evidence
  - type/report
  - status/active
  - workflow/live-validation
date: 2026-04-13
status: completed-partial
up: "[[_04_증빙_MOC]]"
---

# Live Smoke Bugs — 2026-04-13

## Summary
- total: 1
- P0: 1
- P1: 0
- P2: 0
- note: `BUG-001` 때문에 요청된 live smoke 나머지 영역은 전부 미검증 상태로 남았다.

### BUG-001 [resolved — Codex 환경 이슈, 라이브는 정상]
- Codex 샌드박스의 DNS egress 제한으로 라이브 확인이 불가능했던 환경 문제
- 본 세션에서 외부 네트워크로 재확인:
  - `GET https://hagent-os.up.railway.app/` → **HTTP 200** (670B, Railway edge)
  - `GET /api/health` → **HTTP 200**
  - `GET /api/organizations` → **HTTP 200**
  - `GET /api/cases|agents|settings` → 404 (org-scoped route 구조, 정상)
- 결론: 라이브 배포 자체는 살아있음. Railway 도메인·deploy 정상.
- 실제 기능 버그 (인증 플로우, 시드, 케이스 패널, 승인, OpenAI, 실시간 로그 등)는 브라우저 세션에서 별도 검증 필요.

## 미검증 항목
- 인증/온보딩 실브라우저 플로우
- 기본 org preload 및 시드 데이터 노출
- 케이스 속성 패널 상태/우선순위/담당 에이전트 변경
- quick ask / wakeup / runs 조회
- SSE 로그 스트리밍
- 승인 inbox → case → approve 결과
- settings 모델 선택 / adapter test / API 키 저장
