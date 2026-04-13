---
tags: [area/product, type/design, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/design/DESIGN-STATUS.md"
synced_at: 2026-04-13
---
# Design System 적용 상태

> 정본 규칙: [`ui-harness.md`](ui-harness.md) | 토큰: `ui/src/index.css`  
> 마지막 업데이트: 2026-04-13 (전체 30페이지 구조/색상 동시 감사)

---

## 문서 인덱스

| 파일 | 상태 | 역할 |
|------|------|------|
| `ui-harness.md` | ✅ **정본** | 코딩 규칙 + 패턴 + 금지 목록 (AI 필독) |
| `design-system-rules.md` | ✅ 현재 | 압축 규칙 요약 + PR 체크리스트 |
| `2026-04-13-hagent-ui-token-system.md` | ⚠️ SUPERSEDED | Phase A 이전 원본 |
| `2026-04-13-claude-design-review.md` | ⚠️ SUPERSEDED | Phase A 이전 리뷰 판정문 |

---

## Phase 진행 상황

| Phase | 내용 | 상태 |
|-------|------|------|
| A | `index.css` 토큰 슬림화 | ✅ 완료 |
| B | SkillsPage pilot | ✅ 완료 |
| **C** | **전역 반영 — 30개 페이지** | 🔲 진행 중 |

---

## 위반 유형 정의

| 코드 | 의미 |
|------|------|
| 🎨 | Tailwind 색상 유틸 (`bg-white`, `text-slate-*`, `bg-emerald-*` 등) |
| 🏗️ | WorkspaceHeader 미사용 (커스텀 헤더) |
| ➕ | Primary 버튼 2개 이상 (같은 영역) |
| 📋 | stats 텍스트 줄 (`전체 N개 · X개`) |
| 🃏 | Panel 중첩 (WorkspacePanel 안 border+bg box) |
| 🔁 | 헤더 정보를 탭/본문에서 반복 |
| 📑 | 탭 5개 이상 |
| 🏷️ | 배지 2개 동시 |

---

## 전체 페이지 상태

### 🔴 P0 — 즉시 수정 (색상 + 구조 복합 위반)

| 페이지 | 위반 | 비고 |
|--------|------|------|
| `DocumentsPage` | 🎨27 🏗️ 🔁 | 최다 색상 위반, 헤더 정보 반복 |
| `AgentDetailPage` | 🎨16 🏗️ 📑6탭 🏷️ | 탭 6개, 배지 중복 |
| `ApprovalsPage` | 🎨13 🏗️ ➕ 🏷️3 | 일괄승인+일괄거부 primary 충돌, 배지 3개 |
| `CapabilitiesPage` | 🏗️ 📑6탭 📋 🏷️ | 탭 6개, stats 줄, 배지 중복 |

### 🟠 P1 — 구조 문제 (색상 위반 소수 or 없음, 위계 틀림)

| 페이지 | 위반 | 비고 |
|--------|------|------|
| `StudentsPage` | 🎨22 🏗️ ➕5 | Primary 버튼 5개 (최다!) |
| `CaseDetailPage` | 🎨1 🏗️ 🃏 🔁 | Panel 중첩, 헤더 반복 |
| `ProjectDetailPage` | 🏗️ ➕ 🃏 🔁 | Panel 중첩, summary 헤더+탭 이중 노출 |
| `RoutinesPage` | 🏗️ ➕3 📋 | Primary 3개, stats 줄 |
| `AssistantPage` | 🎨13 🏗️ | 색상 위반 |
| `DashboardPage` | 🏗️ 📋 🔁 | stats 카운트, 요약 반복 |
| `SchedulePage` | 🏗️ ➕2 | Primary 2개 |
| `InstructorsPage` | 🎨4 🏗️ ➕2 | 잔여 색상, Primary 2개 |

### 🟡 P2 — 경미한 문제

| 페이지 | 위반 | 비고 |
|--------|------|------|
| `OrgChartPage` | 🎨4 🏗️ ➕ | text-slate 4건 |
| `PluginsPage` | 🏗️ | WorkspaceHeader만 없음 |
| `SettingsPage` | 🏗️ 🃏3 | Panel 중첩 3곳 |
| `CasesPage` | 🏗️ ➕ 📋 | dual primary, stats |
| `GoalsPage` | 🏗️ ➕ 🃏 | |
| `GoalDetailPage` | 🏗️ ➕ 🃏 | |
| `ProjectsPage` | 🏗️ ➕ 📋 | |
| `InboxPage` | 🏗️ ➕ | |
| `AdaptersPage` | 🏗️ | |
| `AgentsPage` | 🏗️ | WorkspaceHeader만 없음 |

### 🟢 P3 — 소규모 잔여

| 페이지 | 위반 | 비고 |
|--------|------|------|
| `NewAgentPage` | 🏗️ | |
| `CostsPage` | 🎨1 | 사소한 색상 1건 |
| `ActivityPage` | 🏗️ | |
| `ApprovalDetailPage` | 🏗️ | |
| `CaseNewPage` | 🏗️ | |

### ✅ 완료

| 페이지 | 비고 |
|--------|------|
| `SkillsPage` | Phase B 기준 구현체 |
| `OnboardingPage` | 전체화면 의도적 예외 |

---

## 공통 수정 패턴

### 패턴 1 — 색상 → CSS 변수

```tsx
// ❌
<div className="bg-white text-slate-900 border border-slate-200">
<span className="bg-emerald-50 text-emerald-700">완료</span>

// ✅
<div style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
<span style={{ backgroundColor: "var(--status-success-soft)", color: "var(--color-success)" }}>완료</span>
```

### 패턴 2 — WorkspaceHeader 적용

```tsx
// ❌ 커스텀 헤더
<div className="flex justify-between">
  <h1 className="text-xl font-bold">페이지 제목</h1>
  <Button>액션</Button>
</div>

// ✅
import { WorkspaceHeader } from "@/components/ui/workspace-surface"
<WorkspaceHeader
  title="페이지 제목"
  description="설명"
  action={<Button>액션</Button>}
/>
```

### 패턴 3 — Primary 1개 + overflow

```tsx
// ❌ Primary 여러 개
<Button>승인</Button>
<Button>거부</Button>
<Button>보류</Button>

// ✅
<Button onClick={onApprove}>승인</Button>
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon"><MoreHorizontal /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={onReject}>거부</DropdownMenuItem>
    <DropdownMenuItem onClick={onHold}>보류</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 패턴 4 — p-6 래퍼

```tsx
return (
  <div className="p-6 md:p-8 space-y-6">
    <WorkspaceHeader ... />
    {/* 본문 */}
  </div>
)
```

### 패턴 5 — 헤더 반복 제거

헤더에 이미 있는 요약/설명을 탭 "개요" 섹션에서 다시 쓰지 않는다.  
탭 본문은 헤더에 없는 새 정보만 담는다.

---

## 완료 기준

각 페이지 수정 후:
1. `cd ui && npx vite build` 통과
2. `cd ui && npx tsc --noEmit` 통과
3. `ui-harness.md` §17 체크리스트 확인
