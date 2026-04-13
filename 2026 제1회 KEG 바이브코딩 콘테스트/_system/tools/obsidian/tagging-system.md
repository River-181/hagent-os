---
tags:
  - area/system
  - type/guide
  - status/active
  - workflow/review
date: 2026-04-07
up: "[[_system/tools/obsidian/obsidian-cli-and-skills]]"
aliases:
  - tagging-system
  - 옵시디언태깅시스템
  - 태깅시스템
---
# Obsidian Tagging System

이 문서는 이 workspace의 태그 정본이다.

## 1. 태그의 정의

- 태그는 폴더를 대체하는 분류가 아니다.
- 태그는 폴더를 가로질러 재사용되는 횡단 메타데이터다.
- 태그는 문서의 역할, 상태, 워크플로우 연결점만 표현한다.
- 문서의 주제명, 동의어, slug, 검색 편의어는 `aliases`, 제목, 파일명, 링크로 처리한다.

## 1-1. `up`의 정의

- `up`은 이 노트의 즉시 부모 note를 가리키는 구조 메타데이터다.
- 부모는 자식을 설명하는 기준 문서여야 한다.
- 관련 문서 여러 개 중 하나를 임의로 고르는 용도가 아니라, 계층 구조를 명시하는 용도다.
- root note만 `up`이 없어도 된다.

## 2. 허용 namespace

### `area/*`

문서가 속한 운영 영역.

- `area/home`
- `area/contest`
- `area/strategy`
- `area/product`
- `area/evidence`
- `area/submission`
- `area/wiki`
- `area/system`
- `area/moc`

### `type/*`

문서의 역할.

- `type/moc`
- `type/dashboard`
- `type/guide`
- `type/log`
- `type/report`
- `type/checklist`
- `type/research`
- `type/task`
- `type/reference`
- `type/template`

### `status/*`

문서의 장기 상태.

- `status/active`
- `status/archive`
- `status/draft`

주의:
- 태스크 진행 상태는 태그로 중복 표현하지 않는다.
- 태스크는 frontmatter `status: todo|in-progress|blocked|done`를 사용한다.

### `workflow/*`

자동화 또는 운영 연결점.

- `workflow/daily`
- `workflow/demo-critical`
- `workflow/review`
- `workflow/evidence-source`

## 3. 금지 규칙

- 평면 태그 금지: `#전략`, `#증빙`, `#dashboard`, `#tools`
- 별칭성 태그 금지: `#AI리포트원장`, `#워크스페이스감사보고서`
- 폴더명 반복 태그 금지
- 한글/영문 동의어를 태그로 중복 등록하는 방식 금지
- 주제 키워드를 계속 태그에 누적하는 방식 금지

## 4. 폴더별 기본 규칙

- `00 HOME.md`: `area/home + type/reference`
- `_MOC/`: `area/moc + type/moc`
- `01_대회정보/`: `area/contest`
- `02_전략/`: `area/strategy`
- `03_제품/`: `area/product`
- `04_증빙/`: `area/evidence`
- `05_제출/`: `area/submission`
- `06_LLM위키/`: `area/wiki`
- `_system/`, `.agent/system/`: `area/system`

모든 운영 문서는 기본적으로 `status/active`를 포함한다.

## 4-1. 기본 `up` 규칙

- `_MOC/_MOC_HOME.md` → `[[00 HOME]]`
- 섹션 MOC → `[[_MOC_HOME]]`
- `01_대회정보/*` → `[[_01_대회정보_MOC]]`
- `02_전략/*` → `[[_02_전략_MOC]]`
- `03_제품/*` → `[[_03_제품_MOC]]`
- `04_증빙/*` → `[[_04_증빙_MOC]]`
- `05_제출/*` → `[[_05_제출_MOC]]`
- `06_LLM위키/*` → `[[_06_LLM위키_MOC]]`
- `_system/tools/*`, `_system/team-setup/*` → `[[_system_tools_MOC]]`
- `_system/dashboard/project-dashboard.md` → `[[00 HOME]]`
- `.agent/system/README.md` → `[[.agent/AGENTS]]`
- `.agent/system/ops/*` → `[[.agent/system/ops/README]]`
- `.agent/system/memory/*` → `[[.agent/system/memory/MEMORY]]`
- `.agent/system/contracts/tools/*` → `[[.agent/system/contracts/workspace-contract]]`

## 5. 태스크 규칙

태스크 note는 최소 아래 태그를 사용한다.

```yaml
tags:
  - area/product
  - type/task
  - status/active
up: "[[Parent Note]]"
```

데모 필수 태스크만 선택적으로 아래 태그를 추가한다.

```yaml
  - workflow/demo-critical
```

태스크 상태는 태그가 아니라 frontmatter로 관리한다.

```yaml
status: todo
priority: P0
track: 개발
owner: AI
day: 1
due: 2026-04-07
demo_critical: true
```

태스크의 `up`은 관련 MOC나 운영 부모 note를 가리킨다.
- 제품 구현 태스크: `[[_03_제품_MOC]]`
- 제출 태스크: `[[_05_제출_MOC]]`
- 증빙 태스크: `[[_04_증빙_MOC]]`

## 6. `.agent` 처리 원칙

- `.agent`도 같은 namespace 철학을 따른다.
- 단, Obsidian이 숨김 폴더 `.agent`를 인덱싱하지 않을 수 있으므로, Obsidian 태그 탐색용이 아니라 저장소 내부 규칙 일관성 유지용으로 본다.
- `.agent` 감사는 `obsidian`보다 `rg` 기반 검사에 의존한다.

## 7. CLI 감사 루틴

### 빠른 점검

```bash
obsidian tags counts sort=count
obsidian search query='tag:type/task' limit=20
obsidian base:query path='_system/dashboard/project-dashboard.base' format=md
rg -n '^up:' --glob '*.md' .agent _system _MOC 01_대회정보 02_전략 03_제품 04_증빙 05_제출
```

### 비표준 태그 탐지

```bash
rg --pcre2 -n '^  - (?!area/|type/|status/|workflow/)' --glob '*.md' .agent _system _MOC 01_대회정보 02_전략 03_제품 04_증빙 05_제출
```

### inline 태그 탐지

```bash
rg --pcre2 -n '(?<!`)(#[^ ]+)' --glob '*.md' .agent _system _MOC 01_대회정보 02_전략 03_제품 04_증빙 05_제출
```

### task 누락 탐지

```bash
rg -L 'type/task' --glob '*.md' . | grep '/tasks/' || true
```

통합 점검은 `bash _system/tools/obsidian/tag-audit.sh`를 사용한다.

## 8. 신규 문서 생성 규칙

- 일반 note는 `templates/standard-note-template.md` 기준
- 태스크 note는 `templates/task-note-template.md` 기준
- 생성 직후 `up`이 올바른 부모를 가리키는지 확인한다
- 생성 직후 `obsidian read` 또는 `obsidian tags file=...`로 태그를 확인한다

## 9. 유지보수 루틴

월 1회:
- 태그 카운트 확인
- 비표준 태그 확인
- 대시보드 task 필터 점검

분기 1회:
- namespace 추가 필요성 재평가
- 사용하지 않는 workflow 태그 제거
- 템플릿과 실제 사용 패턴 차이 점검

원칙:
- 새 태그를 만들기 전에 기존 `area/type/status/workflow` 안에서 해결 가능한지 먼저 검토한다.
- 새 평면 태그는 만들지 않는다.
