---
tags:
  - area/product
  - type/reference
  - status/active
  - workflow/ui-pass-2
date: 2026-04-13
up: "[[DESIGN]]"
aliases:
  - 디자인 토큰 전략
  - Token Strategy
---

# 디자인 토큰 전략 (Design Token Strategy)

> [[DESIGN]]이 **원칙**을 말한다면, 이 문서는 **코드에 넣는 규칙**을 말한다.
> 2026-04-13 Skills 페이지 UI 리뷰에서 드러난 "AI스러운 허접함"의 뿌리 — 중복·과잉·위계 혼란 — 을 토큰 레이어와 패턴 규칙으로 막는다.

> [!important] 이 문서의 범위
> - 토큰 아키텍처 (3-tier)
> - 색/타이포/간격/둥글기/그림자의 **정본 표**
> - 컴포넌트·레이아웃 **금지/허용 규칙**
> - PR 직전 체크리스트
>
> 이 문서 바깥의 토큰·패턴은 쓰지 않는다.

---

## 0. 원칙 (5줄)

1. **중복 금지.** 같은 정보는 화면에 한 번만. 헤더에 있으면 본문에 다시 넣지 않는다.
2. **카드 속 카드 금지.** panel 안에 또 border+bg 박스를 넣지 않는다.
3. **한 화면 1개 Primary.** 주요 액션은 1개, 나머지는 `⋯` overflow로 내린다.
4. **토큰 없는 색은 쓰지 않는다.** `#0ea5b0`, `bg-teal-50` 같은 리터럴 금지.
5. **스케일에 없는 숫자 금지.** font-size 11px / 15px / 17px 같은 "어디서 본 적 없는 수치"는 금지.

---

## 1. 토큰 아키텍처 (3-tier)

```
Tier 1  Primitive   │  --teal-500, --grey-200, --size-4
                    │  → 값 그 자체. 코드에서 직접 쓰지 않는다.
                    ▼
Tier 2  Semantic    │  --color-primary, --bg-elevated, --text-primary
                    │  → 코드에서 쓰는 유일한 레이어. 역할 기반.
                    ▼
Tier 3  Component   │  (필요할 때만)  --button-primary-bg
                    │  → 2-tier로 못 푸는 반복 패턴만 3-tier로 올린다.
```

### 규칙
- **코드는 Tier 2만 참조한다.** Tier 1 이름(`--teal-500`)을 JSX/CSS에서 직접 쓰면 리뷰에서 막는다.
- Tier 3는 **같은 semantic 조합이 5번 이상 반복될 때**만 승격한다. 그 전에는 inline으로 조합.
- 테마(`.dark`)는 **Tier 2에서만 분기**한다. Tier 1 값은 고정.

> [!warning] 현재 `index.css`의 문제
> - 배경 토큰이 9종(`--bg-canvas / --bg-page / --bg-surface / --bg-muted / --bg-subtle / --bg-base / --bg-secondary / --bg-tertiary / --bg-elevated`).
> - 절반이 서로 aliasing(`--bg-base = var(--bg-page)`).
> - **Tier 2에서 5종으로 축소**, 나머지는 주석으로 legacy alias만 남김.

---

## 2. 색 토큰 (Tier 2 정본)

### 2.1 배경 — 5종만 사용

| 토큰 | 역할 | Light | Dark |
|------|------|-------|------|
| `--bg-canvas` | 앱 최외곽 (rail, 본문 shell 동일) | `#ffffff` | `#17171c` |
| `--bg-elevated` | panel/card/popover 표면 | `#ffffff` | `#1d232c` |
| `--bg-muted` | 입력·칩·코드 블록 배경 | `#f2f4f6` | `#242c36` |
| `--bg-subtle` | empty state·비강조 영역 | `#f6f8fb` | `#1f262f` |
| `--bg-overlay` | 모달 뒷배경 | `rgba(15,23,42,0.36)` | `rgba(0,0,0,0.5)` |

**결정: rail과 본문 shell은 같은 `--bg-canvas`를 쓰고 구분은 `border-right`로만 한다.** (리뷰 #11)
→ 기존 `--bg-canvas(#f4f6f8) vs --bg-page(#ffffff)` 이원화를 **단일화**.

> [!example] 금지
> ```tsx
> // ❌ 같은 panel 안에서 또 bg를 깔기
> <div style={{ backgroundColor: "var(--bg-muted)" }}>  // panel
>   <div style={{ backgroundColor: "var(--bg-subtle)" }}>  // 속 박스
> ```

### 2.2 텍스트 — 4종만 사용

| 토큰 | 역할 | Light | Dark |
|------|------|-------|------|
| `--text-primary` | 제목·본문 주 | `#191f28` | `#ffffff` |
| `--text-secondary` | 본문 보조·설명 | `#4e5968` | `#c9d1db` |
| `--text-tertiary` | 메타·캡션·disabled | `#8b95a1` | `#8a95a3` |
| `--text-on-primary` | primary 버튼 위 | `#ffffff` | `#ffffff` |

기존 `--text-strong / --text-muted / --text-disabled`는 **legacy alias로만 유지**, 신규 코드에서 금지.

### 2.3 경계 — 2종

| 토큰 | 역할 |
|------|------|
| `--border-default` | 표면 간 구분선 |
| `--border-focus` | focus-visible outline |

`--border-subtle / --border-strong`는 **각각 `--border-default`에 흡수**. 강도 차이는 `opacity`로 표현.

### 2.4 브랜드 & 상태

| 토큰 | 용도 | 값 |
|------|------|----|
| `--color-primary` | 브랜드, primary 버튼, 선택 상태 | teal-500 `#0ea5b0` |
| `--color-primary-soft` | 선택 배경 wash | light: teal-50 / dark: rgba(14,165,176,.12) |
| `--color-success` | 성공/준비됨 | `#03b26c` |
| `--color-warning` | 점검 필요/경고 | `#ffc342` |
| `--color-danger` | 오류/삭제 | `#f04452` |

> [!danger] teal 누적 금지 (리뷰 #12)
> 한 화면에 `--color-primary` 포인트는 **최대 2곳**까지. 우선순위: Primary 버튼 > 선택 상태 > 그 외는 모두 중성 회색.
> 배지, 탭 인디케이터, 아이콘 hover까지 teal을 쓰면 **3곳 이상** 누적이 시작됨 — 하나를 꺼야 한다.

---

## 3. 타이포 토큰 — 4단계 scale

| 티어 | 크기 | weight | letter-spacing | 용도 |
|------|------|--------|----------------|------|
| `title` | 28px | 600 | -0.02em | 페이지 H1, 상세 H2 |
| `section` | 14px | 600 | 0 | 섹션 헤더, 카드 제목 |
| `body` | 14px | 400 | 0 | 본문, 버튼 |
| `meta` | 12px | 400 | 0 | 캡션, 메타, 배지 |

### 금지 (리뷰 #9)
- `11px`, `13px`, `15px`, `17px` **임의 크기 금지**.
- **uppercase + letter-spacing 트릭**은 페이지당 1곳(상세 kicker)만 허용.
  - `0.08em / 0.12em / 0.14em` 3가지 버전 혼재 → **`0.12em`으로 통일**.

### 허용 예외
- 코드/모노스페이스: `12px` 유지 가능.
- 대시보드 KPI 숫자: `28px` title 토큰 재사용 (별도 크기 신설 금지).

---

## 4. 간격 — 4/8 grid

```
4  8  12  16  20  24  32  40  48
```

- 그 외 숫자(6/10/14/18 등) 금지.
- `gap-5` (20px) 이하는 밀도 있는 row, `gap-6` (24px) 이상은 섹션 구분.
- panel padding 기본: `p-6` (24px). 모바일 `p-4` (16px).

---

## 5. Radius — 4단계

| 토큰 | 값 | 용도 |
|------|----|----|
| `--radius-sm` | 6px | input, small button |
| `--radius-md` | 10px | card, panel |
| `--radius-lg` | 14px | large panel, modal |
| `--radius-full` | 9999px | avatar, pill badge, chip |

### 금지 (리뷰 #13)
- `rounded-[20px]` 이상 금지. **panel은 `--radius-lg`(14px) 고정**.
  - 외곽이 더 둥글면 토이/앱스러워진다. paperclip은 10~12px.
- 한 행(row) 안에 radius가 섞이지 않게 한다 (내부 칩만 `rounded-full`, 나머지는 md).

---

## 6. Shadow — 3단계만

| 토큰 | 용도 |
|------|------|
| `--shadow-xs` | panel 기본 (거의 안 보임) |
| `--shadow-sm` | hover/focus |
| `--shadow-md` | modal, popover |

- `--shadow-lg` 금지. 더 강하면 modal 레벨이 아니라는 뜻이므로 구조를 고친다.
- **hover에 lift(translateY) 금지.** 운영툴에 애니메이션 과잉.

---

## 7. 컴포넌트 규칙

### 7.1 버튼 위계
- **한 영역(panel 헤더, 카드 푸터)에 Primary는 1개.**
- 2차 액션은 `variant="outline"`, 3차 이하는 `⋯` overflow 메뉴로.
- Ghost 버튼은 **같은 줄에 primary/outline과 공존하지 않는다.**

> 리뷰 #5: Skills 상세 헤더가 `[설치 해제(outline)] + [로컬 복제(outline sm)] + [동기화 점검(ghost sm)]` 3개 평행 → **`[설치 해제] + [⋯]`**로.

### 7.2 배지
- **설치/상태 1개면 충분하다.** "설치됨" + "사용 가능" 동시 노출 금지 (리뷰 #12, #7).
- 문제 있을 때만 경고 배지(warning/danger), 정상일 때는 배지 없음.
- 배지 스타일: `border-0` + `backgroundColor` rgba tint + `color` semantic. Tailwind 색 유틸 금지.

### 7.3 Panel
- **panel은 1단.** `WorkspacePanel` 안에 또 다른 `WorkspacePanel` 혹은 bordered box 중첩 금지.
- `EmptyState`가 panel 내부에 들어가면 `border-0 bg-transparent` variant 사용.
- panel 헤더 구분선은 `border-b` 1개, 내부 섹션 구분은 **여백(gap-6+)으로만**. 상단 border-t 반복 금지 (리뷰 #10).

### 7.4 Tabs
- **탭은 최대 4개.** 5개 이상은 정보 구조가 틀린 것.
- 탭끼리 컨텐츠가 30%+ 겹치면 합친다 (리뷰 #4: Skills `개요/런타임/출처`).
- 탭 라벨은 **1~3자 명사**. "연결 요구사항" 같은 긴 라벨 금지.

### 7.5 필터 영역
- **필터 칩 5개 이상 금지.** 그 이상이면 `[필터 ▾]` 드롭다운 1개로 압축 (리뷰 #6).
- 검색 Input은 **단층**. bg-muted wrapper 안에 Input 중첩 금지.
- "분류" 같은 uppercase kicker 라벨 금지.

### 7.6 리스트 row
- row 하나에 시각 요소 **최대 3개**: 제목 / 보조(1줄 clamp) / 우측 메타 1개.
- 아이콘 타일(32x32 뱃지 아이콘) 금지 — 제목 자체로 식별 가능.
- 선택 상태는 `--color-primary-soft` wash + `inset 2px 0 0 --color-primary` **둘 다** 쓰지 않고 **하나만**.

### 7.7 Empty / Loading
- 최소 높이 `180px` 고정. `720px` 같은 거대 empty 금지 (panel 안에서 공간 낭비).
- loading은 **텍스트 + Loader2 아이콘** 1세트로 통일, 각 페이지마다 커스텀 금지.

---

## 8. 레이아웃 규칙

### 8.1 페이지 shell
```
┌──────────────────────────────────────────────┐
│ WorkspaceHeader  (title + description + action) │  ← 1개만
├──────────────────────────────────────────────┤
│  (필터/stats 줄 — 없으면 없는 대로)               │  ← 여기에 stats 텍스트 줄 금지
├──────────────────────────────────────────────┤
│  panel / grid 본문                             │
└──────────────────────────────────────────────┘
```

- **stats 텍스트 줄**(`전체 N · 설치 N · 연결 필요 N`) 금지 — 필터 칩이나 카운트 badge로 흡수 (리뷰 #3).
- Header action 영역: Primary 1 + Secondary 1 최대.

### 8.2 상세 페이지 (2-col detail)
```
┌──────────────┬────────────────────────────┐
│ 리스트 panel  │ 상세 panel                  │
│ (340px)     │ (flex-1)                    │
└──────────────┴────────────────────────────┘
```

- 상세 헤더 정보 계층: **kicker → title → meta 줄 → summary → status badge**. 5단계 고정.
- 이 계층의 정보를 탭 본문에서 반복하면 안 된다 (리뷰 #3).

### 8.3 전역 요소 (모든 페이지 공통)
- **Properties 토글**은 `supportsProperties=true`인 페이지에서만 렌더 (리뷰 #1).
- **FAB(플로팅 원형 버튼)** 금지 (리뷰 #2). 모달 트리거는 헤더 action으로.

---

## 9. 금지 규칙 종합 (빠른 참조)

| # | 금지 | 대안 | 출처 |
|---|------|------|------|
| 1 | raw 색상 literal (`#0ea5b0`, `bg-teal-50`) | Tier 2 토큰 | §0 |
| 2 | 타이포 스케일 밖 크기(11/13/15/17px) | title/section/body/meta | §3 |
| 3 | 4/8 grid 밖 간격(6/10/14/18) | 4 8 12 16 20 24 32 40 48 | §4 |
| 4 | `rounded-[20px]` 이상 | `--radius-lg` 14px | §5 |
| 5 | panel 안에 bordered box 중첩 | 여백으로만 구분 | §7.3 |
| 6 | 한 영역에 Primary 2개 이상 | Primary 1 + `⋯` | §7.1 |
| 7 | 배지 2개 동시 | 상태 1개, 문제시에만 warning | §7.2 |
| 8 | 탭 5개 이상 | 통폐합 | §7.4 |
| 9 | 필터 칩 5개 이상 | 드롭다운 | §7.5 |
| 10 | stats 텍스트 줄 + 필터 칩 중복 | 하나만 | §8.1 |
| 11 | FAB | 헤더 action 흡수 | §8.3 |
| 12 | 모든 페이지 Properties 토글 | 페이지별 opt-in | §8.3 |
| 13 | 헤더 정보를 본문에서 반복 | 섹션 자체 삭제 | §8.2 |
| 14 | uppercase kicker 2곳 이상 | 페이지당 1곳 | §3 |
| 15 | teal 포인트 3곳 이상 | 최대 2곳 | §2.4 |

---

## 10. PR 체크리스트 (작업자가 자기 점검)

작업 완료 후 PR 올리기 전 눈으로 빠르게:

- [ ] 한 화면에서 **같은 정보가 2번 이상** 나오지 않는가
- [ ] **Primary 버튼 1개**인가 (헤더/카드/모달 각각)
- [ ] **배지 동시 2개** 금지 지켜졌는가
- [ ] **탭 4개 이하**인가
- [ ] **필터 칩 4개 이하**, 아니면 드롭다운인가
- [ ] **카드 안 카드** 없는가 (panel 내부 bordered box)
- [ ] `rounded-[20px]` 등 **임의 radius** 없는가
- [ ] 스케일 밖 **font-size** 없는가 (11/13/15/17px)
- [ ] `bg-*-50 / text-*-700` 같은 **Tailwind 색 유틸** 없는가 → 전부 CSS 변수 inline?
- [ ] **다크 모드** 토글해서 눈으로 확인했는가
- [ ] **FAB / 전역 Properties 토글** 재등장하지 않았는가
- [ ] 한 페이지당 **teal 포인트 2곳 이하**인가

---

## 11. 마이그레이션 계획 (현재 코드 → 이 문서 준수)

### Phase A — 인프라 (index.css)
1. `--bg-canvas`를 흰색으로 통일 (rail/본문 동일).
2. 배경 토큰 9종 → 5종. 제거된 3종은 legacy alias 주석으로 유지.
3. 텍스트 토큰 7종 → 4종.
4. `--border-subtle / --border-strong` alias 처리.
5. `--radius-xl(1rem)` 제거, `--radius-lg`(0.875rem=14px)로 panel 통일.

### Phase B — Skills 페이지 (pilot, 리뷰 반영)
1. 전역 FAB, Properties 전역 토글 제거 (`Layout`).
2. stats 텍스트 줄 삭제.
3. 필터 칩 5개 → `[전체 ▾]` 드롭다운.
4. `개요` 탭의 `스킬 요약` 섹션 + `DetailMetric` 3칸 제거.
5. `런타임` / `출처` 탭 → `개요`에 흡수. 탭 4개.
6. 헤더 우측 action: Primary 1 + `⋯`.
7. `내보내기` 버튼 3개 → `[내보내기 ▾]` 1개.
8. SkillCard 아이콘 타일 제거, 배지 1개로.

### Phase C — 전역 반영
Skills가 기준 통과하면 같은 패턴을 **Cases / Projects / Students / Schedule / Agents / Settings** 순으로 적용.

---

## 12. 참고 / 링크

- 원칙 상위 문서: [[DESIGN]]
- 리뷰 원본(세션 메모리): `/Users/river/.claude/projects/-Users-river-workspace-active-2026--1--KEG-----------/` 세션 이력 중 2026-04-13 skills 리뷰
- 벤치마크: paperclip (운영툴 위계), Toss (절제된 강조)
- 기존 앱 토큰 정본: [[03_제품/app/ui/src/index.css]]
