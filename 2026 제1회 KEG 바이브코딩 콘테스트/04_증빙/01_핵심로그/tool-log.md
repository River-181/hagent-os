---
tags:
  - area/evidence
  - type/log
  - status/active
date: 2026-04-10
up: "[[_04_증빙_MOC]]"
---
# 도구 사용 기록

> 이 프로젝트에서 사용하는 모든 AI 도구와 외부 서비스를 기록한다.
> 도구 선택의 근거, 강점/약점, 사용 시점을 추적하여 AI 리포트에 활용.
> 공용 운영 정본은 `.agent/system/registry/*.md`, 도구 계약 정본은 `.agent/system/contracts/tools/*.md`이다.

## AI 도구

| ID    | 도구명         | 카테고리        | 역할           | 환경      | 모델        | 플랜  | 강점                         | 약점          | 언제 쓰나               | 언제 안 쓰나        | 계약 정본                                          | 상태     |
| ----- | ----------- | ----------- | ------------ | ------- | --------- | --- | -------------------------- | ----------- | ------------------- | -------------- | ---------------------------------------------- | ------ |
| T-001 | ChatGPT Web | AI Chat     | 설계/기획        | Web     | GPT-5.4   | Pro | 문제 구조화, 단계 설계 빠름           | 로컬 파일 조작 약함 | 전략, 문서 초안, 방향 설정    | 로컬 수정, 파일 생성   | `.agent/system/contracts/tools/chatgpt-web.md` | Active |
| T-002 | Codex       | AI Agent    | 구현/정리        | Desktop | GPT-5 / GPT-5.4 | App | 로컬 파일, 코드, 검증, 증빙 자동화      | exact token source 부재 | 산출물 생성, repo 정리, 검증, 증빙 동기화 | 대규모 웹 리서치 단독 작업 | `.agent/system/contracts/tools/codex.md`       | Active |
| T-003 | Perplexity  | AI Research | 리서치          | Web     | Search+AI | Pro | 방대한 자료 탐색, 출처 수집           | 출처 품질 편차    | 사례 수집, 경쟁 분석, 참고 링크 | 최종 결정 근거 단독 사용 | `.agent/system/contracts/tools/perplexity.md`  | Active |
| T-004 | Claude Code | AI Agent    | 워크스페이스 구축/코딩 | CLI     | Opus 4.6  | -   | 로컬 파일 완전 제어, MCP, 스킬, 에이전트 | 컨텍스트 소모 큼   | 구조 설계, 코드, 증빙       | 단순 리서치         | `.agent/system/contracts/tools/claude-code.md` | Active |
| T-005 | Gemini Web  | AI Chat     | 비교 질의/보조 발상     | Web     | Gemini    | Paid | 빠른 비교 응답, 대안 관점 확보            | 세션/토큰 근거 약함 | 비교 질문, 대안 탐색        | 로컬 수정, 정본 작성  | `.agent/system/contracts/tools/gemini-web.md`  | Active |
| T-006 | Grok Web    | AI Chat     | 가벼운 보조 질의        | Web     | Grok      | Free | 빠른 보조 질의, 추가 관점                 | 정밀 증빙/추적 약함 | 가벼운 탐색, 보조 질문      | 정본 의사결정 근거    | `.agent/system/contracts/tools/grok.md`        | Active |

## 외부 도구/서비스

| ID    | 도구명            | 카테고리   | 용도                | 연결 방법      | 상태          |
| ----- | -------------- | ------ | ----------------- | ---------- | ----------- |
| E-001 | Obsidian       | 지식관리   | 볼트 + MOC + 노트     | CLI + App  | Active      |
| E-002 | Excalidraw MCP | 다이어그램  | 아키텍처 시각화          | MCP 서버     | Active      |
| E-003 | Notion MCP     | 프로젝트관리 | 외부 공유용            | MCP 서버     | Active      |
| E-004 | context7 MCP   | 문서조회   | 라이브러리 문서          | MCP 서버     | Active      |
| E-005 | Magic Patterns | UI     | 컴포넌트 생성           | MCP 서버     | Standby     |
| E-006 | Figma MCP      | 디자인    | 디자인→코드            | MCP 서버     | Standby     |
| E-007 | GitHub         | 코드관리   | public repo (제출용) | git init 시 | Not Started |
| E-008 | NotebookLM     | 리서치 합성  | 자료 묶음 기반 리서치 정리      | Web          | Active      |
