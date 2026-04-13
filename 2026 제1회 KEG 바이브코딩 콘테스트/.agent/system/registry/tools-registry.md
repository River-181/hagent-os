---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/system/README]]"
---
# Tools Registry

| Tool | Role | Canonical Contract |
|---|---|---|
| ChatGPT Web | 설계/기획 | `contracts/tools/chatgpt-web.md` |
| Perplexity | 리서치 | `contracts/tools/perplexity.md` |
| Codex | 구현/정리/감사 | `contracts/tools/codex.md` |
| Claude Code | 구축/자동화/구현 | `contracts/tools/claude-code.md` |

## Workspace Tool Stack

| Tool | Role | Canonical Contract |
|---|---|---|
| Obsidian CLI + Skills | 볼트 조작, MOC 유지, base 관리 | `_system/tools/obsidian/obsidian-cli-and-skills.md` |
| Excalidraw MCP | 시스템/프로세스 다이어그램 | `_system/tools/excalidraw/excalidraw-mcp.md` |
| Figma MCP | 디자인 파일 읽기/쓰기 | `_system/tools/figma/figma.md` |
| NotebookLM CLI (`nlm`) | 딥리서치/브리핑 | `_system/tools/nlm/nlm.md` |

## Claude Runtime Layer

- Command structure and design notes: `.agent/system/registry/claude-command-stack.md`
- Runtime command files: `.claude/commands/`
