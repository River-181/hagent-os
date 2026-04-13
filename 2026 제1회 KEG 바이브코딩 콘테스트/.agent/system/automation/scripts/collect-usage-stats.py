#!/usr/bin/env python3
"""
Claude Code 토큰 사용량 자동 집계 스크립트

사용법:
  python3 .agent/system/automation/scripts/collect-usage-stats.py

동작:
  1. ~/.claude/projects/ 에서 이 프로젝트의 JSONL 세션 파일을 찾는다
  2. 모든 assistant 메시지의 토큰/비용을 집계한다
  3. 결과를 04_증빙/01_핵심로그/ai-usage-stats.md 의 Claude Code 섹션에 출력한다
  4. JSON 형식으로도 출력 (다른 도구에서 활용 가능)

가격 기준: Claude Opus 4.6 (2026-04 기준)
"""

import json
import os
import glob
import sys
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# ---- Config ----
PRICING = {
    "opus": {"input": 15.0, "cache_create": 18.75, "cache_read": 1.50, "output": 75.0},
    "sonnet": {"input": 3.0, "cache_create": 3.75, "cache_read": 0.30, "output": 15.0},
    "haiku": {"input": 0.80, "cache_create": 1.00, "cache_read": 0.08, "output": 4.0},
}

KST = timezone(timedelta(hours=9))

def find_project_jsonls():
    """Find all JSONL files for this project."""
    home = os.path.expanduser("~")
    # Match project directory pattern
    pattern = os.path.join(home, ".claude/projects/*KEG*/*.jsonl")
    return glob.glob(pattern)

def parse_session(fpath, model_tier="opus"):
    """Parse a single JSONL session file."""
    pricing = PRICING[model_tier]

    stats = {
        "file": os.path.basename(fpath),
        "messages": 0,
        "input_tokens": 0,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "output_tokens": 0,
        "first_timestamp": None,
        "last_timestamp": None,
        "tool_calls": 0,
        "turns": [],  # per-turn breakdown
    }

    current_turn = None

    with open(fpath) as f:
        for line in f:
            try:
                d = json.loads(line.strip())
            except:
                continue

            ts = d.get("timestamp")
            if ts:
                if stats["first_timestamp"] is None:
                    stats["first_timestamp"] = ts
                stats["last_timestamp"] = ts

            if d.get("type") == "assistant" and "message" in d:
                msg = d["message"]
                if isinstance(msg, dict) and "usage" in msg:
                    u = msg["usage"]
                    out = u.get("output_tokens", 0)

                    # Skip retry/streaming intermediate messages (low output)
                    if out <= 5:
                        continue

                    stats["messages"] += 1
                    inp = u.get("input_tokens", 0)
                    cc = u.get("cache_creation_input_tokens", 0)
                    cr = u.get("cache_read_input_tokens", 0)

                    stats["input_tokens"] += inp
                    stats["cache_creation_tokens"] += cc
                    stats["cache_read_tokens"] += cr
                    stats["output_tokens"] += out

                    # Count tool calls
                    if isinstance(msg.get("content"), list):
                        for block in msg["content"]:
                            if isinstance(block, dict) and block.get("type") == "tool_use":
                                stats["tool_calls"] += 1

    # Calculate cost
    total_tokens = (stats["input_tokens"] + stats["cache_creation_tokens"] +
                   stats["cache_read_tokens"] + stats["output_tokens"])

    cost = (
        (stats["input_tokens"] / 1_000_000) * pricing["input"] +
        (stats["cache_creation_tokens"] / 1_000_000) * pricing["cache_create"] +
        (stats["cache_read_tokens"] / 1_000_000) * pricing["cache_read"] +
        (stats["output_tokens"] / 1_000_000) * pricing["output"]
    )

    # Calculate duration
    duration_sec = 0
    if stats["first_timestamp"] and stats["last_timestamp"]:
        try:
            t1 = datetime.fromisoformat(stats["first_timestamp"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(stats["last_timestamp"].replace("Z", "+00:00"))
            duration_sec = (t2 - t1).total_seconds()
        except:
            pass

    stats["total_tokens"] = total_tokens
    stats["cost_usd"] = cost
    stats["duration_seconds"] = duration_sec
    stats["duration_minutes"] = round(duration_sec / 60, 1)

    return stats

def format_number(n):
    """Format number with commas."""
    return f"{n:,}"

def main():
    jsonl_files = find_project_jsonls()

    if not jsonl_files:
        print("No JSONL files found for this project.")
        sys.exit(1)

    all_stats = []
    totals = {
        "sessions": 0,
        "messages": 0,
        "input_tokens": 0,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "cost_usd": 0,
        "duration_seconds": 0,
        "tool_calls": 0,
    }

    for fpath in sorted(jsonl_files):
        stats = parse_session(fpath)
        if stats["messages"] > 0:
            all_stats.append(stats)
            totals["sessions"] += 1
            for k in ["messages", "input_tokens", "cache_creation_tokens",
                      "cache_read_tokens", "output_tokens", "total_tokens",
                      "cost_usd", "duration_seconds", "tool_calls"]:
                totals[k] += stats[k]

    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")

    # ---- Markdown output ----
    print(f"## Claude Code 사용 통계 (자동 집계)")
    print(f"> 집계 시각: {now}")
    print(f"> 집계 대상: {len(jsonl_files)} JSONL files")
    print()
    print("### 토큰 사용량")
    print()
    print("| 항목 | 수치 |")
    print("|------|------|")
    print(f"| 세션 수 | {totals['sessions']} |")
    print(f"| 어시스턴트 메시지 | {format_number(totals['messages'])} |")
    print(f"| 도구 호출 | {format_number(totals['tool_calls'])} |")
    print(f"| 총 작업 시간 | {round(totals['duration_seconds']/60, 1)}분 |")
    print(f"| 입력 토큰 | {format_number(totals['input_tokens'])} |")
    print(f"| 캐시 생성 토큰 | {format_number(totals['cache_creation_tokens'])} |")
    print(f"| 캐시 읽기 토큰 | {format_number(totals['cache_read_tokens'])} |")
    print(f"| 출력 토큰 | {format_number(totals['output_tokens'])} |")
    print(f"| **총 토큰** | **{format_number(totals['total_tokens'])}** |")
    print()
    print("### 비용 분석")
    print()
    print("| 항목 | 비용 (USD) |")
    print("|------|-----------|")
    cost_input = (totals["input_tokens"] / 1_000_000) * PRICING["opus"]["input"]
    cost_cc = (totals["cache_creation_tokens"] / 1_000_000) * PRICING["opus"]["cache_create"]
    cost_cr = (totals["cache_read_tokens"] / 1_000_000) * PRICING["opus"]["cache_read"]
    cost_out = (totals["output_tokens"] / 1_000_000) * PRICING["opus"]["output"]
    print(f"| 입력 | ${cost_input:.2f} |")
    print(f"| 캐시 생성 | ${cost_cc:.2f} |")
    print(f"| 캐시 읽기 | ${cost_cr:.2f} |")
    print(f"| 출력 | ${cost_out:.2f} |")
    print(f"| **합계** | **${totals['cost_usd']:.2f}** |")
    print()
    print("### 효율 지표")
    print()
    print("| 지표 | 수치 |")
    print("|------|------|")
    if totals["messages"] > 0:
        avg_out = totals["output_tokens"] / totals["messages"]
        avg_cost = totals["cost_usd"] / totals["messages"]
        cache_ratio = totals["cache_read_tokens"] / max(1, totals["cache_creation_tokens"] + totals["input_tokens"]) * 100
        print(f"| 메시지당 평균 출력 | {format_number(int(avg_out))} tokens |")
        print(f"| 메시지당 평균 비용 | ${avg_cost:.2f} |")
        print(f"| 캐시 히트율 | {cache_ratio:.1f}% |")
        if totals["duration_seconds"] > 0:
            tokens_per_min = totals["total_tokens"] / (totals["duration_seconds"] / 60)
            cost_per_hour = totals["cost_usd"] / (totals["duration_seconds"] / 3600)
            print(f"| 분당 토큰 처리량 | {format_number(int(tokens_per_min))} |")
            print(f"| 시간당 비용 | ${cost_per_hour:.2f} |")

    # ---- JSON output (for programmatic use) ----
    print()
    print("### JSON (프로그래밍용)")
    print("```json")
    json_out = {
        "timestamp": now,
        "model": "claude-opus-4-6",
        "sessions": totals["sessions"],
        "messages": totals["messages"],
        "tool_calls": totals["tool_calls"],
        "duration_minutes": round(totals["duration_seconds"] / 60, 1),
        "tokens": {
            "input": totals["input_tokens"],
            "cache_creation": totals["cache_creation_tokens"],
            "cache_read": totals["cache_read_tokens"],
            "output": totals["output_tokens"],
            "total": totals["total_tokens"],
        },
        "cost_usd": {
            "input": round(cost_input, 4),
            "cache_creation": round(cost_cc, 4),
            "cache_read": round(cost_cr, 4),
            "output": round(cost_out, 4),
            "total": round(totals["cost_usd"], 4),
        },
    }
    print(json.dumps(json_out, indent=2, ensure_ascii=False))
    print("```")

if __name__ == "__main__":
    main()
