---
tags:
  - area/evidence
  - type/report
  - status/active
  - workflow/audit
date: 2026-04-06
up: "[[_04_증빙_MOC]]"
aliases:
  - AI네이티브워크스페이스감사보고서
  - 워크스페이스감사보고서
---
# AI Native 워크스페이스 감사 보고서

> 평가자: Codex
> 평가 시점: 2026-04-06
> 평가 범위: `vibe_contest_master_playbook_v0_1.md`와 현재 워크스페이스 전체
> 평가 목적: 이 공간이 사람 2명 + 다중 AI 에이전트가 대회 시작 전부터 제출/회고까지 ==유기적으로 운영 가능한지==를 점검하고, 제한점과 개선 우선순위를 도출한다.
> 수정 반영: 사용자 후속 지시에 따라 `제품 구현 이전의 운영 공간 구축`을 우선 목표로 재해석하고, `.agent`를 공용 정본 공간으로 강화하는 방향을 반영했다.

## 1. 결론 요약

> [!summary]
> 현재 워크스페이스는 ==문서 중심 AI 협업 공간==으로는 잘 설계되어 있다.  
> 그러나 아직 ==에이전트 네이티브 운영체계==로 완전히 닫힌 상태는 아니다.
> 가장 큰 문제는 `문서가 많음`이 아니라, `문서·로그·메모리·설정이 하나의 자동화된 운영 루프로 완전히 연결되지 않았음`이다.
> 다만 사용자 의도 기준으로 보면, 지금 가장 중요한 것은 `제품 공간 완성`이 아니라 `운영 시스템의 정본 위치와 미러링 규칙 확정`이다.

### 종합 등급

| 항목 | 평가 | 판단 |
|---|---|---|
| 정보 구조 | A- | Obsidian 관점의 탑다운 구조는 좋다 |
| 온보딩/가이드 | B+ | 진입 문서는 충분하지만 일부 중복된다 |
| 에이전트 네이티브 적합성 | B- | 규칙은 있으나 실행 하네스는 약하다 |
| 재현성/포터블성 | C+ | 의도는 좋지만 Claude 중심 의존이 남아 있다 |
| 자동화/계측 | C | Claude는 일부 자동화, 다중 AI 통합 통계는 아직 수동이다 |
| 제품 실행 준비도 | D+ | `app/`, `tests/`는 사실상 비어 있다 |
| 운영 시스템 정본성 | C | `.agent`, `.claude`, `.context`의 정본/미러 관계가 아직 불명확하다 |
| 전체 준비도 | B- | 전략/문서 강점이 크지만 운영 시스템 정본성이 아직 약하다 |

## 2. 현재 구조의 강점

### 2-1. 탑다운 탐색 구조가 명확하다

- [[00 HOME]]에서 `01_대회정보 → 05_제출`로 흐르는 구조는 사람과 에이전트 모두에게 직관적이다.
- [[바이브코딩공모전_개요]]는 실제로 대회 맥락을 빠르게 파악하는 단일 브리프로 기능한다.
- [[01-vibe-contest-master-playbook-v0-1]]는 아직 rough 단계지만, 전략/운영/제출을 하나의 서사로 묶는 기준 문서 역할을 한다.

### 2-2. 에이전트 진입점이 분리되어 있다

- `.agent/AGENTS.md`는 공용 진입점, `.claude/CLAUDE.md`는 Claude 전용 진입점으로 역할이 나뉘어 있다.
- `PLAN.md`, `PROGRESS.md`를 둔 것은 다중 에이전트 충돌을 줄이는 데 유효하다.
- `.context/`를 통해 메모리/MCP/플러그인/온보딩을 프로젝트 안에 보존한 방향은 맞다.

### 2-3. 증빙 의식이 강하다

- `04_증빙/`에 AI 사용 기록, 세션 기록, 도구 기록, 의사결정 기록, 통계 문서가 이미 존재한다.
- [[ai-usage-stats]]처럼 수치 증빙을 문서화하려는 시도는 대회 심사 맥락과 잘 맞는다.
- `assets/originals/`를 원본 보존 공간으로 분리한 점은 감사 추적에 유리하다.

## 3. 핵심 제한점

## 3-0. 목표 재정의가 문서 전반에 아직 반영되지 않았다

- 현재 여러 문서는 암묵적으로 `운영 공간 구축`과 `제품 실행 준비`를 같은 레벨에서 다룬다.
- 그러나 사용자 의도는 명확하다. 지금의 최우선은 ==대회를 위한 운영 공간==이며, 제품은 그 다음 단계다.
- 따라서 평가 기준도 `앱이 비어 있다`보다 `운영 체계가 정본/미러/기록/메모리 관점에서 닫혀 있는가`가 더 중요하다.

### 판단

이 워크스페이스는 지금 ==제품 repo==가 아니라 ==운영 시스템 repo==로 먼저 정의되어야 한다.

## 3-1. 단일 진실 소스가 아직 완전히 확정되지 않았다

- `PLAN.md`, `PROGRESS.md`, `.agent/AGENTS.md`, `.claude/CLAUDE.md`, `.context/onboarding.md`가 모두 “무엇을 먼저 읽고 무엇을 업데이트해야 하는지”를 설명한다.
- 방향은 유사하지만, 시간이 지나면 드리프트가 생길 가능성이 높다.
- `prompt-catalog.md`는 비어 있는데, 엑셀 트래커와 `ai-usage-log.md`, `session-log.md`에는 이미 프롬프트/세션 정보가 흩어져 있다.

### 판단

현재는 `문서가 부족한 상태`가 아니라, ==동일한 사실을 여러 문서가 부분 중복해서 들고 있는 상태==다.

## 3-2. “독립적 공간”이지만 실제로는 Claude 중심이다

- `.claude/setup.sh`는 Claude CLI 플러그인 설치를 전제로 한다.
- `.claude/settings.json`, `.claude/agents/`, `.claude/rules/`는 잘 정리돼 있지만, Codex/ChatGPT/Perplexity 쪽은 운영 계약 문서가 상대적으로 약하다.
- `.agent/`는 공용 진입점으로 존재하지만, 실제 실행 가능 수준의 공용 하네스는 아직 부족하다.

### 판단

현재 구조는 “에이전트 중립”을 지향하지만, 실제 운영력은 ==Claude Code 편향==이다.  
사용자 요구를 반영하면, 앞으로는 `.agent`가 정본이고 `.claude`는 ==미러 + 어댑터==로 보는 해석이 더 적합하다.

## 3-2-1. `.context`의 위치가 개념적으로 붕 떠 있다

- `.context/`는 공유 맥락을 담고 있지만, 정작 공용 운영 진입점은 `.agent/AGENTS.md`다.
- 즉, “에이전트가 읽는 공용 규칙”과 “에이전트가 참조하는 공용 맥락”이 서로 다른 최상위 디렉토리에 흩어져 있다.
- 이는 사용자 말대로 인지 부조화를 만든다. 새 에이전트 입장에서 `.agent`가 정본인지 `.context`가 정본인지 직관적이지 않다.

### 판단

공용 시스템 정보는 `.agent` 아래에 모이는 것이 맞다. `.context`는 장기적으로 `.agent/system/` 아래로 흡수되거나, 최소한 `.agent/system`의 미러로 재정의되어야 한다.

## 3-3. 자동화 파이프라인이 닫혀 있지 않다

- `collect-usage-stats.py`는 Claude JSONL만 읽는다.
- ChatGPT, Codex, Perplexity 사용량은 문서에 수동 추정치로 적혀 있다.
- 즉, 통계는 존재하지만 “다중 AI 통합 계측”은 아직 자동화되지 않았다.
- `ai-usage-log.md`, `session-log.md`, `tool-log.md`, `prompt-catalog.md` 사이에 자동 링크 생성 규칙도 없다.

### 판단

현재 증빙은 ==잘 설계된 수동 체계==이지, 아직 ==반자동 운영체계==는 아니다.

## 3-4. 시스템 운영 공간이 아직 분리되지 않았다

- 지금은 운영 규칙, 메모리, 플러그인, MCP, 통계, 로그가 여러 위치에 나뉘어 있다.
- 그러나 사용자 의도상 이들은 전부 “시스템 운영”이라는 하나의 레이어에 속한다.
- `시스템 기능 변경`, `구조 변경`, `미러링 정책`, `메모리 스냅샷`, `도구 등록`, `통계 자동화`는 별도 운영 레이어에서 관리되는 편이 맞다.

### 판단

`.agent` 아래에 ==system 운영 공간==이 필요하다.  
문서가 늘어날수록 규칙 문서를 계속 수정하는 방식보다, 시스템 레이어에서 맵과 계약을 자동 갱신하는 구조가 더 낫다.

## 3-5. 제품 실행 하네스가 약하다

- `app/README.md`는 아직 `TBD`다.
- `tests/`는 비어 있다.
- 기술 스택 미확정은 괜찮지만, 최소한 `app` 초기화 조건, 스택 결정 체크리스트, 첫 배포 기준선은 있어야 한다.
- 지금 상태로는 전략/증빙은 빠르게 늘어나고, 실제 제품은 늦어질 위험이 크다.

### 판단

가장 큰 실전 리스크는 ==운영 문서는 계속 좋아지는데 제품이 늦는 패턴==이다.  
다만 현재 우선순위는 제품 구현보다 운영 시스템 정비이므로, `제품 하네스`는 P1 이하로 두고 `운영 시스템 정본화`를 먼저 끝내는 편이 맞다.

## 3-6. 메모리와 사실 정합성 유지 장치가 약하다

- `team_profiles.md`는 사용자 프롬프트의 팀 설명과 일부 서술이 엇갈린다.
- `00 HOME.md`, `PLAN.md`, `PROGRESS.md`의 현재 단계 설명도 시점에 따라 어긋날 여지가 있다.
- 메모리 파일은 존재하지만, 어떤 정보가 authoritative한지 명시되지 않았다.

### 판단

사용자가 말한 “AI의 두뇌는 믿지만 기억력은 믿지 않는다”는 문제의식에 비해, ==기억력 보정 장치==는 아직 약하다.

## 4. 제한해야 할 사항

> [!warning]
> 아래 항목은 “하면 안 되는 것”에 가깝다. 지금 단계에서 가장 먼저 통제해야 한다.

1. 같은 사실을 여러 문서에 수동으로 반복 기입하는 방식
2. 새 로그 파일을 만들고도 입력 규칙이나 집계 경로를 정하지 않는 방식
3. 특정 AI 도구 전용 규칙을 공용 규칙보다 먼저 두는 방식
4. 글로벌 플러그인 설치를 “포터블”이라고 간주하는 표현
5. 제품 실행 전까지 전략/평가 문서만 계속 늘리는 방식
6. 팀 정보, 대회 규칙, 도구 목록처럼 자주 참조되는 사실을 수정 권한 없이 여러 문서에서 동시 관리하는 방식
7. `.agent`와 `.claude`와 `.context`에 서로 다른 버전의 규칙이 자라나는 방식
8. 폴더가 늘어날 때마다 수동으로 MOC/색인/운영 문서를 뒤늦게 고치는 방식

## 5. 개선 우선순위

## P0. `.agent`를 공용 정본으로 재정의

사용자 선호를 반영하면, 앞으로의 원칙은 아래처럼 잡는 편이 가장 명확하다.

- `.agent/` = 공용 정본
- `.claude/` = Claude 전용 미러/어댑터
- `.context/` = 단계적으로 `.agent/system/`로 흡수 또는 미러 처리

### 권장 구조

```text
.agent/
├── AGENTS.md
├── rules/
├── system/
│   ├── README.md
│   ├── contracts/
│   ├── memory/
│   ├── registry/
│   ├── maps/
│   ├── logs/
│   ├── automation/
│   └── changelog.md
```

### 각 폴더의 역할

- `contracts/`: 문서 책임 범위, 정본/미러 규칙, 도구 운영 계약
- `memory/`: 프로젝트 기억, reference facts, 팀 정보, 핵심 전제
- `registry/`: MCP, skills, plugins, tools, external services 등록부
- `maps/`: 디렉토리 맵, MOC 갱신 규칙, 자동 생성 색인
- `logs/`: 시스템 변경 이력, 미러링 이력, 감사 로그
- `automation/`: 맵 갱신, 통계 생성, 로그 보조 스크립트 명세

## P0. `.context`를 별도 철학으로 두지 말고 시스템 레이어로 흡수

기존 보고서에서는 `.context/workspace-contract.md`를 제안했지만, 사용자 선호를 반영하면 위치는 아래가 더 낫다.

- 제안 파일: `.agent/system/contracts/workspace-contract.md`
- 제안 파일: `.agent/system/memory/reference-facts.md`
- 제안 파일: `.agent/system/registry/mcp-registry.md`
- 제안 파일: `.agent/system/registry/skills-registry.md`
- 제안 파일: `.agent/system/registry/plugins-registry.md`

### 원칙

- `.context/`는 당장 지우지 않는다
- 먼저 `.agent/system/`를 만든다
- 이후 `.context/*`는 `.agent/system/*`의 미러 또는 리다이렉션 문서로 바꾼다

## P0. 운영 계약을 하나로 정리

새 문서를 하나 두는 것이 좋다.

- 제안 파일: `.agent/system/contracts/workspace-contract.md`
- 역할: 이 공간의 유일한 운영 계약 문서
- 포함 내용:
  - 단일 진실 소스 표
  - 각 문서의 책임 범위
  - 어떤 로그는 append-only인지
  - 어떤 문서는 generated인지
  - 어떤 문서는 사람이 승인해야 바뀌는지
  - `.agent → .claude` 미러링 규칙
  - `.agent/system`과 Obsidian MOC의 연결 규칙

### 권장 규칙

- `PLAN.md`: 앞으로 할 일만
- `PROGRESS.md`: 현재 상태만
- `AGENTS.md`: 공용 규칙만
- `CLAUDE.md`: Claude 전용 실행 규칙만, 공용 규칙의 미러
- `prompt-catalog.md`: 재사용 프롬프트만
- `ai-usage-log.md`: 이벤트 원장만

## P0. 로그 체계를 다시 나눠라

현재는 로그 종류는 많지만 경계가 조금 흐리다. 아래처럼 책임을 고정하는 것이 좋다.

| 파일 | 역할 |
|---|---|
| `ai-usage-log.md` | AI 사용 이벤트 원장 |
| `session-log.md` | 세션 단위 목표/결과 |
| `tool-log.md` | 도구 레지스트리 |
| `prompt-catalog.md` | 재사용 가치가 검증된 프롬프트만 |
| `decision-log.md` | 사람 승인 결정만 |
| `ai-usage-stats.md` | 자동 생성 통계 보고서 |

### 핵심

`prompt-catalog.md`는 지금 빈 파일이므로, “모든 프롬프트 저장소”가 아니라 ==검증된 재사용 프롬프트 카탈로그==로 역할을 축소하는 편이 맞다.

## P0. 2~3레벨 구조를 미리 깔아라

사용자 말대로 문서는 계속 늘어난다. 그때마다 규칙 문서를 따라가며 수정하면 늦다.
따라서 초기에 2~3레벨까지는 미리 만들어 두는 편이 맞다.

### 권장 대상

- `.agent/system/contracts/`
- `.agent/system/memory/`
- `.agent/system/registry/`
- `.agent/system/maps/`
- `.agent/system/logs/`
- `.agent/system/automation/`

### 이유

- 새 문서가 생겨도 분류 위치가 이미 정해져 있다
- 에이전트가 “어디에 써야 할지” 묻지 않는다
- 나중에 맵 자동 갱신 규칙을 붙이기 쉽다

## P1. 도구별 운영 계약을 추가

현재 `tool-log.md`는 도구 목록이다. 여기에 더해 도구별 계약 문서가 필요하다.

- 제안 위치: `.agent/system/contracts/tools/`
- 예시 파일:
  - `chatgpt-web.md`
  - `perplexity.md`
  - `codex.md`
  - `claude-code.md`

### 각 계약 문서에 들어갈 내용

- 어떤 역할에 쓰는가
- 어떤 산출물을 기대하는가
- 어떤 로그를 남겨야 하는가
- 어떤 경우 사용하지 않는가
- 토큰/비용 절감 규칙
- 사람이 검토해야 하는 기준

## P1. Obsidian 맵 자동 갱신을 운영 레이어에 포함시켜라

사용자 요구에서 중요한 것은 “문서가 늘어날 때 MOC와 맵이 계속 업데이트되어야 한다”는 점이다.

### 추천 방향

- `.agent/system/maps/directory-map.md` — 전체 디렉토리 맵 정본
- `.agent/system/maps/moc-registry.md` — 어떤 폴더에 어떤 MOC가 대응되는지
- `.agent/system/automation/map-refresh-spec.md` — 자동 갱신 규칙
- `.agent/system/automation/map-refresh.py` 또는 `scripts/refresh-maps.sh` — 나중에 구현

### 자동 갱신 대상

1. 루트 `00 HOME.md`
2. 각 섹션 `_MOC.md`
3. 시스템 레이어 문서 색인
4. 도구/스킬/MCP 등록 문서

## P1. 자동화 범위를 명확히 줄이고 늘려라

줄여야 할 것:

- 모든 것을 자동화하려는 욕심

늘려야 할 것:

- 로그 입력 템플릿 자동 생성
- Claude 외 AI 사용량의 최소 수기 입력 양식 통일
- 산출물과 로그의 ID 연결

### 추천 자동화

1. `scripts/new-session.sh`
2. `scripts/log-prompt.sh`
3. `scripts/link-artifact.sh`
4. `scripts/generate-stats-report.py`
5. `scripts/refresh-maps.sh`

이 정도면 충분하다. 지금 단계에서 MCP까지 엮은 풀오토는 과하다.

## P1. 미러링 정책을 문서화

사용자 방향에 맞는 핵심은 `.agent` 정본, `.claude` 미러다.

### 권장 규칙

- 공용 규칙은 `.agent`에서 먼저 수정
- `.claude`는 Claude 전용 추가 규칙만 가진다
- 공용 내용이 필요하면 `.agent`를 참조하거나 미러링한다
- 미러 파일 상단에는 반드시 정본 경로를 적는다

### 제안 문서

- `.agent/system/contracts/mirroring-policy.md`
- `.agent/system/logs/mirroring-change-log.md`

## P2. 제품 실행 게이트를 문서화

다음 3개가 필요하다.

1. `03_제품/stack-decision-checklist.md`
2. `03_제품/mvp-entry-criteria.md`
3. `app/README.md` 초기화

### 최소 기준

- 기술 스택 결정 전까지는 `app/`에 아무것도 만들지 않는다
- 기술 스택이 결정되면 같은 턴에 `README`, `setup`, `run`, `deploy` 초안을 만든다
- Day 2 종료 전 첫 실행/첫 배포 경로가 보여야 한다

## P2. 기억력 보정 장치를 강화

가장 실용적인 방법은 “메모리를 늘리는 것”이 아니라 “자주 틀리는 사실을 한 군데로 고정하는 것”이다.

- 제안 파일: `.agent/system/memory/reference-facts.md`
- 포함 내용:
  - 팀원 역할
  - 대회 핵심 규칙
  - 현재 공식 제출물
  - 현재 도구 분업
  - 현재 authoritative 파일 목록

이 파일을 `AGENTS.md`, `CLAUDE.md`, `onboarding.md`, `PLAN.md`에서 공통 참조하면 된다.

## 6. 지금 당장 수정해야 할 5개

1. `.agent/system/` 골격을 먼저 만들 것
2. `.agent/system/contracts/workspace-contract.md`를 작성할 것
3. `.context/` 문서들을 `.agent/system/` 기준으로 재배치 또는 미러링 계획을 세울 것
4. `tool-log.md`를 기준으로 ChatGPT/Codex/Perplexity/Claude Code 운영 계약을 별도 문서로 분리할 것
5. `team_profiles.md`와 메모리 파일의 팀 설명 정합성을 점검할 것

## 6-1. 권장 설계 결정

현재 고민은 둘 중 하나다.

1. `.agent` 안에 시스템 운영 공간을 만든다
2. 최상위에 별도 `system/` 폴더를 만든다

이 보고서의 권고는 ==1번==이다.

### 이유

- 공용 에이전트 진입점과 운영 시스템이 같은 계층에 모인다
- “AI가 읽어야 할 것”이 한 군데 모인다
- `.claude`를 명확한 미러/어댑터 레이어로 둘 수 있다
- `.context`를 자연스럽게 흡수할 수 있다
- 사용자가 말한 “인지 부조화 방지” 목적과 가장 잘 맞는다

## 7. 최종 평가

> [!success]
> 이 공간은 ==좋은 문서형 AI 협업 워크스페이스==다.

> [!warning]
> 아직 ==강한 운영체계형 AI-native workspace==는 아니다.

현재 상태를 한 문장으로 요약하면 이렇다.

> “설계는 충분히 좋다. 그러나 설계가 아직 실행 하네스와 자동화 계약으로 완전히 닫히지 않았다.”

즉, 지금 필요한 것은 새 문서를 더 만드는 것이 아니라 다음 세 가지다.

1. `.agent` 정본화
2. 시스템 레이어 분리
3. 미러링/맵 갱신 계약 명문화

이 세 가지가 정리되면, 그때부터는 이 공간이 사람 2명 + 다중 AI가 ==반복 가능하게 굴러가는 작업 시스템==으로 바뀐다.

## 8. 관련 문서

- [[01-vibe-contest-master-playbook-v0-1]]
- [[workspace-structuring-plan]]
- [[codex-workspace-evaluation]]
- [[ai-usage-log]]
- [[session-log]]
- [[tool-log]]
- [[decision-log]]
