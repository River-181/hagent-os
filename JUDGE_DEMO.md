# HagentOS 심사 시연 가이드

> 이 문서는 심사위원이 **짧은 시간 안에 제품 가치를 이해하고, 실패 없이 데모를 따라갈 수 있게** 만드는 정본 가이드입니다.

## 심사 빠른 시작

- 심사 진입 URL: `https://hagent-os.up.railway.app/tanzania-english-academy/dashboard`
- 서비스 기본 URL: `https://hagent-os.up.railway.app`
- 고객 응대 텔레그램 봇: [@TANZANIA_ENGLISH_ACADEMY_bot](https://t.me/TANZANIA_ENGLISH_ACADEMY_bot)
- 운영·원장 제어 텔레그램 봇: `@hagent_os_ops_bot` (`/login hagent2026`)
- 카카오 채널: `pf.kakao.com/_raDdX`
- 데모 조직: 탄자니아 영어학원 데모 조직 사전 로드
- 구현 및 증빙: [docs/JUDGE_EVIDENCE.md](./docs/JUDGE_EVIDENCE.md)
- 공개 로드맵: [ROADMAP.md](./ROADMAP.md)
- 개인정보 안내: [PRIVACY.md](./PRIVACY.md)
- 라이선스: [LICENSE](./LICENSE)

## 생각 없이 따라하기

아래 순서만 그대로 따라가면 됩니다.

1. 웹 열기
   `https://hagent-os.up.railway.app/tanzania-english-academy/dashboard`
2. 고객 봇 열기
   `https://t.me/TANZANIA_ENGLISH_ACADEMY_bot`
3. 고객 봇에 보내기
   `이번 주 보강 필요한 학생 정리해줘`
4. 운영 봇 열기
   `@hagent_os_ops_bot`
5. 운영 봇에 먼저 보내기
   `/login hagent2026`
6. 로그인 뒤 운영 봇에 보내기
   `미승인 보여줘`

중요:

- 운영 봇은 `/start` 보다 `/login hagent2026` 를 바로 보내는 것이 가장 확실합니다.
- 심사 중 막히면 다시 웹으로 돌아가 `Dashboard -> Cases -> Approvals` 순서로 보면 됩니다.
- 최종 제출 GitHub URL은 `https://github.com/River-181/hagent-os` 입니다.

## 채널 봇 추천 시나리오

고객 응대 봇 추천 입력:

```text
이번 주 보강 필요한 학생 정리해줘
```

```text
이수아 학생 최근 출결 현황 알려줘
```

```text
환불 문의가 들어왔는데 먼저 확인할 항목 알려줘
```

```text
학부모 상담 가능한 시간대 안내 문구 초안 만들어줘
```

운영·원장 제어 봇 추천 입력:

```text
/login hagent2026
```

```text
미승인 보여줘
```

```text
최근 케이스 보여줘
```

```text
오늘 일정 보여줘
```

운영 봇은 approval queue와 운영 제어 성격을 보여주는 채널이므로, 심사 중에는 `미승인 보여줘` 와 `오늘 일정 보여줘` 두 개만 해도 충분합니다.

추천 순서:

1. `Dashboard`
2. `Cases`
3. `Approvals`
4. 고객 텔레그램 입력 시연
5. 필요하면 운영 봇 로그인 후 승인 시연
6. `Agents`

## 심사 포인트

심사에서 가장 강한 증거는 아래 세 가지입니다.

1. **채널 입력이 `Case` 로 구조화되는가**
2. **AI가 draft와 근거를 만들고 승인 게이트를 거치는가**
3. **승인 이후 메시지·일정·문서·활동 로그 같은 결과가 남는가**

한 줄 컨셉:

**학원 운영의 비정형 예외를 승인 가능한 AI workflow로 바꾸는 control plane**

즉, 핵심 흐름은 이것입니다.

`message -> case -> draft -> approval -> side effect`

## 90초 시연 순서

### 1. `Dashboard`

경로: `/{org}/dashboard`

확인 포인트:

- 현재 운영 상태
- 최근 케이스
- 위험 학생 또는 운영 요약

심사 포인트:

- 첫 화면에서 "학원 운영 보드" 라는 제품 포지션이 바로 읽혀야 합니다.

### 2. `Case Detail`

경로: `/{org}/cases`

추천 행동:

- 최근 케이스 1개를 엽니다.
- `agentDraft`, 타임라인, 코멘트, 발송 이력을 확인합니다.

심사 포인트:

- 단순 대화 로그가 아니라 **Case 단위로 구조화된 운영 기록** 이라는 점을 보여줍니다.

### 3. `Approval Queue`

경로: `/{org}/approvals`

확인 포인트:

- 승인 대기 항목
- 승인 후 발송·후속조치 상태

심사 포인트:

- "완전 자동" 이 아니라 **승인 가능한 자동화** 라는 점을 증명합니다.

### 4. 텔레그램 봇

고객 응대 봇:

- [@TANZANIA_ENGLISH_ACADEMY_bot](https://t.me/TANZANIA_ENGLISH_ACADEMY_bot)
- 역할: 문의 수신, inbound 생성, 새 `Case` 시작

운영·원장 제어 봇:

- `@hagent_os_ops_bot`
- 역할: 미승인 확인, 승인, 상태 변경, `Confirm / Cancel`
- 공개 데모 로그인: `/login hagent2026`
- `/start` 또는 `도움말`을 보내면 로그인 안내를 다시 받을 수 있습니다.
- 공개 데모이므로 실제 학생 개인정보나 민감정보 입력은 피하는 것을 권장합니다.

고객 응대 봇 추천 메시지:

```text
이수아 학생 최근 출결 현황 알려줘
```

또는

```text
이번 주 보강 필요한 학생 정리해줘
```

운영 봇 추천 명령:

```text
/login hagent2026
```

그 다음

```text
미승인 보여줘
```

또는

```text
케이스 C-101 승인
```

확인 포인트:

- 봇 응답
- 새 `Case` 생성 또는 승인 반영 여부
- 웹 UI에 방금 요청이 반영되는지

심사 포인트:

- 채널 입력과 웹 control plane 이 실제로 연결돼 있음을 보여줍니다.

## 개인정보 안내

- 공개 데모는 seeded data와 마스킹된 예시 데이터를 우선 사용합니다.
- 심사 중 입력한 메시지나 명령은 case, approval, activity 검증을 위해 일시적으로 처리될 수 있습니다.
- 실제 학생 연락처, 건강정보, 결제정보 같은 민감정보는 입력하지 않는 것이 원칙입니다.
- 자세한 내용은 [PRIVACY.md](./PRIVACY.md)를 확인해 주세요.

## 3분 확장 시연

시간이 더 있으면 아래를 추가로 보여주면 좋습니다.

### `Agents`

경로: `/{org}/agents`

확인 포인트:

- Orchestrator와 전문 Agent 분리
- 실행 이력
- 메모리·인사이트

### `Inbox` 또는 `Activity`

경로: `/{org}/inbox` 또는 `/{org}/activity`

확인 포인트:

- 승인 요청, 운영 알림, 처리 흐름이 하나의 제품 경험으로 묶여 있는지

### `Settings`

경로: `/{org}/settings`

확인 포인트:

- Telegram, Kakao 같은 채널 구성이 단순 mock 화면이 아니라 제품 구조 안에 들어와 있는지
- 텔레그램이 `고객 bot` 과 `원장 bot` 역할로 분리되어 있는지

## 심사 항목과 연결

| 심사 항목 | HagentOS에서 볼 것 |
| --- | --- |
| 기술적 완성도 | `Cases`, `Approvals`, 채널 입력 후 반영 흐름 |
| AI 활용 능력 | `agentDraft`, Agent 역할 분리, 메모리·인사이트 |
| 기획력·실무 접합성 | 민원, 보강, 재등록 위험 같은 실제 학원 운영 문제 |
| 창의성 | 단일 챗봇이 아니라 agent team + approval gate 구조 |

## 라이브가 느리거나 실패할 때

라이브 환경이 불안정해도 심사를 실패시키지 않도록 아래 순서를 따릅니다.

1. `Dashboard` 와 `Cases` 에 이미 적재된 seeded data를 먼저 보여줍니다.
2. `Approvals` 에서 승인 흐름을 보여줍니다.
3. 고객 텔레그램 실연이 지연되면 "실제 채널 입력도 이 흐름으로 들어온다"는 점만 짧게 설명하고 seeded case로 이어갑니다.
4. 운영 봇이 필요하면 `/login hagent2026` 후 승인 장면을 보여줍니다.
5. 필요하면 [docs/JUDGE_EVIDENCE.md](./docs/JUDGE_EVIDENCE.md) 와 검증 메모를 함께 보여줍니다.

즉, **채널 실연이 실패해도 제품 핵심은 웹에서 증명 가능** 해야 합니다.

## 로컬 fallback

라이브 URL 대신 로컬 실행이 필요할 때:

```bash
git clone https://github.com/River-181/hagent-os.git
cd hagent-os
cp .env.example .env
pnpm install
pnpm dev
```

`.env` 예시:

```bash
DEMO_MODE=true
PORT=3200
```

기본 URL:

- UI: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:3200`

## 데모 데이터 기준

현재 데모에서는 아래 범주의 데이터가 보이도록 설계되어 있습니다.

- 학생
- 강사
- 수업 일정
- 케이스
- 정책·문서
- 에이전트

정확한 수량보다 중요한 것은, 이 데이터가 **운영 흐름을 설명할 만큼 연결되어 있는가** 입니다.

## 현재 알려진 제한

- `DEMO_MODE=true` 에서는 일부 AI 응답이 mock 기반입니다.
- 실채널 자동 발송은 안전을 위해 게이트가 있을 수 있습니다.
- 외부 연동 품질은 채널 설정과 런타임 상태에 따라 달라질 수 있습니다.
- 일부 외부 조회는 `cached fallback` 으로 보일 수 있습니다.
- 운영 봇은 owner control 채널이지만, 공개 데모 비밀번호 `hagent2026` 으로 로그인 가능한 상태를 기준으로 안내합니다.

## 한 줄 마무리

HagentOS는 "AI가 답한다"가 아니라, **AI 에이전트 팀이 학원 운영 업무를 구조화하고 사람은 승인에 집중하게 만드는 제품** 입니다.
