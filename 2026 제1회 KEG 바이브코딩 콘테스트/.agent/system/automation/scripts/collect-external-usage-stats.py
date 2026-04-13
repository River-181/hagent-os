#!/usr/bin/env python3
"""
External AI usage aggregation for manually tracked tools.

Usage:
  python3 .agent/system/automation/scripts/collect-external-usage-stats.py

Input source:
  04_증빙/01_핵심로그/external-ai-usage.csv

CSV columns:
  date,tool,client,model,plan,session_id,prompts,estimated_tokens,cost_usd,pricing_mode,notes

Rule:
  - one meaningful session or usage block per row
  - exact token export unavailable -> record estimated_tokens as rough integer
  - leave cost_usd empty for flat subscription / unknown cases
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))
CSV_PATH = Path("04_증빙/01_핵심로그/external-ai-usage.csv")


def to_int(value: str) -> int:
    value = (value or "").strip()
    if not value:
        return 0
    return int(float(value))


def to_float(value: str) -> float:
    value = (value or "").strip()
    if not value:
        return 0.0
    return float(value)


def load_rows() -> list[dict]:
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def main() -> None:
    rows = load_rows()
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")

    grouped: dict[str, dict] = defaultdict(
        lambda: {
            "sessions": 0,
            "prompts": 0,
            "estimated_tokens": 0,
            "cost_usd": 0.0,
            "pricing_modes": set(),
            "models": set(),
        }
    )

    daily: dict[str, dict] = defaultdict(
        lambda: {
            "sessions": 0,
            "prompts": 0,
            "estimated_tokens": 0,
            "cost_usd": 0.0,
        }
    )

    valid_rows = []
    for row in rows:
        prompts = to_int(row.get("prompts", "0"))
        tokens = to_int(row.get("estimated_tokens", "0"))
        cost = to_float(row.get("cost_usd", "0"))
        tool = (row.get("tool") or "Unknown").strip()
        date = (row.get("date") or "").strip()
        pricing_mode = (row.get("pricing_mode") or "").strip()
        model = (row.get("model") or "").strip()

        # Skip placeholder rows with no usage signal.
        if prompts == 0 and tokens == 0 and cost == 0:
            continue

        valid_rows.append(row)
        grouped[tool]["sessions"] += 1
        grouped[tool]["prompts"] += prompts
        grouped[tool]["estimated_tokens"] += tokens
        grouped[tool]["cost_usd"] += cost
        if pricing_mode:
            grouped[tool]["pricing_modes"].add(pricing_mode)
        if model:
            grouped[tool]["models"].add(model)

        if date:
            daily[date]["sessions"] += 1
            daily[date]["prompts"] += prompts
            daily[date]["estimated_tokens"] += tokens
            daily[date]["cost_usd"] += cost

    total_sessions = sum(v["sessions"] for v in grouped.values())
    total_prompts = sum(v["prompts"] for v in grouped.values())
    total_tokens = sum(v["estimated_tokens"] for v in grouped.values())
    total_cost = sum(v["cost_usd"] for v in grouped.values())

    print("## 외부 AI 사용 통계 (수동 집계)")
    print(f"> 집계 시각: {now}")
    print(f"> 입력 원장: `{CSV_PATH}`")
    print("> 해석 규칙: Web/App 플랜은 exact token이 아니라 `estimated_tokens` 기준으로 집계")
    print()
    print("| 도구 | 세션 수 | 프롬프트 수 | 추정 토큰 | 비용(known USD) | 과금 방식 |")
    print("|---|---:|---:|---:|---:|---|")
    for tool in sorted(grouped):
        item = grouped[tool]
        pricing_modes = ", ".join(sorted(item["pricing_modes"])) or "-"
        print(
            f"| {tool} | {item['sessions']} | {item['prompts']} | "
            f"{item['estimated_tokens']:,} | {item['cost_usd']:.2f} | {pricing_modes} |"
        )
    print(
        f"| **합계** | **{total_sessions}** | **{total_prompts}** | "
        f"**{total_tokens:,}** | **{total_cost:.2f}** | - |"
    )
    print()
    print("### 일별 외부 AI 추이")
    print()
    print("| 날짜 | 세션 수 | 프롬프트 수 | 추정 토큰 | 비용(known USD) |")
    print("|---|---:|---:|---:|---:|")
    for date in sorted(daily):
        item = daily[date]
        print(
            f"| {date} | {item['sessions']} | {item['prompts']} | "
            f"{item['estimated_tokens']:,} | {item['cost_usd']:.2f} |"
        )

    print()
    print("### JSON (프로그래밍용)")
    print("```json")
    out = {
        "timestamp": now,
        "source": str(CSV_PATH),
        "rows": len(valid_rows),
        "totals": {
            "sessions": total_sessions,
            "prompts": total_prompts,
            "estimated_tokens": total_tokens,
            "known_cost_usd": round(total_cost, 4),
        },
        "by_tool": {
            tool: {
                "sessions": item["sessions"],
                "prompts": item["prompts"],
                "estimated_tokens": item["estimated_tokens"],
                "known_cost_usd": round(item["cost_usd"], 4),
                "pricing_modes": sorted(item["pricing_modes"]),
                "models": sorted(item["models"]),
            }
            for tool, item in sorted(grouped.items())
        },
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    print("```")


if __name__ == "__main__":
    main()
