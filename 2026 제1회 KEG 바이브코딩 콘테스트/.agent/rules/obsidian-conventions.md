---
tags:
  - area/system
  - type/reference
  - status/active
description: 옵시디언 마크다운 규칙 — 위키링크, frontmatter, 태그, 네이밍
up: "[[.agent/AGENTS]]"
---

# 옵시디언 규칙

- 내부 링크: `[[위키링크]]` 사용. 마크다운 링크 `[]()`는 외부 URL에만.
- 모든 노트에 YAML frontmatter 포함. 최소: `tags`, `date`.
- root note를 제외한 모든 노트는 frontmatter `up` 속성으로 즉시 부모 note를 가리킨다.
- `up`은 구조적 부모를 표현한다. 단순 관련 문서나 참고 링크를 넣지 않는다.
- `up`은 Obsidian wikilink 문자열로 저장한다. 예: `up: "[[_02_전략_MOC]]"`
- 태그는 `area/*`, `type/*`, `status/*`, `workflow/*` 네임스페이스만 사용.
- 태그는 폴더를 대체하지 않고, 문서의 역할과 운영 연결점만 표현.
- 주제어, 별칭, 검색 편의어는 태그 대신 `aliases`, 제목, 본문 링크로 처리.
- 태스크 note는 `type/task`를 사용하고, 진행 상태는 frontmatter `status`로 관리.
- 정식 규칙과 감사 절차는 `[[tagging-system]]`을 기준으로 한다.
- 파일명: 한국어 OK, 공백 대신 `_` 권장 (코드 참조 시)
- MOC 파일: `_MOC/` 아래에 중앙화하고 `_` 프리픽스를 유지
- 첨부파일: `assets/` 디렉토리에 저장
- 임베드: `![[파일명]]` 또는 `![[파일명|너비]]`
