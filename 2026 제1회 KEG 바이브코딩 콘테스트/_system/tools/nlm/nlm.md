---
tags:
  - area/system
  - type/guide
  - status/active
title: nlm (NotebookLM CLI)
kind: tool
area: system
status: setup-required
created: 2026-04-06
updated: 2026-04-06
tool_id: nlm
tool_type: cli
owner: research
auth_mode: session
env_keys:
  - UV_PROJECT
  - NOTEBOOKLM_MCP_CLI_PATH
up: "[[_system/tools/README]]"
---

# nlm

> Google NotebookLM을 CLI와 MCP로 다루는 연구 도구.

## 이 공간에서 역할

- 딥리서치
- 대용량 자료 브리핑 생성
- 마인드맵/요약/질의응답
- 산출물의 AI 리포트용 재료화

## 저장 위치

- 문서 정본: `_system/tools/nlm/`
- 런타임 데이터: `_system/tools/runtime/nlm/`
- 연구 결과 note: `02_전략/research-results/` 또는 `04_증빙/02_분석자료/`

## 실행 패턴

```bash
source _system/tools/.env
uv run --project _system/tools nlm <command>
```

## 상세 문서

- [[_system/tools/nlm/260406-nlm-운영가이드|운영 가이드]]

## 팀 적용 원칙

- 인증 정보는 각자 로컬 `runtime/`에 둔다.
- 공용 정본은 이 note와 운영 가이드다.
- 의미 있는 리서치 세션은 `[[master-evidence-ledger]]`에 기록한다.
