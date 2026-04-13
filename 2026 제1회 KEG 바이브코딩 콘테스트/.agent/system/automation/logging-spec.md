---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-06
up: "[[.agent/system/README]]"
---
# Logging Spec

- `04_증빙/01_핵심로그/ai-session-intake.csv`: 직접 입력 정본
- `04_증빙/01_핵심로그/ai-prompt-intake.csv`: prompt 원문과 요약의 직접 입력 정본
- `04_증빙/01_핵심로그/master-evidence-ledger.md`: intake에서 렌더링되는 사람이 읽는 원장
- `04_증빙/01_핵심로그/external-ai-usage.csv`: intake에서 파생되는 외부 AI 통계 입력
- `04_증빙/01_핵심로그/session-intake-dispatch-report.md`: prompt/decision/daily/memory 후보 큐
- `04_증빙/01_핵심로그/decision-log.md`: 중요한 의사결정만 승격
- `04_증빙/01_핵심로그/prompt-catalog.md`: 승격된 재사용 프롬프트
- `04_증빙/01_핵심로그/ai-usage-stats.md`: 파생 통계 집계본
- `04_증빙/01_핵심로그/ai-usage-log.md`: archive/reference
- `04_증빙/01_핵심로그/session-log.md`: archive/reference

## Dispatch Rule

- 낮 동안에는 `ai-session-intake.csv`만 append한다.
- 프롬프트 원문이 중요하면 `ai-prompt-intake.csv`도 같이 append한다.
- 하루 종료 시 `python3 .agent/system/automation/scripts/dispatch-session-intake.py`를 실행한다.
- `prompt-catalog.md`와 `decision-log.md`는 dispatch report 후보를 보고 승격한다.

## Prompt Promotion Rule

- 프롬프트는 문장만 저장하지 않는다.
- 최소 `Intent / Prompt / Input contract / Output contract / Reuse rule / Linked evidence`를 같이 저장한다.
- 구조 변경 프롬프트는 결과물 note, script, template을 연결해야 한다.
