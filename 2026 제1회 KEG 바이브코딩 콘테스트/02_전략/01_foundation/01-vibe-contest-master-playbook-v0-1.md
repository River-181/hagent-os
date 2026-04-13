---
tags:
  - area/strategy
  - type/guide
  - status/active
date: 2026-04-06
up: "[[_02_전략_MOC]]"
aliases:
  - 마스터플레이북
  - 플레이북
---
# KEG 바이브코딩 콘테스트 마스터 플레이북 v0.1

버전: rough blueprint
용도: 대회 준비부터 제출, 회고, 재활용까지를 **하나의 운영 문서**로 묶은 초안
권장 저장 위치: GitHub 리포지토리 루트의 `docs/00_competition/` 또는 루트 `PLAYBOOK.md`

---

## 이 문서의 성격

이 문서는 “지금 당장 모든 걸 완벽히 조사한 최종판”이 아니라, **상금을 목표로 한 팀 운영체계의 큰 그림**을 먼저 잡기 위한 설계 문서다. 따라서 아래 내용을 구분해서 읽는다.

- **확정 사실**: 공식 포스터/홍보 자료/공식 문서로 확인된 내용
- **전략 가설**: 유사 대회, 제품 개발 방법론, AI 운영 문서에서 끌어온 실전 가설
- **추가 조사 필요**: 주제 공개 후 또는 운영을 시작하며 검증해야 할 항목

핵심 원칙은 하나다.

> 이 대회는 “AI를 많이 쓴 팀”보다 **AI를 활용해 짧은 시간 안에 문제정의–구현–배포–증빙–설명**까지 끝낸 팀이 유리하다.

---

## 0. 먼저 합의할 대회 해석

### 0-1. 이 대회는 무엇을 겨루는가

현재 확보한 공식/홍보 자료를 종합하면, 이번 대회는 **AI 도구를 활용해 실제 서비스 MVP를 기획·구현·배포·증빙하는 실무형 콘테스트**로 보는 것이 타당하다. 2026년 **제1회 KEG 바이브코딩 콘테스트**이며, 코리아IT아카데미는 2023년 `KIT 해커톤 공모전`, 2024년 `KIT 코지컬:100 코딩대회`, 2025년 `KIT 코딩챌린지 코딩대회`를 운영해 왔고, 올해는 AI 기반 개발 역량을 중심축으로 전환했다. [S01][S02][S03]

### 0-2. 심사에서 실제로 중요해 보이는 것

공식 자료에 나온 심사 기준은 기술적 완성도, AI 활용 능력, 실무 적합성, 창의성 및 확장성이다. 제출물은 GitHub 저장소, 배포 URL, AI 활용 리포트, 참가 동의서다. 이는 곧 심사위원이 보는 대상이 **아이디어 설명문만이 아니라 작동하는 결과물 + 개발 흔적 + AI 사용 방식**이라는 뜻이다. [S01][S02][S03]

### 0-3. 지금 당장 주의할 점

홍보 기사에서는 공모 주제를 `차세대 교육 서비스 솔루션`으로 소개하지만, 포스터에는 `04.06 공개 예정`으로 적혀 있다. 따라서 **최종 과제 범위와 세부 문제 정의는 공식 공개본 기준으로 다시 확정**해야 한다. 지금 단계에서는 교육 현장·행정·수강생 경험·비즈니스 모델 문제를 중심으로 “문제 은행”만 준비하는 편이 안전하다. [S01][S02][S03]

### 0-4. 이 단계의 결과물

1. `contest-brief.md` — 대회 사실 요약 1장
2. `judging-hypothesis.md` — 우리 팀의 심사 가설 1장
3. `risk-register.md` — 일정/배포/도메인/증빙 리스크 초안
4. `theme-watchlist.md` — 주제 공개 시 확인할 질문 목록

### 0-5. 이 단계에 바로 쓸 프롬프트

```text
너는 공모전 전략 분석가다.
아래 공식 자료를 기반으로, 다음 4가지를 분리해서 정리하라.
1) 확인된 사실
2) 해석이 필요한 문장
3) 심사위원이 실제로 볼 증거물
4) 우리 팀이 지금 준비할 수 있는 것

출력 형식:
- 확정 사실 10개
- 전략 가설 5개
- 모순/불확실성 5개
- 당장 해야 할 준비 10개
```

### 0-6. 추가 조사 필요

- 공식 홈페이지의 세부 FAQ, 제출 형식, 배포 가능 범위
- 발표/시연 여부, 영상 제출 여부, 현장 심사 여부
- 주제 공개 직후 제공되는 세부 브리프 존재 여부

---

## 1. 문제 은행 구축: 주제 공개 전 준비할 것은 아이디어가 아니라 “문제 지도”다

### 왜 필요한가

Y Combinator는 초기에 가장 중요한 일로 “무언가 사람들이 원하는 것을 만들고, 코드를 쓰고, 사용자와 이야기하고, 그 피드백을 바탕으로 반복하라”고 조언한다. Lean Startup도 Build-Measure-Learn과 MVP를 통해 **먼저 학습해야 한다**고 본다. 이번 대회에서도 넓은 플랫폼보다 **현장의 반복적 문제 하나를 날카롭게 해결하는 MVP**가 더 강할 가능성이 높다. [S04][S05][S06]

### 우리가 세울 원칙

- 아이디어 30개보다 **검증 가능한 문제 10개**가 낫다.
- “교육”을 넓게 보지 말고 **사용자군 + 업무 상황 + 실패 비용**으로 잘라 본다.
- AI를 써야 하는 이유가 약하면 후보에서 뺀다.
- 주제 공개 후 6시간 안에 결정을 끝내기 위해, 지금은 **문제 후보와 평가 기준**을 준비한다.

### 추천 산출물

1. `problem-bank.md`
   - 사용자군: 상담사 / 운영자 / 강사 / 수강생 / 학부모 / 관리자
   - 상황: 상담, 문의 응대, 학습 코칭, 일정 운영, 출결, 과제 피드백, 추천, 리포팅
   - 문제 문장: “누가 / 언제 / 무엇 때문에 / 어떤 손실을 본다”

2. `problem-scorecard.md`
   아래 5개 항목을 5점 척도로 평가
   - 현장성
   - AI 적합성
   - 7일 내 구현 가능성
   - 데모 전달력
   - 비즈니스 확장성

3. `user-scenarios.md`
   - 가장 고통이 큰 3개 사용 시나리오

### 가져올 방법론

- **YC / Jessica Livingston**: “사람들이 원하는 것을 만들어라” — 문제의 진짜 수요가 가장 중요하다. [S04][S05]
- **Eric Ries / Lean Startup**: MVP는 저품질 변명이 아니라, 가설을 검증하기 위한 실험이다. [S06][S07]
- **Jake Knapp / Design Sprint**: 큰 문제를 빠르게 좁혀 프로토타입과 테스트로 이동한다. [S08][S09]

### 이 단계 프롬프트

```text
너는 에듀테크 제품 리서처다.
목표는 “7일 안에 MVP로 만들 수 있는 교육 서비스 문제”를 발굴하는 것이다.
다음 기준으로 후보 15개를 제안하라.
- 실제 교육 현장에서 반복적으로 발생
- 7일 안에 웹/앱 MVP 가능
- AI 사용 이유가 명확함
- 데모 장면을 2분 안에 보여줄 수 있음
- 수강생 경험, 운영 행정, 강사 업무, 교육 비즈니스 중 하나에 속함

출력 형식:
문제명 / 사용자 / 현재 불편 / AI가 필요한 이유 / MVP 핵심 기능 / 데모 장면 / 위험요인
```

```text
아래 문제 후보 10개를 심사위원 관점으로 평가하라.
평가 항목은 기술 완성도, 실무 적합성, AI 활용 설명 가능성, 창의성/확장성이다.
출력은 상위 3개만 남기고, 각각 “왜 지금 버려야 하는가”와 “왜 지금 남겨야 하는가”를 함께 써라.
```

### 추가 조사 필요

- 실제 교육기관 운영자/강사 인터뷰 또는 관찰 메모
- 유사 서비스 경쟁 구도
- 데이터가 필요한 기능의 경우, 공개/가상 데이터로 충분한지 여부

---

## 2. 주제 공개 직후: 6~12시간 의사결정 스프린트

### 왜 필요한가

대회에서 흔히 지는 팀은 주제 공개 후 이틀을 아이디어 회의에 쓴다. Design Sprint는 문제를 맵핑하고, 해결책을 넓게 본 뒤, 빠르게 하나를 결정해 프로토타입/테스트로 가는 구조를 제안한다. Shape Up은 애매한 작업을 줄이기 위해 먼저 **boundaries(경계)** 와 **appetite(얼마나 큰 범위까지 할지)** 를 정하라고 말한다. [S08][S09][S10][S11]

### 운영 방식

주제 공개 후 첫 반나절의 목표는 “무엇을 만들지”가 아니라 아래 4개를 확정하는 것이다.

1. **누가 가장 중요한 사용자냐**
2. **우리가 해결할 단 하나의 핵심 순간이 뭐냐**
3. **심사 당일 반드시 보여줄 장면이 뭐냐**
4. **버릴 기능이 뭐냐**

### 이 단계의 결과물

1. `decision-sprint.md`
   - 문제 요약
   - 사용자 1차 페르소나
   - 해결 전/후 흐름
   - MVP 범위 / 제외 범위

2. `bet-memo.md`
   - 이번 대회에서 우리가 거는 베팅 1개

3. `demo-critical-path.md`
   - 시연에 필요한 최소 사용자 여정

### 추천 의사결정 질문

- 이 기능이 없어도 데모가 되나?
- 이 기능이 없어도 문제 정의가 살아 있나?
- 이 기능은 AI가 아니어도 되는가?
- 이 기능이 배포 실패를 부르나?
- 이 기능은 README와 AI 활용 리포트에 설명 가능한가?

### 이 단계 프롬프트

```text
너는 제품 전략 퍼실리테이터다.
지금부터 우리는 대회 주제 공개 직후 6시간 안에 하나의 MVP를 선택해야 한다.
아래 후보 3개를 비교하여, 각 후보에 대해 다음을 작성하라.
1) 핵심 사용자
2) 해결하는 한 문장 문제
3) MVP 최소 범위
4) 데모 핵심 장면
5) 버려야 할 기능
6) 실패 가능성이 가장 큰 이유
7) 이 대회 심사 기준과의 적합성

마지막에는 반드시 하나를 고르고, “왜 나머지 둘을 버리는지”도 써라.
```

```text
아래 아이디어를 Shape Up 방식으로 bounded problem으로 다시 써라.
- appetite: 7일
- fixed time, variable scope
- demo-first
- judge can verify by browser

출력 형식:
문제 / 해결 접근 / 하지 않을 것 / 데모 통과 조건 / 컷라인
```

### 추가 조사 필요

- 주제 공개 직후 나온 세부 안내문
- 심사위원 성향, 시상식 발표 형식, 현장 네트워크 조건

---

## 3. 범위 설계: MVP를 “제품”이 아니라 “베팅”으로 다룬다

### 왜 필요한가

Shape Up은 **고정된 시간, 가변 범위**를 강조한다. 이번 대회는 7일이라는 강한 시간 제한이 있으므로, 가장 중요한 것은 “무엇을 더 만들까?”가 아니라 “무엇을 잘라낼까?”다. Lean Startup도 MVP를 학습 실험으로 보고, 과잉 제작을 경계한다. [S10][S11][S06][S07]

### 우리 팀의 기본 룰

- 기능은 **데모-임팩트 순으로만** 남긴다.
- MVP는 “전체 서비스의 축소판”이 아니라 **핵심 가설 검증 장치**다.
- Day 3 이후 새 기능은 원칙적으로 금지한다.
- 배포/안정성/설명 가능성을 해치면 아무리 멋져도 제거한다.

### 산출물

1. `scope-board.md`
   - Must / Should / Could / Not now

2. `success-metrics.md`
   - 제품 성공 지표가 아니라 **심사 성공 지표** 중심
   - 예: 2분 내 핵심 시나리오 시연, 주요 오류 0개, 첫 화면 이해도, README 재현 가능성

3. `cut-list.md`
   - 끝까지 버릴 기능 목록

4. `demo-script-v0.md`
   - 실제 구현 전에 먼저 데모 대본 작성

### 이 단계 프롬프트

```text
아래 기능 목록을 Must / Should / Could / Not now로 재분류하라.
기준은 다음과 같다.
- 7일 내 구현 가능성
- 데모 필수성
- 배포 안정성에 미치는 위험
- AI 활용 리포트에서 설명 가치
- 심사 기준과의 직접 연결성

반드시 Not now를 공격적으로 늘려라.
```

```text
너는 심사위원이다.
이 MVP의 데모를 2분 동안 본다고 가정하고, “없으면 치명적인 기능” 3개와 “있어도 점수에 거의 영향 없는 기능” 5개를 구분하라.
```

### 추가 조사 필요

- 배포 인프라 선택: Vercel / Netlify / Render / Firebase 등
- 데이터 보안/개인정보 이슈가 있는지

---

## 4. GitHub 기반 워크스페이스: 리포지토리를 “운영체계”로 설계한다

### 왜 필요한가

GitHub Issues는 작업, 아이디어, 버그를 추적하는 기본 단위이고, Projects는 테이블/보드/로드맵/차트와 커스텀 필드를 통해 작업을 계획·추적할 수 있다. GitHub Actions는 빌드·테스트·배포 같은 CI/CD뿐 아니라 이슈/프로젝트 자동화도 수행할 수 있고, workflow artifacts를 통해 빌드 결과, 로그, 스크린샷 등을 저장할 수 있다. 즉, GitHub 하나만으로도 **작업 관리 + 자동화 + 증빙 저장**의 중심축을 만들 수 있다. [S12][S13][S14][S15][S16][S17][S18][S19]

### 목표 상태

리포지토리는 단순 코드 저장소가 아니라 아래 네 층으로 나뉜다.

1. **Execution layer** — Issues, PRs, Projects
2. **Agent layer** — AI 지침 파일, 역할 문서, 프롬프트, handoff 규약
3. **Evidence layer** — 스크린샷, 동영상, 로그, AI 사용 기록, Actions artifacts
4. **Submission layer** — README, 배포 링크, AI 활용 리포트, 발표 자료

### 추천 리포지토리 구조

```text
repo/
  README.md
  PLAYBOOK.md
  AGENTS.md
  CLAUDE.md
  .cursor/
    rules/
      product.mdc
      frontend.mdc
      backend.mdc
      qa.mdc
      judge.mdc
  .github/
    copilot-instructions.md
    instructions/
      docs.instructions.md
      src.instructions.md
      tests.instructions.md
    ISSUE_TEMPLATE/
      task.yml
      research.yml
      bug.yml
      evidence.yml
    PULL_REQUEST_TEMPLATE.md
    workflows/
      ci.yml
      deploy-preview.yml
      evidence-bundle.yml
      nightly-summary.yml
  docs/
    00_competition/
    01_strategy/
    02_product/
    03_research/
    04_prompts/
    05_evidence/
    06_submission/
    07_retro/
  agents/
    roles/
    handoffs/
    evals/
    runbooks/
  prompts/
    research/
    planning/
    coding/
    qa/
    judging/
  media/
    screenshots/
    recordings/
    demo/
  app/
  tests/
```

### GitHub 기능별 기본 사용법

- **Issues**: 작업, 리서치, 버그, 증빙 요청을 모두 이슈로 남긴다. [S20][S21]
- **Issue Forms / Templates**: 사람들이 빠뜨리기 쉬운 정보를 강제 입력받는다. 예: 재현 절차, 데모 영향 여부, 증빙 필요 여부. [S22][S23][S24]
- **Projects**: Status, Owner, Priority, Demo-critical, Evidence-required 같은 필드를 둔다. [S13][S14]
- **Pull Request Templates**: 변경 내용, 데모 영향, 스크린샷, 테스트 여부, AI 사용 여부를 체크하게 만든다. [S25][S26]
- **Actions**: push/PR 때 빌드·테스트·배포·증빙 번들 업로드를 자동화한다. [S15][S16][S19]
- **Artifacts**: 테스트 결과, screenshots, Lighthouse 리포트, demo build 등을 저장한다. [S18][S19]
- **Rulesets / Protected Branches**: `main` 브랜치를 보호하고, 최소 리뷰/체크를 강제한다. [S27][S28]
- **Template Repository**: 이번 대회용 레포를 다음 해커톤에 그대로 재사용할 수 있게 템플릿화한다. [S29][S30]

### 이 단계의 핵심 산출물

1. `template-repo` 1개
2. GitHub Project 보드 1개
3. Issue forms 4종
4. PR template 1종
5. CI + deploy + evidence workflow 3종
6. branch rule / ruleset 설정

### 이 단계 프롬프트

```text
너는 GitHub 운영 설계자다.
우리 팀은 7일짜리 AI 개발 대회를 준비한다.
다음 조건을 만족하는 GitHub 운영 구조를 설계하라.
- 작업 추적
- AI 프롬프트/에이전트 지침 관리
- 증빙 파일 보관
- README와 제출물 생산
- 데모 크리티컬 작업 우선순위 관리

출력 형식:
1) 권장 폴더 트리
2) GitHub Project 필드 설계
3) 이슈 템플릿 종류와 필드
4) PR 템플릿 체크리스트
5) Actions 워크플로 목록
```

```text
아래 기능 요구사항을 기준으로 GitHub Issue Form 초안을 YAML 수준이 아니라 사람용 설계안으로 작성하라.
- Task
- Research
- Bug
- Evidence
각 폼마다 필수 입력값, 자동 라벨, assignee 원칙, 완료 정의를 적어라.
```

### 추가 조사 필요

- 실제 사용할 배포 플랫폼과 GitHub Actions 연동 방법
- private/public repo 전략
- 저장 용량과 artifact retention 전략

---

## 5. AI 에이전트 네이티브 공간: 에이전트가 ‘뛸 수 있는’ 구조를 만든다

### 왜 필요한가

이번 대회는 AI 활용 능력 자체가 평가 항목이다. 따라서 AI는 “채팅 도구”가 아니라 **운영 참가자**로 조직되어야 한다. Anthropic은 Claude Code의 프로젝트 메모리로 `./CLAUDE.md`를, Cursor는 `.cursor/rules`와 `AGENTS.md`를, GitHub Copilot은 `.github/copilot-instructions.md` 및 path-specific instructions를 지원한다. 즉, 리포지토리 안에 **에이전트가 읽는 규칙 공간**을 명시적으로 둘 수 있다. [S31][S32][S33][S34][S35]

### 권장 원칙

- **중립 진입점**: `AGENTS.md`를 사람과 AI가 함께 읽는 최고 수준 운영 문서로 둔다.
- **툴별 어댑터**: `CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`로 각 에이전트 특성에 맞춘 보조 규칙을 둔다.
- **역할 분리**: 하나의 만능 에이전트 대신, 역할 기반 에이전트를 둔다.
- **handoff format 통일**: 에이전트끼리 넘기는 정보 포맷을 고정한다.
- **human override**: 최종 범위 결정, 삭제 결정, 제출 결정은 항상 사람이 한다.

### 추천 에이전트 역할

1. **PM Agent**
   - 오늘 해야 할 일, blocker, 결정 포인트 정리
2. **Research Agent**
   - 사용자 문제, 경쟁, 근거 자료 요약
3. **Product Agent**
   - user story, acceptance criteria, edge case 작성
4. **Builder Agent**
   - 구현 계획, 코드 생성, 리팩터링
5. **QA Agent**
   - 실패 시나리오, 테스트 케이스, 재현 절차
6. **Judge Agent**
   - 심사위원 시점의 치명적 약점 지적
7. **Evidence Agent**
   - AI 활용 기록, 스크린샷 설명, 회고용 정리
8. **Submission Agent**
   - README, AI 리포트, 발표 스크립트 초안

### handoff 표준

모든 에이전트 출력은 최소한 아래 6개 블록을 가진다.

```text
[Task]
[Assumptions]
[Inputs used]
[Output]
[Open risks]
[Next recommended action]
```

### AI가 사용할 수 있는 공간 설계

- `agents/roles/*.md` — 각 역할의 임무와 금지사항
- `agents/handoffs/*.md` — 역할 간 전달 규격
- `prompts/` — 실제 프롬프트 자산
- `docs/05_evidence/` — AI 사용 로그와 결과 요약
- `media/` — 시연 자료
- `tests/` — 프롬프트 또는 기능 eval 기록

### 이 단계의 산출물

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.cursor/rules/*.mdc`
4. `.github/copilot-instructions.md`
5. `agents/roles/*.md`
6. `handoff-contract.md`

### 이 단계 프롬프트

```text
너는 AI 운영 설계자다.
우리 팀은 GitHub 리포지토리 안에서 여러 AI 에이전트를 역할 기반으로 운영하려 한다.
다음 역할에 대해 각각 1페이지 운영 명세를 만들어라.
- PM Agent
- Research Agent
- Product Agent
- Builder Agent
- QA Agent
- Judge Agent
- Evidence Agent
- Submission Agent

각 명세에는 다음이 포함되어야 한다.
- mission
- allowed actions
- forbidden actions
- required inputs
- output contract
- escalation conditions
```

```text
아래 프로젝트 상황을 읽고, 각 에이전트가 어떤 순서로 개입해야 하는지 orchestration plan을 작성하라.
상황: 주제 공개 직후 / 7일 제한 / 3인 팀 / 배포 필수는 아니지만 가산점 있음 / AI 활용 리포트 제출 필요
```

### 추가 조사 필요

- 실제 사용할 에이전트 도구 조합: Cursor, Claude Code, Copilot, ChatGPT 등
- 로컬/클라우드 개발환경과 권한 정책
- 로그 보존 범위와 개인정보 이슈

---

## 6. 증빙과 재현성: “AI를 잘 썼다”가 아니라 “어떻게 썼는지 다시 보여줄 수 있다”를 만든다

### 왜 필요한가

이 대회는 AI 활용 리포트 제출을 요구한다. 또한 훗날 그대로 재사용·회고·포트폴리오화하려면, 개발 당시의 의사결정과 결과물을 다시 따라갈 수 있어야 한다. OpenAI는 프롬프트를 명확하게 관리하고, 모델 버전을 고정하고, evals를 구축해 성능을 비교하라고 권장한다. Anthropic도 프롬프트 엔지니어링 전에 **성공 기준과 경험적 테스트**를 먼저 정의하라고 말한다. [S36][S37][S38][S39][S40]

### 증빙의 4개 층

1. **Prompt provenance**
   - 어떤 모델/프롬프트/입력으로 무엇을 얻었는가
2. **Build provenance**
   - 어떤 commit에서 어떤 빌드/배포가 생성됐는가
3. **Decision provenance**
   - 왜 기능을 넣거나 뺐는가
4. **Media provenance**
   - 어떤 시점의 화면/동영상이 어떤 버전을 보여주는가

### 최소 기록 단위

각 주요 작업마다 아래 1줄 로그를 남긴다.

```text
날짜 | 역할 | 작업 | 사용한 AI/모델 | 입력 문서/이슈 | 출력 파일 | 채택 여부 | 이유
```

### 반드시 남길 것

- 주요 프롬프트 원문
- 모델명/버전 또는 최소 모델 계열
- 입력 자료 링크
- 출력 산출물 링크
- 사람이 채택/수정/폐기한 이유
- 주요 스크린샷과 짧은 캡션
- 데모 영상 버전별 변화

### 권장 파일

- `docs/05_evidence/ai-usage-log.csv`
- `docs/05_evidence/decision-log.md`
- `docs/05_evidence/prompt-catalog.md`
- `docs/05_evidence/demo-capture-log.md`
- `docs/06_submission/ai-utilization-report.md`
- GitHub Actions artifact: `evidence-bundle-YYYYMMDD-HHMM`

### 추천 자동화

- push 또는 PR 마다 테스트 결과와 스크린샷 업로드
- nightly build 후 `summary.md`와 캡처본 보관
- release candidate 태그 시 demo bundle 자동 생성

### 이 단계 프롬프트

```text
너는 AI 활용 증빙 담당자다.
아래 대화/프롬프트/출력물을 바탕으로 AI 활용 리포트용 요약을 작성하라.
반드시 다음 항목으로 나눠라.
1) 문제 상황
2) AI에 맡긴 작업
3) 사람이 검토/수정한 부분
4) 최종 채택 결과
5) 성과
6) 한계와 리스크

과장하지 말고, 사람이 한 일과 AI가 한 일을 분리해서 써라.
```

```text
아래 작업 이력을 보고 재현 가이드를 작성하라.
형식은 다음과 같다.
- prerequisite
- files needed
- commands/actions
- expected output
- failure points
- proof artifacts
```

### 추가 조사 필요

- 최종 AI 활용 리포트의 분량/형식/필수 항목
- 스크린샷/영상 제출 여부
- 외부 모델/API 사용 시 비용·정책 이슈

---

## 7. 7일 운영 리듬: 개발 스프린트가 아니라 “데모 스프린트”로 돌린다

### 왜 필요한가

대부분의 단기 빌드 대회에서 승부는 코드량이 아니라 **매일 밤 살아 있는 배포본이 있느냐**로 갈린다. Design Sprint가 빠르게 프로토타입을 보고 배우는 데 초점을 두고, Shape Up이 제한된 시간 안에서 범위를 통제하는 데 초점을 둔다면, 이번 대회 운영은 이를 7일짜리 개발 리듬으로 바꿔야 한다. [S08][S09][S10][S11]

### 권장 일일 리듬

- 오전 10분: 오늘의 필수 결과물 확인
- 오후 중간 10분: blocker 정리
- 밤 20분: 배포본 시연 + 기록 + 내일 컷라인 갱신

### 권장 날짜별 초점

- **Day 0 (주제 공개일)**: 문제/범위/데모 경로 확정
- **Day 1**: 뼈대 앱, 데이터 구조, 첫 배포
- **Day 2**: 핵심 플로우 작동
- **Day 3**: 데모 크리티컬 기능 완성, 이후 기능 동결 시작
- **Day 4**: QA, 예외 처리, UX 문구, 증빙 정리
- **Day 5**: README, AI 리포트, judge review
- **Day 6**: 시연 리허설, 안정화
- **Day 7 (제출일)**: 기능 추가 금지, 제출 패키징만

### 데일리 종료 조건

매일 밤 아래 5개가 있어야 한다.

1. 접속 가능한 배포본
2. 오늘 변경된 기능 설명
3. 스크린샷 3장 이상
4. 기록된 AI 사용 내역
5. 내일의 단일 목표

### 이 단계 산출물

- `daily-standup.md`
- `release-notes-daily.md`
- `bug-bash.md`
- `judge-review-notes.md`

### 이 단계 프롬프트

```text
너는 PM Agent다.
현재 날짜는 Day 3 밤이다.
아래 현황을 바탕으로 내일의 단일 목표 1개, 절대 버려야 할 기능 3개, 반드시 수정해야 할 치명 버그 3개를 정리하라.
기준은 대회 제출 성공률이다.
```

```text
너는 Judge Agent다.
현재 배포본을 심사위원이 2분간 본다고 가정하고, 감점 포인트를 치명도 순으로 10개 적어라.
반드시 “왜 감점인지”와 “최소 수정안”을 같이 적어라.
```

### 추가 조사 필요

- 팀원 실제 가용 시간과 역할 중복 허용 범위
- 시연용 더미 데이터/계정 준비

---

## 8. 제출물 패키징: 심사위원은 코드베이스보다 이야기 구조를 먼저 본다

### 왜 필요한가

이번 대회 제출물은 GitHub 저장소, 배포 URL, AI 활용 리포트가 핵심이다. 따라서 제출 패키지는 “코드 정리”가 아니라 **심사위원이 이해하기 쉬운 스토리 구조**여야 한다. 공식 자료상 배포가 필수는 아니지만 가산점 요소이고, GitHub 변경 이력도 평가상 민감하다. [S01][S02][S03]

### 제출 패키지의 최소 구성

1. **README**
   - 문제
   - 사용자
   - 해결 방식
   - 핵심 기능
   - 데모 링크
   - 아키텍처
   - 실행 방법
   - AI 활용 요약
   - 한계 / 향후 확장

2. **Demo script**
   - 90초 버전
   - 180초 버전

3. **AI 활용 리포트**
   - 도구별 활용 방식
   - 프롬프트 전략
   - 인간 검토와 수정
   - 결과물과 연결된 증거

4. **Submission checklist**
   - GitHub repo 접근 권한
   - URL 작동 여부
   - 환경 변수/계정 이슈
   - README 오탈자
   - 화면 녹화 백업

### 유명 방법론을 여기서 어떻게 쓰는가

- **YC**: “write code, talk to users”를 심사 언어로 바꾸면 “작동하는가, 진짜 문제를 푸는가”다. [S04]
- **Lean Startup**: MVP를 학습 실험으로 설명하면, 왜 범위를 좁혔는지 설득하기 쉽다. [S06][S07]
- **Design Sprint**: 데모는 기능 나열이 아니라 사용자 스토리 순으로 보여준다. [S09]

### 이 단계 프롬프트

```text
너는 제출 패키지 에디터다.
아래 프로젝트 정보를 바탕으로 심사위원이 3분 안에 이해할 수 있는 README 구조를 작성하라.
필수 섹션은 문제, 사용자, 해결 방식, 핵심 기능, 데모, 기술 스택, AI 활용, 재현 방법, 한계다.
```

```text
너는 시연 코치다.
아래 기능 목록을 바탕으로 90초 데모 스크립트와 180초 데모 스크립트를 각각 작성하라.
중요한 것은 기능 수가 아니라 문제 해결 전후 대비가 보이게 하는 것이다.
```

### 추가 조사 필요

- 제출 이메일 형식 / 파일명 규칙
- 필요 시 팀 소개 문구 / 소개서

---

## 9. 회고와 자산화: 대회가 끝나도 남아야 하는 것

### 왜 필요한가

이번 운영을 한 번으로 끝내지 않으려면, 결과물뿐 아니라 **작동했던 운영 방식**까지 자산화해야 한다. GitHub 템플릿 리포지토리, 프롬프트 카탈로그, 에이전트 규칙 파일, 이슈 템플릿은 다음 대회에서도 그대로 재사용할 수 있다. [S29][S30]

### 회고 질문

- 어떤 문제 선별 기준이 잘 먹혔는가?
- 어떤 AI 역할이 생산성을 올렸고, 어떤 역할은 소음만 만들었는가?
- 어떤 프롬프트가 재사용 가치가 높은가?
- 어떤 기록 방식이 귀찮았지만 결국 도움이 됐는가?
- 어떤 의사결정이 늦어서 범위를 망쳤는가?

### 남겨야 할 최종 자산

1. `retrospective.md`
2. `template-repo-v1`
3. `prompt-pack-v1`
4. `agent-rules-pack-v1`
5. `submission-pack-sample/`
6. `demo-video-final.mp4`
7. `portfolio-case-study.md`

### 이 단계 프롬프트

```text
너는 회고 퍼실리테이터다.
아래 대회 운영 로그를 기반으로, 다음 5개 카테고리로 회고를 정리하라.
- keep
- problem
- experiment next time
- delete
- reusable asset

각 항목마다 다음 대회에서 바로 실행할 한 줄 규칙까지 적어라.
```

```text
아래 프로젝트의 전 과정을 포트폴리오용 케이스 스터디로 재구성하라.
단, 성과 과장은 금지하고 “문제-제약-의사결정-AI 활용-결과-배운 점” 구조를 유지하라.
```

### 추가 조사 필요

- 대회 후 공개 가능한 자료 범위
- 포트폴리오/채용 활용 시 비공개 처리 항목

---

## 부록 A. 지금 바로 만들면 좋은 GitHub Project 필드

- `Status` — Backlog / Ready / In Progress / In Review / Blocked / Done
- `Track` — Product / Engineering / QA / Evidence / Submission
- `Priority` — P0 / P1 / P2
- `Owner` — 사람 이름
- `Demo Critical` — Yes / No
- `Evidence Required` — Yes / No
- `AI Used` — None / Low / Medium / High
- `Cuttable` — Yes / No
- `Risk` — Low / Medium / High
- `Due Day` — Day0 ~ Day7

권장 뷰

- `Today`
- `Demo Critical`
- `Submission Blockers`
- `Evidence Missing`
- `Done Today`

---

## 부록 B. 에이전트 지침 파일 추천 구성

### `AGENTS.md`

- 프로젝트 목적
- 대회 제약
- 현재 우선순위
- 금지사항
- 의사결정 원칙
- handoff contract 링크

### `CLAUDE.md`

- 프로젝트 구조
- 자주 쓰는 명령어
- 코딩/문서 규칙
- 테스트와 배포 원칙
- import 가능한 세부 문서 링크

### `.cursor/rules/`

- `product.mdc`
- `frontend.mdc`
- `backend.mdc`
- `qa.mdc`
- `judge.mdc`

### `.github/copilot-instructions.md`

- 저장소 전체 공통 규칙
- 문서 스타일
- PR/Issue 연결 방식
- 테스트/스크린샷 첨부 규칙

---

## 부록 C. 증빙 파일 네이밍 규칙 예시

```text
/docs/05_evidence/
  2026-04-06_theme-decision.md
  2026-04-07_ai-usage-log.csv
  2026-04-08_demo-capture-01.png
  2026-04-08_build-summary.md
  2026-04-09_judge-review.md
  2026-04-10_ai-report-draft.md
```

```text
/media/demo/
  day3-core-flow.mp4
  day5-judge-run.mp4
  final-demo-90s.mp4
  final-demo-180s.mp4
```

핵심은 “파일명만 봐도 언제, 무엇, 왜 생성됐는지 알 수 있게” 만드는 것이다.

---

## 부록 D. 프롬프트 공통 뼈대

모든 중요 프롬프트는 아래 형식을 유지하는 편이 좋다.

```text
[Role]
너는 누구인가.

[Goal]
이 작업의 목적은 무엇인가.

[Context]
이 작업이 전체 워크플로에서 어디에 위치하는가.

[Inputs]
어떤 문서/로그/이슈/코드를 읽어야 하는가.

[Constraints]
시간, 범위, 금지사항, 평가 기준은 무엇인가.

[Output format]
표/목록/체크리스트/초안 등 원하는 결과 형식은 무엇인가.

[Quality bar]
무엇이 좋은 답이고, 무엇이 불충분한 답인가.

[Uncertainty policy]
불확실한 내용은 추정이라고 표시하고, 추가 조사 항목을 분리하라.
```

이 형식은 Anthropic의 clear/direct prompting, prompt chaining, long-context 구조화 조언과 OpenAI의 명확한 지시, eval, prompt versioning 권고와 잘 맞는다. [S36][S37][S38][S39][S40]

---

## 부록 E. 이 문서의 운영 원칙 요약

1. 아이디어보다 **문제 정의**가 먼저다.
2. 기능보다 **데모 경로**가 먼저다.
3. 속도보다 **컷라인 관리**가 먼저다.
4. AI 사용량보다 **AI 사용 증빙**이 먼저다.
5. 코드보다 **심사 가능한 제출 패키지**가 먼저다.
6. 결과물보다 **재현 가능한 운영체계**가 오래 남는다.

---

## Sources

### 대회 자료
- [S01] 바이브코딩 공모전 포스터 PDF (사용자 제공)
- [S02] 홍보 기사 PDF 1 — `바이브코딩공모전_홍보자료_오명훈.pdf` (사용자 제공)
- [S03] 홍보 기사 PDF 2 — `바이브코딩공모전_홍보자료_정용석.pdf` (사용자 제공)

### 제품/스타트업 방법론
- [S04] Y Combinator — YC’s Essential Startup Advice
  https://www.ycombinator.com/blog/ycs-essential-startup-advice/
- [S05] Y Combinator — Jessica Livingston's Pretty Complete List on How Not to Fail
  https://www.ycombinator.com/blog/how-not-to-fail/
- [S06] The Lean Startup — Methodology
  https://theleanstartup.com/principles?locale=en_GB
- [S07] Eric Ries / Startup Lessons Learned — MVPs and Excellence
  https://news.theleanstartup.com/p/startup-lessons-learned-blog-rss-96e2
- [S08] The Sprint Book — home / method overview
  https://www.thesprintbook.com/
- [S09] The Sprint Book — The Design Sprint
  https://www.thesprintbook.com/the-design-sprint
- [S10] Basecamp Shape Up — Introduction / Principles of Shaping
  https://basecamp.com/shapeup
  https://basecamp.com/shapeup/1.1-chapter-02?curius=2896
- [S11] Basecamp Shape Up — Set Boundaries / Betting Table
  https://basecamp.com/shapeup/2.2-chapter-08
  https://basecamp.com/shapeup/4.1-appendix-02

### GitHub 운영 문서
- [S12] GitHub Docs — About issues
  https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues
- [S13] GitHub Docs — About Projects
  https://docs.github.com/enterprise-cloud%40latest/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects
- [S14] GitHub Docs — Planning and tracking with Projects
  https://docs.github.com/en/issues/planning-and-tracking-with-projects
- [S15] GitHub Docs — Understanding GitHub Actions
  https://docs.github.com/ko/actions/get-started/understand-github-actions
- [S16] GitHub Docs — GitHub Actions documentation
  https://docs.github.com/en/actions/
- [S17] GitHub Docs — Automating Projects using Actions
  https://docs.github.com/en/enterprise-cloud%40latest/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions
- [S18] GitHub Docs — Workflow artifacts
  https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
- [S19] GitHub Docs — Store and share data with workflow artifacts
  https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts
- [S20] GitHub Docs — Quickstart for GitHub Issues
  https://docs.github.com/en/issues/tracking-your-work-with-issues/quickstart
- [S21] GitHub Docs — Communicating on GitHub
  https://docs.github.com/en/get-started/using-github/communicating-on-github
- [S22] GitHub Docs — About issue and pull request templates
  https://docs.github.com/en/enterprise-cloud%40latest/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates
- [S23] GitHub Docs — Configuring issue templates for your repository
  https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository
- [S24] GitHub Docs — Syntax for issue forms
  https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
- [S25] GitHub Docs — Managing and standardizing pull requests
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/managing-and-standardizing-pull-requests
- [S26] GitHub Docs — Creating a pull request template for your repository
  https://docs.github.com/articles/creating-a-pull-request-template-for-your-repository
- [S27] GitHub Docs — About protected branches
  https://docs.github.com/articles/about-protected-branches
- [S28] GitHub Docs — About rulesets
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- [S29] GitHub Docs — Creating a template repository
  https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository
- [S30] GitHub Docs — Creating a repository from a template
  https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template

### AI 프롬프트/에이전트 운영 문서
- [S31] Anthropic — Manage Claude's memory
  https://docs.anthropic.com/en/docs/claude-code/memory
- [S32] Anthropic — Prompt engineering overview
  https://docs.anthropic.com/en/docs/prompt-engineering
- [S33] Anthropic — Be clear, direct, and detailed
  https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct
- [S34] Anthropic — Chain complex prompts for stronger performance
  https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts
- [S35] Anthropic — Long context prompting tips
  https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips
- [S36] Cursor Docs — Rules / AGENTS.md / project rules
  https://docs.cursor.com/en/context/rules
  https://docs.cursor.com/context/rules-for-ai
- [S37] GitHub Docs — Adding repository custom instructions for GitHub Copilot
  https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot
- [S38] OpenAI Docs — Prompt engineering
  https://platform.openai.com/docs/guides/prompt-engineering/strategies-to-improve-reliability
- [S39] OpenAI Docs — Prompting
  https://platform.openai.com/docs/guides/prompting
- [S40] OpenAI Docs — Evaluation best practices / reasoning best practices
  https://platform.openai.com/docs/guides/evaluation-best-practices
  https://platform.openai.com/docs/guides/reasoning-best-practices
