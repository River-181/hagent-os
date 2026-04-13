---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/system/README]]"
aliases:
  - workspace-contract
  - 운영계약
---
# Workspace Contract

> 이 문서는 운영 문서의 책임 범위와 정본 위치를 결정하는 단일 계약 문서다.

## 정본 위치

| 대상 | 정본 |
|---|---|
| 공용 운영 규칙 | `.agent/system/` |
| 운영 진행 관리 | `.agent/system/ops/` |
| Claude 전용 실행 규칙 | `.claude/CLAUDE.md`, `.claude/settings.json` |
| AI 리포트 재료 | `04_증빙/` |
| 제품 구현 | `03_제품/app/`, `03_제품/tests/` |
| 대회/전략 지식 | `01_대회정보/`, `02_전략/` |
| 지속 합성 지식 | `06_LLM위키/` |

## Obsidian 인터페이스 계약

- 이 저장소의 문서 레이어는 Obsidian vault를 기준으로 설계한다.
- 내부 문서는 `[[wikilink]]`, YAML frontmatter, MOC 구조를 유지해야 한다.
- 외부 URL만 Markdown link `[]()`를 사용한다.
- `.base` 파일은 Obsidian Bases 자산이며 일반 설정 파일처럼 취급하지 않는다.
- 노트 생성/조회/append/검색은 가능하면 `obsidian` CLI 사용을 먼저 검토한다.
- Obsidian 관련 작업은 `.agent/rules/obsidian-conventions.md`와 `.agent/skills/obsidian-workspace/SKILL.md`를 따른다.

## 문서 책임 범위

| 문서 | 역할 |
|---|---|
| `.agent/system/ops/PLAN.md` | 앞으로 할 일과 우선순위 |
| `.agent/system/ops/PROGRESS.md` | 현재 상태와 다음 핸드오프 |
| `.agent/system/ops/project-manager.md` | AI 운영용 대시보드 어댑터 |
| `_system/dashboard/project-dashboard.md` | 사용자/AI 공용 운영 대시보드 |
| `_system/dashboard/project-dashboard.base` | Obsidian Bases 태스크 트래커 |
| `.agent/AGENTS.md` | 공용 시작 프로토콜과 금지사항 |
| `.claude/CLAUDE.md` | Claude 실행 어댑터 문서 |
| `04_증빙/01_핵심로그/master-evidence-ledger.md` | 직접 입력하는 AI 리포트 재료 원장 |
| `04_증빙/01_핵심로그/ai-usage-log.md` | archive/reference |
| `04_증빙/01_핵심로그/session-log.md` | archive/reference |
| `04_증빙/01_핵심로그/decision-log.md` | 사람 승인 결정 |
| `04_증빙/01_핵심로그/tool-log.md` | 도구 요약 뷰 |
| `04_증빙/01_핵심로그/prompt-catalog.md` | 승격된 재사용 프롬프트 카탈로그 |
| `04_증빙/01_핵심로그/ai-usage-stats.md` | 파생 통계 집계본 |
| `.agent/system/memory/long-term-memory.md` | 오래 유지되는 핵심 사실 정본 |
| `.agent/system/memory/daily-memory.md` | 오늘 세션 단기 기억 |
| `.agent/system/maps/workspace-atlas.md` | 구조와 갱신 규칙 정본 |
| `.agent/system/contracts/llm-wiki-operations.md` | LLM wiki 조회/갱신 운영 규칙 |
| `06_LLM위키/index.md` | 지속 지식 주제 인덱스 |
| `06_LLM위키/log.md` | ingest/query/lint 이력 |

## 업데이트 의무

- 새 공용 운영 문서를 만들면 `.agent/system/maps/workspace-atlas.md`를 갱신한다.
- 새 사실을 메모리에 저장했다면 세션 종료 시 Evidence Gate를 통해 `04_증빙/` 반영 여부를 판단한다.
- 직접 기록은 원칙적으로 `04_증빙/01_핵심로그/master-evidence-ledger.md` 하나에 한다.
- `.claude`의 공용 내용은 `.agent/system/`을 참조하거나 요약만 한다.
- 프로젝트 맥락 질의는 `06_LLM위키/`를 먼저 조회하고, raw source는 필요할 때만 내려간다.

## 금지

1. 같은 사실을 여러 문서에 수동 중복 기록
2. 공용 규칙을 `.claude`에서 먼저 수정
3. 증빙 가치가 있는 사실을 메모리에만 남김
4. 새 공용 운영 문서를 `.agent/system/` 밖에 생성
