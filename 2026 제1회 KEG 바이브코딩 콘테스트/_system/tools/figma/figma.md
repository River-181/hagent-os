---
tags:
  - area/system
  - type/guide
  - status/active
title: figma
kind: tool
area: system
status: setup-required
created: 2026-04-06
updated: 2026-04-06
tool_id: figma
tool_type: mcp
owner: design
auth_mode: oauth
up: "[[_system/tools/README]]"
---

# Figma MCP

> 이 문서는 이 워크스페이스의 Figma MCP 정본이다.
> 전역 설치 여부와 무관하게 연결 방법과 운영 규칙은 여기서 관리한다.

## 역할

- 디자인 파일 읽기/쓰기
- 디자인 토큰, 스크린샷, context 추출
- Figma 기반 구현 작업 연결

## 연결 방식

- 방식: remote MCP + OAuth
- 팀원별 인증 필요
- 연결 후 사용 규칙은 [[.agent/skills/obsidian-workspace/SKILL|obsidian-workspace]] 및 공용 에이전트 규칙을 따른다.

## 팀 Figma 링크

- 개발자 링크: [Figma Dev](https://www.figma.com/design/EAIDgsEJScEZZgwADHiNLQ/%ED%94%BC%EA%B7%B8%EB%A7%88%E3%85%A3?node-id=0-1&m=dev)
- 편집 링크: [Figma Edit](https://www.figma.com/design/EAIDgsEJScEZZgwADHiNLQ/%ED%94%BC%EA%B7%B8%EB%A7%88%E3%85%A3?node-id=0-1&t=PeaVY4SNHow2DC8e-1)
- 파일 키: `EAIDgsEJScEZZgwADHiNLQ`

## 팀 적용 순서

1. Claude Code 또는 사용 중인 에이전트 런타임에서 Figma MCP 추가
2. OAuth 인증
3. 테스트 파일 또는 팀 파일 연결 확인
4. 결과를 `[[master-evidence-ledger]]`에 기록

## 주의

- 계정별 권한이 다를 수 있다.
- 파일 키, 노드 ID, 인증 토큰은 문서 정본에는 넣지 않는다.
- 실제 프로젝트 키는 필요 시 `assets/`나 별도 비공개 note에 보관한다.
