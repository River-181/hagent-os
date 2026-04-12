---
name: k-skill-registry
description: Import curated Korean skill packages into HagentOS with upstream/fork metadata preserved.
---

# k-skill 레지스트리

이 system skill은 `k-skill` 저장소를 curated upstream asset으로 다루기 위한 래퍼입니다.

## 목적

- 필요한 skill만 선별 수입
- upstream repo 정보 유지
- 수정이 필요하면 `hagent` namespace로 fork
- case, project, agent에 바로 연결 가능한 형태로 재포장

## 운영 규칙

1. 원본 저장소 메타데이터를 삭제하지 말 것
2. 바로 전체 import하지 말고 운영 목적에 맞는 항목만 선별할 것
3. 로컬 수정이 필요하면 fork 후 수정할 것
4. 중복 skill이 이미 있으면 duplicate 후보로 정리할 것
