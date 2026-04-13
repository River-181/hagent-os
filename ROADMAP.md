# HagentOS Roadmap

> 이 문서는 공개용 로드맵입니다. 내부 작업 메모가 아니라, **지금 어디까지 왔고 다음에 무엇을 강화할지** 를 심사자와 협업자가 빠르게 이해하도록 정리한 문서입니다.

## 현재 위치

HagentOS는 이미 아래 핵심 흐름을 보여줄 수 있는 상태를 목표 기준으로 삼고 있습니다.

`message -> case -> draft -> approval -> side effect`

즉, 우리는 단순한 챗봇보다 **학원 운영의 비정형 예외를 끝까지 처리하는 운영 관제판** 을 만드는 데 집중하고 있습니다.

## 1단계. 심사 흐름 고정

목표:

- `Dashboard -> Cases -> Approvals` 흐름이 흔들리지 않게 만든다.
- 텔레그램 입력, 승인, 후속조치 반영이 심사 장면에서 자연스럽게 이어지게 만든다.
- seeded data와 live input을 함께 설명할 수 있게 만든다.

핵심 항목:

- 운영 보드 첫인상 강화
- `Case detail`과 `Approval queue` 정합성 강화
- 고객 bot / 운영 bot 역할 구분 명확화
- 심사 문서와 실서비스 URL 정리
- fallback 문구와 시연 순서 고정

## 2단계. 운영 채널과 실서비스 완성도 강화

목표:

- 웹 UI, 텔레그램, 카카오, 일정 반영 흐름이 더 안정적으로 연결되게 만든다.
- 심사 이후에도 실운영 데모가 가능한 수준으로 채널과 상태 관리를 강화한다.

핵심 항목:

- Telegram customer / owner control 흐름 안정화
- Kakao outbound 연결성 강화
- `approval -> schedule / outbound / document / activity` 추적성 강화
- degraded / fallback / missing 상태를 더 명확하게 표현
- 운영 로그와 최근 활동 가독성 개선

## 3단계. 학원 운영 control plane 확장

목표:

- 단발성 데모가 아니라, 학원 운영 전반을 다루는 제품으로 확장한다.

핵심 항목:

- 더 많은 정책·운영 문서 기반 답변
- 재등록 위험, 민원, 일정 충돌 같은 예외 처리 고도화
- 운영 메모리와 인사이트 강화
- 문서, 일정, 채널 후속조치 자동화 확장
- 관리자와 운영자가 함께 쓰는 협업 흐름 강화

## 진행 원칙

- 보기 좋은 기능보다 **끊기지 않는 흐름** 을 우선한다.
- 기능 나열보다 **문제 -> 흐름 -> 증거** 를 먼저 보여준다.
- AI는 자동화 엔진이 아니라 **승인 가능한 운영 초안 생성기** 로 사용한다.
- 제품 소개와 작업 증빙을 분리하지 않는다.

## 함께 보면 좋은 문서

- [README.md](./README.md)
- [JUDGE_DEMO.md](./JUDGE_DEMO.md)
- [docs/JUDGE_EVIDENCE.md](./docs/JUDGE_EVIDENCE.md)
- [docs/handoff/2026-04-13-final-3-day-roadmap.md](./docs/handoff/2026-04-13-final-3-day-roadmap.md)
