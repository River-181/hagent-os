#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


EXCLUDE_PARTS = {
    ".git",
    ".obsidian",
    ".DS_Store",
    "node_modules",
    ".venv",
    "__pycache__",
    "06_LLM위키",
    ".agents",
    "paperclip-master",
}

ROOT_SCORES = {
    "02_전략": 6,
    "03_제품": 5,
    "05_제출": 5,
    "01_대회정보": 4,
    "04_증빙": 3,
}

KEYWORD_SCORES = {
    "problem": 4,
    "pain": 4,
    "playbook": 4,
    "scorecard": 4,
    "persona": 4,
    "architecture": 4,
    "workflow": 4,
    "report": 3,
    "analysis": 3,
    "strategy": 3,
    "positioning": 3,
    "judge": 3,
    "checklist": 3,
    "research": 2,
    "prompt": 1,
    "daily": -3,
    "log": -3,
    "archive": -4,
}

TYPE_HINTS = [
    ("comparison", ("vs", "비교", "difference", "compare")),
    ("problem", ("problem", "pain", "complaint", "페인", "민원")),
    ("concept", ("playbook", "guide", "framework", "map", "workflow", "architecture", "원칙")),
    ("thesis", ("scorecard", "positioning", "hypothesis", "why", "selection")),
    ("entity", ("academy", "group", "committee", "기관", "위원회", "아카데미")),
]


@dataclass
class Candidate:
    path: Path
    score: int
    recommended_type: str
    reasons: list[str]


def should_skip(path: Path) -> bool:
    return any(part in EXCLUDE_PARTS for part in path.parts)


def recommend_type(text: str) -> str:
    lowered = text.lower()
    for type_name, hints in TYPE_HINTS:
        if any(hint.lower() in lowered for hint in hints):
            return type_name
    return "source"


def score_candidate(path: Path) -> Candidate | None:
    if path.suffix != ".md" or should_skip(path):
        return None

    rel = path
    text = str(rel).lower()
    score = 0
    reasons: list[str] = []

    if rel.parts:
        root = rel.parts[0]
        root_score = ROOT_SCORES.get(root, 0)
        if root_score:
            score += root_score
            reasons.append(f"root:{root}")

    for keyword, keyword_score in KEYWORD_SCORES.items():
        if keyword in text:
            score += keyword_score
            reasons.append(f"keyword:{keyword}")

    if "research-results" in text:
        score -= 2
        reasons.append("raw-mirror")

    if path.name.lower().startswith("readme"):
        score -= 2
        reasons.append("readme")

    if score <= 0:
        return None

    return Candidate(
        path=rel,
        score=score,
        recommended_type=recommend_type(text),
        reasons=reasons,
    )


def scan(root: Path, limit: int) -> list[Candidate]:
    candidates: list[Candidate] = []
    for path in root.rglob("*.md"):
        rel = path.relative_to(root)
        candidate = score_candidate(rel)
        if candidate:
            candidates.append(candidate)
    candidates.sort(key=lambda item: (-item.score, str(item.path)))
    return candidates[:limit]


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan KEG workspace for LLM wiki promotion candidates.")
    parser.add_argument("--root", default=".", help="Workspace root to scan")
    parser.add_argument("--limit", type=int, default=30, help="Maximum candidates to print")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    candidates = scan(root, args.limit)

    print("# Wiki candidate scan")
    print()
    print(f"- root: {root}")
    print(f"- candidates: {len(candidates)}")
    print()
    print("## Top candidates")
    for item in candidates:
        reason_text = ", ".join(item.reasons[:4])
        print(f"- `{item.path}` -> `{item.recommended_type}` | score={item.score} | {reason_text}")


if __name__ == "__main__":
    main()
