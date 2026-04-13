---
tags: [area/product, type/reference, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/capabilities/paperclip-system-skills-prompt.md"
synced_at: 2026-04-13
---
# Paperclip System Skills To HagentOS Prompt

## 확인된 `paperclip` 시스템 스킬/메타스킬

`paperclip-analysis/paperclip-master` 기준으로 설치 직후 또는 개발/런타임에 핵심으로 쓰이는 스킬 계층은 아래처럼 보인다.

### 런타임 기본 스킬

- `skills/paperclip/SKILL.md`
- `skills/paperclip-create-agent/SKILL.md`
- `skills/paperclip-create-plugin/SKILL.md`
- `skills/para-memory-files/SKILL.md`

이들은 사용자용 업무 스킬이라기보다, 에이전트가 Paperclip 환경에서 일하는 방식을 규정하는 시스템 스킬에 가깝다.

### 개발팀 메타스킬

- `.agents/skills/company-creator/SKILL.md`
- `.agents/skills/create-agent-adapter/SKILL.md`
- `.agents/skills/doc-maintenance/SKILL.md`
- `.agents/skills/pr-report/SKILL.md`
- `.agents/skills/release/SKILL.md`
- `.agents/skills/release-changelog/SKILL.md`

이들은 최종 고객에게 바로 노출되는 스킬이 아니라, 제품 운영과 확장을 위한 내부 skill layer다.

### 보조 스킬

- `.claude/skills/design-guide/SKILL.md`

## 제품 해석

핵심은 “스킬 페이지가 있다”가 아니다.

- 첫 경험은 chat이 아니라 setup과 board다.
- 온보딩, 회사 생성, 에이전트 생성, 플러그인 생성 같은 절차도 스킬로 캡슐화된다.
- 스킬은 단순 prompt preset이 아니라 `절차 + 정책 + 파일/도구 기대치 + 결과 형식`을 담는 시스템 instruction bundle이다.
- 사용자용 업무 스킬과 내부 운영 스킬을 분리한다.

## HagentOS에 반영할 원칙

- `역량`은 사용자용 업무 pack만 담는 페이지가 아니라, 시스템 스킬과 setup pack도 함께 다루는 control plane이어야 한다.
- 고객이 먼저 보는 것은 `학원 온보딩`, `채널 연결`, `법령/환불 설정`, `문서 자동화 설정` 같은 setup pack이다.
- 에이전트 생성/수정, 외부 연동 점검, 런타임 readiness 확인도 “운영 스킬”이 아니라 “시스템 스킬” 층으로 관리한다.
- 한국형 업무 스킬은 `workflow`와 `policy` 중심 taxonomy를 우선한다.

## 다른 코딩 에이전트에게 전달할 프롬프트

```md
You are implementing HagentOS capability control plane inspired by Paperclip.

What matters from Paperclip is not a marketplace of many skills. The important pattern is:
onboarding -> setup skill -> install/configure -> mount to agent -> runtime injection -> result visibility.

Confirmed Paperclip system skills and meta-skills:
- runtime skills: `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, `para-memory-files`
- internal meta-skills: `company-creator`, `create-agent-adapter`, `doc-maintenance`, `pr-report`, `release`, `release-changelog`

Interpretation for HagentOS:
- setup itself must be a skill/pack
- onboarding must recommend and mount setup packs before normal business skills
- user-facing business skills and internal system skills must be separated
- packs should represent repeatable operational flows, not just prompt text

Implement the following product rules:
1. The top-level UI term is Korean: `역량`.
2. `역량` must include four kinds: `skill`, `integration`, `runtime`, `pack`.
3. Add a separate “system/setup” layer for packs like:
   - `academy-bootstrap-pack`
   - `channel-setup-pack`
   - `compliance-setup-pack`
   - `document-setup-pack`
4. In onboarding, recommend setup packs first, then business packs.
5. In the right `Properties` panel for a selected capability, support:
   - install/uninstall for organization
   - assign/remove to a chosen agent
   - duplicate candidate visibility
6. Prefer Korean academy workflows and policies over generic role naming.
7. Preserve path/API compatibility where possible, but make labels Korean for operator-facing UI.

Business capability direction:
- complaint / parent communication
- refund / compliance / law lookup
- schedule / make-up classes / instructor coordination
- document automation / HWPX output
- retention / churn prevention

Do not reduce this to a plain prompt library.
Treat capabilities as an operational control plane.
```
