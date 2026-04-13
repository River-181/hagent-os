# HagentOS

> **AI agent orchestration platform for Korean education operations**
> **Package snapshot:** `2026-04-13`

이 저장소는 **HagentOS 대회 워크스페이스 패키지**입니다.
제품 소개만 담은 README가 아니라, 기획 정본, 증빙, 심사 시나리오, 제출 문서, 대회 시점 코드 스냅샷을 함께 묶은 공유용 패키지입니다.

최신 구현 정본은 별도 제품 저장소를 기준으로 봅니다.

- latest runnable product: `River-181/hagent-os`
- contest-time code snapshot: `03_제품/app/`
- package guide: [SHARE-PACKAGE.md](SHARE-PACKAGE.md)

## Product Summary

HagentOS는 한국 교육기관, 특히 학원 운영자가 반복적인 운영 업무를 AI agent team에 위임하고 사람은 승인과 예외 판단에 집중할 수 있게 만드는 운영 OS입니다.

```text
Inbound message / operator instruction
  -> Case created
  -> Agent run
  -> Approval
  -> Schedule / Document / Outbound
  -> Activity / Notification
```

핵심은 "AI가 답한다"가 아니라, **운영 단위가 Case로 남고 승인과 후속조치까지 추적된다**는 점입니다.

## What It Is Not

- Not a chatbot
- Not a generic workflow builder
- Not a single-agent copilot
- Not a school ERP replacement

HagentOS는 질문응답용 assistant가 아니라, **교육 운영 후속처리를 AI agent team이 분담하는 control plane**입니다.

## Demo In 90 Seconds

1. `Dashboard`에서 현재 운영 상태를 봅니다.
2. `Cases`에서 Telegram/Kakao inbound로 생성된 케이스를 엽니다.
3. AI draft를 확인하고 승인합니다.
4. `Schedule / Document / Activity` side effect를 확인합니다.
5. `Inbox / Settings`에서 운영 상태와 채널 연결을 봅니다.

핵심 심사 문서:

- [제품 README](03_제품/hagent-os/README.md)
- [제출 직전 라이브 최종 검증](05_제출/live-final-verification.md)
- [제출 체크리스트](05_제출/submission-checklist.md)

## Live Demo

- Live URL: `https://hagent-os.up.railway.app`
- 고객 상담 bot: `@TANZANIA_ENGLISH_ACADEMY_bot`
- 운영 승인 bot: `@hagent_os_ops_bot`
- 제출 직전 검증 기록: [05_제출/live-final-verification.md](05_제출/live-final-verification.md)

## Read This First

외부 공유 기준으로는 아래 순서가 가장 깔끔합니다.

1. [SHARE-PACKAGE.md](SHARE-PACKAGE.md)
2. [03_제품/hagent-os/README.md](03_제품/hagent-os/README.md)
3. [03_제품/hagent-os/02_product/prd.md](03_제품/hagent-os/02_product/prd.md)
4. [03_제품/hagent-os/02_product/mvp-scope.md](03_제품/hagent-os/02_product/mvp-scope.md)
5. [03_제품/hagent-os/09_uxui/domain-ux-paperclip-gap.md](03_제품/hagent-os/09_uxui/domain-ux-paperclip-gap.md)
6. [05_제출/live-final-verification.md](05_제출/live-final-verification.md)

## Browse Modes

### General Markdown

`README.md` → `SHARE-PACKAGE.md` → `03_제품/hagent-os/README.md` → `05_제출/`

### Obsidian

`00 HOME.md` → `_MOC/` → 각 섹션 문서

## Run The Latest Product

이 패키지는 실행용 저장소가 아닙니다. 최신 구현을 실행하려면 **별도 제품 저장소**를 사용해야 합니다.

```bash
git clone https://github.com/River-181/hagent-os
cd hagent-os
pnpm install
pnpm dev
```

기본 포트:

- server: `3200`
- ui: `5174`

헬스 체크:

```bash
curl http://127.0.0.1:3200/api/health
```

참고:

- 이 패키지의 `03_제품/app/`은 대회 시점 코드 스냅샷입니다.
- 최신 동작 기준은 구현 저장소의 `docs/handoff/2026-04-13-full-regression.md`와 라이브 검증 기록을 함께 봅니다.

## Repository Map

```text
.
├── 00 HOME.md                    # package home
├── 01_대회정보/                   # 대회 규칙, 일정, 심사 자료
├── 02_전략/                       # 문제 정의, 전략, 의사결정
├── 03_제품/                       # 제품 문서 정본 + 코드 스냅샷
├── 04_증빙/                       # AI 활용 및 개발 증빙
├── 05_제출/                       # 최종 제출물
├── 06_LLM위키/                    # 장기 지식 베이스
├── _MOC/                         # Obsidian navigation
├── _system/                      # 운영 대시보드, 팀 세팅, 툴 문서
├── .agent/                       # AI 협업 운영 규칙
└── .claude/                      # Claude runtime adapter
```

## Evidence And Submission

- [master-evidence-ledger.md](04_증빙/01_핵심로그/master-evidence-ledger.md)
- [ai-report-final.md](05_제출/ai-report-final.md)
- [live-final-verification.md](05_제출/live-final-verification.md)
- [submission-checklist.md](05_제출/submission-checklist.md)

이 패키지는 제품 설명만이 아니라, **왜 이 제품을 만들었고 어떻게 검증했고 무엇을 제출했는지**까지 한 번에 전달하는 구조입니다.

## Asset Conventions

- `assets/excaildraw/`: Excalidraw source files (legacy directory name retained)
- `03_제품/hagent-os/diagrams/`: 공유 문서에 쓰는 rendered diagrams
- `assets/screenshots/`: 제품 화면 증빙 스크린샷
- `assets/pdf/`: 대회 안내 PDF, 동의서, 각서 등 제출 부속 파일

한 줄 요약:

> HagentOS는 Paperclip의 control-plane 철학을 한국 교육 운영 맥락으로 재구성한 제품이며, 이 저장소는 그 대회 제출 패키지다.
