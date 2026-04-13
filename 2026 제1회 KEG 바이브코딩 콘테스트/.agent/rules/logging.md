---
tags:
  - area/system
  - type/reference
  - status/active
description: 자동 로깅 규칙 — 모든 에이전트가 작업 완료 시 증빙에 기록
up: "[[.agent/AGENTS]]"
---

# 로깅 규칙

## 언제 기록하는가

의미 있는 작업을 완료했을 때 `04_증빙/01_핵심로그/master-evidence-ledger.md`에 세션 블록 1개를 추가한다.
"의미 있는 작업" = 파일을 생성/수정했거나, 의사결정에 영향을 준 분석을 수행한 경우.

## 직접 기록 정본

- 직접 입력 정본: `04_증빙/01_핵심로그/master-evidence-ledger.md`
- 기록 단위: 세션 단위
- 내부 링크: `[[wikilink]]`
- 기존 `ai-usage-log.md`, `session-log.md`, `evolution-log.md`는 archive/reference로 둔다.

## 의사결정 기록

범위, 기술, 디자인 관련 결정 중 실제로 남겨야 할 것만 `04_증빙/01_핵심로그/decision-log.md`에 DEC-NNN 형식으로 승격 기록한다.

## 프롬프트 기록

재사용 가치가 검증된 프롬프트만 `04_증빙/01_핵심로그/prompt-catalog.md`에 P-NNN 형식으로 승격 기록한다.
- 승격 시 `Intent / Prompt / Input contract / Output contract / Reuse rule / Linked evidence`를 같이 남긴다.
- 규칙/구조 프롬프트는 결과 note, script, template까지 연결해야 한다.

## 시스템 진화 기록

구조/규칙/도구 변화는 우선 `master-evidence-ledger.md`에 기록하고, 정말 필요한 경우에만 `evolution-log.md`를 참고용으로 갱신한다.

## 통계 자동 업데이트

### 자동 집계 명령어
```bash
python3 .agent/system/automation/scripts/collect-usage-stats.py
python3 .agent/system/automation/scripts/collect-external-usage-stats.py
```
이 스크립트는 `~/.claude/projects/` 의 JSONL 세션 파일에서 토큰/비용/효율 지표를 자동 추출한다.
수집 항목: 세션 수, 메시지 수, 도구 호출, 작업 시간, 토큰 (입력/캐시생성/캐시읽기/출력), 비용 (항목별), 효율 지표 (캐시 히트율, 메시지당 비용, 시간당 비용)
외부 AI는 `04_증빙/01_핵심로그/external-ai-usage.csv`를 읽어 수동 입력분을 요약한다.

### PM Agent / Evidence Agent 매일 밤 루틴
1. `python3 .agent/system/automation/scripts/collect-usage-stats.py` 실행
2. 외부 AI를 썼다면 `04_증빙/01_핵심로그/external-ai-usage.csv`에 세션 row 추가
3. `python3 .agent/system/automation/scripts/collect-external-usage-stats.py` 실행
4. 결과를 `04_증빙/01_핵심로그/ai-usage-stats.md`에 파생 반영
5. 일별 추이 테이블 업데이트
6. 리포트용 시각화 데이터 갱신

이 통계는 AI 리포트의 "AI 활용 통계" 섹션에 직접 삽입된다.

## 권장 스킬

구조, 메모리, 증빙을 동시에 만질 때는 `.agent/skills/workspace-sync/SKILL.md`를 따른다.
Obsidian note, MOC, daily, `.base` 파일을 함께 만질 때는 `.agent/skills/obsidian-workspace/SKILL.md`를 우선 검토한다.
