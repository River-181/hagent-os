---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-08
up: "[[.agent/system/README]]"
---
# Session Intake Pipeline

이 문서는 "모든 AI 세션을 먼저 한 파일에 모으고, 하루 종료 시 파생 문서로 분배한다"는 운영 규칙의 정본이다.

## Canonical Input

- 직접 입력 정본: `04_증빙/01_핵심로그/ai-session-intake.csv`
- 프롬프트 정본: `04_증빙/01_핵심로그/ai-prompt-intake.csv`
- row 단위: 의미 있는 대화/작업 세션 1건
- prompt row 단위: 세션 안의 중요한 프롬프트 1건
- 대상: Claude Code, Codex, ChatGPT, Perplexity, Gemini, Grok, NotebookLM, 기타 Web/App/CLI AI
- 작성 시점: 세션 종료 직후 또는 큰 phase 전환 직후

## Why

- 어떤 로컬/어떤 사용자/어떤 AI든 일단 한 곳에 모아야 누락이 줄어든다.
- 엑셀 트래커의 `Prompt_Log / Session_Log / Artifact_Log / Tool_Log` 관점을 CSV 1장으로 축약해 append 마찰을 낮춘다.
- `master-evidence-ledger.md`와 `external-ai-usage.csv`는 직접 입력보다 파생 문서에 가깝다.

## Session Intake Columns

- `date`, `session_id`, `phase`
- `environment`, `client_app`, `provider`, `model`, `service_tier`
- `participants`, `prompt_count`, `estimated_tokens`, `cost_usd`, `pricing_mode`
- `goal`, `source_refs`, `what_changed`, `why_it_mattered`, `artifacts`
- `ai_usage_strategy`, `evidence_value`, `report_section_hint`, `token_note`, `follow_up`
- `prompt_candidate`, `decision_candidate`, `daily_note_hint`, `memory_hint`
- `status`, `notes`

## Prompt Intake Columns

- `date`, `prompt_id`, `session_id`, `phase`
- `environment`, `client_app`, `provider`, `model`, `service_tier`
- `prompt_type`, `prompt_source`, `prompt_text`, `prompt_summary`
- `attachment_list`, `context_source`, `expected_output`, `actual_output_summary`
- `reusable`, `sensitive_flag`, `evidence_path`, `artifact_refs`, `status`, `notes`

## Real-time Rule

- 어떤 AI든 의미 있는 세션을 끝내면 `ai-session-intake.csv`에 1 row를 append한다.
- raw prompt를 남길 가치가 있거나 재사용 가능성이 높으면 `ai-prompt-intake.csv`에도 append한다.
- 사용자가 별도로 skill을 호출하지 않아도 된다.
- exact token source가 있으면 exact를 쓰고, 없으면 `estimated_tokens`에 보수 추정치를 넣는다.
- 모르면 비워두되 `token_note`에 이유를 남긴다.

## End-of-day Dispatch

매일 작업 마감 시 아래 명령을 실행한다.

```bash
python3 .agent/system/automation/scripts/dispatch-session-intake.py
```

이 스크립트는 intake를 읽어 아래 파일을 다시 생성한다.

- `04_증빙/01_핵심로그/master-evidence-ledger.md`
- `04_증빙/01_핵심로그/external-ai-usage.csv`
- `04_증빙/01_핵심로그/session-intake-dispatch-report.md`

프롬프트 intake 요약은 아래 명령으로 본다.

```bash
python3 .agent/system/automation/scripts/collect-prompt-intake.py
```

## Promotion Policy

- `master-evidence-ledger.md`: intake row에서 직접 렌더링
- `external-ai-usage.csv`: Claude 계열 exact 집계를 제외한 외부 AI row만 파생
- `prompt-catalog.md`: `prompt_candidate`와 `ai-prompt-intake.csv`를 같이 보고 승격 후보를 판단
- `decision-log.md`: `decision_candidate`가 비지 않은 row만 후보로 보고 dispatch report에 노출
- `daily-memory.md`, `04_증빙/03_daily/*.md`: 자동 후보 요약은 dispatch report에 노출하고, 최종 반영은 사람이 확인하거나 AI가 근거를 보고 반영

## Guardrails

- intake는 append-first다.
- 파생 문서는 재생성 가능해야 한다.
- 하나의 세션을 여러 파일에 먼저 중복 기록하지 않는다.
- 혼합 세션이라도 1 row로 먼저 받고, 필요하면 nightly에 파생 문서에서 분리 해석한다.

## Operator Expectation

- 낮에는 `ai-session-intake.csv`만 append
- 밤에는 `dispatch-session-intake.py` 실행
- 승격 후보는 `session-intake-dispatch-report.md`를 보고 처리
