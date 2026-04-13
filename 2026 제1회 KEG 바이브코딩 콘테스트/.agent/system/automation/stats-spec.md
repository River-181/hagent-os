---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/system/README]]"
---
# Stats Spec

- Claude Code는 자동 집계 가능
- Codex Desktop, ChatGPT Web, Gemini Web, Perplexity Web, Grok Web은 이 환경에서 exact token source가 없으면 `estimated_tokens` 기준으로 기록
- 모든 AI 세션은 먼저 `04_증빙/01_핵심로그/ai-session-intake.csv`에 한 row를 추가한다
- 외부 AI 통계 입력 파일 `external-ai-usage.csv`는 intake에서 nightly dispatch로 다시 만든다
- `estimated_tokens`는 exact가 아니라 rough integer이며, 모르겠으면 빈칸보다 보수적 추정치를 권장한다
- 정액제/무료 플랜은 `cost_usd` 대신 `pricing_mode`로 관리하고, known variable cost가 있을 때만 `cost_usd`를 채운다
- 통계 문서는 원장 데이터를 요약할 뿐, 정본 로그를 대체하지 않는다
