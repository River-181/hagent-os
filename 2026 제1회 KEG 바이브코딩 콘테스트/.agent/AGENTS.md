---
tags:
  - area/system
  - type/reference
  - status/active
date: 2026-04-10
up: "[[.agent/system/README]]"
aliases:
  - AGENTS
---
# AGENTS.md — 에이전트 공용 진입점

> 이 문서는 모든 AI 에이전트(Claude Code, Cursor, Copilot, ChatGPT 등)가 이 프로젝트에서 **가장 먼저** 읽어야 하는 문서다.

> 공용 운영 정본:
> - `.agent/system/contracts/workspace-contract.md`
> - `.agent/system/contracts/memory-evidence-policy.md`
> - `.agent/system/contracts/llm-wiki-operations.md`
> - `.agent/system/memory/long-term-memory.md`
> - `.agent/system/maps/workspace-atlas.md`

> 이 저장소는 일반 Markdown 폴더가 아니라 **Obsidian vault**다.
> 노트, 링크, MOC, `.base` 파일은 모두 Obsidian 규칙으로 다뤄야 한다.
> 새 markdown note를 만들면 첫 저장 시점에 `tags`, `date`, `up`을 같이 넣는다. root note가 아니면 `up` 생략 금지다.

## 에이전트 시작 프로토콜

**새 세션을 시작할 때 반드시 아래 순서로 읽어라:**

1. **`.agent/system/ops/PLAN.md`** — 지금 무슨 일을 해야 하는지
2. **`.agent/system/ops/PROGRESS.md`** — 어디까지 진행됐는지
3. **이 파일** (`AGENTS.md`) — 공용 시작 규칙
4. **`.agent/system/contracts/workspace-contract.md`** — 정본/문서 책임 범위
5. **`.agent/system/contracts/memory-evidence-policy.md`** — 메모리/증빙 동기화 규칙
6. **`.agent/system/memory/long-term-memory.md`** — 장기 기억 정본
7. **`.agent/system/memory/daily-memory.md`** — 오늘의 단기 기억
8. **`.agent/system/maps/workspace-atlas.md`** — 구조와 갱신 지도
9. **`06_LLM위키/index.md`** — 지속 지식의 주제 인덱스
10. **`06_LLM위키/overview.md`** — 위키 읽기 우선순위
11. **`06_LLM위키/log.md`** — 최근 ingest/query/lint 이력
12. **`.agent/system/contracts/llm-wiki-operations.md`** — wiki-first 검색/갱신 규칙
13. **`.agent/rules/obsidian-conventions.md`** — Obsidian 문서 규칙

**작업 완료 시 반드시:**
- `.agent/system/ops/PROGRESS.md` 업데이트
- 필요 시 `.agent/system/ops/PLAN.md` 업데이트
- `04_증빙/01_핵심로그/ai-session-intake.csv` append
- 필요 시 `04_증빙/01_핵심로그/ai-prompt-intake.csv` append
- 세션 종료 또는 의미 있는 배치 종료 시 `python3 .agent/system/automation/scripts/dispatch-session-intake.py` 실행
- 필요 시 `decision-log.md` 또는 `prompt-catalog.md` 승격 여부 확인
- Evidence Gate가 필요한 경우에만 확인

## LLM Wiki First 원칙

- 프로젝트 맥락이 필요한 질문은 raw source보다 먼저 `06_LLM위키/`를 조회한다.
- `06_LLM위키/`는 `assets/`와 `04_증빙/` 사이의 persistent synthesis layer다.
- 위키에서 충분히 답할 수 있으면 raw source를 다시 읽지 않는다.
- 위키가 비어 있거나 충돌하거나 freshness가 의심될 때만 raw source로 내려간다.
- durable finding은 답변으로만 끝내지 말고 위키에 writeback 한다.
- report-grade material만 `[[master-evidence-ledger]]`로 승격한다.

## Obsidian First 원칙

- 내부 문서는 일반 Markdown이 아니라 Obsidian note로 작성한다.
- 내부 링크는 `[[wikilink]]`, 임베드는 `![[embed]]`를 사용한다.
- 노트를 만들거나 구조를 바꿀 때는 `obsidian-cli` 사용을 우선 검토한다.
- `.base` 파일은 `obsidian-bases` 규칙으로 다룬다.
- Obsidian 관련 작업은 필요 시 글로벌 `obsidian-cli`, `obsidian-markdown`, `obsidian-bases` 스킬과 프로젝트 스킬 `.agent/skills/obsidian-workspace/SKILL.md`를 따른다.
- 새 note 생성 후에는 `bash _system/tools/obsidian/tag-audit.sh` 또는 동등한 점검으로 `tags/up` 누락이 없는지 확인한다.

---

## 프로젝트 목적

2026 제1회 KEG 바이브코딩 콘테스트(4/6~4/13, 7일) 참가. AI 도구를 활용해 교육 현장의 페인포인트를 해결하는 MVP를 기획·구현·배포한다. 500팀 경쟁. 총 상금 600만원.

## 대회 제약

| 항목 | 내용 |
|------|------|
| 마감 | 2026-04-13 24:00 (이후 커밋 = 부정행위 → 탈락) |
| 주제 | AI활용 차세대 교육 솔루션 (단순 LMS 금지) |
| 제출물 | GitHub(public) + 라이브 URL + AI 리포트(양식) + 동의서/각서 |
| 심사 | 기술적 완성도, AI활용 능력/효율성, 기획력/실무접합성, 창의성 |
| 핵심 권장 | AI 기획문서·지침서를 프로젝트 내부에 포함 |

## 현재 우선순위

- 현재 우선순위의 정본은 이 파일이 아니라 `.agent/system/ops/PLAN.md`다.
- 현재 상태의 정본은 `.agent/system/ops/PROGRESS.md`다.
- 제출용 가시 판은 `_system/dashboard/project-dashboard.md`다.
- 이 파일에는 변하지 않는 시작 규칙만 남긴다.

## 디렉토리 맵

```
01_대회정보/  — 대회 개요서, 팀 프로필, 홍보자료
02_전략/      — 전략 루트
  ├─ 00_foundation/        — 대회 이해, 계보, 심사 전략
  ├─ 01_problem-framing/   — 문제 정의 전 기준 문서와 후보 비교
  ├─ 02_prompts/           — Claude, NotebookLM, Paperclip 분석 프롬프트
  ├─ 03_decisions/         — 베팅, 범위, 데모, 리스크, 의사결정
  ├─ paperclip-analysis/   — reference 프로그램 해체 분석
  ├─ research-results/     — 세부 리서치 정본
  ├─ tasks/                — 전략 실행 태스크
  └─ archive/              — 보관 문서와 웹 캡처
03_제품/      — 문제정의, 페르소나, 아키텍처, 데모
  ├─ app/                — 실제 앱 코드 (`ui/`, `server/`, `packages/`)
  └─ tests/              — 제품 테스트
04_증빙/      — AI 사용 로그, 결정 기록, 프롬프트, 데일리 노트
05_제출/      — AI 리포트, 체크리스트, 회고
06_LLM위키/   — 지속 지식 베이스
assets/       — 원본 파일, 스크린샷, 데모 영상
.agent/       — 에이전트 공용 설정과 운영 정본
  ├─ agents/  — 역할별 에이전트 정의
  ├─ rules/   — 공용/도구 규칙
  ├─ skills/  — 프로젝트 전용 스킬
  ├─ adapters/claude/ — Claude 전용 어댑터 자산
  └─ system/  — 공용 운영 정본 (계약, 메모리, 레지스트리, 맵, 로그, ops)
.claude/      — 최소 Claude 어댑터 (`CLAUDE.md`, `commands/`, `settings.json`)
```

## 에이전트 역할

| 역할 | 미션 | 읽는 파일 | 쓰는 파일 |
|------|------|-----------|-----------|
| PM | 우선순위, blocker, 진행 추적 | `PLAN`, `PROGRESS`, `project-dashboard` | `PLAN`, `PROGRESS`, `04_증빙/03_daily` |
| Research | 문제 리서치, 경쟁 분석, LLM 위키 운영 | 01_대회정보, 02_전략, 06_LLM위키 | 02_전략, 06_LLM위키, 04_증빙 |
| Product | 문제 정의, 페르소나, 스펙 | 02_전략 | 03_제품 |
| Builder | 구현, 코드 생성 | 03_제품 | 03_제품/app/, 03_제품/tests/ |
| QA | 테스트, 엣지케이스 | 03_제품/app/, 03_제품/tests/ | 04_증빙/01_핵심로그, 04_증빙/03_daily |
| Judge | 심사위원 시뮬레이션 | 전체 | 04_증빙/02_분석자료 |
| Evidence | AI 리포트 재료 원장 관리 | 대화 로그, `ai-session-intake.csv` | `ai-session-intake.csv`, `ai-prompt-intake.csv`, 필요 시 dispatch 산출물 |
| Submission | 제출물 패키징 | 04_증빙, 03_제품 | 05_제출, README |

## 핸드오프 계약

모든 에이전트 출력은 최소한 아래 6개 블록을 포함한다:

```
[Task] — 수행한 작업
[Assumptions] — 전제한 가정
[Inputs used] — 참조한 자료
[Output] — 산출물
[Open risks] — 미해결 위험
[Next recommended action] — 다음 추천 행동
```

## 제품/앱 상태 읽는 방법

- 제품 기획 정본은 `03_제품/` 아래 note들이 맡는다.
- 실제 앱 구조는 `03_제품/app/` 기준으로 읽는다.
- 앱 실행 여부는 문서 문구를 믿지 말고 직접 확인한다.
  - 예: `curl -I http://localhost:5173/`
  - 예: `lsof -nP -iTCP:5173 -sTCP:LISTEN`
- `README`, `daily-memory`, `project-dashboard`는 실행 상태를 설명할 수 있지만, 최종 진실은 현재 프로세스와 코드 구조다.

## 금지사항

1. **Day 3(04-09) 이후 새 기능 추가 금지** — 안정화와 증빙에 집중
2. **증빙 파일 삭제 금지** — `04_증빙/`의 파일은 append-only
3. **시크릿 커밋 금지** — API Key, 비밀번호 등을 코드에 포함하지 않음
4. **`assets/originals/` 수정 금지** — 원본 보관용
5. **최종 범위 결정, 삭제 결정, 제출 결정은 반드시 사람이 한다**
6. **공용 운영 규칙을 `.claude`에서 먼저 수정 금지**
7. **증빙 가치가 있는 사실을 메모리에만 두고 세션 종료 금지**
8. **프로젝트 맥락 질문에 raw source부터 읽기 금지** — 먼저 `06_LLM위키/` 확인
9. **`master-evidence-ledger.md`를 직접 정본처럼 수동 편집만 하고 끝내기 금지** — intake-first 규칙을 우선한다

## 의사결정 권한

| 결정 | 권한 |
|------|------|
| 아이디어/기능 범위 | 사람만 |
| 기술 스택 선택 | 사람만 |
| 코드 구현 방식 | 에이전트 제안 → 사람 승인 |
| 버그 수정 | 에이전트 자율 |
| 증빙 기록 | 에이전트 자율 |
| 파일 삭제 | 사람만 |
| 제출 | 사람만 |
