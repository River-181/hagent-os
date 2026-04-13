---
tags:
  - area/evidence
  - type/report
  - status/active
  - workflow/planning
date: 2026-04-06
up: "[[_04_증빙_MOC]]"
aliases:
  - 워크스페이스구조화플랜
---
# 워크스페이스 구조화 계획서

> 이 문서는 Claude Code Plan Mode에서 생성된 원본 계획서이다.
> 원본 위치: `~/.claude/plans/polished-honking-hinton.md`
> 생성일: 2026-04-06
> AI: Claude Opus 4.6
> 상태: ==실행 완료==

---

## Context

2026 제1회 KEG 바이브코딩 콘테스트(4/6~4/13, 7일) 참가를 위한 AI native 협업 워크스페이스를 구조화한다. 현재 루트에 기초 자료들이 모여 있을 뿐 체계가 없다. 이 워크스페이스는 옵시디언 볼트이자 AI 에이전트들의 작업 공간이며, 2인 팀 + AI 에이전트들이 리서치→개발→제출→회고까지 유기적으로 협업하는 공간이다. 로컬과 연결되지 않은 독립 공간으로서 스킬/MCP/메모리/에이전트가 프로젝트 내에 자기완결적으로 존재해야 한다.

---

## Step 1: 디렉토리 구조 생성

옵시디언 친화적 + 에이전트 친화적 구조. 한국어 지식 디렉토리 + 영어 코드 디렉토리.
**`.cursor/` 사용하지 않음** — `.agent/`를 에이전트 중립 설정 디렉토리로 사용.
**`.github/`는 git init 시점으로 미룸.**

```
2026 제1회 KEG 바이브코딩 콘테스트/
│
├── .obsidian/                          # (기존) 옵시디언 설정
├── .claude/                            # 프로젝트 로컬 Claude Code 설정
│   ├── CLAUDE.md                       # Claude Code 프로젝트 지시서
│   ├── settings.json                   # 프로젝트 레벨 설정
│   ├── agents/                         # Claude Code 에이전트 페르소나 (8개)
│   │   ├── pm.md                       # ★ 상세 정의
│   │   ├── research.md                 # ★ 상세 정의
│   │   ├── product.md                  # 뼈대
│   │   ├── builder.md                  # 뼈대
│   │   ├── qa.md                       # 뼈대
│   │   ├── judge.md                    # ★ 상세 정의
│   │   ├── evidence.md                 # ★ 상세 정의
│   │   └── submission.md               # 뼈대
│   └── rules/                          # 프로젝트 로컬 규칙
│       ├── obsidian-conventions.md
│       ├── logging.md
│       └── contest-constraints.md
│
├── .agent/                              # 에이전트 중립 설정 (Cursor/Copilot 등 공용)
│   ├── AGENTS.md                       # 모든 AI 에이전트의 최상위 진입점
│   └── rules/                          # 에이전트 공통 규칙
│
├── 00 HOME.md                          # ROOT MOC
├── 01_대회정보/                         # 대회 규칙, 일정, 팀
├── 02_전략/                             # 전략, 분석, 의사결정
├── 03_제품/                             # 제품 설계, 스펙
├── 04_증빙/                             # AI 증빙, 로그 (자동 축적)
├── 05_제출/                             # 제출물
├── assets/                              # 비마크다운 파일
├── app/                                 # 실제 제출 제품
└── tests/                               # 테스트 파일
```

**플레이북 대비 주요 개선사항:**
- `docs/` 안에 8개 하위 폴더 → 루트에 번호 폴더 5개로 평탄화 (옵시디언 탐색 최적화)
- 한국어 디렉토리명 (사람이 옵시디언에서 브라우징) / 영어 디렉토리명 (코드용)
- `.cursor/` 대신 `.agent/` 사용 — 에이전트 중립 공용 설정 디렉토리
- Claude Code 전용 설정은 `.claude/agents/`에 배치
- `_` 프리픽스 MOC 파일 → 디렉토리 내 상단 정렬
- 별도 `prompts/`, `agents/` 루트 디렉토리 제거 → 증빙과 통합
- `.github/`는 git init 시점으로 미룸

---

## Step 2~9: 실행 요약

| Step | 내용 | 상태 |
|------|------|------|
| 2 | 기존 파일 11개 이동 | ✅ |
| 3 | `.context/` 공유 맥락 구축 (메모리 5개 + plugins + mcp + onboarding) | ✅ |
| 4 | MOC 6개 작성 | ✅ |
| 5 | `.agent/AGENTS.md` 작성 | ✅ |
| 6 | `.claude/` 전체 (CLAUDE.md, agents 8개, rules 3개, settings.json) | ✅ |
| 7 | `.agent/rules/` 3개 | ✅ |
| 8 | `04_증빙/` 로깅 3개 + 데일리 1개 | ✅ |
| 9 | `05_제출/` 뼈대 3개 + app/README.md | ✅ |

## 검증 결과

- MOC 6개 존재 확인
- 루트 정리 완료
- 위키링크 연결 확인
- 옵시디언 설정 (첨부파일 → assets/, 데일리 → 04_증빙/daily/)
- 증빙 로그 첫 기록 존재

---

> 관련 문서: [[decision-log]] DEC-001, DEC-002, DEC-003
