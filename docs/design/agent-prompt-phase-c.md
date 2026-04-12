# Phase C 전역 디자인 통일 — 에이전트 프롬프트

아래 프롬프트를 Codex/Cursor 등 다른 AI에게 그대로 전달한다.

---

## 프롬프트 (복붙용)

```
HagentOS UI Phase C — 전역 디자인 통일.

작업 전 필독:
docs/design/ui-harness.md
docs/design/DESIGN-STATUS.md (페이지별 우선순위 + 위반 목록)

기준 구현체: ui/src/pages/SkillsPage.tsx (Phase B 완료)

각 페이지에서 아래 5가지를 순서대로 수정한다.

1. 색상 → CSS 변수
   bg-white → var(--bg-elevated)
   bg-slate-* → var(--bg-muted) or var(--bg-subtle)
   text-slate-* → var(--text-primary/secondary/tertiary)
   bg-emerald-* → var(--status-success-soft), color: var(--color-success)
   bg-rose-*/bg-red-* → var(--status-danger-soft), color: var(--color-danger)
   bg-teal-* → var(--accent-primary-soft), color: var(--accent-primary)

2. WorkspaceHeader 적용
   커스텀 헤더(div+h1+Button)를 WorkspaceHeader로 교체
   import { WorkspaceHeader } from "@/components/ui/workspace-surface"

3. Primary 버튼 위계
   같은 영역에 Primary 1개만. 나머지는 DropdownMenu ⋯ 로.

4. 헤더 정보 반복 제거
   헤더 summary/description과 동일 내용을 탭 본문에서 삭제.

5. p-6 래퍼 확인
   return() 최상단: <div className="p-6 md:p-8 space-y-6">

순서: P0(Document→Capabilities→AgentDetail→Approvals) →
      P1(Students→CaseDetail→ProjectDetail→Routines) →
      P2(나머지)

페이지 1개 완료마다: cd ui && npx vite build 통과 확인.
```

---

## 문자 수

약 **880자** (공백 포함). 1000자 이하 조건 충족.
