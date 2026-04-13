# HagentOS — Repo Operating Guide For AI Agents

> 이 저장소는 일반 개발 저장소가 아니라, **GitHub URL 자체가 심사 진입점** 인 제출 저장소다.
> 따라서 모든 변경은 "심사자가 무엇을 먼저 보고 무엇을 이해하는가"를 기준으로 판단한다.

## What Matters Most

이 저장소에서 우선순위가 가장 높은 파일은 아래 다섯 개다.

1. `README.md`
2. `JUDGE_DEMO.md`
3. `docs/JUDGE_EVIDENCE.md`
4. `ROADMAP.md`
5. `AGENTS.md`

이유:

- `README.md` 는 심사자와 첫 방문자가 가장 먼저 보는 공개 문서다.
- `JUDGE_DEMO.md` 는 심사 시연의 정본이다.
- `docs/JUDGE_EVIDENCE.md` 는 우리가 실제로 어떻게 만들고 검증했는지 보여주는 증빙 문서다.
- `ROADMAP.md` 는 지금 무엇을 보여줬고 다음에 무엇을 강화할지 설명하는 공개 계획 문서다.
- `AGENTS.md` 는 이후 작업자가 위 문서를 일관되게 유지하게 만드는 운영 규칙이다.
- `PRIVACY.md` 와 `LICENSE` 는 공개 데모 저장소로서의 기본 신뢰 장치다.

`CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` 같은 파일은 중요하지만, 현재 목표인 **심사 + 배포 + 첫인상** 에서는 2순위다.

## Source Of Truth Order

문서와 제품 메시지가 충돌하면 아래 순서를 따른다.

1. `README.md`
   공개 포지셔닝, 라이브 URL, 스크린샷, 로컬 실행
2. `JUDGE_DEMO.md`
   심사 클릭 순서, 데모 문구, fallback
3. `docs/JUDGE_EVIDENCE.md`
   도구 사용, 검증, 작업 방식
4. `ROADMAP.md`
   공개용 방향성과 다음 단계
5. `docs/design/ui-harness.md`
   UI 화면 규칙
6. 실제 코드
   검증 가능한 사실과 현재 구현 상태

확인되지 않은 문구는 README에 넣지 않는다.

## Judge-First Method

문서를 수정할 때는 항상 아래 질문에 답해야 한다.

1. 이 제품은 무엇인가
2. 왜 필요한가
3. 심사자는 어디를 클릭해야 하는가
4. 가장 강한 증거 화면은 무엇인가
5. 라이브가 불안정할 때 fallback은 무엇인가
6. 우리가 이 제품을 어떻게 만들고 검증했는가

좋은 방법론:

- 설명보다 **흐름** 을 먼저 보여준다.
- 과장보다 **검증 가능한 주장** 을 쓴다.
- 기능 나열보다 **문제 -> 구조 -> 증거** 순서를 따른다.
- 최종 내러티브는 항상 **Pain -> Workflow -> Proof** 로 읽히게 만든다.
- 첫 화면, 첫 링크, 첫 이미지의 품질에 가장 민감하게 반응한다.

## README Rules

README는 항상 아래 구조를 유지한다.

1. Hero image 또는 핵심 화면
2. 빠른 링크
3. 제품 한 줄 정의
4. Judge in 90 seconds
5. 제품이 해결하는 문제
6. 작동 흐름
7. 핵심 화면
8. 우리가 어떻게 일했는가
9. 라이브 URL / 채널 / 도구
10. 로컬 실행
11. 로드맵
12. 현재 한계

README에 반드시 포함할 것:

- Live URL
- Judge Guide 링크
- Build & Evidence 링크
- Roadmap 링크
- Privacy 링크
- License 링크
- 핵심 스크린샷
- 고객 채널과 운영 채널 정보
- 실제 사용 도구와 기술
- 현재 한계
- Obsidian을 포함한 작업 방식 요약

README에 넣지 말 것:

- 확인하지 않은 수치
- 오래된 포트
- raw 캡처 폴더 링크
- 로컬 전용 임시 경로
- 대량의 작업 로그

## JUDGE_DEMO Rules

`JUDGE_DEMO.md` 는 설명 문서가 아니라 **시연 스크립트** 다.

반드시 포함할 것:

- Live URL
- 추천 클릭 순서
- 고객 bot / 운영 bot 구분
- 추천 bot 메시지
- 심사 포인트별 매핑
- 라이브 실패 시 fallback

항상 유지해야 할 핵심 흐름:

`message -> case -> draft -> approval -> side effect`

이 흐름이 깨지면 심사 설득력이 크게 떨어진다.

## AGENTS Rules

이 파일의 역할은 "앞으로 누가 수정하더라도 저장소의 방향이 흐트러지지 않게 하는 것"이다.

따라서 항상 포함할 것:

- 우선순위 파일
- source of truth 순서
- judge-first 원칙
- Pain -> Workflow -> Proof 내러티브 규칙
- 산출물 정리 규칙
- 최소 검증 규칙

## Artifact Hygiene

심사용 저장소를 지저분하게 만드는 파일은 올리지 않는다.

올리지 말아야 할 대표 항목:

- `.DS_Store`
- `.playwright-cli/`
- `.obsidian/`
- `.claude/`
- 임시 캡처 폴더 전체
- 사용자가 명시하지 않은 대형 대회 보관 폴더

이미지가 필요하면:

- 엄선한 파일만 `docs/assets/readme/` 에 둔다.
- README에서 쓰는 이미지 경로는 짧고 안정적으로 유지한다.

## Product Positioning Guardrails

HagentOS를 아래처럼 설명하지 않는다.

- 단순 챗봇
- 범용 업무 자동화 툴
- 학교 ERP 대체제
- AI가 다 알아서 하는 무인 시스템

HagentOS는 이렇게 설명한다.

- 한국 학원 운영용 AI agent control plane
- Case-first 운영 구조
- Approval gate가 있는 agent team product
- 메시지, 일정, 문서, 활동 로그를 연결하는 운영 보드

## Stack And Ports

| 항목 | 값 |
| --- | --- |
| UI | React 19 + Vite + TypeScript |
| Server | Express + Drizzle ORM |
| DB | PostgreSQL 17 |
| Package Manager | pnpm workspace |
| UI Port | `5174` |
| Server Port | `3200` |

실행 명령:

```bash
pnpm dev
pnpm dev:server
pnpm dev:ui
pnpm typecheck
pnpm build
```

## Verification Rules

문서만 수정했을 때:

```bash
git diff --check
```

UI를 수정했을 때:

```bash
cd ui && npx tsc --noEmit
cd ui && npx vite build
```

서버, 공유 타입, 빌드 경로를 수정했을 때:

```bash
pnpm typecheck
```

검증을 못 돌렸다면 반드시 명시한다.

## Commit Rules

```text
feat: 새 기능
fix: 버그 수정
refactor: 리팩터링
docs: 문서
chore: 설정/의존성
```
