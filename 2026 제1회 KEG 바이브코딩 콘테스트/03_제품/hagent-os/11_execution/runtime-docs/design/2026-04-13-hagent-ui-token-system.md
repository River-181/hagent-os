---
tags: [area/product, type/design, status/active, workflow/execution]
date: 2026-04-13
up: "[[hagent-os/10_execution/runtime-docs/README]]"
source: "hagent-os/docs/design/2026-04-13-hagent-ui-token-system.md"
synced_at: 2026-04-13
---
# HagentOS UI Token System v1
> ⚠️ **SUPERSEDED** — 토큰 구조가 Phase A에서 재편됨(2026-04-13). 현재 정본: [`ui-harness.md`](ui-harness.md) §2


작성일: 2026-04-13  
대상: `/Users/river/workspace/active/hagent-os`  
참조:
- `/Users/river/workspace/active/hagent-os/ui/src/index.css`
- `/Users/river/workspace/active/2026 제1회 KEG 바이브코딩 콘테스트/03_제품/DESIGN.md`
- `/Users/river/workspace/active/2026 제1회 KEG 바이브코딩 콘테스트/03_제품/hagent-os/brand/visual-language.md`
- `/Users/river/workspace/active/2026 제1회 KEG 바이브코딩 콘테스트/03_제품/hagent-os/_research/paperclip-ui-reference.md`

## 1. 목적

이 문서는 HagentOS의 전역 UI 수정 전에 반드시 따를 디자인 토큰 기준을 고정하기 위한 문서다.

목표는 세 가지다.

1. `Toss` 수준의 정돈감, 명확한 위계, 높은 신뢰감을 만든다.
2. `paperclip`처럼 구조는 단순하되, 학원 운영 도메인에 맞는 언어와 정보 밀도를 유지한다.
3. `teal` 브랜드 hue는 유지하되, 화면 인상은 과장된 스타트업 랜딩이 아니라 차분한 운영 제품으로 만든다.

이 문서 승인 전에는 `Case / Project / Student / Schedule / Agent / Settings / Skills` 전역 UI 확산 작업을 진행하지 않는다.

## 2. 현재 진단

현재 화면이 허접해 보이는 주된 이유는 기능 부족보다 토큰 규칙이 느슨하기 때문이다.

- `radius`가 너무 크다. `rounded-2xl`, `rounded-3xl`, 심지어 임의 radius가 뒤섞여 제품이 부드럽다기보다 흐물흐물해 보인다.
- `surface`가 너무 많다. 박스 안에 박스 안에 박스 구조와 회색 배경 레이어가 누적돼 정보보다 UI 껍데기가 먼저 보인다.
- `shadow`가 많다. 카드마다 hover lift, shadow, 강조 tint가 다르게 들어가 `Toss`식 또렷함이 아니라 산만한 카드 갤러리처럼 보인다.
- `accent` 사용량이 과하다. brand color는 한정적으로 써야 하는데, badge, toggle, chip, button, icon에서 동시에 강하게 나온다.
- `light theme` 대비가 약하다. 현재 스크린샷 기준으로 전체가 옅은 회색과 옅은 teal에 묻혀 텍스트 대비와 정보 계층이 희미하다.

## 3. 북극성

HagentOS는 아래 3개를 동시에 만족해야 한다.

- `Toss의 품질`: 선명한 대비, 절제된 면, 가벼운 shadow, 빠르게 읽히는 위계
- `paperclip의 구조감`: 좌측 navigation, 중앙 작업면, 우측 보조 패널의 운영 도구 구조
- `학원 운영의 맥락`: 한국어 레이블, 보호자/학생/직원/승인/민원/일정 중심의 현실적 정보 배치

정리하면:

`Hue는 Hagent`, `품질 기준은 Toss`, `정보 구조 감각은 paperclip`

## 4. 토큰 원칙

### 4-1. Brand

- primary hue는 기존 `teal`을 유지한다.
- 단, `teal`은 CTA, focus, active state, 핵심 상태 강조에만 쓴다.
- `teal wash`를 큰 면에 남발하지 않는다.

### 4-2. Surface

- 페이지 배경은 거의 흰색이어야 한다.
- 카드보다 `구획`이 먼저 읽혀야 한다.
- 한 화면에서 동시에 보이는 surface depth는 최대 3단계만 허용한다.

### 4-3. Typography

- 제목은 적고 강하게, 본문은 충분히 또렷하게.
- `12 / 14 / 16 / 18 / 24 / 32` 6단계만 쓴다.
- decorative typography 금지.

### 4-4. Motion

- hover와 transition은 존재하되 존재감이 강하면 안 된다.
- `transform lift`는 list card에 기본 적용하지 않는다.

## 5. Core Tokens

### 5-1. Color

```css
:root {
  --bg-canvas: #f7f8fa;
  --bg-page: #ffffff;
  --bg-surface: #ffffff;
  --bg-muted: #f2f4f6;
  --bg-subtle: #f8fafc;
  --bg-overlay: rgba(15, 23, 42, 0.36);

  --text-strong: #111827;
  --text-primary: #191f28;
  --text-secondary: #4e5968;
  --text-muted: #6b7684;
  --text-tertiary: #8b95a1;
  --text-disabled: #b0b8c1;

  --border-subtle: #eef1f4;
  --border-default: #e5e8eb;
  --border-strong: #d7dce2;
  --border-focus: #0ea5b0;

  --accent-primary: #0ea5b0;
  --accent-primary-hover: #0891a0;
  --accent-primary-pressed: #077e8d;
  --accent-primary-soft: #e8f8f8;
  --text-on-primary: #ffffff;

  --status-success: #03b26c;
  --status-success-soft: #ecfbf4;
  --status-warning: #ffc342;
  --status-warning-soft: #fff8e8;
  --status-danger: #f04452;
  --status-danger-soft: #fff1f3;
  --status-info: #0ea5b0;
  --status-info-soft: #e8f8f8;

  --input-bg: #ffffff;
  --input-bg-disabled: #f7f8fa;
  --input-border: #e5e8eb;
  --input-border-error: #f04452;
}
```

```css
.dark {
  --bg-canvas: #17171c;
  --bg-page: #202027;
  --bg-surface: #202027;
  --bg-muted: #2c2c35;
  --bg-subtle: #252530;
  --bg-overlay: rgba(255, 255, 255, 0.12);

  --text-strong: #ffffff;
  --text-primary: #ffffff;
  --text-secondary: #c3c3c6;
  --text-muted: #8b8b92;
  --text-tertiary: #737378;
  --text-disabled: #4a4a52;

  --border-subtle: #2c2c35;
  --border-default: #3a3a45;
  --border-strong: #4a4a55;
  --border-focus: #26c7c7;

  --accent-primary: #26c7c7;
  --accent-primary-hover: #0ea5b0;
  --accent-primary-pressed: #0891a0;
  --accent-primary-soft: rgba(14, 165, 176, 0.12);

  --status-success-soft: rgba(3, 178, 108, 0.12);
  --status-warning-soft: rgba(255, 195, 66, 0.12);
  --status-danger-soft: rgba(240, 68, 82, 0.12);
  --status-info-soft: rgba(14, 165, 176, 0.12);

  --input-bg: #202027;
  --input-bg-disabled: #252530;
  --input-border: #3a3a45;
  --input-border-error: #f04452;
}
```

규칙:

- large panel 배경은 `--bg-page` 또는 `--bg-surface`만 쓴다.
- small internal block만 `--bg-muted`를 허용한다.
- `--bg-secondary`, `--bg-tertiary`, `--bg-elevated`처럼 의미가 겹치는 토큰은 장기적으로 위 semantic 세트로 흡수한다.
- current `index.css`와의 migration mapping을 먼저 확정한다.
  - `--bg-base` -> `--bg-page`
  - `--bg-secondary` -> `--bg-muted`
  - `--bg-tertiary` -> `--bg-subtle`
  - `--bg-elevated` -> `--bg-surface`

### 5-2. Radius

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 999px;
}
```

규칙:

- dialog, main panel: `--radius-xl`
- card, section, input: `--radius-lg`
- compact input, chip, row item: `--radius-md`
- chip, badge: `--radius-pill`
- `24px` 초과 radius 금지
- `rounded-3xl` 금지
- 구현 시 Tailwind utility와 semantic token이 충돌하지 않게 mapping을 먼저 정의한다.
  - `rounded-lg` ≈ 12px
  - `rounded-xl` ≈ 16px
  - `rounded-[20px]`는 dialog / main panel에만 허용

### 5-3. Shadow

```css
:root {
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.10);
}
```

규칙:

- 기본 card는 shadow 없이 border만 사용 가능
- modal, popover, floating panel만 shadow 사용
- list item hover shadow 금지

### 5-4. Spacing

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

규칙:

- page section gap: `24px`
- panel padding: `24px`
- internal block gap: `12px` or `16px`
- metric grid gap: `16px`

### 5-5. Typography

```css
:root {
  --font-family-base: "Toss Product Sans", "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif;

  --text-display: 32px;
  --text-title: 24px;
  --text-section: 18px;
  --text-body: 16px;
  --text-label: 14px;
  --text-meta: 12px;
}
```

규칙:

- page title: `24px / 700`
- section title: `18px / 600`
- card title: `16px / 600`
- body: `16px / 400`
- meta: `12px / 500`
- dashboard metric: `32px / 700`
- `17px`, `20px`, `28px`는 새 토큰 체계에서 더 이상 추가하지 않는다.

## 6. Component Role Tokens

### 6-1. Page Shell

- max width는 page type별로 정하되, 시각적 출발점은 동일해야 한다.
- 상단은 `title -> 1줄 설명 -> meta row -> actions` 순서로 고정한다.
- hero panel 금지. page header는 panel이 아니라 평면 구조를 기본으로 한다.

### 6-2. Main Panel

- 좌측 목록/우측 상세처럼 제품의 큰 작업면은 `main panel`로 정의한다.
- 배경은 `--bg-surface`
- border는 `--border-default`
- radius는 `--radius-lg`
- shadow 기본값 없음

### 6-3. Subtle Block

- panel 내부의 작은 정보 블록만 `subtle block`로 정의한다.
- 배경은 `--bg-muted`
- border는 `--border-default`
- radius는 `--radius-md`
- 박스 안에 또 박스를 넣을 때는 내부 박스 배경을 `--bg-page`로 낮춘다.

### 6-4. Buttons

- primary button은 solid teal 하나만 사용
- secondary는 outline
- tertiary는 text
- page 내 같은 액션 계층에서 variant 혼용 금지

### 6-5. Inputs

- input 배경은 `--bg-page`
- border는 `--border-default`
- focus ring은 `--border-focus`
- glow 효과 금지

### 6-6. Badges

badge는 4종만 허용한다.

- neutral
- success
- warning
- danger

source, namespace, imported 같은 기술 메타는 badge보다 작은 text meta로 처리하는 것이 우선이다.

variant 매핑:

| variant | background | text | border |
|---------|------------|------|--------|
| neutral | `--bg-muted` | `--text-secondary` | `--border-default` |
| success | `--status-success-soft` | `--status-success` | `transparent` |
| warning | `--status-warning-soft` | `--status-warning` | `transparent` |
| danger | `--status-danger-soft` | `--status-danger` | `transparent` |

### 6-7. Input State

- default: `--input-bg`, `--input-border`
- focus: `--input-bg`, `--border-focus`
- error: `--input-bg`, `--input-border-error`
- disabled: `--input-bg-disabled`, `--border-subtle`, `--text-disabled`

## 7. Screen Rules

### 7-1. Skills

- `목록 + 상세` 구조를 유지한다.
- 상단 hero 금지
- summary card, runtime card, source card는 모두 같은 `subtle block` 톤
- 기술 메타는 badge 남발 금지, `SOURCE / KEY / MODE / USED BY` 한 줄 meta row로 고정

### 7-2. Settings

- `admin console`처럼 보이더라도 공격적인 contrast를 쓰지 않는다.
- 설정 섹션은 큰 box보다 `section title + field group` 구조를 우선한다.

### 7-3. Case / Project / Agent / Student / Schedule

- 상세 화면 공통: `header`, `tabs`, `content`, `properties`
- `Properties` 패널은 가장 조용한 surface여야 한다.
- 본문보다 properties가 더 튀면 안 된다.

## 8. 금지 패턴

- large gradient hero
- `rounded-3xl`
- card hover lift 기본 적용
- 같은 레벨 정보에 서로 다른 배경 색 3종 이상 사용
- 의미 없는 icon badge 장식
- `shadow + border + tint` 3개를 동시에 쓰는 강조
- dialog 내부의 강한 cyan focus outline
- loading, empty, error state를 page별 bespoke block으로 각각 제작

## 9. 현재 코드베이스에 대한 즉시 정리 포인트

현재 `ui/src/index.css`는 이미 `Toss` 지향 토큰을 일부 가지고 있지만, 이름과 사용 규칙이 느슨하다.

즉시 필요한 것은 새 색을 더 만드는 일이 아니라 아래 4가지다.

1. `surface` semantic 정리
2. `radius` 상한 강제
3. `shadow` 사용처 축소
4. `badge / chip / filter` 계층 규칙 고정
5. current `index.css` naming을 새 semantic set에 맞춰 rename 또는 alias 정리

## 10. 롤아웃 게이트

이 문서 승인 후 구현은 다음 순서로만 진행한다.

1. `ui/src/index.css` 토큰 정비
2. 공용 surface primitive 정리
3. `SkillsPage` 1차 pilot 재수정
4. `SettingsPage`
5. `CaseDetailPage`, `ProjectDetailPage`, `AgentDetailPage`
6. `Student`, `Schedule`

전역 전파 전에 pilot 검증 조건:

- screenshot 상 대비와 위계가 또렷할 것
- modal, input, button, badge가 같은 언어로 보일 것
- “카드 앱”이 아니라 “운영 제품”처럼 보일 것

## 11. 디자인 작업 중단선

다음 항목이 확정되기 전에는 페이지별 broad rewrite를 금지한다.

- color semantic set
- radius ceiling
- shadow rule
- page header pattern
- panel vs subtle block rule
- badge taxonomy

## 12. 별도 버그 메모

현재 `Skills` 화면의 “스킬이 안 불러와짐” 현상은 디자인과 별개로 데이터/응답 shape 버그 가능성이 있다.

관찰:

- `GET /api/skills?orgId=...` 응답이 정상 skill list가 아니라 `{ "error": "Failed to load skills" }`를 반환한다.

즉, 화면의 비어 있음은 디자인 문제가 아니라 스킬 로딩 실패일 가능성이 높다. 이 버그는 토큰 작업과 분리해서 처리한다.
