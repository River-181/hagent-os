# Candidate Signals

## High-signal folders

- `02_전략/`: 문제 정의, 비교, playbook, scorecard, research synthesis
- `03_제품/`: persona, architecture, workflow, demo script, UX logic
- `05_제출/`: 심사 대응 문법, checklist, report draft
- `01_대회정보/`: 규칙, 제약, 평가 기준
- `04_증빙/02_분석자료/`: 재사용 가능한 분석 결과

## Lower-signal folders

- `04_증빙/03_daily/`: 일일 로그 성격이 강함
- `.agent/`: 운영 정본이지만 LLM wiki 대상은 아님
- `06_LLM위키/`: 이미 승격된 결과물

## Recommended Type Hints

- `problem`, `pain`, `issue`, `complaint` -> `problem`
- `compare`, `vs`, `difference` -> `comparison`
- `playbook`, `principle`, `guide`, `framework`, `map` -> `concept`
- `scorecard`, `selection`, `positioning`, `why`, `hypothesis` -> `thesis`
- `institution`, `academy`, `group`, `committee` -> `entity`
- raw research bundles and imported external docs -> `source`

## Promotion Heuristics

- 같은 질문에 다시 답하게 만들면 승격 대상이다.
- source trace 두 개 이상을 붙일 수 있으면 좋은 대상이다.
- 2분 데모나 제출 문장으로 바로 재사용되면 우선순위가 높다.
- note 하나로 끝내기보다 기존 wiki 축을 보강할 수 있으면 더 좋다.
