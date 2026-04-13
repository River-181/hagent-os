---
tags:
  - area/system
  - type/guide
  - status/active
date: 2026-04-06
up: "[[_system_tools_MOC]]"
aliases:
  - team-computer-setup-guide
  - 팀 컴퓨터 셋업
---
# 팀 컴퓨터 환경 적용 가이드

## 목표

이 워크스페이스를 팀원 컴퓨터에서도 같은 구조와 도구로 바로 운영할 수 있게 한다.

## 먼저 볼 문서

- [[_system/team-setup/workspace-visual-map|워크스페이스 시각화 맵]]
- [[_MOC_HOME]]
- [[_system/dashboard/project-dashboard|프로젝트 대시보드]]

## 1. 기본 준비

1. 저장소 clone
2. Obsidian으로 이 폴더를 vault로 열기
3. Claude Code 또는 Codex에서 같은 폴더 열기
4. `bash _system/tools/bootstrap.sh` 실행

## 2. Obsidian

필수:
- Obsidian Desktop App
- Obsidian CLI 사용 가능 상태

검증:
```bash
obsidian help
```

읽어야 할 문서:
- [[_system/tools/obsidian/obsidian-cli-and-skills]]
- [[_MOC_HOME]]
- [[_system/team-setup/workspace-visual-map|워크스페이스 시각화 맵]]

## 3. NLM

```bash
uv sync --project _system/tools
cp _system/tools/.env.example _system/tools/.env
source _system/tools/.env
uv run --project _system/tools nlm login
```

읽어야 할 문서:
- [[_system/tools/nlm/nlm]]
- [[_system/tools/nlm/260406-nlm-운영가이드]]

## 4. MCP

연결 대상:
- Excalidraw MCP
- Figma MCP

읽어야 할 문서:
- [[_system/tools/excalidraw/excalidraw-mcp]]
- [[_system/tools/figma/figma]]

## 5. 프로젝트 규칙

- MOC는 `_MOC/`에만 둔다.
- 증빙 직접 입력은 [[master-evidence-ledger]] 하나만 쓴다.
- 도구 관련 정본은 `_system/tools/`에서 관리한다.

## 6. 첫 검증 체크리스트

- [ ] `obsidian help` 동작
- [ ] vault 열림
- [ ] `_MOC/` 노트 탐색 가능
- [ ] `uv sync --project _system/tools` 성공
- [ ] `nlm login` 가능
- [ ] Excalidraw MCP 연결
- [ ] Figma MCP 연결
