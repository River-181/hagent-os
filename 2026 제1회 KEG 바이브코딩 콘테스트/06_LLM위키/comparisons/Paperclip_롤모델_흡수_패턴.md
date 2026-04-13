---
tags:
  - area/wiki
  - type/comparison
  - status/active
date: 2026-04-13
up: "[[index]]"
status: active
aliases:
  - Paperclip absorption pattern
  - paperclip role model pattern
---
# Paperclip 롤모델 흡수 패턴

## Summary First

HagentOS는 Paperclip을 그대로 복제하지 않았다. 대신 `company as AI`의 control-plane 뼈대만 흡수하고, 한국 교육 운영 문맥에 맞게 `케이스`, `승인`, `일정`, `문서`, `채널`, `k-skill`로 다시 조립했다.

## 12가지 흡수 패턴

> 아래 12개는 “완전히 끝난 기능 목록”이 아니라, [[Paperclip_vs_HagentOS_설계_갭]]과 Day 7~8 운영 문서를 합쳐 읽은 흡수 패턴 정리다.

| # | 패턴 | HagentOS 해석 | 상태 |
|---|------|--------------|------|
| 1 | board-first 진입점 | chat-first 대신 `dashboard / inbox / cases / approvals`를 메인 표면으로 둔다 | shipped |
| 2 | issue 중심 허브 | `Issue`를 `Case`로 번역하고 `case -> run -> approval -> document` 루프로 재조합 | shipped |
| 3 | approval in context | 승인 페이지 분리만이 아니라 케이스/인박스 문맥에서 액션이 보이게 정리 | partial |
| 4 | heartbeat / wakeup | `heartbeat`, `routine`, `run recovery`를 운영 자동화의 기본 메커니즘으로 채택 | shipped |
| 5 | kanban + filter | Paperclip의 issue board를 참고해 케이스 목록에 `KanbanBoard`와 filter 사고를 도입 | partial |
| 6 | inbox action | approval 대기, outbound 준비, dedupe/grouped read를 인박스 액션 중심으로 읽는다 | shipped |
| 7 | agent memory | 제품 바깥 운영 레이어에서 `long-term-memory` + `daily-memory`를 분리해 기억 체계를 고정 | shipped in ops layer |
| 8 | project linkage | Goals와 Projects를 양방향으로 연결해 “운영 이니셔티브”를 추적한다 | shipped |
| 9 | org hierarchy | `reportsTo`와 org chart를 유지해 사람-에이전트 보고 체계를 시각화 | shipped |
| 10 | icon / status language | 에이전트·상태·우선순위를 아이콘과 badge로 읽히게 만드는 방식을 유지 | shipped |
| 11 | switch / toggle discipline | settings, routine, runtime readiness를 on/off 가능한 제어 표면으로 다룬다 | partial |
| 12 | Korean translation layer | `Company -> Organization`, `Issue -> Case`, `CEO -> Orchestrator`, `Plugins/Adapters -> 업무 스킬/AI 연결`로 번역 | shipped |

## 요청에서 언급된 항목을 현재 상태로 풀어 읽으면

### 칸반 DnD

- Paperclip의 list/kanban 전환을 강하게 참고했다.
- HagentOS는 현재 `KanbanBoard` 컴포넌트를 포함하지만, source set 기준으로는 “완전한 DnD 검증 완료”보다 “흡수 방향이 반영된 partial 상태”로 읽는 편이 맞다.

### 인박스 액션

- 단순 알림함이 아니라 `승인`, `outbound_ready`, grouped read 같은 운영 액션 허브로 발전했다.
- [[03_제품/hagent-os/02_product/prd]]의 notification / approval 해석과 `2026-04-13-full-regression.md`의 dedupe 검증이 이 축의 근거다.

### 에이전트 메모리

- Paperclip이 memory surface를 중요하게 보는 것처럼, 이 프로젝트도 `.agent/system/memory/`를 `daily-memory`와 `long-term-memory`로 분리했다.
- 다만 현재 메모리는 제품 UI보다 운영 워크스페이스 레이어에 더 강하게 구현되어 있다.

### 프로젝트

- 초반 갭 문서에서는 Project 엔티티 부족이 약점이었다.
- Day 7~8 기준으로 Goals ↔ Projects 양방향 연결과 `ProjectsPage`가 들어오면서 “운영 이니셔티브 단위”가 살아났다.

### 아이콘

- Paperclip의 작은 상태 언어를 흡수해 agent/status/priority를 아이콘으로 읽게 하는 방향을 유지했다.
- 이건 단순 시각 장식이 아니라 “지금 누가 일하고 있는가”를 빠르게 파악하는 control-plane 문법이다.

### Switch

- Paperclip의 작은 설정 제어는 대부분 toggle/switch 패턴으로 읽힌다.
- HagentOS도 runtime readiness, routines, integration 상태를 boolean 제어 대상으로 보는 사고를 가져왔지만, 이 축은 핵심 루프보다 보조 패턴으로 보는 편이 정확하다.

## 복제가 아니라 번역인 이유

- Paperclip의 `company portfolio` 서사는 교육 기관 운영으로 바뀌었다.
- code execution workspace보다 [[케이스_승인_후속조치_모델|`approval-driven operations system`]]이 중심이 됐다.
- generic skill system은 `k-skill 생태계`로 번역됐다.
- multi-company SaaS보다는 `organization` 단위 데모와 local-first 운영이 우선됐다.

## Related Pages

- [[Paperclip_vs_HagentOS_설계_갭]]
- [[운영_Control_Plane_모델]]
- [[HagentOS_현재_아키텍처_상태]]
- [[멀티에이전트_운영_모델]]

## Source Trace

- [[03_제품/hagent-os/02_product/prd]]
- [[03_제품/hagent-os/04_ai-agents/agent-design]]
- [[.agent/system/memory/daily-memory]]
- [[.agent/system/ops/PROGRESS]]
- [[Paperclip_vs_HagentOS_설계_갭]]
