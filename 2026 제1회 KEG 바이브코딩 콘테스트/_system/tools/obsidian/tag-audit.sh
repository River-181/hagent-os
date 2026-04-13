#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

echo "[1/5] Obsidian tag counts"
obsidian tags counts sort=count

echo
echo "[2/5] Dashboard task query"
obsidian search query='tag:type/task' limit=20 || true

echo
echo "[3/5] Base query"
obsidian base:query path='_system/dashboard/project-dashboard.base' format=md || true

echo
echo "[4/5] Non-standard frontmatter tags"
python3 - <<'PY'
from pathlib import Path

roots = [Path('.agent'), Path('.claude'), Path('_system'), Path('_MOC'), Path('01_대회정보'), Path('02_전략'), Path('03_제품'), Path('04_증빙'), Path('05_제출'), Path('06_LLM위키')]
bad = []

for root in roots:
    if not root.exists():
        continue
    for path in root.rglob('*.md'):
        text = path.read_text(errors='ignore')
        if not text.startswith('---\n'):
            continue
        lines = text.splitlines()
        try:
            end = lines[1:].index('---') + 1
        except ValueError:
            continue
        in_tags = False
        for idx, line in enumerate(lines[1:end], start=2):
            if line == 'tags:':
                in_tags = True
                continue
            if in_tags:
                if line.startswith('  - '):
                    tag = line[4:]
                    if not tag.startswith(('area/', 'type/', 'status/', 'workflow/')):
                        bad.append(f'{path}:{idx}: {tag}')
                elif line and not line.startswith(' '):
                    in_tags = False

print('\n'.join(bad))
PY

echo
echo "[5/5] Inline tag usage"
python3 - <<'PY'
from pathlib import Path
import re

roots = [Path('.agent'), Path('.claude'), Path('_system'), Path('_MOC'), Path('01_대회정보'), Path('02_전략'), Path('03_제품'), Path('04_증빙'), Path('05_제출'), Path('06_LLM위키'), Path('00 HOME.md')]
pattern = re.compile(r'(^|[^#\\w`])(#[-/A-Za-z0-9_가-힣]+)')
hits = []

for root in roots:
    paths = [root] if root.is_file() else root.rglob('*.md')
    for path in paths:
        text = path.read_text(errors='ignore')
        for lineno, line in enumerate(text.splitlines(), start=1):
            if line.lstrip().startswith('#'):
                continue
            for match in pattern.finditer(line):
                hits.append(f'{path}:{lineno}: {match.group(2)}')

print('\\n'.join(hits))
PY

echo
echo "[6/6] Missing up property"
python3 - <<'PY'
from pathlib import Path

roots_without_up = {
    '00 HOME.md',
    '.agent/AGENTS.md',
}

targets = [
    Path('.agent'),
    Path('.claude'),
    Path('_system'),
    Path('_MOC'),
    Path('01_대회정보'),
    Path('02_전략'),
    Path('03_제품'),
    Path('04_증빙'),
    Path('05_제출'),
    Path('06_LLM위키'),
    Path('00 HOME.md'),
]

missing = []
for target in targets:
    paths = [target] if target.is_file() else target.rglob('*.md')
    for path in paths:
        s = path.as_posix()
        if s in roots_without_up:
            continue
        text = path.read_text(errors='ignore')
        if not text.startswith('---\n'):
            missing.append(s)
            continue
        lines = text.splitlines()
        try:
            end = lines[1:].index('---') + 1
        except ValueError:
            missing.append(s)
            continue
        if not any(line.startswith('up:') for line in lines[1:end]):
            missing.append(s)

print('\n'.join(missing))
PY
