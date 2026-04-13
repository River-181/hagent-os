---
tags:
  - area/evidence
  - type/log
  - status/active
  - workflow/evidence-source
date: 2026-04-13
up: "[[_04_증빙_MOC]]"
aliases:
  - master-evidence-ledger
  - 증빙원장
  - AI리포트원장
---
# Master Evidence Ledger

> 이 파일은 `ai-session-intake.csv`에서 파생되는 증빙 원장이다.
> 낮 동안 직접 입력은 intake에 먼저 하고, nightly dispatch에서 이 파일을 재생성한다.

## 원칙

- intake row 1건은 의미 있는 세션 1건이다.
- 세션 블록은 날짜별로 정렬해 렌더링한다.
- 정확 수치와 추정 수치를 구분해 `Token note`에 남긴다.
- prompt/decision 승격 여부는 dispatch report의 후보를 보고 최종 판단한다.

## 2026-04-06

### S-001

- DateTime: 2026-04-06 / CLI
- Phase: Contest Research
- Tool/Client: Claude Code
- Model: Opus 4.6
- Goal: 대회 개요 정리와 워크스페이스 구조화를 시작한다
- What changed: 대회 개요서와 초기 워크스페이스 구조 및 MOC와 에이전트 뼈대가 만들어졌다
- Why it mattered: 프로젝트 전체를 증빙 중심 워크스페이스로 운영하는 출발점이 되었다
- Artifacts: [[바이브코딩공모전_공지]] | `_MOC/` | `.agent/agents/`
- AI usage strategy: Claude Code는 로컬 파일 생성과 구조화에 집중했다
- Evidence value: 워크스페이스 초기 생성 기록
- Report section hint: 워크플로우 | AI 활용 과정
- Token note: exact token source exists in Claude JSONL
- Follow-up: 증빙 시스템 확장 단계로 연결

### S-002

- DateTime: 2026-04-06 / CLI
- Phase: Workspace Setup
- Tool/Client: Claude Code
- Model: Opus 4.6
- Goal: 증빙 시스템 개선과 포터블 환경을 정리한다
- What changed: 증빙 구조 분석 문서와 setup 스크립트 및 포터블 설정이 추가되었다
- Why it mattered: 기록 체계가 일회성이 아니라 재현 가능한 구조로 전환되었다
- Artifacts: evidence-system-improvement-analysis.md | setup.sh | portable-config.md
- AI usage strategy: 분석 결과를 바로 스크립트와 설정 파일로 연결했다
- Evidence value: 증빙 체계와 포터블 환경 설계 기록
- Report section hint: AI 활용 전략 | 유지보수성
- Token note: exact token source exists in Claude JSONL
- Follow-up: PLAN/PROGRESS 생성으로 이어짐

### S-003

- DateTime: 2026-04-06 / CLI
- Phase: Workspace Setup
- Tool/Client: Claude Code
- Model: Opus 4.6
- Goal: 멀티에이전트 조율 체계를 도입한다
- What changed: PLAN과 PROGRESS가 생기고 멀티 AI 동기화 프로토콜이 도입되었다
- Why it mattered: 여러 AI가 현재 상태와 다음 할 일을 공유할 수 있게 되었다
- Artifacts: [[.agent/system/ops/PLAN]] | [[.agent/system/ops/PROGRESS]]
- AI usage strategy: Claude는 운영 문서 반영을 맡고 Codex 평가는 입력 신호로 활용했다
- Evidence value: 멀티 에이전트 조율 체계의 기원
- Report section hint: 워크플로우 | AI 활용 과정
- Token note: Claude exact token은 JSONL 참조
- Follow-up: 증빙 확장과 아키텍처 시각화로 연결

### S-CODEX-001

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: 워크스페이스 전반을 평가해 약점과 개선점을 찾는다
- What changed: 워크스페이스 평가서와 개선 우선순위가 정리되었다
- Why it mattered: 운영 정본화와 증빙 체계 재설계의 외부 피드백 근거가 되었다
- Artifacts: [[codex-workspace-evaluation]]
- AI usage strategy: Codex는 감사와 정리 역할로 활용했다
- Evidence value: 초기 진단과 약점 식별 근거
- Report section hint: AI 활용 전략 | 운영 감사
- Token note: Desktop App Codex exact export unavailable; intake estimate 10000 tokens.
- Follow-up: 평가 결과를 운영 문서에 통합

### S-CODEX-002

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: AI-native 운영감사 보고서를 작성하고 수정한다
- What changed: 운영감사 보고서 초안과 수정본이 만들어졌다
- Why it mattered: 운영 체계의 통합성/재현성/자동화 한계를 구조적으로 정리했다
- Artifacts: [[ai-native-workspace-audit-report]]
- AI usage strategy: Codex를 감사와 구조 개선 제안 채널로 사용했다
- Evidence value: 감사 보고서와 개선 제안 근거
- Report section hint: AI 활용 전략 | 유지보수성
- Token note: Desktop App Codex exact export unavailable; intake estimate 16000 tokens.
- Follow-up: 운영 정본 V2 구현으로 연결

### S-GPT-001

- DateTime: 2026-04-06 / Web
- Phase: Contest Research
- Tool/Client: ChatGPT
- Model: GPT-5.4
- Goal: 대회 개요와 준비 로드맵의 큰 그림을 잡는다
- What changed: 대회 개요서 초안과 플레이북 방향 및 프롬프트 트래커 초기 구조가 만들어졌다
- Why it mattered: 이후 모든 운영 설계와 워크스페이스 구축의 출발점이 되었다
- Artifacts: [[바이브코딩공모전_공지]] | [[01-vibe-contest-master-playbook-v0-1]] | KEG_AI_Prompt_Tracker.xlsx
- AI usage strategy: 설계와 방향 설정을 Web AI에 먼저 맡기고 로컬 구현은 후속 에이전트로 넘겼다
- Evidence value: 대회 해석과 초기 전략의 기원 기록
- Report section hint: 기획 | AI 활용 전략 | 도구 선택 이유
- Token note: 정액제 환경이라 exact unavailable
- Follow-up: 후속 리서치와 구현 분업 검증

### S-OPS-001

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: 공용 운영 정본 V2를 실제 파일 구조로 반영한다
- What changed: `.agent/system/` 골격과 계약 문서 및 정본 메모리와 맵 구조가 생겼다
- Why it mattered: 공용 운영 정본이 생기며 워크스페이스가 재현 가능한 시스템으로 바뀌었다
- Artifacts: [[workspace-contract]] | [[workspace-atlas]] | `.agent/system/`
- AI usage strategy: 구조 설계를 문서와 실제 파일 이동으로 동시에 반영했다
- Evidence value: 운영 정본화와 시스템 레이어 구축
- Report section hint: AI 활용 전략 | 유지보수성/재현성
- Token note: Desktop App Codex exact export unavailable; intake estimate 12000 tokens.
- Follow-up: 문제 리서치 세션에서도 같은 구조가 유효한지 검증

### S-OPS-002

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Cleanup
- Tool/Client: Codex
- Model: GPT-5
- Goal: 루트 구조와 경로 정합성을 단순화한다
- What changed: 운영 파일이 `.agent/system/ops`로 이동하고 `.claude`가 최소 어댑터로 정리되었다
- Why it mattered: 루트 혼란이 줄고 공용 운영 자산 위치가 명확해졌다
- Artifacts: `.agent/system/ops/` | `.claude/` | `03_제품/`
- AI usage strategy: 정본과 어댑터를 분리하는 방향으로 정리했다
- Evidence value: 루트 최소화와 어댑터 단순화 기록
- Report section hint: 유지보수성 | 재현성
- Token note: Desktop App Codex exact export unavailable; intake estimate 14000 tokens.
- Follow-up: 실전 운용 검증으로 연결

### S-OPS-003

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Cleanup
- Tool/Client: Codex
- Model: GPT-5
- Goal: 처음 보는 사용자 기준으로 memory/maps/evidence를 단순화한다
- What changed: 장기기억/일일기억과 workspace-atlas 및 핵심로그/분석자료/daily 3구역 구조가 생겼다
- Why it mattered: 학습 비용이 줄고 세션 종료 동기화 경로가 분명해졌다
- Artifacts: [[long-term-memory]] | [[daily-memory]] | [[workspace-atlas]]
- AI usage strategy: 복잡한 구조를 파일 수 축소와 sync 스킬로 함께 정리했다
- Evidence value: 초심자 친화 구조 개편 근거
- Report section hint: 워크플로우 | 유지보수성
- Token note: Desktop App Codex exact export unavailable; intake estimate 14000 tokens.
- Follow-up: workspace-sync 실전 적용 검증

### S-OPS-004

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: GitHub 운영 전용 스킬을 추가한다
- What changed: `github-workflow` 스킬과 registry 연결이 추가되었다
- Why it mattered: GitHub 작업도 증빙 흐름과 같은 규칙 아래 관리되게 되었다
- Artifacts: `.agent/skills/github-workflow/SKILL.md` | registry
- AI usage strategy: commit/push/PR 흐름을 프로젝트 스킬로 표준화했다
- Evidence value: GitHub 운영 표준화 기록
- Report section hint: AI 활용 전략 | 운영 자동화
- Token note: Desktop App Codex exact export unavailable; intake estimate 8000 tokens.
- Follow-up: 실제 GitHub issue/commit 작업에서 검증

### S-OPS-005

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: Obsidian-first 운영 기준을 정본 문서에 명시한다
- What changed: Obsidian workspace 스킬과 관련 규칙이 AGENTS와 계약 문서에 반영되었다
- Why it mattered: 이 저장소가 일반 markdown repo가 아니라 Obsidian vault라는 전제가 고정되었다
- Artifacts: `.agent/skills/obsidian-workspace/SKILL.md` | [[AGENTS]]
- AI usage strategy: vault 규칙과 스킬 사용 원칙을 함께 고정했다
- Evidence value: Obsidian-first 운영 기준의 정착
- Report section hint: 도구 선택 이유 | 워크플로우
- Token note: Desktop App Codex exact export unavailable; intake estimate 10000 tokens.
- Follow-up: 실제 note/MOC/base 작업에서 실전 적용

### S-OPS-006

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: Claude runtime command layer를 얇게 설계한다
- What changed: `.claude/commands`와 command stack registry가 추가되었다
- Why it mattered: 런타임 접근성은 높이고 공용 정본 중복은 줄일 수 있게 되었다
- Artifacts: `.claude/commands/` | [[claude-command-stack]]
- AI usage strategy: entrypoint는 얇게 두고 실제 로직은 agents/skills를 재사용하게 설계했다
- Evidence value: command layer 설계와 재사용 전략
- Report section hint: 유지보수성 | 재현성
- Token note: Desktop App Codex exact export unavailable; intake estimate 12000 tokens.
- Follow-up: Claude runtime 실사용 검증

### S-OPS-007

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: GitHub issue/project 운영 스킬을 분리한다
- What changed: issue/project 전용 스킬과 registry 연결이 추가되었다
- Why it mattered: GitHub 코드 흐름과 관리 흐름을 분리해 유지보수성이 좋아졌다
- Artifacts: `.agent/skills/github-issue-ops/` | `.agent/skills/github-project-ops/`
- AI usage strategy: 상위 workflow는 유지하고 하위 운영 스킬을 분리했다
- Evidence value: GitHub 운영 세분화 기록
- Report section hint: AI 활용 전략 | 운영 자동화
- Token note: Desktop App Codex exact export unavailable; intake estimate 10000 tokens.
- Follow-up: 실제 issue triage와 board 생성에서 검증

### S-OPS-008

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: 증빙 입력을 단일 원장 체계로 전환한다
- What changed: `master-evidence-ledger.md`가 직접 입력 정본으로 재정의되고 관련 규칙이 바뀌었다
- Why it mattered: 기록 비용을 줄이고 AI 리포트 재료를 한 곳에 쌓을 수 있게 되었다
- Artifacts: [[master-evidence-ledger]] | [[memory-evidence-policy]]
- AI usage strategy: 입력 1개와 파생 N개 전략으로 기록 비용을 줄였다
- Evidence value: 로깅 전략 변화와 유지비 절감
- Report section hint: AI 활용 전략 | 토큰 절약 전략
- Token note: Desktop App Codex exact export unavailable; intake estimate 9000 tokens.
- Follow-up: 실제 세션 운영에서 체계 검증

### S-OPS-009

- DateTime: 2026-04-06 / Desktop App
- Phase: Workspace Setup
- Tool/Client: Codex
- Model: GPT-5
- Goal: MOC를 중앙화하고 도구 문서를 저장소 내부로 가져온다
- What changed: `_MOC/` 중앙화와 `_system/tools/` / `_system/team-setup/` 공간이 만들어졌다
- Why it mattered: 다른 워크스페이스나 전역 환경에 덜 의존하는 포터블 구조가 되었다
- Artifacts: [[_MOC_HOME]] | [[_system/tools/README]] | team-computer-setup-guide.md
- AI usage strategy: 구조 변경은 정본 문서와 팀 가이드까지 함께 묶었다
- Evidence value: 포터블 환경과 도구 계층 정리
- Report section hint: 도구 선택 이유 | 재현성
- Token note: Desktop App exact export unavailable; intake estimate 12,000 tokens.
- Follow-up: Obsidian CLI와 NLM 설치 실동작 검증

### S-PPLX-001

- DateTime: 2026-04-06 / Web
- Phase: Contest Research
- Tool/Client: Perplexity
- Model: Search+AI
- Goal: 기관 의도와 유사 대회 패턴을 리서치한다
- What changed: 기관 선호 포인트와 심사 문법을 추론할 재료를 모았다
- Why it mattered: 문제 정의를 기관 친화 문법으로 맞추는 기준이 생겼다
- Artifacts: [[03-기관-분석-및-심사-전략]] | [[02-계보-포지셔닝-분석]]
- AI usage strategy: Perplexity는 대규모 탐색과 출처 모음에만 쓰고 최종 판단은 별도 문서와 결합했다
- Evidence value: 기관 적합성과 심사 전략 근거
- Report section hint: 기획 | 문제 정의 근거 | AI 활용 전략
- Token note: 토큰 비공개라 conservative estimate
- Follow-up: 실제 문제 후보 평가 시 조사 재활용

## 2026-04-08

### S-EVID-015

- DateTime: 2026-04-08 / Desktop App
- Phase: Evidence Operations
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: Codex 세션도 증빙 원장과 외부 AI 사용 집계에 포함되게 만든다
- What changed: Codex 토큰을 estimate로 기록하는 규칙이 실제 CSV와 원장에 반영되었다
- Why it mattered: Claude만 exact 집계되고 Codex가 누락되는 왜곡을 줄였다
- Artifacts: [[master-evidence-ledger]] | `external-ai-usage.csv`
- AI usage strategy: exact source가 없는 도구는 zero로 비우지 않고 보수 추정치로 누적했다
- Evidence value: 도구별 사용량 비교와 멀티 AI 분업 기록
- Report section hint: AI 활용 과정 | 통계
- Token note: Desktop App Codex exact export unavailable; intake estimate 12000 tokens.
- Follow-up: nightly 집계 시 stats 재생성

### S-OPS-011

- DateTime: 2026-04-08 / Desktop App
- Phase: Workspace Operations
- Tool/Client: Codex
- Model: GPT-5
- Goal: 태그와 계층 규칙을 vault 전반에 일관되게 적용한다
- What changed: namespace 태그 체계와 `up` 속성 및 감사 스크립트와 템플릿이 정리되었다
- Why it mattered: 검색/필터/구조 복구가 안정화되었다
- Artifacts: [[tagging-system]] | `tag-audit.sh` | templates
- AI usage strategy: 규칙 문서와 스크립트와 실제 노트를 한 번에 맞췄다
- Evidence value: 정보 구조 정규화와 vault 유지보수 방식
- Report section hint: AI 활용 전략 | 유지보수성
- Token note: Desktop App Codex exact export unavailable; intake estimate 15000 tokens.
- Follow-up: 새 note 생성 기본값으로 동일 규칙 유지

### S-OPS-012

- DateTime: 2026-04-08 / Desktop App
- Phase: Evidence
- Tool/Client: Codex
- Model: GPT-5
- Goal: 대시보드와 계획/진행/데일리/메모리를 제출용으로 정렬한다
- What changed: 프로젝트 대시보드가 간트형 진행판으로 재설계되고 연계 문서가 보강되었다
- Why it mattered: 나중에 AI 리포트와 결과보고서에서 작업 흐름을 설명할 수 있게 되었다
- Artifacts: [[project-dashboard]] | [[PLAN]] | [[PROGRESS]] | [[2026-04-08]]
- AI usage strategy: PM 문서와 증빙 문서를 visible dashboard로 연결해 설명 가능성을 높였다
- Evidence value: 제출용 진행 가시화 레이어
- Report section hint: 워크플로우 | 프로젝트 관리 방식
- Token note: Desktop App Codex exact export unavailable; intake estimate 14000 tokens.
- Follow-up: 주제 확정 이후 제품 태스크도 같은 방식으로 누적

### S-OPS-014

- DateTime: 2026-04-08 / Desktop App
- Phase: Workspace Hardening
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 공개 저장소 push 전 secret/privacy 점검 절차를 고정한다
- What changed: pre-push safety gate와 관련 정책/스크립트가 추가되었다
- Why it mattered: 공개 저장소 운영에서 보안 점검이 구조보다 우선이라는 기준이 생겼다
- Artifacts: `pre-push-safety-check.sh` | `.gitignore`
- AI usage strategy: 정책 문서와 실행 스크립트와 ignore rule을 같이 둬서 누락을 줄였다
- Evidence value: 보안과 공개 저장소 운영 안전장치
- Report section hint: 운영 안전장치 | 재현성
- Token note: Desktop App Codex exact export unavailable; intake estimate 9000 tokens.
- Follow-up: 이후 push 전 표준 루틴으로 사용

### S-RES-013

- DateTime: 2026-04-08 / Desktop App
- Phase: Research Ops
- Tool/Client: Codex
- Model: GPT-5
- Goal: 리서치 작업 공간을 구축하고 NotebookLM을 통합한다
- What changed: 리서치 허브/플랜/프롬프트/로그와 통합 브리프가 만들어지고 NotebookLM 노트북이 생성되었다
- Why it mattered: 흩어진 리서치 결과를 MVP 판단용 합성 계층으로 묶을 수 있게 되었다
- Artifacts: `research-hub` | `research-plan-eduswarm-v0` | NotebookLM notebook
- AI usage strategy: 구조화는 Codex가 맡고 상위 비교 질문은 NotebookLM 합성 계층으로 넘겼다
- Evidence value: 리서치 운영 구조와 합성 도구 검증
- Report section hint: 문제 정의 근거 | AI 활용 전략
- Token note: Codex Desktop App + NotebookLM mixed session; exact token export unavailable. Intake estimate 22000 tokens.
- Follow-up: scorecard 반영과 최종 문제 압축으로 연결

### S-STRAT-010

- DateTime: 2026-04-08 / Desktop App
- Phase: Strategy
- Tool/Client: Codex
- Model: GPT-5
- Goal: Karpathy 스타일 LLM Wiki를 현재 워크스페이스에 삽입한다
- What changed: `06_LLM위키/` 레이어와 schema/index/log/overview가 생겼다
- Why it mattered: 리서치 지식을 채팅 로그가 아니라 지속 가능한 wiki layer에 누적할 수 있게 되었다
- Artifacts: [[karpathy-llm-wiki-adaptation]] | `06_LLM위키/`
- AI usage strategy: raw/wiki/schema 3층을 분리해 compounding knowledge 구조를 만들었다
- Evidence value: 지속 지식 시스템 설계
- Report section hint: AI 활용 전략 | 데이터 흐름 | 재현성
- Token note: Desktop App Codex exact export unavailable; intake estimate 12000 tokens.
- Follow-up: 기존 전략 문서 첫 ingest 실행

## 2026-04-09

### S-MTG-019

- DateTime: 2026-04-09 / Offline Meeting
- Phase: Product Alignment
- Tool/Client: Human Meeting
- Model: 
- Goal: 승보님과 UI 및 핵심 컨셉을 공유하고 개발 착수 가능 여부를 정렬한다
- What changed: UI가 준비되어 이제 개발에 들어갈 수 있다는 공감대가 생겼고 핵심 컨셉이 `학원 데이터 자산화 + 쉬운 AI 에이전트 활용`으로 명확해졌다
- Why it mattered: 소규모 학원 타깃과 로컬 우선 오픈소스 전략을 제품 베팅으로 더 분명하게 합의했다
- Artifacts: UI 시안 | 기획 문서 | 모델링 결과
- AI usage strategy: 사람 간 미팅에서 제품 가설을 압축하고 이후 구현 기준선을 확정했다
- Evidence value: 핵심 컨셉 합의와 타깃/배포 철학 정렬
- Report section hint: 제품 정의 근거 | 핵심 컨셉 | 의사결정
- Token note: no AI usage in this session
- Follow-up: 다음 단계는 UI 기준으로 실제 개발 착수

### S-OPS-017

- DateTime: 2026-04-09 / Desktop App
- Phase: Workspace Sync
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 운영 문서와 메모리와 AI 사용 기록을 한 번 더 최신 상태로 동기화한다
- What changed: 반복 요청 기준으로 운영 정합성을 다시 맞추고 intake/dispatch/usage stats를 재실행했다
- Why it mattered: 다음 에이전트가 읽는 운영 상태와 통계가 더 최신화되었다
- Artifacts: [[PLAN]] | [[PROGRESS]] | [[daily-memory]] | [[ai-usage-stats]]
- AI usage strategy: Codex를 운영 동기화와 증빙 재생성 루틴 검증에 사용했다
- Evidence value: 운영 루틴 반복 가능성 검증
- Report section hint: 워크플로우 | AI 활용 전략 | 유지보수성
- Token note: Desktop App Codex exact export unavailable; intake estimate 8000 tokens.
- Follow-up: nightly dispatch와 stats 재집계를 같은 패턴으로 반복 유지

### S-PROD-018

- DateTime: 2026-04-09 / Desktop App
- Phase: Product Learning
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: `03_제품/hagent-os` 기획 문서를 수정 없이 읽고 현재 제품 방향을 학습한다
- What changed: HagentOS의 현재 제품 방향이 학원 운영자 민원·예외 처리 OS와 board-first AI 팀과 k-skill registry와 통합 스케줄러 축으로 정리되어 있음을 제품 정본 관점에서 재확인했다
- Why it mattered: 이후 구현과 피드백이 기존 전략 메모가 아니라 실제 제품 문서 정본을 기준으로 이루어질 수 있게 되었다
- Artifacts: `03_제품/hagent-os/README.md` | `00_vision/` | `01_strategy/` | `02_product/`
- AI usage strategy: Codex는 문서를 수정하지 않고 제품 방향을 읽어 현재 설계의 중심축과 미정 영역만 학습했다
- Evidence value: 제품 정본 학습과 방향 정합성 확보
- Report section hint: 제품 정의 근거 | 워크플로우 | AI 활용 전략
- Token note: Desktop App Codex exact export unavailable; intake estimate 7000 tokens.
- Follow-up: 향후 구현/비평/리팩터링은 hagent-os 문서군을 기준으로 진행

### S-STRAT-016

- DateTime: 2026-04-09 / Desktop App
- Phase: Reference Analysis
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: `paperclip-master` 실제 코드 기준으로 분석 문서를 보강하고 운영 메모리를 최신화한다
- What changed: `paperclip-analysis` 문서가 개념 메모에서 repo-grounded 분석으로 바뀌고 운영 문서와 메모리도 현재 상태 기준으로 정렬되었다
- Why it mattered: reference 프로그램을 chat이 아니라 control plane으로 이해하게 되면서 향후 제품 정의의 기준점이 명확해졌다
- Artifacts: [[00-paperclip-ai]] | [[PLAN]] | [[PROGRESS]] | [[daily-memory]]
- AI usage strategy: Codex는 로컬 repo 해체와 전략/운영 문서 동기화를 한 세션 안에서 연결했다
- Evidence value: reference 분석을 실제 제품 방향 입력으로 승격한 기록
- Report section hint: 문제 정의 근거 | 워크플로우 | AI 활용 전략
- Token note: Desktop App exact export unavailable; intake estimate 18,000 tokens.
- Follow-up: 다음으로 problem-definition-source와 scorecard에 반영

## 2026-04-10

### S-OPS-020

- DateTime: 2026-04-10 / Desktop App
- Phase: Workspace Sync
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: Day 5 기준 운영 문서와 증빙 정본을 다시 동기화하고 구현 전 문서 충돌을 기록한다
- What changed: Day 5 daily와 운영 문서가 최신화됐고 구현 전에 잠가야 할 블로커 4개가 문서로 압축되었다
- Why it mattered: 다음 구현 세션이 모바일 탭바와 앱 셸과 폰트와 브랜드 claim 충돌을 모른 채 진행되는 위험을 줄였다
- Artifacts: [[PLAN]] | [[PROGRESS]] | [[project-dashboard]] | [[daily-memory]] | [[2026-04-10]]
- AI usage strategy: Codex를 운영 문서 동기화와 design review findings 압축에 사용했다
- Evidence value: 운영 상태 최신화와 구현 전 기준선 기록
- Report section hint: 워크플로우 | AI 활용 전략 | 의사결정
- Token note: Desktop App Codex exact export unavailable; intake estimate 6000 tokens.
- Follow-up: dispatch와 usage stats 재생성

### S-PROD-021

- DateTime: 2026-04-10 / Claude Code CLI
- Phase: App Gap Audit + P0/P1 Fix
- Tool/Client: Claude
- Model: claude-sonnet-4-6
- Goal: 11개 페이지 전수 갭 감사 후 P0(강사관리·일정편집·반배정) P1(스킬추가·일괄승인·목표링크·루틴이력) 즉시 구현
- What changed: InstructorsPage 신규, SchedulePage 강사선택+편집삭제, StudentsPage 반배정, AgentDetailPage 스킬추가, ApprovalsPage 일괄승인/거부, GoalsPage 링크, RoutinesPage 아코디언, DB 스키마 v2 마이그레이션, PATCH/students + student-schedules 엔드포인트
- Why it mattered: 운영 차단 갭 5개 해소. 학원장이 실제 쓸 수 있는 레벨로 품질 향상. v0.4.0 커밋
- Artifacts: [[PROGRESS]] | [[PLAN]] | git commit f32570b
- AI usage strategy: 4개 병렬 에이전트(schedule/instructors/students-cases/skills-approvals)로 분업 구현. TS 에러 0 확인
- Evidence value: 병렬 에이전트 분업 패턴이 효과적임을 재확인
- Report section hint: 워크플로우 | AI 활용 | 제품
- Token note: ~85k tokens Claude Sonnet
- Follow-up: 다음: DB 마이그레이션 실행 + 온보딩 + 에이전트 E2E + 배포

## 2026-04-11

### S-DEV-022

- DateTime: 2026-04-11 / Claude Code CLI
- Phase: Product Build v1.0
- Tool/Client: Claude
- Model: claude-opus-4-6 → claude-sonnet-4-6
- Goal: HagentOS 독립 레포 구축 + Paperclip급 E2E 완전 재구축 (서버 엔진 + UI + Mock AI + DB 마이그레이션)
- What changed: 독립 레포 River-181/hagent-os 구축; execution.ts Case 자동 상태변경+댓글 삽입; approvals.ts reject rollback+agent_hire; agents.ts SOUL.md 자동생성; agent-hires.ts 신규; organizations.ts DELETE cascade; claude.ts 키워드 기반 mock 라우팅; orchestrator.ts 실제 지시→케이스 제목; UI 전면 재구축(OnboardingPage/AgentDetailPage/OrgChart/Approvals/OrganizationRail); 11파일 fallback 데이터 제거
- Why it mattered: 껍데기에서 Paperclip급 E2E 실동작으로 전환. 독립 설치형 레포로 제출물 완성 형태 확보. 멀티 학원 지원. 실제 지시 내용 기반 라우팅
- Artifacts: [[PROGRESS]] | git commits 09a02e0~3254c76 (River-181/hagent-os)
- AI usage strategy: Opus 시작 후 Sonnet으로 전환. 병렬 에이전트 없이 순차 집중 구현. 컨텍스트 압축 후 Sonnet으로 계속
- Evidence value: E2E 실동작 증명 + 독립 레포 구조 확보
- Report section hint: 워크플로우 | AI 활용 전략 | 제품
- Token note: ~320k tokens (Opus+Sonnet 혼합)
- Follow-up: E2E 검증 + Railway 배포 + README + AI 리포트 초안

## 2026-04-12

### S-DEV-025

- DateTime: 2026-04-12 / Claude Code CLI
- Phase: Product Build UX
- Tool/Client: Claude
- Model: claude-sonnet-4-6
- Goal: 승인 스크롤 수정 + Settings Danger Zone + 지식베이스 실질화 + 온보딩 전체화면 + 탄자니아 루틴/목표 3종 + Goals 재설계(클린 목록+Detail) + Goals↔Projects 양방향 연결
- What changed: ApprovalsPage overflow fix + Settings export+delete + 문서 실내용화 + 온보딩 full-screen route 분리 + 데모 루틴3/목표3 생성 + GoalsPage 클린리스트 + GoalDetailPage 신규 + 양방향 FK 연결
- Why it mattered: D-1 최종 UX 정비 세션. 승인 스크롤·온보딩·Goals가 모두 Paperclip 수준으로 정렬됨
- Artifacts: [[2026-04-12_4차-배포전-점검-미팅]] | commit ab34705 (Goals rewrite) | commit f936cb4 (bidirectional link)
- AI usage strategy: 긴 컨텍스트 1M 모델로 연속 구현 세션. 스크롤 버그 근본 원인(min-h-0) + route 분리 패턴 + FK 양방향 노출 3가지 다른 패턴 동시 해결
- Evidence value: UX 정비 + E2E 준비 기록
- Report section hint: 앱 개발 | UX 개선 | 기능 완성
- Token note: 1M context Sonnet long-session estimate (~380k tokens).
- Follow-up: Railway 배포 + E2E 검증으로 연결

### S-EVID-024

- DateTime: 2026-04-12 / Desktop App
- Phase: Evidence Operations
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 오늘 AI 사용 기록을 intake와 정본 로그에 반영한다
- What changed: 2026-04-12 기준 Codex 증빙 세션이 intake에 추가되고 ledger와 외부 AI 집계와 archive 로그가 함께 재생성되었다
- Why it mattered: 오늘 사용량이 빠지지 않고 일자별 증빙과 AI 리포트 raw material이 계속 최신 상태를 유지하게 되었다
- Artifacts: `ai-session-intake.csv` | `master-evidence-ledger.md` | `external-ai-usage.csv` | `ai-usage-log.md` | `session-log.md` | `2026-04-12.md`
- AI usage strategy: Codex를 evidence orchestrator로 사용해 원장 append 후 파생 로그를 일괄 재생성했다
- Evidence value: Day 7 AI 활용 증빙 최신화
- Report section hint: AI 활용 전략 | 워크플로우 | 증빙
- Token note: Desktop App Codex exact export unavailable; intake estimate 10000 tokens.
- Follow-up: 추가 세션이나 외부 프롬프트가 생기면 같은 intake-first 패턴으로 계속 기록

### S-OPS-023

- DateTime: 2026-04-12 / Claude Code CLI
- Phase: Workspace Sync + Meeting Log
- Tool/Client: Claude
- Model: claude-sonnet-4-6
- Goal: Day 7 작업 환경 이동 확인 + 회의록 추가 + 운영 문서 동기화
- What changed: daily-memory/PLAN/PROGRESS를 Day 7 기준으로 업데이트; 04_meetings에 4차 미팅 회의록 생성; 2026-04-12.md daily note 생성; _04_증빙_MOC 링크 추가
- Why it mattered: 작업 환경이 hagent-os 독립 레포로 완전 이동됨을 운영 문서에 반영; 배포 전 점검 미팅 이슈(에이전트 실동작 + 승인 스크롤)가 공식 기록됨
- Artifacts: [[2026-04-12]] | [[2026-04-12_4차-배포전-점검-미팅]] | [[daily-memory]] | [[PLAN]] | [[PROGRESS]]
- AI usage strategy: Sonnet 4.6으로 운영 문서 동기화 전담; 실행 작업은 hagent-os 레포에서 별도 진행
- Evidence value: 운영 상태 정합성 유지 및 회의록 증빙 확보
- Report section hint: 워크플로우 | 운영 동기화
- Token note: ~15k tokens Sonnet
- Follow-up: 승인 화면 스크롤 버그 수정 착수

## 2026-04-13

### S-DEP-034

- DateTime: 2026-04-13 / Railway + Web
- Phase: Deployment Completion
- Tool/Client: Human Deployment
- Model: 
- Goal: Railway 라이브 URL, GitHub, DB, Telegram, Kakao 공개 링크를 확정하고 제출 직전 남은 일을 재정렬한다
- What changed: HagentOS Railway 라이브 URL, GitHub 저장소, Railway 프로젝트, Neon DB, Telegram bot, Kakao 채널 공개 링크가 모두 확정되었고 배포 완료 상태가 공유되었다. 탄자니아 영어학원 데모 데이터 자동 시딩, Telegram bot 연동, Kakao 웹훅, 한국 법령 fallback, 에이전트 메모리 갱신, 온보딩 재체험, 설정/일정 잡버그 수정 완료 사실도 함께 정리되었다
- Why it mattered: 이제 심사위원에게 실제 접근 가능한 URL을 줄 수 있고 제출 상태를 배포 이후 단계로 전환할 수 있다. 남은 일은 AI 리포트 PDF, 서명 문서, 제출 이메일로 좁혀졌다.
- Artifacts: https://hagent-os.up.railway.app | https://github.com/River-181/hagent-os | https://t.me/TANZANIA_ENGLISH_ACADEMY_bot | https://pf.kakao.com/_raDdX
- AI usage strategy: 사람이 배포 완료 상태와 인프라 링크를 정리한 운영 세션이다. AI 사용량 통계에는 포함하지 않고 intake/ledger 증빙에만 남긴다.
- Evidence value: 라이브 배포 완료와 제출 직전 상태 전환의 공식 기록
- Report section hint: 배포 | 제출 상태 | 운영 연속성
- Token note: no AI token usage in this session
- Follow-up: AI 리포트 docx→PDF, 개인정보동의서/참가각서 서명, 제출 이메일 발송

### S-EVID-027

- DateTime: 2026-04-13 / Desktop App
- Phase: Evidence Sync
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 증빙 원장, daily memory, long-term memory, dashboard, progress, 0412/0413 일자 파일과 AI 사용 통계를 오늘 기준으로 동기화한다
- What changed: today intake row가 추가되고 파생 로그/usage 집계/데일리 노트와 memory/dashboard 문서가 2026-04-13 기준으로 맞춰졌다
- Why it mattered: AI 활용 증빙과 제출 상태 문서가 하루 늦지 않게 유지되어 리포트와 심사 대응의 근거가 정리되었다
- Artifacts: ai-session-intake.csv | master-evidence-ledger.md | external-ai-usage.csv | ai-usage-log.md | session-log.md | ai-usage-stats.md | 2026-04-13.md
- AI usage strategy: intake-first 원칙으로 Codex 세션을 먼저 기록한 뒤 파생 로그를 재생성하는 패턴을 유지했다
- Evidence value: Day 8 증빙 최신화
- Report section hint: 증빙 | 워크플로우 | AI 활용 전략
- Token note: Desktop App exact export unavailable; intake estimate 12,000 tokens for evidence sync + stats update.
- Follow-up: 최종 제출 직전 stats/ledger/hand-off 재확인

### S-EVID-030

- DateTime: 2026-04-13 / Desktop App
- Phase: Evidence Operations
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 현재 작업 세션 기준으로 증빙과 메모리와 대시보드와 통계를 다시 최신화한다
- What changed: 오늘 추가된 Telegram fallback과 judge/public split과 현재 검증 결과와 로그 경로와 미검증 항목이 증빙 문서에 반영되었다
- Why it mattered: 다른 세션이 바로 이어받을 수 있는 운영 상태와 제출용 증빙의 최신 정합성이 확보되었다
- Artifacts: [[2026-04-13]] | [[daily-memory]] | [[long-term-memory]] | [[project-dashboard]] | [[ai-usage-stats]]
- AI usage strategy: 지금 세션에서 확인한 체크 결과와 이전 handoff artifact를 함께 묶어 evidence continuity를 유지했다
- Evidence value: Day 8 current-session handoff 기록
- Report section hint: 증빙 | 워크플로우 | 운영 연속성
- Token note: Desktop App exact export unavailable; intake estimate 14,000 tokens for current-session evidence handoff.
- Follow-up: commit/push 전 마지막 regression과 live env만 다시 확인

### S-PLAN-029

- DateTime: 2026-04-13 / Desktop App
- Phase: Deployment Strategy
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 심사용 URL과 공개용 URL의 배포 방식을 분리해 제출 직전 구조를 확정한다
- What changed: judge_demo와 public_byom 두 모드로 같은 코드베이스를 운영하고 심사용은 탄자니아 영어학원 seed data와 사전 연결 모델을 포함한 고정 demo instance로 가는 방향이 결정되었다
- Why it mattered: 심사위원에게 키 입력을 요구하지 않는 재현 가능한 데모 패키지 기준이 생겼고 공개 배포와 심사 배포의 책임이 분리되었다
- Artifacts: [[project-dashboard]] | [[daily-memory]] | [[long-term-memory]]
- AI usage strategy: 로컬 코드와 현재 bootstrap/runtime 구성을 먼저 읽고 그 위에 judge/public split을 얹는 방식으로 계획을 고정했다
- Evidence value: 제출 직전 배포 아키텍처 의사결정 기록
- Report section hint: 배포 전략 | 운영 구조 | AI 활용 전략
- Token note: Desktop App exact export unavailable; intake estimate 18,000 tokens for judge/public deployment planning.
- Follow-up: Docker judge package와 demo reset/bootstrap 구현으로 연결

### S-PROD-026

- DateTime: 2026-04-13 / Desktop App
- Phase: Product Submission Polish
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: HagentOS 실사용 제출 마감용 UI/운영 흐름을 정리하고 issue/properties, schedule, students/settings, telegram approval loop를 polish한다
- What changed: issue/properties panel, case detail, schedule weekly/monthly interaction, students/instructors linkage, telegram inbound/approval/outbound, capabilities/skills/imported packs, dark mode 변수 치환까지 대규모 정비가 반영되었다
- Why it mattered: 심사용 핵심 루프가 기능 나열 수준에서 실제 운영 OS 수준으로 올라갔고, 제출 직전 UX와 증빙의 정합성이 크게 개선되었다
- Artifacts: git commit c44d5a5 | git commit e4b43f3 | [[PROGRESS_v2]] | [[project-dashboard]] | /Users/river/workspace/active/hagent-os/docs/handoff/2026-04-12-demo-rehearsal.md
- AI usage strategy: Codex를 주 구현+검증 오케스트레이터로 사용하고, 세부 화면 검증은 브라우저/route smoke와 병행했다
- Evidence value: Day 8 제출 마감용 제품 polish 기록
- Report section hint: 제품 | UX 개선 | AI 활용 전략 | 증빙
- Token note: Long desktop coding session estimate (~280k tokens); exact export unavailable.
- Follow-up: 최종 리허설과 live env 확인으로 연결

### S-PROD-028

- DateTime: 2026-04-13 / Desktop App
- Phase: Product Integration Polish
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: Telegram fallback와 운영 패널 확장을 실제 제품 흐름에 연결한다
- What changed: telegram outbound approval delivery와 adapter readiness 그리고 students/schedule에서 cases로 가는 drill-down과 cases/approvals/projects 운영 요약 패널 확장이 반영되었다
- Why it mattered: 카카오가 안 되는 환경에서도 Telegram 기준 demo loop가 유지되고 핵심 운영 객체 연결이 더 실제 제품처럼 보이게 되었다
- Artifacts: /Users/river/workspace/active/hagent-os/server/src/routes/approvals.ts | /Users/river/workspace/active/hagent-os/server/src/routes/adapters.ts | /Users/river/workspace/active/hagent-os/ui/src/pages/CaseDetailPage.tsx | /Users/river/workspace/active/hagent-os/ui/src/pages/ApprovalsPage.tsx | /Users/river/workspace/active/hagent-os/ui/src/pages/ProjectDetailPage.tsx
- AI usage strategy: Codex로 구현과 adapter/API smoke를 함께 돌려 Telegram readiness와 channel-aware delivery를 정리했다
- Evidence value: Day 8 Telegram fallback과 운영 패널 확장 기록
- Report section hint: 제품 | 통합 | AI 활용 전략
- Token note: Implementation + adapter verification estimate (~96k tokens); exact export unavailable.
- Follow-up: 실제 외부 Telegram 기기 수신과 live env를 다시 확인

### S-PROD-031

- DateTime: 2026-04-13 / Desktop App
- Phase: Product Design Pilot
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: `Skills` 화면을 pilot로 잡아 스킬 로딩을 복구하고, Toss 토큰 규칙과 paperclip형 구조를 대조해 디자인 파일럿을 다시 정리한다
- What changed: `/api/skills` 로딩 실패 원인을 `agentTypes` enum 불일치로 수정했고, `SkillsPage`를 dense list + flat detail 구조로 다시 정리했으며, 다크 neutral token과 상세 section 위계를 조정했다
- Why it mattered: 제출 직전 가장 눈에 띄는 깨짐이던 `Skills` 빈 화면을 복구하고, 전역 rollout 전에 합의 가능한 디자인 기준 샘플 화면을 확보했다
- Artifacts: /Users/river/workspace/active/hagent-os/packages/shared/src/types/index.ts | /Users/river/workspace/active/hagent-os/server/src/services/skills.ts | /Users/river/workspace/active/hagent-os/packages/db/src/schema/agents.ts | /Users/river/workspace/active/hagent-os/ui/src/pages/SkillsPage.tsx | /Users/river/workspace/active/hagent-os/ui/src/index.css | /Users/river/workspace/active/hagent-os/ui/src/components/ui/workspace-surface.tsx | /Users/river/workspace/active/hagent-os/output/playwright/skills-pilot/skills-after-2026-04-13.png
- AI usage strategy: Codex를 로컬 디자인/구현/검증 오케스트레이터로 사용하고, 병렬 subagent는 문제 진단과 문서 기준 추출에만 제한했다
- Evidence value: `Skills` 파일럿 디자인 기준, 로딩 복구, 디자인 토큰 정렬
- Report section hint: 제품 | UX 개선 | AI 활용 전략 | 증빙
- Token note: Multi-turn design audit + code edits + route smoke + Playwright verification estimate (~90k tokens); exact export unavailable.
- Follow-up: pilot 승인 후 `Settings`, `Case`, `Project`, `Agent`로 좁게 확산. 승인 전 전역 rollout 금지

### S-RALPH-033

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Parallel A
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 허용 경로만 수정해 Day 8 증빙/메모리/로그를 전수 동기화한다
- What changed: pre-Ralph snapshot 누락 세션이 intake에 보강되고 dispatch가 재실행되었으며 usage log/session log/stats와 Day 8 daily note, memory, progress, Ralph loop 결과가 허용 경로 안에서 다시 맞춰졌다
- Why it mattered: 코드 변경 없이도 Ralph 병렬 작업의 감사 추적선이 완성되고 심사 대응용 증빙 정합성이 유지되었다
- Artifacts: ai-session-intake.csv | ai-usage-log.md | ai-usage-stats.md | session-log.md | session-intake-dispatch-report.md | 2026-04-13.md | daily-memory.md | long-term-memory.md | PROGRESS.md | RALPH-LOOP-2026-04-13.md
- AI usage strategy: intake-first 후 dispatch와 memory/progress sync를 연결하는 evidence-only 세션으로 분리했다
- Evidence value: 랄프 병렬 A 증빙/메모리 동기화 기록
- Report section hint: 증빙 | 워크플로우 | 운영 연속성
- Token note: Desktop App exact export unavailable; intake estimate 16,000 tokens for Ralph evidence-only synchronization.
- Follow-up: 후속 Ralph 병렬 세션도 동일 baseline에서 diff만 추가

### S-RALPH1-A

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 1차 par A
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 1차 iter 1 실행 — smoke + basic flow 검증
- What changed: 랄프 루프 1차 병렬 A 세션으로 기본 smoke 흐름과 증빙 정합성을 확인했다
- Why it mattered: 랄프 루프 1차 병렬 실행의 기준 세션으로 B~E 세션과 비교 기준이 된다
- Artifacts: RALPH-LOOP-2026-04-13.md | ai-session-intake.csv
- AI usage strategy: 랄프 루프 1차 iter 1을 병렬 A 기준으로 실행하고 결과를 intake에 기록했다
- Evidence value: 랄프 1차 병렬 A 기록
- Report section hint: 증빙 | 워크플로우
- Token note: Desktop App Codex exact export unavailable; intake estimate 18000 tokens.
- Follow-up: B~E 병렬 세션과 합산해 Day 8 증빙 총계에 반영

### S-RALPH1-B

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 1차 par B
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 1차 iter 1 병렬 B — 증빙 경로와 daily-memory 정합성 확인
- What changed: daily-memory의 Day 8 섹션이 par B 기준으로 재검토되었다
- Why it mattered: 병렬 세션 간 중복 없이 각 세션이 독립적인 경로를 처리할 수 있음을 확인했다
- Artifacts: RALPH-LOOP-2026-04-13.md | daily-memory.md
- AI usage strategy: par A와 분기해 daily-memory와 증빙 경로 처리만 담당했다
- Evidence value: 랄프 1차 병렬 B 기록
- Report section hint: 증빙 | 운영 연속성
- Token note: Desktop App Codex exact export unavailable; intake estimate 17000 tokens.
- Follow-up: C~E 병렬 결과와 합산

### S-RALPH1-C

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 1차 par C
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 1차 iter 1 병렬 C — long-term-memory와 PROGRESS 동기화
- What changed: long-term-memory와 PROGRESS의 Day 8 항목이 par C 기준으로 재동기화되었다
- Why it mattered: 병렬 세션이 메모리와 진행 현황을 독립적으로 검토할 수 있음을 확인했다
- Artifacts: RALPH-LOOP-2026-04-13.md | long-term-memory.md | PROGRESS.md
- AI usage strategy: par B와 분기해 long-term-memory와 PROGRESS만 담당했다
- Evidence value: 랄프 1차 병렬 C 기록
- Report section hint: 증빙 | 메모리 관리
- Token note: Desktop App Codex exact export unavailable; intake estimate 16000 tokens.
- Follow-up: D~E 병렬 결과와 합산

### S-RALPH1-D

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 1차 par D
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 1차 iter 1 병렬 D — ai-usage-stats와 master-evidence-ledger 갱신
- What changed: ai-usage-stats의 Day 8 행과 master-evidence-ledger의 오늘 항목이 par D 기준으로 갱신되었다
- Why it mattered: 통계 파일과 원장이 병렬로 처리되어 전체 동기화 속도가 높아졌다
- Artifacts: RALPH-LOOP-2026-04-13.md | ai-usage-stats.md | master-evidence-ledger.md
- AI usage strategy: par C와 분기해 통계와 원장만 담당했다
- Evidence value: 랄프 1차 병렬 D 기록
- Report section hint: 증빙 | 통계
- Token note: Desktop App Codex exact export unavailable; intake estimate 15000 tokens.
- Follow-up: E 병렬 결과와 합산

### S-RALPH1-E

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 1차 par E
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 1차 iter 1 병렬 E — session-log와 session-intake-dispatch-report 갱신
- What changed: session-log의 Day 8 섹션과 dispatch report가 par E 기준으로 갱신되었다
- Why it mattered: session-log와 dispatch report를 별도 세션에서 독립 처리함으로써 충돌 없이 완성했다
- Artifacts: RALPH-LOOP-2026-04-13.md | session-log.md | session-intake-dispatch-report.md
- AI usage strategy: par D와 분기해 session-log와 dispatch report만 담당했다
- Evidence value: 랄프 1차 병렬 E 기록
- Report section hint: 증빙 | 워크플로우
- Token note: Desktop App Codex exact export unavailable; intake estimate 14000 tokens.
- Follow-up: 1차 병렬 A~E 합산 후 2차 루프 시작

### S-RALPH2-CASE

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-case
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-case — 민원 케이스 흐름 전수 검증 및 증빙 기록
- What changed: 민원 생성-승인-완료 전체 흐름이 재검증되었고 결과가 증빙에 기록되었다
- Why it mattered: 핵심 시나리오인 민원 처리 루프가 Day 8 증빙에 포함되어 심사 대응 가능 상태가 되었다
- Artifacts: 04_증빙/02_분석자료/live-smoke-2026-04-13.md | ai-session-intake.csv
- AI usage strategy: T-smoke 이후 케이스 흐름을 별도 세션으로 검증했다
- Evidence value: 케이스 흐름 검증 기록
- Report section hint: 증빙 | 제품 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 28000 tokens.
- Follow-up: T-settings-api 결과와 연결

### S-RALPH2-CASE-LEAN

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-case-lean-retry
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-case-lean-retry — 케이스 흐름 간소화 경로 재시도
- What changed: T-case에서 발견된 경계 케이스를 lean path로 재시도하여 처리 가능 여부를 확인했다
- Why it mattered: 예외 케이스 처리가 증빙에 추가되어 심사 시나리오 커버리지가 높아졌다
- Artifacts: ai-session-intake.csv
- AI usage strategy: T-case lean path를 별도 재시도 세션으로 분리했다
- Evidence value: 케이스 린 재시도 기록
- Report section hint: 증빙 | 제품 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 16000 tokens.
- Follow-up: T-settings-api 결과와 통합

### S-RALPH2-SECURITY

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-security
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-security — 보안 감사 및 주요 취약점 점검 결과 기록
- What changed: 보안 감사 결과가 `04_증빙/02_분석자료/security-audit-2026-04-13.md`에 기록되었다
- Why it mattered: 배포된 앱의 보안 취약점 점검 결과가 심사 증빙에 포함되어 신뢰성이 높아졌다
- Artifacts: 04_증빙/02_분석자료/security-audit-2026-04-13.md | ai-session-intake.csv
- AI usage strategy: 보안 감사를 별도 세션으로 분리해 독립 증빙으로 생성했다
- Evidence value: 보안 감사 기록
- Report section hint: 증빙 | 보안 | 제출물
- Token note: Desktop App Codex exact export unavailable; intake estimate 24000 tokens.
- Follow-up: T-security-recover와 연결

### S-RALPH2-SEEDLOG

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-seed-log
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-seed-log — 탄자니아 영어학원 seed 데이터 로그 검증
- What changed: 탄자니아 영어학원 데모 조직의 seed 데이터 삽입 로그가 검증되고 결과가 기록되었다
- Why it mattered: 심사용 데모 데이터가 안정적으로 시딩되는지 증빙할 수 있게 되었다
- Artifacts: ai-session-intake.csv
- AI usage strategy: seed 로그를 별도 검증 세션으로 분리했다
- Evidence value: 시드 데이터 로그 검증 기록
- Report section hint: 증빙 | 배포 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 18000 tokens.
- Follow-up: T-seed-log-retry와 연결

### S-RALPH2-SEEDLOG-RETRY

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-seed-log-retry
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-seed-log-retry — seed 로그 재시도 및 최종 확인
- What changed: seed 로그 재시도 후 최종 성공 결과가 확인되었다
- Why it mattered: 데모 seed 데이터의 멱등성이 검증되어 여러 번 재실행해도 안전함을 확인했다
- Artifacts: ai-session-intake.csv
- AI usage strategy: T-seed-log 실패 경로를 재시도 세션으로 분리했다
- Evidence value: 시드 데이터 재시도 기록
- Report section hint: 증빙 | 배포 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 12000 tokens.
- Follow-up: T-ui-polish와 연결

### S-RALPH2-SETTINGS

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-settings-api
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-settings-api — Settings API 엔드포인트 검증 및 증빙 기록
- What changed: Settings API의 주요 엔드포인트 응답이 검증되고 결과가 증빙에 기록되었다
- Why it mattered: Settings 기능의 API 레이어 신뢰성이 Day 8 증빙에 포함되었다
- Artifacts: ai-session-intake.csv
- AI usage strategy: Settings API 검증을 별도 세션으로 분리해 제품 증빙을 모듈화했다
- Evidence value: Settings API 검증 기록
- Report section hint: 증빙 | 제품 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 20000 tokens.
- Follow-up: T-settings v2와 연결

### S-RALPH2-SETTINGS-V2

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-settings v2
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-settings v2 — Settings 화면 v2 개선 반영 확인
- What changed: Settings 화면의 v2 개선 항목이 올바르게 반영되었는지 확인되었다
- Why it mattered: Settings 화면 품질이 제출 기준에 맞게 유지되고 있음을 증빙할 수 있게 되었다
- Artifacts: ai-session-intake.csv
- AI usage strategy: T-settings-api 이후 UI 확인 세션으로 분리했다
- Evidence value: Settings v2 확인 기록
- Report section hint: 증빙 | UX
- Token note: Desktop App Codex exact export unavailable; intake estimate 14000 tokens.
- Follow-up: T-seed-log와 연결

### S-RALPH2-SMOKE

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-smoke
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-smoke — 라이브 앱 smoke test 결과를 증빙에 기록
- What changed: Railway 라이브 앱의 smoke test 결과가 증빙 파일에 기록되었다
- Why it mattered: 배포된 앱의 기본 가용성이 Day 8 증빙에 포함되었다
- Artifacts: 04_증빙/02_분석자료/live-smoke-2026-04-13.md | ai-session-intake.csv
- AI usage strategy: smoke test 결과를 별도 세션으로 기록해 배포 검증을 독립 증빙으로 분리했다
- Evidence value: 라이브 스모크 테스트 결과 기록
- Report section hint: 증빙 | 배포 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 22000 tokens.
- Follow-up: T-case 결과와 연결

### S-RALPH2-UIPOLISH

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 2차 T-ui-polish
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 2차 T-ui-polish — UI 마감 polish 및 증빙 스크린샷 확보
- What changed: 주요 화면의 마감 polish 결과가 적용되고 스크린샷이 증빙에 추가되었다
- Why it mattered: 제출 전 UI 품질이 기준 이상임을 증빙 스크린샷으로 확인할 수 있게 되었다
- Artifacts: output/playwright/skills-pilot/ | ai-session-intake.csv
- AI usage strategy: UI polish를 별도 세션으로 분리해 스크린샷 증빙을 집중적으로 확보했다
- Evidence value: UI polish 기록
- Report section hint: 증빙 | UX | 제출물
- Token note: Desktop App Codex exact export unavailable; intake estimate 32000 tokens.
- Follow-up: T-security와 연결

### S-RALPH3-ASSISTANT

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 3차 T-assistant-fix
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 3차 T-assistant-fix — AI 어시스턴트 라우팅 버그 수정 및 검증
- What changed: AI 어시스턴트 라우팅 버그가 수정되고 응답 체인이 재검증되었다
- Why it mattered: 어시스턴트 기능의 신뢰성이 회복되어 심사 시나리오 실행 시 일관된 응답을 보장할 수 있게 되었다
- Artifacts: ai-session-intake.csv
- AI usage strategy: 어시스턴트 버그 수정을 별도 세션으로 분리해 제품 수정 증빙을 모듈화했다
- Evidence value: 어시스턴트 수정 기록
- Report section hint: 증빙 | 제품 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 19000 tokens.
- Follow-up: 최종 어시스턴트 상태 확인 완료

### S-RALPH3-DOCX

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 3차 T-docx
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 3차 T-docx — AI 리포트 최종 docx 조립 및 27개 이미지 삽입
- What changed: AI 리포트 docx 파일이 Q1~Q6 전체 내용과 27개 이미지를 포함해 최종 조립되었다
- Why it mattered: 심사 제출용 Word 문서가 완성되어 PDF 변환만 남은 상태가 되었다
- Artifacts: 05_제출/20260413_③_2026_KIT_바이브코딩_공모전_망상궤도_AI리포트.docx | ai-session-intake.csv
- AI usage strategy: docx 조립을 별도 세션으로 분리해 제출 패키지 생성을 독립 증빙으로 기록했다
- Evidence value: AI 리포트 docx 조립 기록
- Report section hint: 증빙 | 제출물
- Token note: Desktop App Codex exact export unavailable; intake estimate 35000 tokens.
- Follow-up: T-png-export와 연결

### S-RALPH3-PNG

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 3차 T-png-export
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 3차 T-png-export — Excalidraw 6종 PNG 내보내기 및 증빙 저장
- What changed: Excalidraw 6종이 PNG로 내보내져 `assets/screenshots/` 또는 `assets/excalidraw/` 경로에 저장되었다
- Why it mattered: AI 리포트 삽입용 도식 이미지가 확보되어 docx 조립이 가능해졌다
- Artifacts: assets/excalidraw/*.png | ai-session-intake.csv
- AI usage strategy: PNG 내보내기를 별도 세션으로 분리해 시각 자산 생성을 독립 증빙으로 기록했다
- Evidence value: PNG 내보내기 기록
- Report section hint: 증빙 | 제출물
- Token note: Desktop App Codex exact export unavailable; intake estimate 16000 tokens.
- Follow-up: T-docx에서 사용됨

### S-RALPH3-ROUTINE

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 3차 T-routine-fix
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 3차 T-routine-fix — 루틴 일관성 수정 및 검증 결과 기록
- What changed: 루틴 일관성 분석 결과가 `04_증빙/02_분석자료/routine-consistency-2026-04-13.md`에 기록되었다
- Why it mattered: 루틴 기능의 일관성 문제가 증빙에 포함되어 제품 검증 근거가 추가되었다
- Artifacts: 04_증빙/02_분석자료/routine-consistency-2026-04-13.md | ai-session-intake.csv
- AI usage strategy: 루틴 수정을 별도 세션으로 분리해 독립 증빙으로 생성했다
- Evidence value: 루틴 일관성 수정 기록
- Report section hint: 증빙 | 제품 검증
- Token note: Desktop App Codex exact export unavailable; intake estimate 20000 tokens.
- Follow-up: T-case-lean 결과와 통합

### S-RALPH3-SECURITY

- DateTime: 2026-04-13 / Desktop App
- Phase: Ralph Loop 3차 T-security-recover
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: 랄프 3차 T-security-recover — 보안 감사 후속 복구 작업 및 재검증
- What changed: 보안 감사에서 발견된 주요 항목의 복구 작업이 완료되고 재검증 결과가 기록되었다
- Why it mattered: 보안 취약점 복구 사실이 증빙에 포함되어 심사 대응력이 강화되었다
- Artifacts: 04_증빙/02_분석자료/security-audit-2026-04-13.md | ai-session-intake.csv
- AI usage strategy: T-security 후속으로 복구 작업을 별도 세션에서 처리했다
- Evidence value: 보안 복구 기록
- Report section hint: 증빙 | 보안
- Token note: Desktop App Codex exact export unavailable; intake estimate 18000 tokens.
- Follow-up: 최종 보안 상태 확인 완료

### S-SUB-032

- DateTime: 2026-04-13 / Desktop App
- Phase: Submission Package
- Tool/Client: Codex
- Model: GPT-5.4
- Goal: AI 리포트 final markdown, Excalidraw 3종, 배포 수정 스냅샷을 Ralph loop 직전 제출 기준선으로 정리한다
- What changed: 공식 6문항 형식의 `ai-report-final.md`가 완성되고 Excalidraw 3종(민원 플로우/AI 협업 구조/시스템 4계층)과 종합 아키텍처 다이어그램, 배포 수정 요약, 스크린샷 연결이 pre-Ralph snapshot 커밋으로 고정되었다
- Why it mattered: 심사위원용 제출 본문과 핵심 비주얼, 배포 수정 근거가 하나의 기준선으로 묶여 이후 Ralph loop 변경을 비교 가능한 상태로 만들었다
- Artifacts: 05_제출/ai-report-final.md | assets/excaildraw/01_민원-처리-플로우.excalidraw | assets/excaildraw/02_AI-협업-구조.excalidraw | assets/excaildraw/03_시스템-4계층.excalidraw | 03_제품/hagent-os/diagrams/99_comprehensive-architecture.md | git commit 15902fc
- AI usage strategy: Codex로 제출 문안/도식 구조/배포 수정 요약을 한 세션에 정리하고 Ralph loop 직전 기준 snapshot을 커밋으로 고정했다
- Evidence value: AI 리포트 본문 + 핵심 다이어그램 3종 + 배포 수정 기준선
- Report section hint: 제출물 | 제품 | AI 활용 전략 | 증빙
- Token note: Desktop App exact export unavailable; intake estimate 45,000 tokens for ai-report-final + diagram snapshot packaging.
- Follow-up: Ralph loop에서는 이 snapshot 이후 diff만 추적
