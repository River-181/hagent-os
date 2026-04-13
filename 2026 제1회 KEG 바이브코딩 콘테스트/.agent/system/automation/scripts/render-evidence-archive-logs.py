#!/usr/bin/env python3
"""
Render archive/reference evidence logs from canonical intake.

Usage:
  python3 .agent/system/automation/scripts/render-evidence-archive-logs.py

Outputs:
  - 04_증빙/01_핵심로그/ai-usage-log.md
  - 04_증빙/01_핵심로그/session-log.md
"""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

KST = timezone(timedelta(hours=9))
INTAKE_PATH = Path("04_증빙/01_핵심로그/ai-session-intake.csv")
USAGE_PATH = Path("04_증빙/01_핵심로그/ai-usage-log.md")
SESSION_PATH = Path("04_증빙/01_핵심로그/session-log.md")


def clean(value: str) -> str:
    return (value or "").strip()


def md_cell(value: str) -> str:
    value = clean(value)
    if not value:
        return "-"
    return value.replace("|", " / ").replace("\n", " ").strip()


def load_rows() -> list[dict[str, str]]:
    with INTAKE_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def render_usage(rows: list[dict[str, str]]) -> str:
    by_date: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_date[clean(row["date"])].append(row)

    parts = [
        "---",
        "tags:",
        "  - area/evidence",
        "  - type/log",
        "  - status/active",
        f"date: {datetime.now(KST).strftime('%Y-%m-%d')}",
        'up: "[[_04_증빙_MOC]]"',
        "---",
        "# AI 사용 기록",
        "",
        "> archive/reference.",
        "> intake 기반 파생 로그. 직접 입력은 `ai-session-intake.csv`를 사용한다.",
        "",
    ]

    uid = 1
    for date in sorted(d for d in by_date if d):
        parts.append(f"## {date}")
        parts.append("")
        parts.append("| ID | Session_ID | Phase | 작업 | 환경 | 클라이언트 | 모델 | Prompt_Count | Estimated_Tokens | Artifact | Notes |")
        parts.append("|---|---|---|---|---|---|---|---:|---:|---|---|")
        for row in by_date[date]:
            parts.append(
                f"| U-{uid:03d} | {md_cell(row['session_id'])} | {md_cell(row['phase'])} | "
                f"{md_cell(row['goal'])} | {md_cell(row['environment'])} | {md_cell(row['client_app'])} | "
                f"{md_cell(row['model'])} | {clean(row['prompt_count']) or '0'} | "
                f"{clean(row['estimated_tokens']) or '0'} | {md_cell(row['artifacts'])} | "
                f"{md_cell(row['notes'])} |"
            )
            uid += 1
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def render_session(rows: list[dict[str, str]]) -> str:
    by_date: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_date[clean(row["date"])].append(row)

    parts = [
        "---",
        "tags:",
        "  - area/evidence",
        "  - type/log",
        "  - status/active",
        f"date: {datetime.now(KST).strftime('%Y-%m-%d')}",
        'up: "[[_04_증빙_MOC]]"',
        "---",
        "# 세션 기록",
        "",
        "> archive/reference.",
        "> intake 기반 파생 로그. 직접 입력은 `ai-session-intake.csv`를 사용한다.",
        "",
    ]

    for date in sorted(d for d in by_date if d):
        parts.append(f"## {date}")
        parts.append("")
        parts.append("| Session_ID | Phase | 목표 | 환경 | 클라이언트 | 모델 | 참여자 | 소스 | 산출물 | 의사결정 | 다음행동 | 상태 |")
        parts.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
        for row in by_date[date]:
            parts.append(
                f"| {md_cell(row['session_id'])} | {md_cell(row['phase'])} | {md_cell(row['goal'])} | "
                f"{md_cell(row['environment'])} | {md_cell(row['client_app'])} | {md_cell(row['model'])} | "
                f"{md_cell(row['participants'])} | {md_cell(row['source_refs'])} | "
                f"{md_cell(row['artifacts'])} | {md_cell(row['decision_candidate'])} | "
                f"{md_cell(row['follow_up'])} | {md_cell(row['status'])} |"
            )
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def main() -> None:
    rows = sorted(load_rows(), key=lambda r: (clean(r["date"]), clean(r["session_id"])))
    USAGE_PATH.write_text(render_usage(rows), encoding="utf-8")
    SESSION_PATH.write_text(render_session(rows), encoding="utf-8")
    print(f"Updated: {USAGE_PATH}")
    print(f"Updated: {SESSION_PATH}")


if __name__ == "__main__":
    main()
