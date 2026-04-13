---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-10
up: "[[.agent/AGENTS]]"
aliases:
  - CLAUDE
---
# CLAUDE.md — Claude Code 프로젝트 지시서

Canonical: `.agent/system/`

## 에이전트 시작 프로토콜

**새 세션을 시작할 때 반드시 아래 순서로 읽어라:**

1. **`.agent/system/ops/PLAN.md`** — 지금 무슨 일을 해야 하는지 (우선순위, 역할별 할 일)
2. **`.agent/system/ops/PROGRESS.md`** — 어디까지 진행됐는지 (완료/미완료, 참여 중인 AI 목록)
3. **`.agent/AGENTS.md`** — 공용 시작 프로토콜
4. **`.agent/system/contracts/workspace-contract.md`** — 운영 정본 계약
5. **`.agent/system/contracts/memory-evidence-policy.md`** — 메모리/증빙 규칙
6. **`.agent/system/memory/long-term-memory.md`** — 장기 기억 정본
7. **`.agent/system/memory/daily-memory.md`** — 오늘의 단기 기억
8. **`.agent/system/maps/workspace-atlas.md`** — 구조 지도

**작업 완료 시 반드시:**
- `.agent/system/ops/PROGRESS.md` 업데이트 (완료 항목 체크, 미완료 항목 추가)
- `.agent/system/ops/PLAN.md` 업데이트 (우선순위 변경 있으면)
- `04_증빙/01_핵심로그/ai-session-intake.csv` append
- 필요 시 `04_증빙/01_핵심로그/ai-prompt-intake.csv` append
- 세션 종료 또는 의미 있는 배치 종료 시 `python3 .agent/system/automation/scripts/dispatch-session-intake.py` 실행
- 필요 시 `decision-log.md` 또는 `prompt-catalog.md` 승격 여부 확인
- Evidence Gate는 필요한 경우에만 확인

---

## 프로젝트 구조

이 문서는 Claude 실행 어댑터다. 공용 규칙의 정본은 `.agent/system/`에 있다.
이 워크스페이스는 옵시디언 볼트이다. 모든 마크다운은 옵시디언 호환으로 작성한다.

```
.agent/system/ops/PLAN.md     ← 실행 계획 (에이전트 필독)
.agent/system/ops/PROGRESS.md ← 진행 상황 (에이전트 필독)
_system/dashboard/project-dashboard.md ← 제출용 가시 대시보드
00 HOME.md       ← 루트 MOC

01_대회정보/ → 02_전략/ → 03_제품/ → 04_증빙/ → 05_제출/
                                        ↑ 자동 축적
03_제품/app/ — 실제 제품 (`ui/`, `server/`, `packages/`)
03_제품/tests/ — 테스트
06_LLM위키/ — persistent synthesis layer
```

## 멀티에이전트 조율 규칙

- 여러 AI(Claude, GPT, Codex, Perplexity 등)가 동시에 이 워크스페이스에서 작업한다
- **`.agent/system/ops/PROGRESS.md`**가 단일 진실 소스(single source of truth)이다
- 작업 시작 전: `PROGRESS.md`에서 "미완료" 항목 확인 → 중복 작업 방지
- 작업 완료 후: `PROGRESS.md` 업데이트 + intake append + 필요 시 dispatch
- 충돌 발생 시: 사람(이승보 or 김주용)에게 에스컬레이션

## 현재 작업 기준

- 현재 우선순위는 이 파일이 아니라 `.agent/system/ops/PLAN.md`가 가진다.
- 현재 앱 상태는 문서 문구를 그대로 믿지 말고 `03_제품/app/` 구조와 실제 포트 리스닝으로 확인한다.
- 최근 기준으로 `03_제품/app/`에는 `ui/`, `server/`, `packages/`가 존재한다.
- 최근 기준으로 `http://localhost:5173/`는 세션마다 다를 수 있으므로 직접 확인한다.

## 옵시디언 규칙

- 내부 링크: `[[위키링크]]` 사용 (마크다운 링크 `[]()`는 외부 URL에만)
- 모든 노트에 YAML frontmatter 포함 (최소 `tags`, `date`, `up`)
- 태그: `area/*`, `type/*`, `status/*`, `workflow/*`
- 임베드: `![[파일명]]` 사용
- 강조: `==하이라이트==` 사용 가능
- vault 조작은 가능하면 `obsidian` CLI를 우선 검토
- `.base` 파일은 `obsidian-bases` 규칙으로 처리
- 관련 프로젝트 스킬: `.agent/skills/obsidian-workspace/SKILL.md`

## Claude 실행 메모

- `.claude/`는 canonical 규칙 저장소가 아니라 Claude용 얇은 adapter layer다.
- 공용 규칙 수정은 `.agent/`에서 먼저 하고, 정말 필요할 때만 `.claude/`를 따라갱신한다.
- Claude command 진입점은 `.claude/commands/` 아래에 있지만, 내용 정본은 `.agent/system/`과 각 note 정본에 둔다.

## 자동 로깅 규칙

작업 완료 시 intake-first 규칙을 따른다:

```
1. ai-session-intake.csv append
2. 필요 시 ai-prompt-intake.csv append
3. dispatch-session-intake.py 실행
4. decision-log / prompt-catalog 승격 여부 확인
```

## 사용 가능한 도구

- **MCP 서버**: `.agent/system/registry/mcp-registry.md` 참조
- **플러그인**: `.agent/system/registry/plugins-registry.md` 참조
- **프로젝트 스킬**: `.agent/skills/`, `.agent/system/automation/scripts/`
- **Claude project commands**: `.claude/commands/`
- **에이전트**: `.agent/agents/`

## 포터블 설정

이 워크스페이스는 **독립적으로 작동**해야 한다. 다른 컴퓨터로 옮길 때:
- 글로벌 플러그인: `bash .agent/adapters/claude/setup.sh` 실행
- MCP 서버: `.agent/system/registry/mcp-registry.md` 따라 수동 연결
- 상세 가이드: `.agent/adapters/claude/portable-config.md` 참조

## 코딩 규칙

- 앱 기준 스택은 `React 19 + Vite + Express + pnpm workspace`다.
- 구현 전에는 `SPEC`, `PLAN`, `PROGRESS`, `project-dashboard`와 충돌하지 않는지 먼저 본다.
- 작은 변경을 우선하고, 실행 상태는 직접 확인한다.
- 제품 코드 수정 시 관련 note와 증빙에 필요한 최소 업데이트를 같이 한다.

## 자주 쓰는 명령어

```bash
cd "03_제품/app"
pnpm dev
pnpm dev:ui
curl -I http://localhost:5173/
lsof -nP -iTCP:5173 -sTCP:LISTEN
python3 .agent/system/automation/scripts/dispatch-session-intake.py
```
