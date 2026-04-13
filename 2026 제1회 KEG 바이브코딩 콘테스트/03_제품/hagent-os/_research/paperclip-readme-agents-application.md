---
tags:
  - area/product
  - type/analysis
  - status/active
date: 2026-04-13
up: "[[hagent-os/README]]"
---
# Paperclip README / AGENTS 적용 전략

> 목적: `paperclipai/paperclip`의 `README.md`와 `AGENTS.md`를 읽고, **우리 대회 제출 깃**에 어떤 형태로 적용할지 정리한다.
> 범위: 메시지 구조, 제출용 README 전략, contributor/AI agent 운영 규칙, 심사 데모 narrative.
> 소스:
> - `https://github.com/paperclipai/paperclip/blob/master/README.md`
> - `https://github.com/paperclipai/paperclip/blob/master/AGENTS.md`

---

## 결론

Paperclip에서 지금 당장 가져와야 하는 것은 **기술 기능 자체보다도, 저장소가 스스로를 설명하는 방식**이다.

우리 제출 깃에는 이미 제품 설계 문서와 구현이 많다. 부족한 것은 다음 4가지다.

1. 첫 화면에서 바로 이해되는 **한 문장 포지셔닝**
2. 심사위원이 2분 안에 따라갈 수 있는 **README 정보 구조**
3. AI/사람 기여자가 동일한 기준으로 움직이게 하는 **AGENTS.md 운영 규칙**
4. "이 제품이 무엇이 아니고, 어떤 문제를 어떻게 푸는가"를 명확히 하는 **문제-해결 narrative**

즉, Paperclip를 따라 해야 하는 핵심은:

- "agent가 많다"가 아니라 **무엇을 orchestration하는 제품인지** 명확히 말하는 것
- 기능 나열이 아니라 **운영 단위와 실행 원리**를 보여주는 것
- 개발 가이드가 아니라 **기여와 검증의 최소 규율**을 저장소에 박는 것

반대로 그대로 가져오면 안 되는 것은:

- `zero-human companies` 같은 과장된 철학 문구
- 아직 완전히 검증되지 않은 cloud/mobile/plugin 약속
- 우리 도메인과 무관한 multi-company/generalized startup narrative

---

## Paperclip에서 배울 점

### 1. README가 "기능 목록"보다 먼저 "제품 정의"를 한다

Paperclip README는 초반에 아래 순서를 고정한다.

1. 한 줄 정의
2. 어떤 사용자에게 맞는지
3. 어떤 문제를 푸는지
4. 왜 특별한지
5. quickstart

이 구조가 강한 이유:

- 방문자가 10초 안에 "이게 뭔지" 안다
- 기능을 보기도 전에 "내 문제와 맞는지" 판단 가능하다
- 기술 스택보다 운영 모델이 먼저 이해된다

우리 제출 깃에 적용하면:

- 지금 README는 설명이 나쁘지 않지만, 문단이 길고 설계 문서 index 성격이 더 강하다
- 심사용 제출 README는 `문서 포털`보다 **제품 pitch + demo entrypoint**여야 한다

### 2. README가 "What is not"를 넣어 오해를 줄인다

Paperclip는 명시적으로 아래를 잘라 말한다.

- Not a chatbot
- Not an agent framework
- Not a workflow builder
- Not a single-agent tool

이건 매우 좋다. 왜냐하면 agent 제품은 보는 사람이 각자 다른 걸 기대하기 때문이다.

우리 HagentOS도 같은 문제가 있다.

심사위원이 쉽게 오해하는 포인트:

- "학원 챗봇인가?"
- "CRM인가?"
- "업무 자동화 툴인가?"
- "교사용 assistant인가?"

따라서 제출 README에는 반드시 `HagentOS is not`가 들어가야 한다.

권장 문안 방향:

- Not a chatbot
- Not a generic workflow builder
- Not a single-agent copilot
- Not a school ERP replacement

그리고 그 다음에:

- **민원/예외/운영 후속처리를 AI agent team이 담당하는 운영 OS**라고 못 박아야 한다

### 3. README quickstart가 짧고 실행 가능하다

Paperclip README는 quickstart를 아주 짧게 유지한다.

- `npx ... onboard --yes`
- 아니면 `git clone -> pnpm install -> pnpm dev`

이 방식의 장점:

- 문서가 "설치 설명서"보다 "시도해볼 수 있는 입구"가 된다
- 실패 시에도 어디부터 시작해야 하는지 명확하다

우리 제출 깃에도 같은 원칙이 필요하다.

권장 quickstart 2갈래:

1. **심사 모드**
   - live URL
   - demo org
   - judge flow
2. **로컬 모드**
   - `pnpm install`
   - `pnpm dev`
   - `server:3200 / ui:5174`

즉, README 첫 절반은 "왜/무엇", 둘째 절반은 "어떻게 바로 보나"로 나뉘어야 한다.

### 4. AGENTS.md가 코드보다 먼저 읽어야 할 문서를 강제한다

Paperclip AGENTS는 매우 실무적이다.

- Purpose
- Read This First
- Repo Map
- Core Engineering Rules
- DB workflow
- Verification
- Definition of Done

좋은 점은 두 가지다.

1. 신규 기여자가 어디서부터 읽어야 하는지 헤매지 않는다
2. AI agent가 임의로 설계를 바꾸지 못하게 한다

우리 쪽에도 이미 다양한 handoff와 design docs가 있다. 문제는 **정본 읽기 순서가 분산**되어 있다는 점이다.

따라서 제출 저장소에는 최소한 아래가 필요하다.

- 루트 `AGENTS.md`
- `Read this first` 순서
- 변경 시 반드시 지켜야 할 invariant
- 제출 직전 verification commands

### 5. 문제-해결 표가 강하다

Paperclip README는 `Without / With` 표가 있다.

이건 우리에게 특히 유용하다. 왜냐하면 학원 운영 pain이 추상적이지 않고, 매우 구체적이기 때문이다.

HagentOS에 맞는 변환 예:

| Without HagentOS | With HagentOS |
| --- | --- |
| 민원 메시지를 원장이 직접 읽고 판단한다 | Complaint/Orchestrator가 분류하고 승인안까지 올린다 |
| 보강/상담/환불이 서로 다른 메신저와 엑셀에 흩어진다 | Case/Approval/Schedule/Document가 한 흐름으로 연결된다 |
| 반복 문의 대응이 사람 기억에 의존한다 | 정책 문서와 지식베이스를 기준으로 일관된 초안을 만든다 |
| 누가 언제 무엇을 승인했는지 추적이 어렵다 | Activity와 audit trail이 남는다 |

이 표는 README의 중간에 들어가면 심사 이해도가 크게 오른다.

---

## 우리 제출 깃에 바로 적용할 것

### A. README를 두 층으로 재구성

대상:

- 제출용 루트 `README.md`
- 제품 문서 index인 `03_제품/hagent-os/README.md`

권장 구조:

1. Title
2. One-line positioning
3. What is HagentOS?
4. Why now / for whom
5. Problems solved
6. What HagentOS is not
7. Demo flow
8. Quickstart
9. Repository map
10. Key docs

여기서 중요한 점:

- 현재 `03_제품/hagent-os/README.md`는 문서 index 역할이 강하므로 유지 가치가 있다
- 대신 제출용 root README는 더 짧고 공격적으로 써야 한다
- 즉, **index README**와 **submission README** 역할을 분리해야 한다

### B. 루트 AGENTS.md를 제출 기준으로 좁게 만든다

Paperclip의 AGENTS를 그대로 복사할 필요는 없다. 대신 아래 구조는 거의 그대로 가져오는 게 좋다.

권장 목차:

1. Purpose
2. Read This First
3. Repo Map
4. Product Invariants
5. Engineering Rules
6. Verification Before Hand-off
7. Definition of Done
8. Demo-specific rules

우리 버전에서 강조할 invariant:

- `Organization` scope 유지
- `Case -> Approval -> Schedule/Document/Activity` 흐름 보존
- archived case 재사용 금지
- notification dedupe/grouped read 유지
- stale run recovery / SSE reconnect 훼손 금지
- live demo org 데이터 임의 파괴 금지

### C. 심사 narrative를 README에 직접 내린다

현재 심사 흐름은 handoff 문서에는 있으나, 저장소 첫 진입점에는 약하다.

README에 아래를 넣는 것이 좋다.

```md
## Demo in 90 seconds

1. Open Dashboard
2. Open a Case created from Telegram/Kakao inbound
3. Review AI draft and approve
4. Watch Schedule / Activity / Document side effects
5. Confirm operational state in Inbox / Settings
```

이건 심사위원뿐 아니라 다른 AI agent에게도 작업 우선순위를 바로 알려준다.

### D. README에서 "기술"보다 "운영 흐름"을 먼저 보여준다

Paperclip가 잘하는 점은 orchestration semantics를 먼저 보여준다는 점이다.

우리도 같은 식으로 정리해야 한다.

권장 그림:

```text
Inbound message
  -> Case created
  -> Agent run
  -> Approval
  -> Schedule / Document / Outbound
  -> Activity / Notification
```

이 한 장이면, PRD를 안 읽어도 제품 핵심을 안다.

---

## 그대로 가져오면 안 되는 것

### 1. 철학 문구의 과장

Paperclip는 `zero-human companies`를 밀어도 된다. 그 제품은 그 포지셔닝이 맞다.

우리 제출에서는 이걸 그대로 가져오면 안 된다.

이유:

- 교육 도메인에서는 사람 승인과 책임이 더 중요하다
- 심사에서 "완전자율"보다 "운영 통제 + 안전"이 더 설득력 있다
- 지금 제품도 실제로는 approval-heavy control plane이다

따라서 우리 메시지는:

- `human-out-of-the-loop`가 아니라
- `human-on-the-loop` 또는 `approval-driven operations`

에 맞춰야 한다.

### 2. 로드맵 과다 약속

Paperclip README는 roadmap가 길다. 오픈소스 프로젝트로는 좋다.

하지만 제출 깃에서는 과도한 roadmap가 오히려 해가 된다.

왜냐하면:

- 구현 안 된 미래 약속이 많아 보이면 신뢰가 떨어진다
- 심사위원은 "오늘 되는 것"을 보고 싶다

따라서 우리 제출 README의 roadmap는 길게 쓰지 말고, 최대 3개만 둔다.

- live onboarding hardening
- external channel proof
- knowledge/doc automation expansion

### 3. 범용 multi-company 서사

Paperclip는 multi-company control plane이 중심이다.

우리 MVP는 다르다.

- 현재는 **학원 운영 OS**
- 다기관 격리는 아키텍처 특성이지, 제출 메시지의 주연이 아니다

그래서 README 메인 카피에서 `multi-company`를 앞세우지 말고,
필요하면 아키텍처 특징으로만 짧게 넣는다.

---

## 우리 제출 저장소에 대한 구체적 적용안

### 1. 새 root README에 넣을 문장 뼈대

권장 첫 5문장:

1. `HagentOS is an AI agent orchestration platform for Korean education operations.`
2. `It is not a chatbot. It is an approval-driven control plane for complaints, exceptions, scheduling, and follow-up work.`
3. `A principal gives a one-line instruction or receives an inbound message; HagentOS turns it into a Case, routes it to the right agent, and surfaces an approval with auditable side effects.`
4. `The MVP is focused on private academy operators.`
5. `The judge demo proves Telegram/Kakao inbound, case routing, approval, scheduling, outbound follow-up, and operational visibility in one loop.`

### 2. AGENTS.md의 read order

권장 순서:

1. `03_제품/hagent-os/README.md`
2. `03_제품/hagent-os/02_product/prd.md`
3. `03_제품/hagent-os/02_product/mvp-scope.md`
4. `03_제품/hagent-os/09_ux/domain-ux-paperclip-gap.md`
5. `/Users/river/workspace/active/hagent-os/docs/handoff/2026-04-13-full-regression.md`

이 순서는 좋은 이유가 있다.

- 제품 정의
- 스코프
- UX 방향
- 실제 구현/회귀 상태

즉, 추상 -> 구체 -> 검증 순으로 내려간다.

### 3. 제출 직전 verification section

Paperclip AGENTS처럼, 우리도 끝내기 전에 실행할 것을 짧게 고정해야 한다.

권장:

```bash
npm exec pnpm -- --filter @hagent/server typecheck
npm exec pnpm -- --filter @hagent/ui typecheck
corepack pnpm --filter @hagent/ui exec vite build
curl http://127.0.0.1:3200/api/health
curl 'http://127.0.0.1:3200/api/adapters?orgId=be70ebc8-3b55-4ff3-827a-264f06c4d2ee'
```

그리고 README 또는 AGENTS에 반드시 써야 한다.

- 미검증 항목은 명시
- outbound proof는 별도 증적 링크로 관리

### 4. 제출 심사에서 바로 먹히는 비교 포인트

Paperclip 대비 HagentOS의 차별점은 기술 스택이 아니라 **도메인 번역 수준**이다.

README/발표에서 아래를 세게 말하는 게 좋다.

- Paperclip는 company orchestration generalist
- HagentOS는 Korean education operations specialist
- 우리는 `Case`, `Approval`, `Schedule`, `Document`, `Policy`, `Channel bridge`를 교육 운영 맥락으로 엮었다

즉, `paperclip clone`이 아니라:

- `paperclip의 control-plane 철학을 한국 교육 운영에 재구성한 제품`

으로 말해야 한다.

---

## 우선순위 제안

### P0

- 제출용 root `README.md` 재작성
- 루트 `AGENTS.md` 추가 또는 정리
- `Demo in 90 seconds` 섹션 추가

### P1

- `What HagentOS is not` 섹션 추가
- `Problems solved` 표 추가
- 검증 명령과 live URL 정리

### P2

- GIF/스크린샷 hero
- Quickstart 더 짧게 정리
- 문서 링크를 `judge / product / code` 세 갈래로 정리

---

## 최종 판단

Paperclip에서 가장 많이 배워야 하는 것은 orchestration feature가 아니라 **저장소가 스스로를 설명하는 discipline**이다.

우리 제출 깃은 이미 구현과 문서가 풍부하다.  
지금 더 필요한 것은:

- 첫 화면에서 제품이 뭔지 바로 이해시키는 README
- AI/사람이 같은 정본을 읽게 하는 AGENTS
- 심사위원이 따라가기 쉬운 demo narrative

한 줄로 정리하면:

> Paperclip에게서 가져와야 할 것은 "agent 회사"라는 철학 자체보다,  
> **그 철학을 저장소 첫 화면과 기여 규칙으로 압축하는 방식**이다.

