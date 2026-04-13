---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-07
up: "[[.agent/AGENTS]]"
aliases:
  - skills-readme
---
# .agent/skills/ — 프로젝트 커스텀 스킬

이 디렉토리는 이 프로젝트 전용 커스텀 스킬을 저장한다.

## 구조

```
skills/
├── README.md           ← 이 파일
├── evidence-logger/    ← 증빙 자동 기록 스킬 (예정)
├── judge-simulator/    ← 심사 시뮬레이션 스킬 (예정)
└── report-generator/   ← AI 리포트 생성 스킬 (예정)
```

## 글로벌 플러그인 vs 프로젝트 스킬

| 구분 | 글로벌 플러그인 | 프로젝트 스킬 |
|------|----------------|--------------|
| 위치 | `~/.claude/plugins/` | `.agent/skills/` |
| 범위 | 모든 프로젝트 | 이 프로젝트만 |
| 포터블 | ✗ (로컬 설치) | ✓ (프로젝트에 포함) |
| 설치 | `claude plugins install` | 폴더 복사하면 끝 |

## 커스텀 스킬 생성법

`skill-creator:skill-creator` 스킬을 사용하여 이 디렉토리 안에 생성한다.

## 현재 스킬

- `obsidian-workspace/` — vault note, MOC, daily, `.base` 파일을 Obsidian 규칙에 맞춰 다루는 스킬
- `moc-sync/` — 중앙 MOC 공간 `_MOC/` 유지 스킬
- `workspace-sync/` — memory, maps, evidence를 함께 맞추는 정합성 스킬
- `github-workflow/` — commit, push, PR, issue, release 운영 스킬
- `github-issue-ops/` — issue 생성, triage, dedupe, 상태 전환 스킬
- `github-project-ops/` — GitHub Project 보드, field, item, sprint 운영 스킬
- `wiki-candidate-harvest/` — 프로젝트 문서 중 LLM wiki 승격 후보를 스캔하고 backlog로 정리하는 스킬

## Obsidian 관련 글로벌 스킬

이 프로젝트는 Obsidian vault이므로 아래 글로벌 스킬을 우선 활용한다.

- `obsidian-cli` — vault 조회/생성/append, command 실행
- `obsidian-markdown` — frontmatter, wikilink, embed 규칙
- `obsidian-bases` — `.base` 파일과 view 규칙

프로젝트 문맥까지 함께 반영해야 할 때는 `obsidian-workspace/`를 먼저 보고, 필요 시 글로벌 스킬을 조합한다.

## 글로벌 플러그인 목록

글로벌 플러그인은 `.agent/system/registry/plugins-registry.md`에 기록되어 있으며,
새 컴퓨터에서는 `.agent/adapters/claude/setup.sh`로 일괄 설치한다.

## 저장소 내 도구 정본

도구 설치/연결 정본은 `_system/tools/`에 둔다.
