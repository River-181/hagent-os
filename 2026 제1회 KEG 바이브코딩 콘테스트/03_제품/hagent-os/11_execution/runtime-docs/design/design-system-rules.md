---
tags: [area/product, type/design, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/design/design-system-rules.md"
synced_at: 2026-04-13
---
# HagentOS Design System Rules

> **Living reference** — Phase A+B 완료 기준 (2026-04-13)  
> 코드 작성 전 이 문서를 먼저 확인. PRD/스펙이 아닌 **코드 규칙** 문서.

---

## Quick Reference

```
tokens   →  index.css  (Tier 2 semantic 사용, Tier 1 raw 값 금지)
components  →  ui/src/components/ui/workspace-surface.tsx  (WorkspacePanel, WorkspaceHeader, WorkspaceEmptyState)
icons    →  lucide-react (nav 20px, inline 14-16px)
```

---

## 1. Token Layers

| Tier | 예시 | 코드에서 사용 |
|------|------|:---:|
| 1 — Primitive | `--color-teal-500`, `--radius-sm` | ❌ |
| **2 — Semantic** | `--bg-elevated`, `--text-primary`, `--color-primary` | ✅ |
| Legacy alias | `--bg-page`, `--text-strong` | ⚠️ 기존 코드만 |

**신규 코드는 Tier 2 토큰만 사용한다.**

---

## 2. Color Tokens

### Backgrounds (5)

```css
--bg-canvas      /* shell: Layout outer + rail (light=#fff, dark=#17171c) */
--bg-elevated    /* panel / card / popover     (light=#fff, dark=#1d232c) */
--bg-muted       /* input / chip / code        (light=#f2f4f6, dark=#242c36) */
--bg-subtle      /* empty state / 비강조       (light=#f6f8fb, dark=#1f262f) */
--bg-overlay     /* modal backdrop             */
```

> **주의**: `--bg-canvas`와 `--bg-elevated`는 light에서 모두 `#fff`. 구분은 `border`와 `shadow-xs`만으로 한다.

### Text (4)

```css
--text-primary      /* 제목, 본문 강조 */
--text-secondary    /* 본문 보조, 설명 */
--text-tertiary     /* 메타, 캡션, placeholder */
--text-on-primary   /* primary 버튼 위 (#fff) */
```

### Border (2)

```css
--border-default   /* 모든 구분선 */
--border-focus     /* focus-visible outline */
```

### Brand & Status

```css
--color-primary        /* teal-500, primary 버튼 배경 */
--color-primary-soft   /* 선택 wash (배지 배경 등) */
--color-success  --status-success-soft
--color-warning  --status-warning-soft
--color-danger   --status-danger-soft
```

---

## 3. Typography (4-tier)

| Tier | 크기 | Weight | 용도 |
|------|------|--------|------|
| `title` | 28px | 600 | 페이지 H1, 상세 H2 |
| `section` | 14px | 600 | 섹션 헤더, 카드 제목 (`text-sm font-semibold`) |
| `body` | 14px | 400 | 본문, 버튼 (`text-sm`) |
| `meta` | 12px | 400 | 캡션, 배지 (`text-xs`) |

**금지**: 11px, 13px, 15px, 17px (임의 크기).  
**uppercase + letter-spacing** (`tracking-[0.12em]`): 페이지당 kicker 1곳만.

---

## 4. Spacing

4/8 grid 사용: `4 8 12 16 20 24 32 40 48`  
이 외 숫자(6/10/14/18 등) 금지.

| 패턴 | 값 |
|------|----|
| Panel padding | `p-6` (24px) / mobile `p-4` |
| Section gap | `gap-6` (24px) |
| Row gap | `gap-4` (16px) |
| Tag gap | `gap-2` (8px) |

---

## 5. Radius

| Token | 값 | 용도 |
|-------|----|----|
| `--radius-sm` | 6px | input, small button |
| `--radius-md` | 8px | button, chip |
| `--radius-lg` | 10px | card (`rounded-lg`) |
| `rounded-full` | 9999px | avatar, pill badge |

**금지**: `rounded-[20px]` 이상. Panel은 `rounded-lg` 고정.

---

## 6. Shadow

```css
--shadow-xs   /* panel 기본 (거의 불투명) */
--shadow-sm   /* hover */
--shadow-md   /* modal / popover */
/* shadow-lg 금지 */
```

---

## 7. Component Rules

### Button Hierarchy

```
Primary     →  className="gap-2"  (solid teal)
Secondary   →  variant="outline"
Tertiary    →  DropdownMenu ⋯   (overflow 메뉴)
Ghost       →  동일 행에 primary와 공존 금지
```

> **한 영역(panel 헤더, 카드 푸터)에 Primary 1개 최대.**

### Badge

```tsx
// 문제 있을 때만 warning, 정상이면 단일 상태 배지
<Badge className="border-0 text-xs" style={{
  backgroundColor: "var(--status-warning-soft)",
  color: "var(--status-warning)",
}}>
  설정 필요
</Badge>
```

**배지 동시 2개 금지.** Tailwind `bg-*/text-*` 색 유틸 금지.

### Panel

```tsx
<WorkspacePanel>  {/* rounded-lg border shadow-xs */}
  {/* 내부에 또 다른 border+bg box 금지 */}
</WorkspacePanel>
```

### WorkspaceEmptyState

Panel 내부에서 쓸 때 min-height는 180px으로 제한. 720px 금지.

### Tabs

**최대 4개.** 탭끼리 내용이 30%+ 겹치면 합친다.

```tsx
<TabsList variant="line">
  <TabsTrigger value="overview">개요</TabsTrigger>
  <TabsTrigger value="doc">문서</TabsTrigger>
  <TabsTrigger value="files">파일</TabsTrigger>
  <TabsTrigger value="agents">에이전트</TabsTrigger>
</TabsList>
```

### Filter

```tsx
// 드롭다운 1개 — 칩 5개 이상 금지
<DropdownMenu>
  <DropdownMenuTrigger>
    {currentFilter} <ChevronDown />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuRadioGroup>...</DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 8. Layout Rules

### Page Shell

모든 페이지 콘텐츠는 `p-6 md:p-8` 래퍼 안에:

```tsx
<div className="p-6 md:p-8 space-y-6">
  <WorkspaceHeader title="..." description={...} action={...} />
  {/* panels */}
</div>
```

### Detail Page (2-col)

```tsx
<div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
  <WorkspacePanel>  {/* list */}  </WorkspacePanel>
  <WorkspacePanel>  {/* detail */}  </WorkspacePanel>
</div>
```

헤더 정보 계층: **kicker → title → meta 줄 → summary → status badge**  
이 계층의 정보를 탭 본문에서 반복하지 않는다.

### Global (Layout)

- **FAB 금지** — Assistant 트리거는 BreadcrumbBar 아이콘 버튼
- **Properties 토글**: `panelContent !== null`인 페이지에서만 노출

---

## 9. Anti-patterns Checklist (PR 전 확인)

- [ ] 같은 정보가 화면에 2번 이상 나오지 않는가
- [ ] Primary 버튼 한 영역에 1개인가
- [ ] 배지 동시 2개 없는가
- [ ] 탭 4개 이하인가
- [ ] 필터 칩 4개 이하 (or 드롭다운)인가
- [ ] Panel 안에 bordered box 없는가
- [ ] `rounded-[20px]` 이상 없는가
- [ ] 스케일 밖 font-size(11/13/15/17px) 없는가
- [ ] Tailwind `bg-*/text-*` 색 유틸 → CSS 변수 전환됐는가
- [ ] 다크 모드 토글 확인했는가
- [ ] teal 포인트 한 화면에 2곳 이하인가
- [ ] 페이지에 `p-6` 래퍼 있는가

---

## 10. File Map

```
ui/src/index.css                          — 토큰 정본 (Phase A 2026-04-13)
ui/src/components/ui/workspace-surface.tsx — WorkspacePanel, WorkspaceHeader, WorkspaceEmptyState
ui/src/components/BreadcrumbBar.tsx       — Assistant 트리거, Properties 조건부 토글
ui/src/context/AssistantContext.tsx       — openAssistant() 전역 훅
```

---

*Last updated: 2026-04-13 (Phase A+B)*  
*Full design rationale: `03_제품/DESIGN-TOKENS.md` (KEG workspace)*
