---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-08
up: "[[_06_LLM위키_MOC]]"
status: active
aliases:
  - llm-wiki-overview
---
# LLM Wiki Overview

현재 이 위키는 “초기화 단계”를 지난 persistent synthesis layer다. 2026-04-13 기준으로는 대회 전략 위키가 아니라, `현재 제품 상태`, `k-skill 결정`, `Paperclip 흡수 패턴`, `멀티에이전트 운영`, `배포 버그 수정 기록`까지 읽을 수 있는 운영형 레이어로 봐야 한다.

## 목표

- 대회 관련 knowledge를 raw source에서 반복 재발견하지 않도록 한다.
- 기관, 심사, 문제 영역, 교육 pain point, 전략을 compounding artifact로 만든다.
- 질의 결과가 chat에만 남지 않고 wiki page로 축적되게 한다.

## 지금 바로 읽을 축

- 제품 스냅샷: [[HagentOS_현재_아키텍처_상태]]
- 생태계 결정: [[k-skill_생태계_결정_내역]]
- 롤모델 흡수: [[Paperclip_롤모델_흡수_패턴]]
- 협업 운영: [[멀티에이전트_운영_모델]]
- Day 8 안정화: [[배포_버그_수정_요약_2026-04-13]]

## 계속 유효한 상위 축

- 대회 성격 축: [[KEG는_교육실증형_AI_MVP_콘테스트다]]
- 심사/제출 축: [[KEG_심사_문법]]
- 도메인 언어 축: [[교육_도메인_언어_지도]]
- 설계 원칙 축: [[에듀테크_학습설계_원칙]]

## 현재 해석 프레임

- 제품은 [[케이스_승인_후속조치_모델|approval-driven operations system]]으로 읽는다.
- `k-skill`은 후보 아이디어가 아니라 구조적 결정으로 읽는다.
- Paperclip은 복제 대상이 아니라 흡수 패턴의 원본으로 읽는다.
- AI 협업 기록은 `PROGRESS -> memory -> wiki -> intake ledger` 순서로 읽는다.

## research-results 반영 메모

- `02_전략/research-results`는 `06_LLM위키/sources/research-results/`로 raw mirror 되었다.
- 우선 승격된 주제는 `학원 운영의 예외처리 구조`, `운영 케이스 OS`, `데이터 자산화 우선순위`, `운영자 모드 vs 담임 모드`다.
- 다음 승격 단위는 `민원 대응`, `재등록/이탈 방어`, `법규 approval flow`, `domain pack`이다.

## 현재 추가 확보한 축

- approval flow 축: [[학원_운영의_승인지점과_approval_flow]]
- MVP 후보 축: [[민원_대응은_첫_MVP_후보다]], [[재등록과_이탈_방어는_두번째_강한_MVP_후보다]]
- evidence language 축: [[현장_발화는_문제정의의_강한_근거다]]
- 구조 비교 축: [[공교육_vs_사교육_민원과_행정_체계]]
- domain pack 축: [[업종별_학원_운영_리스크_맵]]

## 이번 라운드 추가 축

- pain priority 축: [[운영자와_교사의_현장_pain_top10]]
- field quote bank 축: [[현장_발화_샘플_뱅크]]
- toolchain 축: [[학원_운영_k-skill_및_MCP_후보_맵]]

## 이번 승격 축

- problem selection 축: [[문제_선택_점수표_문법]]
- problem bank 축: [[문제_후보_뱅크와_탈락_문법]]
- execution doctrine 축: [[KEG_7일_MVP_플레이북]]

## 오늘 추가 축

- product gap 축: [[Paperclip_vs_HagentOS_설계_갭]]
- legal/compliance 축: [[학원_운영_법규_체크리스트]]
- operations loop 축: [[학원_운영_루프_지도]]
- control plane 축: [[운영_Control_Plane_모델]]
- domain translation 축: [[한국_교육_도메인_적합성_갭]]
- solution gap 축: [[기존_교육운영_솔루션의_공백]]
- data asset 축: [[학원_운영_데이터_자산_지도]]
- context quality 축: [[누적_맥락이_운영_AI_품질을_결정한다]]
- execution loop 축: [[케이스_승인_후속조치_모델]]

## 이번 추가 승격 축

- bottom-up research 축: [[바텀업_학원_리서치_원칙]]
- problem-definition guardrail 축: [[문제정의_출발점과_금지선]]
- board-first UI 축: [[운영보드_우선_UI_원칙]]
- case context 축: [[운영_케이스_컨텍스트_모델]]
- role/skill architecture 축: [[역할기반_agent_skill_구조]]

## 이번 라운드에서 메운 빈칸

- current architecture snapshot 축: [[HagentOS_현재_아키텍처_상태]]
- k-skill decision record 축: [[k-skill_생태계_결정_내역]]
- Paperclip absorption pattern 축: [[Paperclip_롤모델_흡수_패턴]]
- multi-agent operating model 축: [[멀티에이전트_운영_모델]]
- deploy bug fix summary 축: [[배포_버그_수정_요약_2026-04-13]]

## 남은 정규화 backlog

- `06_LLM위키/`의 legacy 노트 다수는 `tags` 안의 `status/active`만 있고 frontmatter `status:` scalar가 없다.
- 이번 라운드는 핵심 진입점과 신규/보강 노트만 정규화했다.
- 전체 frontmatter 정규화는 별도 lint round가 더 안전하다.
