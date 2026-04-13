---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-10
up: "[[.agent/system/README]]"
aliases:
  - workspace-atlas
  - 워크스페이스지도
---
# Workspace Atlas

처음 보는 사용자는 이 파일 하나만 읽으면 현재 구조를 이해할 수 있어야 한다.

## 1. 구조 원칙

- `.agent/` = 운영 정본
- `.claude/` = Claude 런타임 어댑터
- `_MOC/` = 모든 MOC 중앙 공간
- `_system/tools/` = 저장소 종속 도구 정본
- `03_제품/` = 제품 정의와 실제 코드
- `04_증빙/` = AI 리포트 재료 정본
- `06_LLM위키/` = Karpathy 스타일 persistent wiki layer
- 루트 = 사람용 색인과 대회 섹션

## 2. 현재 폴더 구조

```text
.
├── 00 HOME.md
├── _MOC/
│   ├── _MOC_HOME.md
│   ├── _01_대회정보_MOC.md
│   ├── _02_전략_MOC.md
│   ├── _03_제품_MOC.md
│   ├── _04_증빙_MOC.md
│   ├── _05_제출_MOC.md
│   └── _system_tools_MOC.md
├── _system/
│   ├── tools/
│   └── team-setup/
├── 01_대회정보/
├── 02_전략/
│   ├── 00_foundation/
│   ├── 01_problem-framing/
│   ├── 02_prompts/
│   ├── 03_decisions/
│   ├── paperclip-analysis/
│   ├── research-results/
│   ├── tasks/
│   └── archive/
├── 03_제품/
│   ├── app/
│   └── tests/
├── 04_증빙/
│   ├── 01_핵심로그/
│   ├── 02_분석자료/
│   ├── 03_daily/
│   └── tasks/
├── 05_제출/
├── 06_LLM위키/
│   ├── concepts/
│   ├── comparisons/
│   ├── entities/
│   ├── problems/
│   ├── sources/
│   ├── theses/
│   └── tasks/
├── assets/
├── .agent/
│   ├── AGENTS.md
│   ├── agents/
│   ├── rules/
│   ├── skills/
│   ├── adapters/
│   └── system/
│       ├── ops/
│       ├── contracts/
│       ├── memory/
│       ├── registry/
│       ├── maps/
│       ├── logs/
│       └── automation/
└── .claude/
    ├── commands/
    ├── CLAUDE.md
    ├── settings.json
    └── setup.sh
```

## 3. 어디를 읽어야 하는가

| 상황 | 먼저 읽을 파일 |
|---|---|
| 새 세션 시작 | `.agent/AGENTS.md` |
| 현재 할 일 확인 | `.agent/system/ops/PLAN.md` |
| 현재 상태 확인 | `.agent/system/ops/PROGRESS.md` |
| 제출용 진행판 확인 | `_system/dashboard/project-dashboard.md` |
| 오래 유지되는 사실 확인 | `.agent/system/memory/long-term-memory.md` |
| 오늘의 단기 맥락 확인 | `.agent/system/memory/daily-memory.md` |
| 지속 위키 확인 | `06_LLM위키/index.md` |
| LLM 위키 운영 규칙 확인 | `.agent/system/contracts/llm-wiki-operations.md` |
| 위키 후보 스캔 규칙 확인 | `.agent/skills/wiki-candidate-harvest/SKILL.md` |
| 증빙 직접 기록 위치 확인 | `04_증빙/01_핵심로그/master-evidence-ledger.md` |

## 4. 메모리 → 증빙 흐름

```mermaid
flowchart LR
    Work["Session work"] --> Memory["memory/daily-memory.md"]
    Memory --> Gate{"Evidence Gate"}
    Gate -->|"report-worthy"| Core["master-evidence-ledger.md"]
    Gate -->|"not report-worthy"| Keep["memory only"]
    Work --> Wiki["06_LLM위키/"]
    Wiki --> Core
    Core --> Report["05_제출/AI report"]
```

## 5. 어댑터 구조

```mermaid
flowchart LR
    Canon[".agent/ (canonical)"] --> Ops["system/ops"]
    Canon --> Memory["system/memory"]
    Canon --> Rules["rules + agents + skills"]
    Canon --> ClaudeAdapter["adapters/claude"]
    ClaudeAdapter --> Runtime[".claude/"]
```

## 6. 구조가 바뀌면 무엇을 함께 바꾸는가

| 변경 유형 | 같이 갱신할 것 |
|---|---|
| 폴더 구조 변경 | 이 파일, `system-change-log.md`, `PROGRESS.md` |
| 운영 규칙 변경 | `workspace-contract.md`, `mirroring-policy.md` |
| 기억 변경 | `daily-memory.md`, 필요 시 `long-term-memory.md` |
| 대시보드/일정 구조 변경 | `project-dashboard.md`, `PLAN.md`, `PROGRESS.md`, `04_증빙/03_daily/` |
| LLM wiki 변경 | `06_LLM위키/index.md`, `06_LLM위키/log.md`, 필요 시 `master-evidence-ledger.md` |
| 위키 후보 발굴 규칙 변경 | `.agent/skills/wiki-candidate-harvest/`, `skills-registry.md`, `PROGRESS.md` |
| 리포트 가치 정보 발생 | `04_증빙/01_핵심로그/` |
| 세션 종료 | `04_증빙/01_핵심로그/master-evidence-ledger.md`, 필요 시 `decision-log.md`, 필요 시 `prompt-catalog.md` |
| MOC 구조 변경 | `_MOC/_MOC_HOME.md`, `00 HOME.md`, `workspace-atlas.md` |
