#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TOOLS_DIR="$ROOT_DIR/_system/tools"

mkdir -p "$TOOLS_DIR/runtime/nlm/profiles"
mkdir -p "$TOOLS_DIR/runtime/nlm/chrome-profiles"

if [ ! -f "$TOOLS_DIR/.env" ] && [ -f "$TOOLS_DIR/.env.example" ]; then
  cp "$TOOLS_DIR/.env.example" "$TOOLS_DIR/.env"
fi

echo "Workspace tool bootstrap complete."
echo ""
echo "Next steps:"
echo "1. Open Obsidian and verify the vault."
echo "2. Check 'obsidian' CLI availability."
echo "3. Run: uv sync --project _system/tools"
echo "4. Connect Excalidraw MCP and Figma MCP."
echo "5. Read: _system/team-setup/team-computer-setup-guide.md"
