---
tags:
  - area/evidence
  - type/log
  - status/active
date: 2026-04-06
up: "[[_04_증빙_MOC]]"
---
# 의사결정 기록

> DEC-NNN 형식.
> [[master-evidence-ledger]]에서 중요한 의사결정만 승격 기록한다.

## DEC-001: 워크스페이스 구조 — 옵시디언 볼트 기반 평탄 구조
- 날짜: 2026-04-06
- 결정: 루트에 번호 폴더 5개(01~05) + assets/app/tests 평탄 구조 채택
- 대안: 플레이북 제안 docs/ 하위 8개 폴더 중첩 구조
- 근거: 옵시디언 탐색/그래프뷰 최적화, 한국어 디렉토리명으로 사람 친화성
- AI 역할: Claude Opus가 구조 설계, Plan agent가 상세 검토
- 영향: 모든 MOC, 에이전트 참조 경로에 반영

## DEC-002: .cursor/ 대신 .agent/ 사용
- 날짜: 2026-04-06
- 결정: 에이전트 공용 설정 디렉토리를 `.agent/`로 명명
- 대안: `.cursor/rules/` (Cursor IDE 전용)
- 근거: 사용자 지시 — 특정 도구에 종속되지 않는 에이전트 중립 공간
- AI 역할: 사용자가 직접 결정
- 영향: AGENTS.md와 공용 규칙이 .agent/에 위치

## DEC-003: 공유 맥락을 .context/에 배치
- 날짜: 2026-04-06
- 결정: 메모리, 플러그인 목록, MCP 설정을 프로젝트 내 `.context/`에 저장
- 대안: 개인 로컬 `~/.claude/memory/`에만 저장
- 근거: 다른 팀원도 동일한 맥락을 공유해야 함 — 독립적 공간 원칙
- AI 역할: 사용자가 지적 → Claude가 구현
- 영향: 모든 팀원·에이전트가 동일 맥락에서 작업 가능

## DEC-004: 엑셀 트래커 → 마크다운 전환 결정
- 날짜: 2026-04-06
- 결정: KEG_AI_Prompt_Tracker.xlsx의 40컬럼 스키마를 마크다운 증빙 시스템으로 전환
- 대안: 엑셀 계속 사용
- 근거: AI 에이전트 자동 append 불가, git diff 불가, 옵시디언 연동 불가
- AI 역할: Claude Opus가 스키마 분석 → 마크다운 전환 설계
- 영향: ai-usage-log 컬럼 확장, session-log/tool-log/evolution-log 신규 생성 예정

## DEC-005: 포터블 스킬 공간 (.claude/skills/) 도입
- 날짜: 2026-04-06
- 결정: 프로젝트 전용 커스텀 스킬을 `.claude/skills/`에, 글로벌 플러그인은 `setup.sh`로 원커맨드 설치
- 대안: 글로벌 설치에만 의존
- 근거: 사용자 지시 — "이 폴더를 다른 컴퓨터에 옮겨도 그대로 작동해야 한다"
- AI 역할: 사용자가 지시 → Claude가 구현
- 영향: setup.sh, portable-config.md, skills/ 디렉토리 생성

## DEC-006: PLAN.md + PROGRESS.md 멀티에이전트 조율 체계 도입
- 날짜: 2026-04-06
- 결정: 루트에 PLAN.md(할 일)와 PROGRESS.md(진행상황)를 두고, 모든 에이전트가 시작 시 읽도록 CLAUDE.md + AGENTS.md에 프로토콜 추가
- 대안: 각 에이전트가 독립적으로 작업 (동기화 없음)
- 근거: Codex 평가 "다중 AI 맥락 유실 위험" + 사용자 지시 "에이전트가 새로 시작할 때 무슨 일을 해야 하는지 알 수 있게"
- AI 역할: 사용자 + Codex 지적 → Claude 구현
- 영향: 모든 AI가 현재 상태와 할 일을 즉시 파악 가능

## DEC-007: `.agent/system/`을 공용 운영 정본으로 채택
- 날짜: 2026-04-06
- 결정: 공용 운영 계약, 메모리, 레지스트리, 맵, 시스템 로그를 `.agent/system/` 아래에서 관리
- 대안: 루트 `system/` 디렉토리 생성, `.context/` 유지
- 근거: 사용자 지시 — 공용 정보가 `.agent` 아래에 모여야 인지 부조화와 정합성 문제가 줄어듦
- AI 역할: 사용자 방향 제시 → Codex 설계/구현
- 영향: `.claude`는 미러/어댑터, `.context`는 과도기 리다이렉션으로 재정의

## DEC-008: `04_증빙/`을 AI 리포트 재료 정본으로 확정
- 날짜: 2026-04-06
- 결정: 리포트, 회고, 결과보고서에 사용할 사실과 근거는 최종적으로 반드시 `04_증빙/`에 존재해야 함
- 대안: 메모리 정본 후 리포트 직전 일괄 이관
- 근거: 사용자 지시 — 메모리에만 있고 증빙에 없는 누락을 허용하면 리포트 품질이 무너짐
- AI 역할: 사용자 방향 제시 → Codex 정책화
- 영향: 세션 종료 시 Evidence Gate 필수, `Pending Evidence` 상태 도입

## DEC-009: 루트 최소화, `.context` 제거, `.claude` 최소 어댑터화
- 날짜: 2026-04-06
- 결정: 운영 파일은 `.agent/system/ops/`로 이동하고, `.claude/agents`, `.claude/rules`, `.claude/skills`는 `.agent/`로 흡수하며, `.context/`는 제거
- 대안: 기존 루트 `PLAN.md`, `PROGRESS.md`, `project-manager.md` 유지 + `.context` 리다이렉션 유지
- 근거: 사용자 지시 — 루트 혼란을 줄이고, 모든 실질 운영 자산을 `.agent`로 수렴해야 함
- AI 역할: 사용자 방향 제시 → Codex가 물리 이동과 경로 정합성 수정 수행
- 영향: 루트는 사람용 진입점 위주로 단순화, `.claude`는 최소 호환 레이어만 유지, 제품 구현 공간은 `03_제품/app`, `03_제품/tests`로 정리

## DEC-010: memory/maps/evidence를 초심자 기준으로 단순화
- 날짜: 2026-04-06
- 결정: memory는 `MEMORY.md + long-term-memory.md + daily-memory.md` 3파일로, maps는 `workspace-atlas.md` 1파일로, 증빙은 `01_핵심로그 / 02_분석자료 / 03_daily` 3구역으로 정리
- 대안: 기존 분할 구조 유지
- 근거: 사용자 지시 — 처음 보는 사용자도 바로 이해할 수 있어야 하고 파일 수를 줄여야 함
- AI 역할: 사용자 방향 제시 → Codex가 통합 구조 설계, 파일 이동, 경로 정합성 수정, `workspace-sync` 스킬 생성
- 영향: 운영 구조 학습 비용 감소, 세션 종료 동기화 경로 명확화, AI 리포트 재료와 장기 기억 구분 개선

## DEC-011: GitHub 운영을 프로젝트 스킬로 표준화
- 날짜: 2026-04-06
- 결정: commit, push, PR, issue, release, tag 작업을 `github-workflow` 프로젝트 스킬로 표준화
- 대안: GitHub 작업을 매번 ad-hoc으로 처리
- 근거: 사용자 요청 — GitHub 전반 작업도 워크스페이스 규칙과 증빙 흐름 안에서 일관되게 운영할 필요가 있음
- AI 역할: Codex가 skill-creator 원칙에 따라 스킬 설계 및 registry 반영
- 영향: GitHub 작업이 Evidence Gate, 로그, 운영 문서와 연결되며 반복 작업 품질이 안정화됨

## DEC-012: 문서 레이어를 Obsidian vault 기준으로 공식화
- 날짜: 2026-04-06
- 결정: 이 저장소의 note, MOC, daily, `.base` 파일은 일반 Markdown이 아니라 Obsidian 자산으로 취급하고, 관련 작업은 `obsidian-cli`, `obsidian-markdown`, `obsidian-bases` 및 `obsidian-workspace` 스킬 기준으로 수행
- 대안: 문서를 일반 Markdown처럼 다루고 Obsidian 규칙은 느슨한 권고 수준으로 유지
- 근거: 사용자 지시 — 이 불렛은 옵시디언이며, 옵시디언의 규칙과 사용법을 전제로 해야 하고 관련 스킬을 사용해야 함
- AI 역할: Codex가 `obsidian --help`로 CLI 가용성 확인 후 공용 문서와 프로젝트 스킬에 Obsidian-first 규칙 반영
- 영향: vault note 품질, wikilink 일관성, `.base` 파일 처리, MOC 갱신 기준이 명확해짐

## DEC-013: Claude command layer는 얇게 두고, 실제 로직은 agents/skills를 재사용
- 날짜: 2026-04-06
- 결정: Claude Code용 project commands는 `.claude/commands/`에 6개만 두고, 각 command는 기존 `.agent/agents/`와 `.agent/skills/`를 읽어 재사용하는 얇은 entrypoint로 설계
- 대안: command를 대량 생성하거나, command 안에 긴 운영 로직을 직접 중복 기입
- 근거: 사용자 요청 — command key 구조를 조사한 뒤 필요한 것들을 정확한 포맷으로 만들 것. 동시에 현재 워크스페이스는 정본 중복과 구조 비대화를 피해야 함
- AI 역할: Codex가 공식 command 구조를 확인하고 runtime command + command stack registry를 설계/작성
- 영향: Claude runtime 접근성이 좋아지면서도 공용 정본은 `.agent/system/`과 `.agent/skills/`에 유지됨

## DEC-014: GitHub 운영 스킬을 issue/project 레이어로 분리
- 날짜: 2026-04-06
- 결정: `github-workflow`는 상위 오케스트레이터로 유지하고, issue 운영은 `github-issue-ops`, project board 운영은 `github-project-ops`로 분리
- 대안: 하나의 GitHub 스킬에 commit, issue, project, release를 모두 계속 누적
- 근거: 사용자 요청 — GitHub 관련 스킬에 이슈와 프로젝트 관리까지 포함해야 함. `gh issue`와 `gh project`는 실제 명령 체계와 운영 포인트가 다름
- AI 역할: Codex가 `gh issue --help`, `gh project --help`를 확인하고 두 개의 운영 스킬과 registry 연결을 추가
- 영향: GitHub 운영이 `code flow`와 `management flow`로 나뉘어 유지보수와 재사용성이 좋아짐

## DEC-015: 태그는 namespace 기반 횡단 메타데이터로만 사용
- 날짜: 2026-04-08
- 결정: Obsidian note의 태그는 `area/*`, `type/*`, `status/*`, `workflow/*` 네 축만 허용하고, 주제어·별칭·폴더 의미는 태그에서 제거
- 대안: 기존처럼 평면 태그, 별칭성 태그, 폴더성 태그를 혼용
- 근거: 검색성과 필터 일관성이 무너지고, 새 파일이 생길 때마다 태그 drift가 커졌기 때문
- AI 역할: Codex가 전수 조사 후 규칙 문서, 감사 스크립트, template, 실제 frontmatter를 함께 정리
- 영향: 대시보드와 CLI 감사가 안정화되고, 1년 뒤에도 같은 규칙을 반복 적용할 수 있게 됨

## DEC-016: child note는 `up` 속성으로 부모를 반드시 가리킨다
- 날짜: 2026-04-08
- 결정: MOC나 상위 운영 note 아래에 속한 child note는 frontmatter `up`에 부모 note를 명시한다
- 대안: 부모 문서가 자식만 가리키는 top-down 링크 구조 유지
- 근거: 자식이 어느 구조에 속하는지 즉시 알 수 있어야 하고, 모듈화된 사고를 시스템적으로 표현해야 하기 때문
- AI 역할: 사용자 방향 제시 → Codex가 visible vault와 `.agent` 전반에 `up`을 반영하고 누락 검사를 추가
- 영향: bottom-up 탐색, 감사, 구조 복구가 쉬워졌고 새 note 생성 규칙이 명확해짐

## DEC-017: 반복 가치가 있는 지시는 prompt asset으로 승격
- 날짜: 2026-04-08
- 결정: 재사용 가능한 프롬프트는 `prompt-catalog`에 `Intent / Input contract / Output contract / Reuse rule` 형태로 저장
- 대안: 좋은 프롬프트를 대화 기록이나 개인 기억에만 남김
- 근거: 같은 작업을 나중에 다른 에이전트가 반복할 수 있어야 하고, 프롬프트도 운영 자산으로 관리해야 하기 때문
- AI 역할: Codex가 `prompt-catalog` 구조를 확장하고 packaging guide와 template를 작성
- 영향: 태그 정규화, `up` 복원 같은 시스템 작업을 재생 가능한 자산으로 재사용 가능

## DEC-018: `project-dashboard`를 제출용 진행 가시화 정본으로 사용
- 날짜: 2026-04-08
- 결정: visible dashboard는 `_system/dashboard/project-dashboard.md`를 기준으로 하고, `PLAN`, `PROGRESS`, `daily`, `type/task` note를 그 아래 유기적으로 연결
- 대안: `PLAN`, `PROGRESS`, 데일리, 증빙 로그를 각각 따로 보고 사용자가 수동으로 해석
- 근거: 결과 보고서와 AI 리포트에서 “우리는 어떤 흐름으로 프로젝트를 운영했는가”를 한 화면에서 설명할 필요가 있기 때문
- AI 역할: 사용자 요구를 기준으로 Codex가 간트형 일정, 로그 링크, task 연동, 새 파일/폴더 생성 이유까지 포함해 대시보드를 재설계
- 영향: 대시보드가 빈 개요판이 아니라 실제 제출용 진행 아티팩트가 됨

## DEC-019: 모든 AI 세션은 intake 1파일에 먼저 기록하고 nightly dispatch로 분배
- 날짜: 2026-04-08
- 결정: 어떤 AI/로컬/사용자 조합이든 모든 의미 있는 세션은 먼저 `04_증빙/01_핵심로그/ai-session-intake.csv`에 1 row로 기록하고, 하루 종료 시 `dispatch-session-intake.py`가 `master-evidence-ledger.md`, `external-ai-usage.csv`, `session-intake-dispatch-report.md`를 재생성한다
- 대안: `master-evidence-ledger.md`, `external-ai-usage.csv`, daily, memory를 그때그때 개별 수정
- 근거: 사용자가 "모든 대화 세션의 기록을 하나의 파일에 먼저 넣고, 하루 끝에 분배"하는 구조를 요구했고, 엑셀 트래커의 다중 시트 관점을 append-friendly한 단일 intake로 바꾸는 편이 누락과 중복을 줄이기 때문
- AI 역할: Codex가 엑셀 트래커 시트 구조를 참조해 intake schema, dispatch script, 운영 문서 갱신을 구현
- 영향: 낮 동안의 기록 입력점이 하나로 줄고, nightly evidence 정리가 자동화되며, prompt/decision/daily/memory는 후보 큐를 통해 분배됨

## DEC-024: 제품 베팅은 소규모 학원용 로컬 우선 데이터 자산화 도구로 고정
- 날짜: 2026-04-09
- 결정: 제품의 핵심 컨셉은 `학원 데이터와 워크플로우를 자산화하고 이를 로컬 우선 환경에서 가장 쉽게 AI 에이전트에 연결하는 도구`로 잡고, 초기 타깃은 소규모 학원으로 한정한다
- 대안: 범용 학원 SaaS, 대형 사업장용 중앙집중형 플랫폼, 복잡한 서비스형 앱 출시
- 근거: 2026-04-09 22:10 KST 승보님 미팅에서 UI, 기획 문서, 모델링 결과를 공유한 뒤, 소규모 학원에서는 로컬 데이터의 활용 가치가 높고 무거운 시스템보다 가벼운 오픈소스형 도구가 더 적합하다는 점에 합의했기 때문
- AI 역할: AI는 사전에 UI, 기획 문서, 모델링 결과를 정리하는 데 기여했고, 최종 타깃/컨셉 합의는 사람 미팅에서 확정
- 영향: 이후 구현 판단은 `소규모 학원`, `로컬 우선`, `데이터 자산화`, `쉬운 AI 에이전트 활용`, `무거운 SaaS 회피` 기준으로 정렬해야 함

## DEC-020: 프로젝트 아이디어를 `EduPaperclip` 방향으로 확정
- 날짜: 2026-04-08
- 결정: 프로젝트의 상위 아이디어는 `paperclip`과 `k-skill`을 참조한 한국형 K-교육 제로 휴먼 시스템 `EduPaperclip` 방향으로 간다
- 대안: 교사용 단일 앱, 민원 완충 앱, 질문 저수지, 실습 SOS 라우터 등 개별 아이디어를 각각 독립 서비스로 추진
- 근거: 운영자/교사/강사 관점의 문제를 하나의 역할 기반 orchestration 시스템 안에서 통합하는 편이 더 강한 차별성과 확장성을 가지기 때문
- AI 역할: 리서치 결과와 기존 임시 아이디어를 종합하는 판단 재료 제공, 통합 note와 회의록 구조화
- 영향: 이후 `spec`, `plan`, MVP 범위 논의는 모두 `EduPaperclip`을 기준으로 진행

## DEC-021: 현재 단계의 문제 정의는 “기능 확정 전 운영 시스템 정의”로 둔다
- 날짜: 2026-04-08
- 결정: 세부 기능부터 고르지 않고, 먼저 `운영자 관점 시스템`과 `강사/교사 관점 시스템`이라는 문제 정의 축을 고정한 뒤 세부 기능을 뽑는다
- 대안: 지금 바로 대표 기능 1~2개를 선택해 구현 단계로 이동
- 근거: 아직 공교육/사교육, 운영자/교사 중 어디에 먼저 포커스할지 완전히 정해지지 않았고, 지금은 역할 축과 운영 컨셉을 먼저 고정하는 편이 맞기 때문
- AI 역할: 임시 아이디어 파일 통합, 회의록 구조화, 리서치 질문 정리
- 영향: 다음 단계 작업은 `문제 정의 초안`, `사용자 포커스 결정`, `spec.md` 작성 순으로 이어짐

## DEC-022: 제품명 정본은 `EduPaperclip` 설명어가 아니라 `HagentOS`를 사용
- 날짜: 2026-04-09
- 결정: 실제 제품 기획 문서와 이후 구현 문맥의 정식 제품명은 `HagentOS`로 통일한다
- 대안: 상위 설명 개념으로 쓰던 `EduPaperclip`를 계속 제품명처럼 병행 사용
- 근거: `03_제품/hagent-os/` 문서군이 이미 제품 정본 역할을 하고 있고, `HagentOS`가 한국 교육 운영 OS라는 제품 서사를 더 직접적으로 담고 있기 때문
- AI 역할: Codex가 제품 문서군을 read-only로 학습하며 현재 정본 명명 규칙을 확인
- 영향: 이후 구현, README, 발표, 피드백은 `HagentOS`를 제품명으로 사용하고 `EduPaperclip`는 계보 설명이나 내부 참조로만 남김

## DEC-023: 대회 MVP의 1순위 문제는 `학원 원장 민원·예외 처리 OS`
- 날짜: 2026-04-09
- 결정: 현재 제품 정본 기준 MVP 1순위 사용자는 `사교육 운영자(학원 원장)`이고, 해결 문제는 `민원·예외 처리 OS`로 둔다
- 대안: `담임교사`, `재등록·이탈 방어 OS`, `강사용 반 운영 보조`를 동순위로 유지
- 근거: `hagent-os` 문서군에서 가장 일관되게 반복되는 기준이 `원장`, `민원`, `승인 대시보드`, `통합 스케줄러`, `AI 팀` 구조이기 때문
- AI 역할: Codex가 `README`, `core-bet`, `market-and-customer`, `prd`, `mvp-scope`를 교차 읽고 정본 방향을 확인
- 영향: 다음 spec, UX, 구현 판단은 `민원 분류/응답 초안`, `이탈 감지`, `승인 대시보드`, `통합 스케줄러`, `k-skill registry`를 중심으로 이뤄진다
