#!/bin/bash
# ============================================================
# KEG 바이브코딩 콘테스트 — 원커맨드 환경 설정
# ============================================================
# 이 스크립트는 새 컴퓨터에서 이 워크스페이스를 열 때
# 필요한 Claude Code 플러그인/스킬/MCP를 자동 설치한다.
#
# 사용법:
#   cd "2026 제1회 KEG 바이브코딩 콘테스트"
#   bash .agent/adapters/claude/setup.sh
#
# 전제조건:
#   - Claude Code CLI 설치됨
#   - Node.js 18+ 설치됨
#   - 인터넷 연결
# ============================================================

set -e

echo "=============================="
echo "KEG 워크스페이스 환경 설정 시작"
echo "=============================="

# ---- 1. Claude Code 플러그인 설치 ----
echo ""
echo "[1/4] Claude Code 플러그인 설치..."

PLUGINS=(
  "everything-claude-code"
  "superpowers"
  "obsidian"
  "frontend-design"
  "ui-ux-pro-max"
  "figma"
  "context7"
  "skill-creator"
  "code-simplifier"
  "agent-sdk-dev"
)

for plugin in "${PLUGINS[@]}"; do
  echo "  설치 중: $plugin"
  claude plugins install "$plugin" 2>/dev/null || echo "  ⚠ $plugin 설치 실패 (이미 설치되었거나 네트워크 문제)"
done

# ---- 2. MCP 서버 활성화 안내 ----
echo ""
echo "[2/4] MCP 서버 설정..."
echo "  아래 MCP 서버는 수동 설정이 필요합니다:"
echo "  - context7: claude mcp add context7 -- npx -y @anthropic/context7-mcp"
echo "  - Notion: Claude Code Settings → MCP → Notion 연결"
echo "  - Excalidraw: Claude Code Settings → MCP → Excalidraw 연결"
echo "  - Gmail: Claude Code Settings → MCP → Gmail 연결"
echo "  - Google Calendar: Claude Code Settings → MCP → Google Calendar 연결"
echo "  - Magic Patterns: Claude Code Settings → MCP → Magic Patterns 연결"
echo "  - Figma: Claude Code Settings → MCP → Figma 연결"
echo ""
echo "  자세한 설정은 .agent/system/registry/mcp-registry.md 참조"

# ---- 3. 프로젝트 설정 확인 ----
echo ""
echo "[3/4] 프로젝트 설정 확인..."

if [ -f ".claude/CLAUDE.md" ]; then
  echo "  ✓ .claude/CLAUDE.md 존재"
else
  echo "  ✗ .claude/CLAUDE.md 없음 — 프로젝트 루트에서 실행하세요"
  exit 1
fi

if [ -f ".agent/AGENTS.md" ]; then
  echo "  ✓ .agent/AGENTS.md 존재"
else
  echo "  ✗ .agent/AGENTS.md 없음"
fi

if [ -f ".agent/system/ops/PLAN.md" ]; then
  echo "  ✓ .agent/system/ops/PLAN.md 존재"
else
  echo "  ✗ .agent/system/ops/PLAN.md 없음"
fi

if [ -f "_system/tools/bootstrap.sh" ]; then
  echo "  ✓ _system/tools/bootstrap.sh 존재"
else
  echo "  ✗ _system/tools/bootstrap.sh 없음"
fi

# ---- 4. 옵시디언 확인 ----
echo ""
echo "[4/4] 옵시디언 확인..."

if command -v obsidian &> /dev/null; then
  echo "  ✓ obsidian CLI 사용 가능"
else
  echo "  ⚠ obsidian CLI 없음 — Obsidian 앱 설치 후 CLI 활성화 필요"
fi

echo ""
echo "=============================="
echo "설정 완료!"
echo ""
echo "다음 단계:"
echo "  1. Obsidian에서 이 폴더를 볼트로 열기"
echo "  2. Claude Code에서 이 폴더 열기"
echo "  3. bash _system/tools/bootstrap.sh 실행"
echo "  4. _system/team-setup/team-computer-setup-guide.md 읽기"
echo "  5. .agent/AGENTS.md 읽고 시작"
echo "=============================="
