---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-10
up: "[[index]]"
status: active
aliases:
  - control_plane_model
  - runtime_control_plane
---
# 운영 Control Plane 모델

## Summary First

좋은 운영 제품은 채팅 앱이 아니라 `board + state + approval + activity`를 중심으로 돌아가는 control plane이다. Paperclip에서 가져와야 할 핵심은 AI 응답 자체보다 이 운영 껍데기다.

현재 shipped snapshot은 [[HagentOS_현재_아키텍처_상태]]에 따로 정리한다. 이 문서는 그 상위 개념을 설명한다.

## Layer Model

### UI layer

- dashboard
- agents
- cases/issues
- goals
- approvals
- activity
- inbox
- routines

핵심은 첫 화면이 chat이 아니라 운영 개체를 관리하는 board라는 점이다.

### API layer

- company/org scoped path
- audit-friendly mutation
- run 단위 추적

즉 "누가 어떤 실행에서 무엇을 바꿨는가"를 남기는 구조가 필요하다.

### Data/state layer

- case/issue
- goal
- approval
- activity
- cost/budget
- agent run

chat transcript보다 운영 상태가 더 중요한 context다.

### Adapter/runtime layer

- runtime은 control plane 뒤에 분리된다.
- adapter-separated execution이 기본 철학이다.
- **텔레그램 어댑터 (Day 8, `a9641e6`)**: 원장이 이동 중에도 케이스를 Confirm/Cancel. 승인 결과는 HagentOS 이력에 자동 기록. 채널-독립 설계로 카카오·LINE 등으로 확장 가능.

## Deployment Reading

- `local_trusted`: 단일 운영자, 로컬 데이터 통제, 빠른 실험에 유리
- `authenticated`: 다중 사용자 협업, 더 엄격한 권한 경계에 필요

## Translation For This Project

- 학원 운영 제품도 chat-first보다 [[운영보드_우선_UI_원칙|board-first]]로 보여줘야 한다.
- control plane의 핵심 오브젝트는 `학생/학부모/강사/케이스/승인/로그`다.
- local-first는 기존 SaaS 잠금 구조와 차별화 포인트가 될 수 있다.

## Recommended Borrow

- [[운영보드_우선_UI_원칙|board-first UI]]
- company-scoped state
- audit-friendly REST API
- local-first deployment
- adapter-separated execution

## Not To Copy Blindly

- multi-company를 첫 MVP 중심에 두는 것
- 미국 SaaS 관리자 기능을 그대로 복제하는 것
- control plane보다 chat UX를 먼저 설계하는 것

## Linked Sources

- [[06-runtime-control-plane-map]]
- [[Paperclip_vs_HagentOS_설계_갭]]

## Related Pages

- [[HagentOS_현재_아키텍처_상태]]
- [[배포_버그_수정_요약_2026-04-13]]
- [[한국_교육_도메인_적합성_갭]]
- [[학원_운영_루프_지도]]
- [[운영_케이스_OS가_화이트스페이스다]]
