# HagentOS 구현 및 증빙

> 이 문서는 심사자가 제품 소개를 본 뒤, **우리가 실제로 어떻게 만들고 검증했는지** 빠르게 확인할 수 있게 만든 요약 증빙 문서입니다.

## 핵심 컨셉

HagentOS의 핵심 컨셉은 아래 한 줄입니다.

**학원 운영의 비정형 예외를 승인 가능한 AI workflow로 바꾸는 control plane**

즉, 우리는 "AI가 답변한다"보다 아래 흐름을 제품으로 만들고자 했습니다.

`message -> case -> draft -> approval -> side effect`

## 우리가 해결하려던 문제

- 학원 운영의 병목은 출결·수납 자체보다 **민원, 보강, 휴원, 재등록 위험, 공지 발송** 같은 예외 처리에 있습니다.
- 이 업무는 메신저, 전화, 엑셀, 담당자 기억에 흩어져 있습니다.
- 그래서 단순 챗봇이 아니라 **기록, 승인, 후속조치가 남는 운영 workflow** 가 필요했습니다.

## 실제로 만든 것

- `Dashboard`
  운영 현황, 최근 케이스, 위험 학생 요약
- `Cases`
  채널 입력이 구조화된 운영 단위
- `Approvals`
  승인 대기와 후속 발송 상태
- `Agents`
  Orchestrator와 전문 Agent 구조
- `Channels`
  Telegram / Kakao 기반 운영 입력

## 우리가 증명하려는 흐름

이번 심사 기준으로 특히 중요한 증명 흐름은 아래입니다.

1. 채널 입력 또는 운영자 지시
2. `Case` 생성
3. Agent draft 생성
4. 승인 요청
5. 승인 후 `schedule / outbound / document / activity` 반영

## 우리가 어떻게 일했는가

이번 작업은 단순 구현보다, **기획과 구현과 증빙을 하나의 흐름으로 연결하는 방식** 에 가깝게 진행했습니다.

핵심 작업 순서는 아래와 같습니다.

1. 문제 정의와 심사 메시지를 정리한다.
2. 제품 흐름을 `message -> case -> draft -> approval -> side effect` 로 고정한다.
3. 코드와 화면을 그 흐름에 맞게 보강한다.
4. 실제 화면, 채널, 승인 흐름을 검증한다.
5. README와 심사 문서를 통해 제품과 작업 과정을 함께 보여준다.

즉, 이번 프로젝트는 단순히 기능 목록을 쌓은 것이 아니라, **Pain -> Workflow -> Proof** 구조로 정리된 제출물입니다.

## Obsidian을 어떻게 활용했는가

Obsidian은 이번 프로젝트에서 단순 노트 앱이 아니라 **작업 관제판** 역할을 했습니다.

- 기획 문서
  학원 운영 pain point, 사용자 시나리오, 심사 포인트를 정리했습니다.
- 제품 구조 문서
  `Dashboard`, `Cases`, `Approvals`, `Agents`, `Channels` 관계를 정리했습니다.
- 증빙 원장
  무엇을 구현했고 무엇을 검증했고 어떤 리스크가 남았는지 누적 기록했습니다.
- 제출 패키지 문서
  README, 심사 시나리오, 체크리스트, AI 리포트 준비물을 연결했습니다.
- 일일 작업 로그
  날짜별 결정 사항, 변경점, 확인 항목을 남겼습니다.

README 첫 화면의 Obsidian 그래프 이미지는 "우리가 이 제품을 어떻게 조직적으로 만들었는가" 를 한 장으로 보여주는 증거입니다.

## 사용한 도구와 역할

제품 제작과 개선에 사용한 대표 도구는 아래와 같습니다.

- `Claude Code`
  구현 보강, 문서 정리, 회귀 대응, 제출 패키지 보완
- `Codex`
  저장소 점검, README/JUDGE/AGENTS 재구성, 심사용 문서 품질 개선
- `Anthropic Claude API`
  실제 제품의 AI draft와 reasoning 흐름
- `Playwright`
  화면 흐름 점검, 시연 경로 검증, 기능 확인
- `Obsidian`
  기획, 전략, 증빙, 제출 문서, 작업 로그 연결

도구를 나열하는 것보다 중요한 점은, 이 도구들을 **역할별로 나눠 같은 목표를 향해 사용했다** 는 것입니다.

## 공개 문서 패키지 구성

심사자 기준 공개 문서 패키지는 아래 네 문서로 정리했습니다.

1. [README.md](../README.md)
2. [JUDGE_DEMO.md](../JUDGE_DEMO.md)
3. [ROADMAP.md](../ROADMAP.md)
4. [docs/JUDGE_EVIDENCE.md](./JUDGE_EVIDENCE.md)

이 구조는 제품 이해 -> 시연 흐름 -> 앞으로의 방향 -> 구현 증빙 순서로 읽히도록 맞춘 것입니다.

## 채널 구성 증빙

심사 시나리오 기준으로 텔레그램은 두 역할로 분리되어 있습니다.

- 고객 응대 봇 `@TANZANIA_ENGLISH_ACADEMY_bot`
  문의 수신과 case 시작
- 운영·원장 제어 봇 `@hagent_os_ops_bot`
  승인 확인, 승인 실행, 운영 명령 처리
- 공개 데모 로그인 비밀번호: `hagent2026`

운영·원장 제어 봇은 owner control 채널이지만, 공개 데모에서는 `/login hagent2026` 으로 직접 진입할 수 있게 안내합니다. 즉, 심사자는 웹 UI와 고객 봇뿐 아니라 운영 봇 승인 흐름도 직접 확인할 수 있습니다.

즉, 채널도 단순 수신 창구가 아니라 **고객 입력 채널** 과 **운영 제어 채널** 로 분리해 설계했습니다.

## 라이선스 및 개인정보 처리 원칙

- 코드와 공개 문서는 [MIT License](../LICENSE) 기준으로 공개합니다.
- 공개 데모는 seeded data와 마스킹된 예시 데이터를 우선 사용합니다.
- 심사자가 입력한 봇 메시지와 명령은 case, approval, activity 검증 범위에서 일시적으로 처리될 수 있습니다.
- 실제 학생 개인정보, 연락처, 결제정보, 건강정보 같은 민감정보는 입력하지 않는 것을 원칙으로 둡니다.
- 자세한 공개 데모 안내는 [PRIVACY.md](../PRIVACY.md)를 참조합니다.

## 검증 요약

`docs/handoff/2026-04-13-master-evidence.md` 기준 핵심 사실:

- `server typecheck` 통과
- `ui typecheck` 통과
- 온보딩, Students, `channel -> case`, `approval -> schedule`, `quick-ask -> document`, `routine trigger` 흐름 검증
- 비용 요약 집계 가능
- 외부 연동은 `live / fallback / missing` 관점으로 설명 가능

## 심사 내러티브

심사에서 점수를 더 받기 위한 내러티브는 아래가 가장 강합니다.

1. **Pain**
   학원 운영의 비정형 예외 처리 문제를 제시
2. **Workflow**
   `message -> case -> draft -> approval -> side effect`
3. **Proof**
   실제 UI, 채널 입력, approval queue, evidence 문서, toolchain

즉, 제품 소개와 작업 증빙을 따로 떼지 말고 **한 줄기 서사** 로 보여주는 것이 중요합니다.

## 주요 원본 문서

- [README.md](../README.md)
- [JUDGE_DEMO.md](../JUDGE_DEMO.md)
- [ROADMAP.md](../ROADMAP.md)
- [docs/handoff/2026-04-13-master-evidence.md](./handoff/2026-04-13-master-evidence.md)
- [docs/handoff/2026-04-13-final-3-day-roadmap.md](./handoff/2026-04-13-final-3-day-roadmap.md)

## 메모

- 이 문서는 raw 작업 로그 전체를 보여주기 위한 것이 아닙니다.
- 목적은 심사자가 "이 팀이 제품도 만들었고, 실제로 검증도 했다"는 점을 빠르게 이해하게 하는 것입니다.
