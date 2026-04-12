---
name: external-skill-importer
description: 외부 스킬과 MCP를 curated upstream 자산으로 등록하고 포크 기준을 정리하는 시스템 스킬입니다.
---

# 외부 스킬 가져오기

## 목적

- 외부 GitHub skill/MCP 자산을 그대로 복사하지 않고 upstream 자산으로 등록합니다.
- 수정이 필요한 경우에만 `hagent` 포크를 권장합니다.

## 실행 가이드

- source URL, repo, branch 또는 commit을 먼저 기록합니다.
- 바로 제품에 노출할지, curated source로만 둘지 구분합니다.
- 겹치는 기존 스킬이 있으면 중복 후보로 표시합니다.
- 가져온 뒤에는 추천 에이전트, 추천 케이스, required integration을 메타데이터로 보강합니다.

