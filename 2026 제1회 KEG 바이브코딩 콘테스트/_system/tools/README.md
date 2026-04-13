---
tags:
  - area/system
  - type/guide
  - status/active
date: 2026-04-06
up: "[[_system_tools_MOC]]"
aliases:
  - Tools Home
---
# Tools Home

이 디렉토리는 이 워크스페이스 전용 도구 운영 정본이다.

## 원칙

- 전역에 설치되어 있더라도 이 저장소 안에 계약 문서와 셋업 절차를 둔다.
- 인증 토큰, 쿠키, 런타임 프로필은 저장소 밖이 아니라 `runtime/` 아래의 로컬 무시 경로를 사용한다.
- 팀원 컴퓨터에도 같은 구조를 복제할 수 있어야 한다.

## 구성

- [[portable-tool-stack]] — 전체 스택 개요
- [[_system/tools/obsidian/obsidian-cli-and-skills|Obsidian CLI + Skills]]
- [[_system/tools/obsidian/tagging-system|Obsidian Tagging System]]
- [[_system/tools/obsidian/prompt-packaging|Prompt Packaging]]
- [[_system/tools/excalidraw/excalidraw-mcp|Excalidraw MCP]]
- [[_system/tools/figma/figma|Figma MCP]]
- [[_system/tools/nlm/nlm|NotebookLM CLI]]
- [[_system/tools/github/release-policy|GitHub Release Policy]]
- [[_system/tools/github/release-note-template|Release Note Template]]
- [[_system/team-setup/team-computer-setup-guide|팀 셋업 가이드]]

## 런타임 데이터

- `runtime/nlm/profiles/`
- `runtime/nlm/chrome-profiles/`

이 경로들은 로컬 전용이며 Git에 올리지 않는다.
