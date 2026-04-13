---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/AGENTS]]"
---
# 포터블 설정 가이드

> 이 워크스페이스를 다른 컴퓨터로 옮길 때 참고.

## 이 프로젝트 안에 포함된 것 (폴더 복사만으로 작동)

| 항목 | 위치 | 설명 |
|------|------|------|
| 에이전트 페르소나 | `.agent/agents/` | 8개 역할 정의 |
| 프로젝트 규칙 | `.agent/rules/` | 옵시디언, 로깅, 대회 제약 |
| 프로젝트 설정 | `.claude/settings.json` | 환경변수 (마감일 등) |
| Claude project commands | `.claude/commands/` | Claude slash command entrypoints |
| 커스텀 스킬 | `.agent/skills/` | 프로젝트 전용 스킬 |
| 자동화 스크립트 | `.agent/system/automation/scripts/` | 통계/로그 자동화 스크립트 |
| CLAUDE.md | `.claude/CLAUDE.md` | Claude Code 진입점 |
| 에이전트 공용 | `.agent/AGENTS.md` | 모든 AI 에이전트 진입점 |
| 운영 시스템 | `.agent/system/` | 계약, 메모리, 레지스트리, 맵, 로그 |
| 운영 진행 문서 | `.agent/system/ops/` | PLAN, PROGRESS, 대시보드 |
| 옵시디언 설정 | `.obsidian/` | 볼트 설정 |

## 새 컴퓨터에서 추가 설치 필요한 것

### 1. Claude Code 플러그인 (원커맨드)
```bash
cd "2026 제1회 KEG 바이브코딩 콘테스트"
bash .agent/adapters/claude/setup.sh
```

### 2. MCP 서버 (수동 연결)
`.agent/system/registry/mcp-registry.md` 참조. OAuth 인증이 필요한 서버들:
- Notion, Gmail, Google Calendar, Figma, Magic Patterns
- 각 서버는 Claude Code Settings에서 연결

### 3. 옵시디언
- Obsidian 앱 설치
- 이 폴더를 볼트로 열기
- `.obsidian/` 설정이 이미 포함되어 있으므로 플러그인/테마 자동 적용

## 포터블 원칙

1. **프로젝트 안에 있는 것은 복사만으로 작동한다**
2. **글로벌 설치가 필요한 것은 `setup.sh`로 자동화한다**
3. **OAuth/인증이 필요한 것은 `mcp-registry.md`에 가이드를 둔다**
4. **개인 로컬(`~/`)에 종속되는 설정은 만들지 않는다**
