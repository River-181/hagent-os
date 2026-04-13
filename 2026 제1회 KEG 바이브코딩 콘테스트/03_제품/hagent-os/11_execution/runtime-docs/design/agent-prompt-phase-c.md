---
tags: [area/product, type/design, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/design/agent-prompt-phase-c.md"
synced_at: 2026-04-13
---
# Phase C 전역 디자인 통일 — 병렬 에이전트 오케스트레이터 프롬프트

> 이 파일을 Claude Code / Codex / Cursor 오케스트레이터에게 그대로 전달한다.  
> 오케스트레이터는 아래 배치별 에이전트를 **동시에** 실행한 뒤 결과를 취합한다.

---

## 오케스트레이터 프롬프트 (복붙용)

```
당신은 HagentOS UI Phase C 오케스트레이터입니다.

# 필독 파일 (작업 전 반드시 읽을 것)
- /Users/river/workspace/active/hagent-os/docs/design/ui-harness.md
- /Users/river/workspace/active/hagent-os/docs/design/DESIGN-STATUS.md
- /Users/river/workspace/active/hagent-os/ui/src/pages/SkillsPage.tsx
  (Phase B 완료 기준 구현체 — 모르는 패턴은 여기서 확인)

# 목표
ui/src/pages/ 아래 지정 페이지들을 ui-harness.md 규칙에 맞게 수정한다.

# 실행 계획
아래 6개 배치를 순서대로 실행한다.
각 배치 내 에이전트는 반드시 병렬로 동시 실행한다.
배치 완료 후 빌드 검증, 통과하면 다음 배치로 진행한다.

---

## 배치 1 — P0 대형 (병렬 2개)

### Agent 1-A: DocumentsPage (1385줄)
파일: ui/src/pages/DocumentsPage.tsx
위반: 🎨27 🏗️ 🔁

수정 사항:
1. Tailwind 색 유틸 27건 전량 교체
   - bg-white → style={{ backgroundColor: "var(--bg-elevated)" }}
   - bg-slate-50/100 → var(--bg-subtle) 또는 var(--bg-muted)
   - text-slate-900/800/700 → var(--text-primary)
   - text-slate-500/400 → var(--text-tertiary)
   - border-slate-200 → style={{ border: "1px solid var(--border-default)" }}

2. WorkspaceHeader 적용
   - 기존 커스텀 헤더(div+h1+button 조합)를 아래로 교체:
   ```tsx
   import { WorkspaceHeader } from "@/components/ui/workspace-surface"
   <WorkspaceHeader
     title="문서"
     description="지식 베이스와 학원 문서를 관리합니다."
     action={<Button className="gap-2" onClick={...}><Plus size={15}/>문서 추가</Button>}
   />
   ```
   - p-6 md:p-8 space-y-6 래퍼 확인, 없으면 추가

3. 헤더 반복 제거
   - 탭 본문에서 헤더 title/summary와 동일한 내용 삭제
   - 탭 안은 헤더에 없는 새 정보만

### Agent 1-B: CapabilitiesPage (1319줄)
파일: ui/src/pages/CapabilitiesPage.tsx
위반: 🏗️ 📑6탭 📋 🏷️

수정 사항:
1. 탭 6개 → 4개 이하로 통합
   - 현재: all/system/pack/skill/integration/runtime
   - 통합 방안: "연결(integration)"과 "런타임(runtime)"은 내용 겹침 → 하나로
   - 결과: all/system/pack+skill/integration
   - 탭 안 section은 border-t 구분 대신 space-y-8 여백으로

2. WorkspaceHeader 적용 (커스텀 헤더 교체)

3. stats 텍스트 줄 제거 (필터가 대체)

4. 배지 2개 동시 노출 → 1개로 (문제 있을 때만 warning badge 노출)

---

## 배치 1 완료 후 검증
```bash
cd /Users/river/workspace/active/hagent-os/ui
npx tsc --noEmit
npx vite build
```
에러 없으면 배치 2 진행.

---

## 배치 2 — P0 (병렬 2개)

### Agent 2-A: AgentDetailPage (2137줄)
파일: ui/src/pages/AgentDetailPage.tsx
위반: 🎨16 🏗️ 📑6탭 🏷️

수정 사항:
1. Tailwind 색 16건 교체 (배치1 패턴 동일)

2. 탭 6개(overview/instructions/skills/settings/history/budget) → 4개
   - overview + instructions 통합 → "개요"
   - history + budget 통합 → "내역"
   - 결과: 개요/스킬/설정/내역

3. WorkspaceHeader 적용
   - 에이전트 이름, 유형, 상태를 헤더 meta 줄로:
   ```tsx
   <WorkspaceHeader
     title={agent.name}
     description={agent.description}
     action={<div className="flex gap-2"><Button>활성화</Button><DropdownMenu>...</DropdownMenu></div>}
   />
   ```
   - 헤더 아래 kicker: 에이전트 유형 (text-xs uppercase tracking-[0.12em])

4. 배지 중복 → 1개 (상태 배지만, 문제시에만 warning)

5. p-6 래퍼 확인

### Agent 2-B: ApprovalsPage (622줄)
파일: ui/src/pages/ApprovalsPage.tsx
위반: 🎨13 🏗️ ➕ 🏷️3

수정 사항:
1. Tailwind 색 13건 교체

2. Primary 버튼 충돌 해결
   - 현재: "일괄 승인" + "일괄 거부" 두 solid 버튼 병렬
   - 수정: "일괄 승인"만 Primary, "일괄 거부"는 DropdownMenu ⋯ 안으로
   ```tsx
   <Button className="gap-2" onClick={onBulkApprove}>일괄 승인</Button>
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Button variant="outline" size="icon"><MoreHorizontal size={16}/></Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end">
       <DropdownMenuItem onClick={onBulkReject}>일괄 거부</DropdownMenuItem>
       <DropdownMenuItem onClick={onBulkHold}>보류 처리</DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
   ```

3. 배지 3개 → 1개 (우선순위: warning > primary 계열 > neutral)

4. WorkspaceHeader 적용, p-6 래퍼

---

## 배치 2 완료 후 검증 (동일)

---

## 배치 3 — P1 대형 (병렬 2개)

### Agent 3-A: StudentsPage (2162줄)
파일: ui/src/pages/StudentsPage.tsx
위반: 🎨22 🏗️ ➕5

수정 사항:
1. Tailwind 색 22건 교체
   - bg-emerald-* → var(--status-success-soft) / color: var(--color-success)
   - bg-rose-* → var(--status-danger-soft) / color: var(--color-danger)
   - 나머지는 배치1 패턴

2. Primary 버튼 5개 → 1개 + overflow
   - 가장 주요한 액션 1개만 solid primary
   - 나머지는 variant="outline" 또는 DropdownMenu

3. WorkspaceHeader 적용, p-6 래퍼

### Agent 3-B: CaseDetailPage (1633줄)
파일: ui/src/pages/CaseDetailPage.tsx
위반: 🎨1 🏗️ 🃏 🔁

수정 사항:
1. Tailwind 색 1건 교체

2. Panel 중첩 해소
   - WorkspacePanel 안에 또 border+bg 박스가 있는 패턴을 찾아 제거
   - 내부 섹션 구분은 space-y-6 여백만으로

3. 헤더 반복 제거
   - title/summary가 헤더에 있으면 탭 "개요" 섹션에서 삭제

4. WorkspaceHeader 적용
   ```tsx
   <WorkspaceHeader
     title={caseItem.title}
     description={...}
     action={<div className="flex gap-2">
       <Button>처리</Button>
       <DropdownMenu>...</DropdownMenu>
     </div>}
   />
   ```

---

## 배치 3 완료 후 검증

---

## 배치 4 — P1 중형 (병렬 2개)

### Agent 4-A: SchedulePage (2225줄)
파일: ui/src/pages/SchedulePage.tsx
위반: 🏗️ ➕2

수정 사항:
1. Primary 2개 → 1개 + overflow
2. WorkspaceHeader 적용
3. p-6 래퍼 확인

### Agent 4-B: InstructorsPage (1499줄)
파일: ui/src/pages/InstructorsPage.tsx
위반: 🎨4 🏗️ ➕2

수정 사항:
1. bg-rose-* 4건 → var(--status-danger-soft)
2. Primary 2개 → 1개 + overflow
3. WorkspaceHeader 적용

---

## 배치 4 완료 후 검증

---

## 배치 5 — P1 소형 (병렬 4개)

### Agent 5-A: DashboardPage (668줄)
파일: ui/src/pages/DashboardPage.tsx
위반: 🏗️ 📋 🔁

- 섹션 카운트 줄(stats) 제거
- 헤더 반복 제거
- WorkspaceHeader 적용

### Agent 5-B: ProjectDetailPage (700줄)
파일: ui/src/pages/ProjectDetailPage.tsx
위반: 🏗️ ➕ 🃏 🔁

- Primary 2개 → 1개 + overflow
- Panel 중첩 해소
- summary 헤더+탭 이중 제거
- WorkspaceHeader 적용

### Agent 5-C: RoutinesPage (736줄)
파일: ui/src/pages/RoutinesPage.tsx
위반: 🏗️ ➕3 📋

- Primary 3개 → 1개 + overflow
- stats 줄 제거
- WorkspaceHeader 적용

### Agent 5-D: AssistantPage (529줄)
파일: ui/src/pages/AssistantPage.tsx
위반: 🎨13 🏗️

- Tailwind 색 13건 교체
- WorkspaceHeader 적용

---

## 배치 5 완료 후 검증

---

## 배치 6 — P2 소형 (병렬 4개)

### Agent 6-A: AgentsPage + OrgChartPage + PluginsPage
파일:
- ui/src/pages/AgentsPage.tsx (339줄, 위반: 🏗️)
- ui/src/pages/OrgChartPage.tsx (551줄, 위반: 🎨4 🏗️ ➕)
- ui/src/pages/PluginsPage.tsx (137줄, 위반: 🏗️)

OrgChartPage: text-slate 4건 교체 + WorkspaceHeader
AgentsPage, PluginsPage: WorkspaceHeader만 적용

### Agent 6-B: SettingsPage (1362줄)
파일: ui/src/pages/SettingsPage.tsx
위반: 🏗️ 🃏3

- Panel 중첩 3곳 → 여백으로 구분
- WorkspaceHeader 적용 (설정 페이지 상단 타이틀)

### Agent 6-C: CasesPage + GoalsPage + ProjectsPage
파일:
- ui/src/pages/CasesPage.tsx (518줄, 위반: 🏗️ ➕ 📋)
- ui/src/pages/GoalsPage.tsx (249줄, 위반: 🏗️ ➕ 🃏)
- ui/src/pages/ProjectsPage.tsx (456줄, 위반: 🏗️ ➕ 📋)

각 페이지: stats 줄 제거, Primary 1개 + overflow, WorkspaceHeader, Panel 중첩 해소

### Agent 6-D: InboxPage (1227줄)
파일: ui/src/pages/InboxPage.tsx
위반: 🏗️ ➕

- Primary 2개 → 1개 + overflow
- WorkspaceHeader 적용

---

## 배치 6 완료 후 최종 검증
```bash
cd /Users/river/workspace/active/hagent-os/ui
npx tsc --noEmit
npx vite build
# 에러 0 확인 후 완료
```

---

## 모든 에이전트 공통 규칙

### 색상 치환표
| Tailwind | CSS 변수 |
|----------|---------|
| bg-white | var(--bg-elevated) |
| bg-slate-50 | var(--bg-subtle) |
| bg-slate-100 | var(--bg-muted) |
| text-slate-900 | var(--text-primary) |
| text-slate-700/600 | var(--text-secondary) |
| text-slate-500/400 | var(--text-tertiary) |
| border-slate-200 | 1px solid var(--border-default) |
| bg-emerald-50 | var(--status-success-soft) |
| text-emerald-700 | var(--color-success) |
| bg-rose-50 / bg-red-50 | var(--status-danger-soft) |
| text-rose-700 / text-red-700 | var(--color-danger) |
| bg-amber-50 | var(--status-warning-soft) |
| text-amber-700 | var(--color-warning) |
| bg-teal-50 | var(--accent-primary-soft) |
| text-teal-700 | var(--accent-primary) |
| bg-teal-600 버튼 | className="border-0 text-white" style={{ backgroundColor: "var(--color-primary)" }} |

### WorkspaceHeader 보일러플레이트
```tsx
import { WorkspaceHeader } from "@/components/ui/workspace-surface"

// 페이지 return() 최상단 래퍼 포함:
<div className="p-6 md:p-8 space-y-6">
  <WorkspaceHeader
    title="페이지 제목"
    description="한 줄 설명 (선택)"
    action={
      <div className="flex gap-2">
        <Button className="gap-2" onClick={...}>
          <Icon size={15} />주요 액션
        </Button>
      </div>
    }
  />
  {/* 본문 */}
</div>
```

### Primary 1개 + overflow 보일러플레이트
```tsx
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
         DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

<div className="flex items-center gap-2">
  <Button className="gap-2" onClick={primaryAction}>주요 액션</Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon" aria-label="추가 작업">
        <MoreHorizontal size={16} />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-[180px]">
      <DropdownMenuItem onClick={secondaryAction}>보조 액션</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-red-500 focus:text-red-500"
        onClick={deleteAction}
      >
        삭제
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### Panel 중첩 해소
```tsx
// ❌ 금지: WorkspacePanel 안에 bordered box
<WorkspacePanel>
  <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--bg-muted)" }}>
    <div className="rounded-lg border p-3">내용</div>

// ✅ 여백으로만 구분
<WorkspacePanel>
  <div className="p-6 space-y-6">
    <section className="space-y-3">
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>섹션 제목</p>
      <div>내용</div>
    </section>
```

### 주의사항
- 로직(hooks, mutations, queries, state)은 절대 건드리지 않는다
- JSX 구조만 수정
- 각 페이지 수정 후 반드시 빌드 통과 확인
- 기준 구현체: ui/src/pages/SkillsPage.tsx
```

---

## 배치 실행 요약

| 배치 | 에이전트 수 | 페이지 | 병렬 |
|------|-----------|--------|------|
| 1 | 2 | DocumentsPage, CapabilitiesPage | ✅ |
| 2 | 2 | AgentDetailPage, ApprovalsPage | ✅ |
| 3 | 2 | StudentsPage, CaseDetailPage | ✅ |
| 4 | 2 | SchedulePage, InstructorsPage | ✅ |
| 5 | 4 | Dashboard, ProjectDetail, Routines, Assistant | ✅ |
| 6 | 4 | Agents+Org+Plugins, Settings, Cases+Goals+Projects, Inbox | ✅ |

총 16개 에이전트, 22개 페이지, 6 배치.  
예상 배치당 소요: 3~5분. 전체: 20~30분.
