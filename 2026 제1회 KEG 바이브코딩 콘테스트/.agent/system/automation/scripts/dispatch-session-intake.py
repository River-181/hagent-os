#!/usr/bin/env python3
"""
Dispatch the canonical AI session intake ledger into derived evidence files.

Usage:
  python3 .agent/system/automation/scripts/dispatch-session-intake.py

Outputs:
  - 04_증빙/01_핵심로그/master-evidence-ledger.md
  - 04_증빙/01_핵심로그/external-ai-usage.csv
  - 04_증빙/01_핵심로그/session-intake-dispatch-report.md
"""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

KST = timezone(timedelta(hours=9))

INTAKE_PATH = Path("04_증빙/01_핵심로그/ai-session-intake.csv")
MASTER_PATH = Path("04_증빙/01_핵심로그/master-evidence-ledger.md")
EXTERNAL_PATH = Path("04_증빙/01_핵심로그/external-ai-usage.csv")
REPORT_PATH = Path("04_증빙/01_핵심로그/session-intake-dispatch-report.md")

FIELDNAMES = [
    "date",
    "session_id",
    "phase",
    "environment",
    "client_app",
    "provider",
    "model",
    "service_tier",
    "participants",
    "prompt_count",
    "estimated_tokens",
    "cost_usd",
    "pricing_mode",
    "goal",
    "source_refs",
    "what_changed",
    "why_it_mattered",
    "artifacts",
    "ai_usage_strategy",
    "evidence_value",
    "report_section_hint",
    "token_note",
    "follow_up",
    "prompt_candidate",
    "decision_candidate",
    "daily_note_hint",
    "memory_hint",
    "status",
    "notes",
]


def read_intake() -> list[dict[str, str]]:
    if not INTAKE_PATH.exists():
        raise SystemExit(f"Missing intake file: {INTAKE_PATH}")
    with INTAKE_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    missing = [field for field in FIELDNAMES if field not in (reader.fieldnames or [])]
    if missing:
        raise SystemExit(f"Missing intake columns: {', '.join(missing)}")
    return rows


def clean(value: str) -> str:
    return (value or "").strip()


def to_int(value: str) -> int:
    value = clean(value).lstrip("~").replace(",", "")
    if not value:
        return 0
    try:
        return int(float(value))
    except ValueError:
        return 0


def to_float(value: str) -> float:
    value = clean(value)
    if not value:
        return 0.0
    return float(value)


def format_token_note(row: dict[str, str]) -> str:
    note = clean(row["token_note"])
    estimate = clean(row["estimated_tokens"])
    environment = clean(row["environment"])
    client = clean(row["client_app"])

    if note in {"exact unavailable estimate", "exact unavailable and recorded as estimate"}:
        if estimate and estimate != "0":
            return f"{environment} {client} exact export unavailable; intake estimate {estimate} tokens."
        return f"{environment} {client} exact export unavailable; no token count recorded."

    if note == "Codex exact unavailable estimate and NotebookLM exact unavailable":
        if estimate and estimate != "0":
            return f"Codex Desktop App + NotebookLM mixed session; exact token export unavailable. Intake estimate {estimate} tokens."
        return "Codex Desktop App + NotebookLM mixed session; exact token export unavailable."

    return note


def is_external_row(row: dict[str, str]) -> bool:
    client = clean(row["client_app"]).lower()
    provider = clean(row["provider"]).lower()
    if provider not in {"openai", "perplexity", "google", "xai", "notebooklm"}:
        return False
    if "claude" in client or provider == "anthropic":
        return False
    return True


def render_master(rows: list[dict[str, str]]) -> str:
    by_date: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_date[clean(row["date"])].append(row)

    parts = [
        "---",
        "tags:",
        "  - area/evidence",
        "  - type/log",
        "  - status/active",
        "  - workflow/evidence-source",
        f"date: {datetime.now(KST).strftime('%Y-%m-%d')}",
        'up: "[[_04_증빙_MOC]]"',
        "aliases:",
        "  - master-evidence-ledger",
        "  - 증빙원장",
        "  - AI리포트원장",
        "---",
        "# Master Evidence Ledger",
        "",
        "> 이 파일은 `ai-session-intake.csv`에서 파생되는 증빙 원장이다.",
        "> 낮 동안 직접 입력은 intake에 먼저 하고, nightly dispatch에서 이 파일을 재생성한다.",
        "",
        "## 원칙",
        "",
        "- intake row 1건은 의미 있는 세션 1건이다.",
        "- 세션 블록은 날짜별로 정렬해 렌더링한다.",
        "- 정확 수치와 추정 수치를 구분해 `Token note`에 남긴다.",
        "- prompt/decision 승격 여부는 dispatch report의 후보를 보고 최종 판단한다.",
        "",
    ]

    for date in sorted(d for d in by_date if d):
        parts.append(f"## {date}")
        parts.append("")
        for row in by_date[date]:
            parts.extend(
                [
                    f"### {clean(row['session_id'])}",
                    "",
                    f"- DateTime: {clean(row['date'])} / {clean(row['environment'])}",
                    f"- Phase: {clean(row['phase'])}",
                    f"- Tool/Client: {clean(row['client_app'])}",
                    f"- Model: {clean(row['model'])}",
                    f"- Goal: {clean(row['goal'])}",
                    f"- What changed: {clean(row['what_changed'])}",
                    f"- Why it mattered: {clean(row['why_it_mattered'])}",
                    f"- Artifacts: {clean(row['artifacts'])}",
                    f"- AI usage strategy: {clean(row['ai_usage_strategy'])}",
                    f"- Evidence value: {clean(row['evidence_value'])}",
                    f"- Report section hint: {clean(row['report_section_hint'])}",
                    f"- Token note: {format_token_note(row)}",
                    f"- Follow-up: {clean(row['follow_up'])}",
                    "",
                ]
            )

    return "\n".join(parts).strip() + "\n"


def write_external(rows: list[dict[str, str]]) -> None:
    fieldnames = [
        "date",
        "tool",
        "client",
        "model",
        "plan",
        "session_id",
        "prompts",
        "estimated_tokens",
        "cost_usd",
        "pricing_mode",
        "notes",
    ]
    with EXTERNAL_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            if not is_external_row(row):
                continue
            writer.writerow(
                {
                    "date": clean(row["date"]),
                    "tool": clean(row["client_app"]),
                    "client": clean(row["environment"]),
                    "model": clean(row["model"]),
                    "plan": clean(row["service_tier"]),
                    "session_id": clean(row["session_id"]),
                    "prompts": clean(row["prompt_count"]),
                    "estimated_tokens": clean(row["estimated_tokens"]),
                    "cost_usd": clean(row["cost_usd"]),
                    "pricing_mode": clean(row["pricing_mode"]),
                    "notes": clean(row["notes"]),
                }
            )


def render_report(rows: list[dict[str, str]]) -> str:
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")
    by_date: dict[str, dict[str, object]] = defaultdict(
        lambda: {"sessions": 0, "tools": set(), "prompts": 0, "tokens": 0}
    )
    prompt_candidates = []
    decision_candidates = []
    memory_candidates = []
    daily_candidates = []

    for row in rows:
        date = clean(row["date"])
        client = clean(row["client_app"])
        by_date[date]["sessions"] += 1
        by_date[date]["tools"].add(client)
        by_date[date]["prompts"] += to_int(row["prompt_count"])
        by_date[date]["tokens"] += to_int(row["estimated_tokens"])

        if clean(row["prompt_candidate"]):
            prompt_candidates.append(row)
        if clean(row["decision_candidate"]):
            decision_candidates.append(row)
        if clean(row["memory_hint"]):
            memory_candidates.append(row)
        if clean(row["daily_note_hint"]):
            daily_candidates.append(row)

    lines = [
        "---",
        "tags:",
        "  - area/evidence",
        "  - type/report",
        "  - status/active",
        f"date: {datetime.now(KST).strftime('%Y-%m-%d')}",
        'up: "[[_04_증빙_MOC]]"',
        "---",
        "# Session Intake Dispatch Report",
        "",
        f"> 생성 시각: {now}",
        f"> 입력 원장: `{INTAKE_PATH}`",
        f"> 재생성 파일: `{MASTER_PATH}`, `{EXTERNAL_PATH}`",
        "",
        "## Daily Summary",
        "",
        "| 날짜 | 세션 수 | 도구 | 프롬프트 수 | 추정 토큰 |",
        "|---|---:|---|---:|---:|",
    ]

    for date in sorted(d for d in by_date if d):
        item = by_date[date]
        tools = ", ".join(sorted(item["tools"])) or "-"
        lines.append(
            f"| {date} | {item['sessions']} | {tools} | {item['prompts']} | {item['tokens']:,} |"
        )

    lines.extend(["", "## Prompt Promotion Candidates", ""])
    if prompt_candidates:
        for row in prompt_candidates:
            lines.append(
                f"- `{clean(row['session_id'])}` {clean(row['client_app'])}: {clean(row['prompt_candidate'])}"
            )
    else:
        lines.append("- 없음")

    lines.extend(["", "## Decision Promotion Candidates", ""])
    if decision_candidates:
        for row in decision_candidates:
            lines.append(
                f"- `{clean(row['session_id'])}` {clean(row['client_app'])}: {clean(row['decision_candidate'])}"
            )
    else:
        lines.append("- 없음")

    lines.extend(["", "## Daily Note Hints", ""])
    if daily_candidates:
        for row in daily_candidates:
            lines.append(
                f"- `{clean(row['date'])}` / `{clean(row['session_id'])}`: {clean(row['daily_note_hint'])}"
            )
    else:
        lines.append("- 없음")

    lines.extend(["", "## Memory Sync Hints", ""])
    if memory_candidates:
        for row in memory_candidates:
            lines.append(
                f"- `{clean(row['date'])}` / `{clean(row['session_id'])}`: {clean(row['memory_hint'])}"
            )
    else:
        lines.append("- 없음")

    lines.extend(
        [
            "",
            "## Open Notes",
            "",
            "- prompt/decision은 후보까지만 자동 분류한다.",
            "- exact token source가 없는 도구는 `estimated_tokens` 기준이다.",
        ]
    )

    return "\n".join(lines).strip() + "\n"


def main() -> None:
    rows = read_intake()
    rows = sorted(rows, key=lambda r: (clean(r["date"]), clean(r["session_id"])))

    MASTER_PATH.write_text(render_master(rows), encoding="utf-8")
    write_external(rows)
    REPORT_PATH.write_text(render_report(rows), encoding="utf-8")

    print(f"Updated: {MASTER_PATH}")
    print(f"Updated: {EXTERNAL_PATH}")
    print(f"Updated: {REPORT_PATH}")


if __name__ == "__main__":
    main()
