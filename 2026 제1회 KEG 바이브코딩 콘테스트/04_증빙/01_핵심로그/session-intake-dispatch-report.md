---
tags:
  - area/evidence
  - type/report
  - status/active
date: 2026-04-13
up: "[[_04_증빙_MOC]]"
---
# Session Intake Dispatch Report

> 생성 시각: 2026-04-13 23:54 KST
> 입력 원장: `04_증빙/01_핵심로그/ai-session-intake.csv`
> 재생성 파일: `04_증빙/01_핵심로그/master-evidence-ledger.md`, `04_증빙/01_핵심로그/external-ai-usage.csv`

## Daily Summary

| 날짜 | 세션 수 | 도구 | 프롬프트 수 | 추정 토큰 |
|---|---:|---|---:|---:|
| 2026-04-06 | 16 | ChatGPT, Claude Code, Codex, Perplexity | 18 | 195,000 |
| 2026-04-08 | 6 | Codex | 8 | 84,000 |
| 2026-04-09 | 4 | Codex, Human Meeting | 3 | 33,000 |
| 2026-04-10 | 2 | Claude, Codex | 5 | 91,000 |
| 2026-04-11 | 1 | Claude | 1 | 320,000 |
| 2026-04-12 | 3 | Claude, Codex | 3 | 405,000 |
| 2026-04-13 | 28 | Codex, Human Deployment | 99 | 945,000 |

## Prompt Promotion Candidates

- `S-GPT-001` ChatGPT: P-001~P-004가 이 세션에서 생성됨
- `S-PPLX-001` Perplexity: P-005와 P-006은 승격 가치가 높음
- `S-EVID-015` Codex: P-009 evidence orchestrator prompt는 재사용 가치 있음
- `S-OPS-011` Codex: P-007과 P-008은 재사용 프롬프트 자산으로 승격 가치 높음
- `S-OPS-020` Codex: Day 5 구현 전 정본 잠금을 위한 운영 프롬프트로 재사용 가능

## Decision Promotion Candidates

- `S-001` Claude Code: 평탄 구조와 증빙 중심 운영 시작
- `S-002` Claude Code: 엑셀 기반 기록 체계의 한계가 드러남
- `S-003` Claude Code: PLAN/PROGRESS 도입 계기
- `S-CODEX-001` Codex: Codex 평가서를 통해 개선 방향 확보
- `S-OPS-001` Codex: `.agent/system`을 canonical로 채택
- `S-OPS-002` Codex: 루트 최소화와 `.context` 제거 결정
- `S-OPS-003` Codex: memory/maps/evidence 단순화 결정
- `S-OPS-004` Codex: GitHub 작업을 evidence gate와 연결
- `S-OPS-005` Codex: 문서 레이어를 Obsidian 자산으로 취급
- `S-OPS-006` Codex: command layer를 얇게 유지하는 방향
- `S-OPS-007` Codex: GitHub management flow 분리
- `S-OPS-008` Codex: 단일 원장 전략 도입
- `S-OPS-009` Codex: MOC와 도구 정본을 저장소 내부로 중앙화
- `S-OPS-011` Codex: DEC-015와 DEC-016의 실행 근거
- `S-OPS-012` Codex: DEC-018의 실행 근거
- `S-OPS-014` Codex: 보안 gate 추가를 decision 후보로 검토 가능
- `S-RES-013` Codex: NotebookLM을 리서치 합성 도구로 검증
- `S-STRAT-010` Codex: LLM 위키 레이어 도입
- `S-MTG-019` Human Meeting: 소규모 학원 타깃; 로컬 데이터 자산화; 무거운 SaaS 회피; 오픈소스 극대화
- `S-PROD-018` Codex: HagentOS를 제품명 정본으로 사용; MVP는 학원 원장 민원·예외 처리 OS로 본다
- `S-STRAT-016` Codex: paperclip 해체 분석을 문제 정의 입력으로 승격
- `S-OPS-020` Codex: 모바일 탭바/앱 셸/폰트/브랜드 claim를 구현 전 잠근다
- `S-PROD-021` Claude: 운영 갭 = 연결 단절이 핵심임을 재확인
- `S-DEV-022` Claude: 껍데기 → 실동작 전환에 병렬 에이전트보다 집중 순차 구현이 효과적이었음
- `S-DEV-025` Claude: Goals 재설계 의사결정 기록
- `S-OPS-023` Claude: 미팅 이슈를 회의록으로 즉시 증빙화하는 패턴 확인
- `S-EVID-027` Codex: 오늘 Codex 사용량 추정치를 공식 통계에 반영
- `S-PLAN-029` Codex: judge_demo와 public_byom을 공식 분기점으로 채택
- `S-PROD-026` Codex: issue/properties를 paperclip식으로 단순화하고 schedule interaction을 Notion Calendar 방향으로 재정렬
- `S-PROD-028` Codex: Telegram fallback을 카카오 대체 채널이 아니라 동등한 demo channel로 승격
- `S-PROD-031` Codex: 전역 rollout 전에 `Skills`를 기준 화면으로 먼저 확정
- `S-RALPH-033` Codex: 랄프 병렬 A는 허용 경로 evidence-only sync로 고정
- `S-RALPH1-A` Codex: 랄프 1차 병렬 A를 Day 8 baseline 세션으로 기억
- `S-RALPH1-B` Codex: 랄프 1차 B는 daily-memory 검토 담당
- `S-RALPH1-C` Codex: 랄프 1차 C는 long-term-memory + PROGRESS 담당
- `S-RALPH1-D` Codex: 랄프 1차 D는 usage-stats + ledger 담당
- `S-RALPH1-E` Codex: 랄프 1차 E는 session-log + dispatch 담당
- `S-RALPH2-CASE` Codex: T-case는 민원 케이스 흐름 검증 담당
- `S-RALPH2-CASE-LEAN` Codex: T-case-lean-retry는 경계 케이스 처리 담당
- `S-RALPH2-SECURITY` Codex: T-security는 보안 감사 담당
- `S-RALPH2-SEEDLOG` Codex: T-seed-log는 데모 seed 데이터 로그 검증 담당
- `S-RALPH2-SEEDLOG-RETRY` Codex: T-seed-log-retry는 seed 멱등성 검증 담당
- `S-RALPH2-SETTINGS` Codex: T-settings-api는 Settings API 검증 담당
- `S-RALPH2-SETTINGS-V2` Codex: T-settings v2는 Settings 화면 확인 담당
- `S-RALPH2-SMOKE` Codex: T-smoke는 배포 smoke test 결과 담당
- `S-RALPH2-UIPOLISH` Codex: T-ui-polish는 마감 UI polish + 스크린샷 담당
- `S-RALPH3-ASSISTANT` Codex: T-assistant-fix는 어시스턴트 라우팅 수정 담당
- `S-RALPH3-DOCX` Codex: T-docx는 AI 리포트 docx 조립 담당
- `S-RALPH3-PNG` Codex: T-png-export는 Excalidraw PNG 내보내기 담당
- `S-RALPH3-ROUTINE` Codex: T-routine-fix는 루틴 일관성 수정 담당
- `S-RALPH3-SECURITY` Codex: T-security-recover는 보안 복구 담당
- `S-SUB-032` Codex: pre-Ralph snapshot을 Day 8 제출 기준선으로 고정

## Daily Note Hints

- `2026-04-06` / `S-001`: 데일리와 장기 기억에 첫 세션 출발점으로 남길 것
- `2026-04-06` / `S-002`: 포터블 환경 구축 이유와 효과를 memory에 남길 것
- `2026-04-06` / `S-003`: 다중 AI 정합화 위험을 장기 기억에 남길 것
- `2026-04-06` / `S-CODEX-001`: PROGRESS에 Codex 참여 이력으로 남길 것
- `2026-04-06` / `S-CODEX-002`: 운영 구조 약점과 개선 포인트를 memory에 유지
- `2026-04-06` / `S-GPT-001`: ChatGPT로 개요서와 준비 단계 큰 그림 확보
- `2026-04-06` / `S-OPS-001`: 구조 변경 사실을 장기 기억에 남길 것
- `2026-04-06` / `S-OPS-002`: 경로 정합성 변경은 atlas와 progress에 유지
- `2026-04-06` / `S-OPS-003`: 구조 단순화 이유를 장기 기억에 남길 것
- `2026-04-06` / `S-OPS-004`: GitHub 작업도 증빙 대상이라는 점을 기억에 남길 것
- `2026-04-06` / `S-OPS-005`: Obsidian-first 원칙을 장기 기억에 고정
- `2026-04-06` / `S-OPS-006`: 정본 중복 방지 원칙을 기억에 남길 것
- `2026-04-06` / `S-OPS-007`: GitHub 운영 구조 변화를 장기 기억에 남길 것
- `2026-04-06` / `S-OPS-008`: 증빙 입력 마찰 감소가 왜 중요했는지 기억에 남길 것
- `2026-04-06` / `S-OPS-009`: 도구 정본 문서를 저장소 내부로 내재화
- `2026-04-06` / `S-PPLX-001`: 기관/심사 문법 리서치 근거 확보
- `2026-04-08` / `S-EVID-015`: Codex 토큰 추정치 기록 반영
- `2026-04-08` / `S-OPS-011`: 태그 정규화와 `up` 복원 작업 완료
- `2026-04-08` / `S-OPS-012`: 대시보드가 제출용 진행 아티팩트로 바뀜
- `2026-04-08` / `S-OPS-014`: 공개 저장소 운영 원칙을 장기 기억에 유지
- `2026-04-08` / `S-RES-013`: 담임 모드 우선 가설을 memory에 유지
- `2026-04-08` / `S-STRAT-010`: 지식 시스템 변경을 장기 기억에 남길 것
- `2026-04-09` / `S-MTG-019`: 승보님과 개발 착수 공감대 형성
- `2026-04-09` / `S-PROD-018`: 제품 정본을 읽은 뒤 그 기준으로만 판단할 것
- `2026-04-09` / `S-STRAT-016`: 메모리와 대시보드를 현재 상태로 맞춘 이유를 남길 것
- `2026-04-10` / `S-OPS-020`: Day 5 운영 문서 동기화와 구현 전 블로커 기록
- `2026-04-10` / `S-PROD-021`: v0.4.0 갭 메우기 세션
- `2026-04-11` / `S-DEV-022`: Day6 독립 레포 E2E 재구축 세션
- `2026-04-12` / `S-DEV-025`: daily-memory Goals↔Projects 완성 반영
- `2026-04-12` / `S-EVID-024`: 오늘 증빙 로그에 Codex 정리 세션 추가
- `2026-04-12` / `S-OPS-023`: Day 7 운영 동기화 세션
- `2026-04-13` / `S-DEP-034`: 배포 완료 사실과 공개 링크를 Day 8 daily note에 남긴다
- `2026-04-13` / `S-EVID-027`: Day 8 evidence sync와 token estimate 기준점
- `2026-04-13` / `S-EVID-030`: 현재 세션 기준 증빙 동기화 완료
- `2026-04-13` / `S-PLAN-029`: 다음 세션은 Docker judge package 구현으로 이어진다
- `2026-04-13` / `S-PROD-026`: Day 8 최종 제품 마감 세션으로 daily/memory/dashboard에 남긴다
- `2026-04-13` / `S-PROD-028`: 다음 세션은 Telegram outbound 실제 송신과 live env를 다시 본다
- `2026-04-13` / `S-PROD-031`: Day 8 late pilot session을 day note와 memory에 남길 것
- `2026-04-13` / `S-RALPH-033`: 랄프 병렬 A 증빙/메모리/로그 동기화 완료
- `2026-04-13` / `S-RALPH1-A`: 랄프 1차 par A 완료
- `2026-04-13` / `S-RALPH1-B`: 랄프 1차 par B 완료
- `2026-04-13` / `S-RALPH1-C`: 랄프 1차 par C 완료
- `2026-04-13` / `S-RALPH1-D`: 랄프 1차 par D 완료
- `2026-04-13` / `S-RALPH1-E`: 랄프 1차 par E 완료
- `2026-04-13` / `S-RALPH2-CASE`: T-case 완료
- `2026-04-13` / `S-RALPH2-CASE-LEAN`: T-case-lean 완료
- `2026-04-13` / `S-RALPH2-SECURITY`: T-security 완료
- `2026-04-13` / `S-RALPH2-SEEDLOG`: T-seed-log 완료
- `2026-04-13` / `S-RALPH2-SEEDLOG-RETRY`: T-seed-log-retry 완료
- `2026-04-13` / `S-RALPH2-SETTINGS`: T-settings-api 완료
- `2026-04-13` / `S-RALPH2-SETTINGS-V2`: T-settings v2 완료
- `2026-04-13` / `S-RALPH2-SMOKE`: T-smoke 완료
- `2026-04-13` / `S-RALPH2-UIPOLISH`: T-ui-polish 완료
- `2026-04-13` / `S-RALPH3-ASSISTANT`: T-assistant-fix 완료
- `2026-04-13` / `S-RALPH3-DOCX`: T-docx 완료
- `2026-04-13` / `S-RALPH3-PNG`: T-png-export 완료
- `2026-04-13` / `S-RALPH3-ROUTINE`: T-routine-fix 완료
- `2026-04-13` / `S-RALPH3-SECURITY`: T-security-recover 완료
- `2026-04-13` / `S-SUB-032`: AI 리포트 final md와 Excalidraw 3종, deploy fix snapshot 완료

## Memory Sync Hints

- `2026-04-06` / `S-GPT-001`: 초기 운영 방향과 플레이북의 출발점
- `2026-04-06` / `S-OPS-009`: 팀 재현성 강화 근거를 기억에 남길 것
- `2026-04-06` / `S-PPLX-001`: 향후 scorecard와 문제 정의에서 재참조 필요
- `2026-04-08` / `S-EVID-015`: 외부 AI 사용 통계 왜곡 방지 맥락 유지
- `2026-04-08` / `S-OPS-011`: 태그/계층 규칙 변경 사실을 장기 기억에 남길 것
- `2026-04-08` / `S-OPS-012`: 데일리와 daily-memory 동기화 이유를 기억에 남길 것
- `2026-04-09` / `S-MTG-019`: 이 합의는 이후 제품 판단 기준으로 계속 유지
- `2026-04-09` / `S-OPS-017`: 반복 요청에서도 intake-first 규칙을 유지했다는 점을 기억에 남길 것
- `2026-04-10` / `S-OPS-020`: 다음 세션은 이 4개 충돌을 우선 해소하고 앱 스켈레톤으로 간다
- `2026-04-10` / `S-PROD-021`: PLAN/PROGRESS 업데이트 완료
- `2026-04-11` / `S-DEV-022`: 독립 레포에서 시작할 때 daily-memory의 포트/DB 정보 확인 필수
- `2026-04-12` / `S-DEV-025`: Goals 재설계와 양방향 연결 완성 상태를 기억
- `2026-04-12` / `S-EVID-024`: Day 7에도 intake-first 증빙 규칙을 유지
- `2026-04-12` / `S-OPS-023`: hagent-os 독립 레포가 배포 대상 정본임을 기억
- `2026-04-13` / `S-DEP-034`: live URL과 공개 채널 링크를 장기 기억과 대시보드 정본에 고정한다
- `2026-04-13` / `S-EVID-027`: Day 8 Codex 사용량 ~1.2M 추정 기준을 유지
- `2026-04-13` / `S-EVID-030`: 현재 검증 결과와 미검증 항목의 handoff 상태를 유지
- `2026-04-13` / `S-PLAN-029`: judge_demo/public_byom 분기와 built-in model demo 원칙을 유지
- `2026-04-13` / `S-PROD-026`: Day 8 issue/properties·schedule·students/settings·telegram polish 범위를 기억
- `2026-04-13` / `S-PROD-028`: Telegram fallback을 demo channel로 승격한 결정을 기억
- `2026-04-13` / `S-PROD-031`: Skills first; no version bump; paperclip structure + Toss token discipline 유지
- `2026-04-13` / `S-RALPH-033`: Ralph loop 병렬 작업은 `15902fc` snapshot 기준으로 증빙
- `2026-04-13` / `S-RALPH1-A`: Ralph loop 병렬 A 기준으로 기억
- `2026-04-13` / `S-RALPH1-B`: Ralph loop 1차 병렬 분기 패턴 기억
- `2026-04-13` / `S-RALPH1-C`: Ralph loop 1차 PROGRESS 동기화 기억
- `2026-04-13` / `S-RALPH1-D`: Ralph loop 1차 통계 동기화 기억
- `2026-04-13` / `S-RALPH1-E`: Ralph loop 1차 완료 시점 기억
- `2026-04-13` / `S-RALPH2-CASE`: 케이스 흐름 검증 결과 기억
- `2026-04-13` / `S-RALPH2-CASE-LEAN`: 린 케이스 경로 검증 기억
- `2026-04-13` / `S-RALPH2-SECURITY`: 보안 감사 결과 기억
- `2026-04-13` / `S-RALPH2-SEEDLOG`: 시드 데이터 검증 기억
- `2026-04-13` / `S-RALPH2-SEEDLOG-RETRY`: seed 멱등성 검증 기억
- `2026-04-13` / `S-RALPH2-SETTINGS`: Settings API 검증 결과 기억
- `2026-04-13` / `S-RALPH2-SETTINGS-V2`: Settings v2 상태 기억
- `2026-04-13` / `S-RALPH2-SMOKE`: Ralph loop 2차 smoke test 기억
- `2026-04-13` / `S-RALPH2-UIPOLISH`: 마감 UI 스크린샷 기억
- `2026-04-13` / `S-RALPH3-ASSISTANT`: 어시스턴트 버그 수정 기억
- `2026-04-13` / `S-RALPH3-DOCX`: AI 리포트 docx 최종본 기억
- `2026-04-13` / `S-RALPH3-PNG`: Excalidraw PNG 6종 기억
- `2026-04-13` / `S-RALPH3-ROUTINE`: 루틴 일관성 검증 기억
- `2026-04-13` / `S-RALPH3-SECURITY`: 보안 복구 완료 기억
- `2026-04-13` / `S-SUB-032`: `05_제출/ai-report-final.md`와 `15902fc`를 Day 8 제출 기준선으로 기억

## Open Notes

- prompt/decision은 후보까지만 자동 분류한다.
- exact token source가 없는 도구는 `estimated_tokens` 기준이다.
