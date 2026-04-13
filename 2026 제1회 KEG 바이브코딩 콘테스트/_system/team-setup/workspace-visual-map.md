---
tags:
  - area/system
  - type/guide
  - status/active
date: 2026-04-06
up: "[[_system_tools_MOC]]"
aliases:
  - workspace-visual-map
  - 워크스페이스시각화맵
---
# 워크스페이스 시각화 맵

> 처음 보는 사용자는 이 note부터 보면 된다.
> 이 문서는 이 워크스페이스의 구조, 읽는 순서, 도구 계층, 운영 흐름을 시각화한다.

## 1. 전체 구조

```mermaid
flowchart TD
    HOME["00 HOME<br/>볼트 홈"] --> MOC["_MOC/<br/>모든 MOC 중앙 공간"]
    HOME --> INFO["01_대회정보<br/>규칙/일정/심사"]
    HOME --> STRATEGY["02_전략<br/>리서치/플레이북"]
    HOME --> PRODUCT["03_제품<br/>문제정의/코드/테스트"]
    HOME --> EVIDENCE["04_증빙<br/>AI 리포트 재료 정본"]
    HOME --> SUBMIT["05_제출<br/>최종 제출물"]
    HOME --> SYSTEM["_system/<br/>도구/대시보드/팀 셋업"]
    HOME --> AGENT[".agent/<br/>AI 운영 정본"]
    HOME --> CLAUDE[".claude/<br/>런타임 어댑터"]

    SYSTEM --> DASH["_system/dashboard<br/>사용자/AI 공용 대시보드"]
    SYSTEM --> TOOLS["_system/tools<br/>도구 정본"]
    SYSTEM --> SETUP["_system/team-setup<br/>팀 컴퓨터 셋업"]

    AGENT --> OPS["system/ops"]
    AGENT --> MEMORY["system/memory"]
    AGENT --> REGISTRY["system/registry"]
    AGENT --> MAPS["system/maps"]
```

## 2. 처음 보는 사용자의 읽는 순서

```mermaid
flowchart LR
    A["[[00 HOME]]"] --> B["[[_MOC_HOME]]"]
    B --> C["[[_system/team-setup/workspace-visual-map|시각화 맵]]"]
    C --> D["[[_system/dashboard/project-dashboard|프로젝트 대시보드]]"]
    D --> E["[[.agent/system/ops/PLAN|PLAN]]"]
    E --> F["[[.agent/system/ops/PROGRESS|PROGRESS]]"]
    F --> G["[[_04_증빙_MOC]]"]
    G --> H["[[master-evidence-ledger]]"]
```

## 3. 도구 계층

```mermaid
flowchart TB
    USER["사용자"] --> OBS["Obsidian App + CLI"]
    USER --> AI["Claude Code / Codex"]

    OBS --> VAULT["Vault Notes<br/>00~05, _MOC, _system"]
    AI --> AGSYS[".agent/system"]
    AI --> ADAPTER[".claude"]

    TOOLS["_system/tools"] --> OBSCLI["Obsidian CLI + Skills"]
    TOOLS --> EXCALI["Excalidraw MCP"]
    TOOLS --> FIGMA["Figma MCP"]
    TOOLS --> NLM["NotebookLM CLI"]

    OBSCLI --> VAULT
    EXCALI --> EVID["04_증빙 / 05_제출"]
    FIGMA --> PRODUCT["03_제품 / 디자인 구현"]
    NLM --> STRAT["02_전략 / 리서치"]
```

## 4. 운영 흐름

```mermaid
flowchart LR
    START["작업 시작"] --> DASH["[[project-dashboard]] 확인"]
    DASH --> PLAN["[[PLAN]] 확인"]
    PLAN --> WORK["문서/리서치/개발 작업"]
    WORK --> MEMORY["daily-memory 또는 작업 note"]
    MEMORY --> LEDGER["[[master-evidence-ledger]] 기록"]
    LEDGER --> DECISION["필요 시 [[decision-log]] 승격"]
    LEDGER --> PROMPT["필요 시 [[prompt-catalog]] 승격"]
    LEDGER --> REPORT["[[20260406_③_2026_KIT_바이브코딩_공모전_팀명_개인은_이름_AI리포트]]"]
```

## 5. 어디에 무엇을 기록하는가

| 상황              | 기록 위치                      |
| --------------- | -------------------------- |
| 대회 규칙/공지 이해     | [[_01_대회정보_MOC]]           |
| 전략, 리서치, 플레이북   | [[_02_전략_MOC]]             |
| 제품 구조, 코드, 테스트  | [[_03_제품_MOC]]             |
| AI 활용 증빙, 세션 재료 | [[master-evidence-ledger]] |
| 중요한 의사결정        | [[decision-log]]           |
| 반복 사용 프롬프트      | [[prompt-catalog]]         |
| 도구 셋업과 팀 환경     | [[_system_tools_MOC]]      |

## 6. 핵심 원칙

- MOC는 `_MOC/`에만 둔다.
- 사용자와 AI가 같이 보는 대시보드는 `[[_system/dashboard/project-dashboard|project-dashboard]]`다.
- 직접 입력 증빙 정본은 [[master-evidence-ledger]] 하나다.
- 도구 정본은 `_system/tools/`에 둔다.
- 팀원 컴퓨터 적용 기준은 [[_system/team-setup/team-computer-setup-guide|팀 컴퓨터 셋업 가이드]]다.
