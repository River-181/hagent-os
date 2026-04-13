---
tags:
  - area/system
  - type/guide
  - status/active
date: 2026-04-06
up: "[[_system/tools/README]]"
aliases:
  - portable-tool-stack
  - 도구스택
---
# Portable Tool Stack

## 목적

이 워크스페이스를 다른 팀원 컴퓨터로 옮겨도 같은 도구 계층을 재현할 수 있게 한다.

## 필수 스택

| 레이어 | 도구 | 상태 | 정본 |
|---|---|---|---|
| Vault | Obsidian App + CLI | Required | [[_system/tools/obsidian/obsidian-cli-and-skills]] |
| Diagram | Excalidraw MCP | Required | [[_system/tools/excalidraw/excalidraw-mcp]] |
| Design | Figma MCP | Required | [[_system/tools/figma/figma]] |
| Research | NotebookLM CLI (`nlm`) | Required | [[_system/tools/nlm/nlm]] |
| Agent Runtime | Claude Code / Codex | Required | [[.agent/AGENTS]] |

## 저장 원칙

- 도구 계약 문서: `_system/tools/**`
- 프로젝트 스킬: `.agent/skills/**`
- 운영 레지스트리: `.agent/system/registry/**`
- 팀 셋업 가이드: `_system/team-setup/**`

## 팀원 적용 순서

1. 저장소 clone
2. Obsidian으로 vault 열기
3. [[_system/team-setup/workspace-visual-map|시각화 맵]]으로 전체 구조 파악
4. [[_system/tools/bootstrap.sh|tool bootstrap]] 실행
5. [[_system/team-setup/team-computer-setup-guide|팀 셋업 가이드]] 순서대로 MCP/CLI 연결
