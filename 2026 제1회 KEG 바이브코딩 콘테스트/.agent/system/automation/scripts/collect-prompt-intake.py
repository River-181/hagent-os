#!/usr/bin/env python3
"""
Summarize the canonical prompt intake ledger.

Usage:
  python3 .agent/system/automation/scripts/collect-prompt-intake.py
"""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

CSV_PATH = Path("04_증빙/01_핵심로그/ai-prompt-intake.csv")


def clean(value: str) -> str:
    return (value or "").strip()


def load_rows() -> list[dict[str, str]]:
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main() -> None:
    rows = [row for row in load_rows() if clean(row.get("status", "")) == "logged"]
    by_client: dict[str, int] = defaultdict(int)
    reusable = []

    for row in rows:
        by_client[clean(row["client_app"])] += 1
        if clean(row["reusable"]).lower() == "yes":
            reusable.append(row)

    print("## Prompt Intake Summary")
    print(f"> source: `{CSV_PATH}`")
    print()
    print("| Client | Prompt Rows |")
    print("|---|---:|")
    for client in sorted(by_client):
        print(f"| {client} | {by_client[client]} |")
    print()
    print("### Reusable Candidates")
    if reusable:
        for row in reusable:
            print(f"- `{clean(row['prompt_id'])}` / `{clean(row['session_id'])}` / {clean(row['prompt_summary'])}")
    else:
        print("- 없음")


if __name__ == "__main__":
    main()
