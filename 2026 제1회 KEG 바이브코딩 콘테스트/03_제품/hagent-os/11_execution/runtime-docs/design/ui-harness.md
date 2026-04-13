---
tags: [area/product, type/design, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/design/ui-harness.md"
synced_at: 2026-04-13
---
# HagentOS UI Harness

> **AI 에이전트용 필독 문서.** UI 코드를 작성하기 전에 이 파일을 먼저 읽는다.
> 마지막 업데이트: 2026-04-13 (Phase B pilot 통과 기준)

---

## 0. 세 줄 요약

1. `var(--토큰명)` 인라인 스타일만 쓴다. Tailwind `bg-teal-*`, `text-slate-*` 색상 유틸 금지.
2. 페이지는 `p-6 space-y-6` 래퍼 + `WorkspaceHeader` + `WorkspacePanel` 조합으로 시작한다.
3. 같은 정보를 두 곳에 쓰지 않는다. Primary 버튼은 한 영역에 1개.

---

## 1. 임포트 경로

```tsx
// 복합 레이아웃 컴포넌트
import { WorkspacePanel, WorkspaceHeader, WorkspaceEmptyState } from "@/components/ui/workspace-surface"

// shadcn 컴포넌트
import { Button }        from "@/components/ui/button"
import { Badge }         from "@/components/ui/badge"
import { Input }         from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
         DropdownMenuRadioGroup, DropdownMenuRadioItem,
         DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea }    from "@/components/ui/scroll-area"

// 아이콘: lucide-react (nav 20px, inline 14-16px)
import { Loader2, Search, ChevronDown, MoreHorizontal } from "lucide-react"

// 컨텍스트
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast }       from "@/context/ToastContext"
```

---

## 2. CSS 토큰 — 신규 코드는 아래 목록만 사용

```css
/* 배경 (5종) */
--bg-canvas       /* 앱 shell 바깥 */
--bg-elevated     /* panel / card / popover */
--bg-muted        /* input / chip / code 배경 */
--bg-subtle       /* empty state */
--bg-overlay      /* modal backdrop */

/* 텍스트 (4종) */
--text-primary    /* 제목, 본문 강조 */
--text-secondary  /* 본문 보조 */
--text-tertiary   /* 메타, placeholder */
--text-on-primary /* primary 버튼 위 (#fff) */

/* 경계 (2종) */
--border-default  /* 모든 구분선 */
--border-focus    /* focus ring */

/* 브랜드 */
--color-primary       /* teal — primary 버튼 배경 */
--color-primary-soft  /* 선택 wash */
--accent-primary      /* = --color-primary */
--accent-primary-soft /* = --color-primary-soft */

/* 상태 */
--color-success  --status-success-soft
--color-warning  --status-warning-soft
--color-danger   --status-danger-soft
--color-info     --status-info-soft
```

> **레거시 별칭 (`--bg-page`, `--bg-secondary`, `--text-strong` 등)**: 기존 코드에서 계속 동작하지만,
> 신규 코드에서는 위 목록만 쓴다.

---

## 3. 페이지 껍데기

모든 페이지는 이 구조로 시작한다.

```tsx
import { useEffect } from "react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { WorkspaceHeader } from "@/components/ui/workspace-surface"
import { Button } from "@/components/ui/button"
import { PackagePlus } from "lucide-react"

export function MyPage() {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([{ label: "페이지 이름" }])
  }, [setBreadcrumbs])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="페이지 제목"
        description="한 줄 설명"
        action={
          <Button className="gap-2" onClick={...}>
            <PackagePlus size={15} />
            주요 액션
          </Button>
        }
      />

      {/* 본문 */}
    </div>
  )
}
```

**규칙**
- `p-6 md:p-8 space-y-6` 래퍼 필수. 없으면 내용이 화면 가장자리에 붙는다.
- `WorkspaceHeader`의 `action`에는 Primary 1개 + 최대 Secondary 1개.
- 헤더 아래 stats 텍스트 줄(`전체 N · 설치 N · ...`) 금지 — 필터로 흡수.

---

## 4. 2-컬럼 상세 화면 (가장 많이 쓰는 패턴)

```tsx
<div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
  {/* 좌측: 목록 패널 */}
  <WorkspacePanel className="overflow-hidden">
    {/* 검색 + 필터 */}
    <div className="p-3 border-b space-y-2" style={{ borderColor: "var(--border-default)" }}>
      <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
           style={{ border: "1px solid var(--border-default)" }}>
        <Search size={14} style={{ color: "var(--text-tertiary)" }} />
        <Input placeholder="검색" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-6" />
      </div>
      {/* 필터 드롭다운 — 아래 §7 참조 */}
    </div>
    {/* 목록 rows */}
    <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
      {items.map((item) => <Row key={item.id} item={item} active={...} onClick={...} />)}
    </div>
  </WorkspacePanel>

  {/* 우측: 상세 패널 */}
  <WorkspacePanel className="overflow-hidden">
    {/* 상세 헤더 */}
    <div className="p-6 md:p-8 border-b" style={{ borderColor: "var(--border-default)" }}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          {/* kicker (선택) — 페이지당 1곳만, uppercase tracking-[0.12em] */}
          <p className="text-xs font-medium uppercase tracking-[0.12em]"
             style={{ color: "var(--text-tertiary)" }}>카테고리</p>
          <h2 className="text-[28px] font-semibold tracking-[-0.02em]"
              style={{ color: "var(--text-primary)" }}>제목</h2>
          {/* meta 줄 — 4종 이하 */}
          <div className="flex flex-wrap gap-x-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <span>키 value</span>
            <span>상태 value</span>
          </div>
          <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>설명</p>
          {/* 상태 배지 — §6 참조 */}
        </div>
        {/* 우측 액션: Primary 1 + ⋯ */}
        <div className="flex shrink-0 items-center gap-2">
          <Button className="gap-2" onClick={...}>주요 액션</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><MoreHorizontal size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onClick={...}>부가 액션 1</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={...}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>

    {/* 탭 — 최대 3~4개 */}
    <Tabs defaultValue="overview">
      <div className="px-6 pt-4 md:px-8">
        <TabsList variant="line" className="w-full justify-start gap-2">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="files">파일</TabsTrigger>
          <TabsTrigger value="agents">에이전트</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview" className="p-6 md:p-8">...</TabsContent>
    </Tabs>
  </WorkspacePanel>
</div>
```

**헤더 정보 위계**: kicker → h2 title → meta 줄(text-xs) → summary(text-sm) → badge  
이 위계의 정보를 탭 본문에서 **반복하지 않는다.**

---

## 5. 목록 Row 패턴

```tsx
// §7.6 dense row: 제목 / 보조 1줄 / 우측 상태 1개
function ItemRow({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: active ? "var(--accent-primary-soft)" : "transparent",
        boxShadow: active ? "inset 2px 0 0 var(--accent-primary)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {item.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {item.summary}
          </p>
        </div>
        <StatusBadge item={item} />  {/* §6 참조 */}
      </div>
    </button>
  )
}
```

**금지**: 32×32 아이콘 타일. 배지 2개 동시 노출.

---

## 6. 배지 패턴

```tsx
// ✅ 올바름: 문제 있을 때만 warning, 정상이면 상태 배지 1개
function StatusBadge({ item }) {
  if (!item.ready) {
    return (
      <Badge className="border-0 text-xs" style={{
        backgroundColor: "var(--status-warning-soft)",
        color: "var(--status-warning)",
      }}>
        설정 필요
      </Badge>
    )
  }
  return (
    <Badge className="border-0 text-xs" style={{
      backgroundColor: item.active ? "var(--accent-primary-soft)" : "var(--bg-muted)",
      color: item.active ? "var(--accent-primary)" : "var(--text-tertiary)",
    }}>
      {item.active ? "활성" : "비활성"}
    </Badge>
  )
}
```

```tsx
// ❌ 금지: Tailwind 색 유틸, 배지 2개 동시, className에 색 클래스
<Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">활성</Badge>
<Badge className="bg-teal-100 text-teal-800">설치됨</Badge>
<Badge className="bg-yellow-50 text-yellow-700">설정 필요</Badge>
```

---

## 7. 필터 드롭다운 패턴

```tsx
// ✅ 드롭다운 1개 — 칩 5개 이상 금지
const FILTERS = [
  { key: "all", label: "전체" },
  { key: "active", label: "활성" },
  { key: "issues", label: "점검 필요" },
]

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-muted)]"
      style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
    >
      {FILTERS.find(f => f.key === filter)?.label ?? "전체"}
      <ChevronDown size={12} />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="min-w-[180px]">
    <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
      {FILTERS.map(f => (
        <DropdownMenuRadioItem key={f.key} value={f.key}>{f.label}</DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 8. 버튼 위계

```tsx
// Primary — 한 영역에 1개만
<Button className="gap-2" onClick={...}>
  <Icon size={15} />
  주요 액션
</Button>

// Secondary
<Button variant="outline" className="gap-2" onClick={...}>
  <Icon size={15} />
  보조 액션
</Button>

// Tertiary 이하 → DropdownMenu ⋯ 에 넣기

// 삭제처럼 위험한 액션 (다이얼로그 안)
<Button
  className="gap-2 border-0 text-white"
  style={{ backgroundColor: "var(--color-danger)" }}
  onClick={...}
>
  <Trash2 size={15} />
  삭제
</Button>
```

---

## 9. 탭 규칙

- **최대 3~4개.** 5개 이상이면 정보 구조를 다시 설계한다.
- **탭끼리 내용이 30%+ 겹치면 합친다.** (예: "문서"와 "파일"은 하나로 통합)
- `.md` 파일은 마크다운 렌더링 / 다른 파일은 raw 코드뷰어로 자동 분기.
- 탭 안 섹션 구분은 `border-t` 대신 **여백(space-y-8)** 으로.

```tsx
<Tabs defaultValue="overview" className="min-h-[560px]">
  <div className="px-6 pt-4 md:px-8">
    <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto">
      <TabsTrigger value="overview">개요</TabsTrigger>
      <TabsTrigger value="files">파일</TabsTrigger>
      <TabsTrigger value="agents">에이전트</TabsTrigger>
    </TabsList>
  </div>
  <TabsContent value="overview" className="p-6 md:p-8 space-y-8">
    {/* DetailSection 조합 */}
  </TabsContent>
</Tabs>
```

---

## 10. 섹션 헤더 (`DetailSection`)

```tsx
// WorkspacePanel 탭 안의 섹션 헤더 패턴
function DetailSection({ title, icon, children, action }) {
  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold"
             style={{ color: "var(--text-primary)" }}>
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
```

---

## 11. 빈 상태 / 로딩

```tsx
// 로딩
<WorkspaceEmptyState
  className="min-h-[180px]"   // ← 720px 같은 큰 값 금지
  icon={<Loader2 size={18} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />}
  title="불러오는 중입니다."
  description="잠시만 기다려 주세요."
/>

// 비어 있음
<WorkspaceEmptyState
  className="min-h-[180px]"
  icon={<Icon size={18} />}
  title="항목이 없습니다."
  description="조건을 바꿔 다시 확인해 주세요."
/>
```

Panel 내부에서 쓸 때 `WorkspaceEmptyState`는 별도 border/bg 없이 사용 (자체 border 있음).  
Panel 안에 또 Panel 금지.

---

## 12. 확인 다이얼로그 패턴

```tsx
<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>항목 삭제</DialogTitle>
    </DialogHeader>
    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
      <strong>{item.name}</strong>을 삭제하면 되돌릴 수 없습니다.
    </p>
    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setConfirmOpen(false)}>취소</Button>
      <Button
        disabled={mutation.isPending}
        className="gap-2 border-0 text-white"
        style={{ backgroundColor: "var(--color-danger)" }}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        삭제
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 13. 타이포그래피 스케일

| 용도 | 클래스 | 크기 |
|------|--------|------|
| 페이지 H1 / 상세 H2 | `text-[28px] font-semibold tracking-[-0.02em]` | 28px |
| 섹션 헤더 / 카드 제목 | `text-sm font-semibold` | 14px |
| 본문 | `text-sm` | 14px |
| 메타 / 캡션 / 배지 | `text-xs` | 12px |
| kicker (페이지당 1곳) | `text-xs font-medium uppercase tracking-[0.12em]` | 12px |

**금지**: `text-[11px]`, `text-[13px]`, `text-[15px]`, `text-[17px]` 임의 크기.

---

## 14. Radius / Shadow

```tsx
// Panel
<WorkspacePanel>  {/* rounded-lg = 10px */}

// Button / Input
rounded-md   // 8px

// Chip / Badge
rounded-full

// 금지
rounded-[20px]  rounded-2xl  rounded-3xl
```

Shadow: `var(--shadow-xs)` (panel), `var(--shadow-sm)` (hover), `var(--shadow-md)` (modal)  
`shadow-lg` 금지. hover 시 translateY lift 금지.

---

## 15. 전역 레이아웃 규칙

```
BreadcrumbBar 우측:
  [Assistant]  [⌘K]  [속성 *조건부*]

속성 토글 노출 조건: panelContent !== null (페이지가 setPanelContent를 호출한 경우만)
FAB(하단 플로팅 버튼): 금지. Assistant 트리거는 BreadcrumbBar 아이콘 버튼.
```

```tsx
// 속성 패널 사용하는 페이지
const { setPanelContent } = usePanel()
useEffect(() => {
  setPanelContent(<MyPropertiesPanel />)
  return () => setPanelContent(null)
}, [selectedItem])
```

---

## 16. 금지 패턴 모음

```tsx
// ❌ Tailwind 색 유틸
<div className="bg-white text-slate-900">
<div className="bg-emerald-50 border-emerald-200 text-emerald-700">
<Button className="bg-teal-600 hover:bg-teal-700 text-white">

// ✅ CSS 변수 인라인
<div style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }}>
<div style={{ backgroundColor: "var(--status-success-soft)", color: "var(--color-success)", border: "..." }}>
<Button className="border-0 text-white" style={{ backgroundColor: "var(--color-primary)" }}>

// ❌ Panel 안에 Panel
<WorkspacePanel>
  <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--bg-muted)" }}>
    <div className="rounded-lg border p-3">...

// ✅ 여백으로만 구분
<WorkspacePanel>
  <div className="p-4 space-y-4">
    <section className="space-y-2">...

// ❌ stats 텍스트 줄
<div>전체 {total}개 · 설치 {installed}개 · 연결 필요 {issues}개</div>

// ✅ 필터 드롭다운이 카운트 역할 대신함 (stats 줄 삭제)

// ❌ Primary 2개 병렬
<Button>설치</Button>
<Button>로컬 복제</Button>
<Button variant="ghost">동기화</Button>

// ✅ Primary 1 + 나머지 overflow
<Button>설치</Button>
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>로컬 복제</DropdownMenuItem>
    <DropdownMenuItem>동기화 점검</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// ❌ 헤더 정보를 탭 본문에서 반복
<h2>스킬 이름</h2>
<p>{summary}</p>          ← 헤더에 이미 있음
{/* 개요 탭 */}
<section>스킬 요약: {summary}</section>    ← 중복 ❌

// ✅ 탭 본문은 헤더에 없는 정보만
<h2>스킬 이름</h2>
<p>{summary}</p>
{/* 개요 탭 */}
<section>필요한 연결: ...</section>        ← 새 정보만
```

---

## 17. PR 전 체크리스트

```
[ ] p-6 래퍼 있는가
[ ] Primary 버튼 한 영역에 1개인가
[ ] 같은 정보가 두 곳에 나오지 않는가
[ ] 배지 동시 2개 없는가
[ ] Tailwind bg-*/text-* 색 유틸 없는가 (전부 CSS 변수 inline)
[ ] 탭 4개 이하인가
[ ] 필터 칩 4개 이하 or 드롭다운인가
[ ] Panel 안 bordered box 없는가
[ ] rounded-[20px] 이상 없는가
[ ] 11/13/15/17px 임의 크기 없는가
[ ] 다크 모드 토글 확인했는가
[ ] teal 포인트 한 화면 2곳 이하인가
[ ] stats 텍스트 줄 없는가
[ ] FAB 없는가
```

---

## 18. 레퍼런스

| 파일 | 역할 |
|------|------|
| `ui/src/index.css` | 토큰 정본 — Tier 1/2/Legacy 구조 |
| `ui/src/components/ui/workspace-surface.tsx` | WorkspacePanel, WorkspaceHeader, WorkspaceEmptyState |
| `ui/src/context/AssistantContext.tsx` | `openAssistant()` 훅 |
| `ui/src/context/PanelContext.tsx` | `setPanelContent()` — 속성 패널 |
| `ui/src/pages/SkillsPage.tsx` | 2-col 상세 화면의 기준 구현체 (Phase B pilot) |
| `docs/design/design-system-rules.md` | 압축 규칙 요약 |
