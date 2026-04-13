---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-10
up: "[[index]]"
status: active
aliases:
  - hagent_gap
  - paperclip_hagent_gap
---
# Paperclip vs HagentOS 설계 갭

## Summary First

HagentOS는 `Company -> Agent -> Task -> Approval`의 큰 방향은 잘 가져왔지만, Paperclip의 핵심인 `Issue/Goal/Project 추적`, `실시간 이벤트`, `API 레이어`, `이중 인증 주체`가 아직 많이 비어 있다.

## Critical Gaps

- Case가 Issue를 완전히 대체하지 못한다.
  - `parentId`, `goalId`, `checkoutRunId`, `labels`, `blockedBy/blocks`가 빠져 있다.
- Agent 상세 탭이 부족하다.
  - `instructions`, `configuration`, `budget` 탭이 미설계다.
- Goal 엔티티와 Secret/API key 관리가 없다.
- 인간과 에이전트를 분리한 인증 구조가 없다.
- 실시간 이벤트와 API 모듈 구조가 정리되지 않았다.

## What To Borrow

- 4-zone board layout
- [[운영보드_우선_UI_원칙|board-first control plane]]
- company-scoped state
- [[학원_운영의_승인지점과_approval_flow|approval-centered flow]]
- audit-friendly API 관점

## What To Adapt

- `company portfolio` 서사는 버리고 `academy operations`로 번역한다.
- multi-company보다 단일 기관 운영과 역할 분담을 우선한다.
- plugin 과잉 구조는 버리고 `k-skill` 중심으로 간다.
- code execution workspace보다 운영 case/approval 중심 데이터 모델을 강화한다.

## Immediate Actions

1. `domain-model.md` 보강
2. `information-architecture.md`에 agent 6탭, kanban/filter, command palette 반영
3. `realtime-architecture.md`, `api-design.md` 추가
4. 인증 아키텍처를 `human + agent` 이중 주체로 명시

## Strategic Reading

- 이 비교는 "뭘 그대로 복제할까"가 아니라 "무엇을 먼저 비워 두면 안 되는가"를 정리한다.
- 현재 MVP에서는 `Case/Approval/AgentRun/Goal` 구조가 가장 중요한 차이점이다.

## Current Follow-up

- 현재 구현 기준 흡수 패턴 정리는 [[Paperclip_롤모델_흡수_패턴]]에서 이어진다.
- Day 8 snapshot은 [[HagentOS_현재_아키텍처_상태]]와 [[배포_버그_수정_요약_2026-04-13]]를 함께 본다.

## Linked Sources

- [[gap-analysis-paperclip-vs-hagent]]
- [[06-runtime-control-plane-map]]
- [[04-k-education-fit-gaps]]

## Related Pages

- [[운영_Control_Plane_모델]]
- [[한국_교육_도메인_적합성_갭]]
- [[학원_운영_루프_지도]]
- [[Paperclip_롤모델_흡수_패턴]]
