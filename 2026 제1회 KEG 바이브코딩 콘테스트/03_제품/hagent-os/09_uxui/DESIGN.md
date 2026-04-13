---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-09
up: "[[03_제품/hagent-os/README]]"
---
# Design System (디자인 시스템)

> HagentOS UI 설계 원칙과 토큰. control plane 철학 채택, 교육 운영 도메인으로 재설계.

---

## 설계 원칙

- **읽기 쉬움 우선.** 30-50대 원장이 모바일에서 빠르게 파악할 수 있어야 한다. 밀도보다 가독성.
- **따뜻하고 신뢰감 있게.** 차갑고 개발자 도구스러운 느낌 금지. 토스 계열의 친근함과 명확함.
- **터치 친화.** 모든 탭 영역 최소 48px. 작은 텍스트 버튼 금지.
- **한국어 기본.** 레이블·메시지·에러는 모두 한국어. 영어는 코드 식별자에만.
- **Light 기본.** 밝은 배경이 기본값. Dark 모드는 선택 토글.
- **컴포넌트 주도.** shadcn/ui 기본 → HagentOS 복합 컴포넌트 → 페이지 3계층 구조.

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | React 19 + Vite |
| 스타일 | Tailwind CSS v4 + CSS Variables |
| 컴포넌트 기반 | shadcn/ui (new-york style, CSS variables 활성화) |
| 접근성 | Radix UI primitives |
| 아이콘 | Lucide React (nav 20px, inline 16px) |
| 폰트 | "Toss Product Sans", "Noto Sans KR", -apple-system, sans-serif |
| 변형 관리 | class-variance-authority (CVA) |
| 클래스 병합 | clsx + tailwind-merge → `cn()` |

> 폰트 전략: Noto Sans KR을 기본 로드. Toss Product Sans는 환경에서 사용 가능한 경우 우선 적용.

---

## 색상 토큰 (CSS Variables)

**항상 시맨틱 토큰만 사용한다** — raw 색상값 하드코딩 금지.

### Light 모드 (기본)

```css
:root {
  /* 배경 */
  --bg-base:      #ffffff;
  --bg-secondary: #f6f7f9;
  --bg-tertiary:  #f2f4f6;
  --bg-elevated:  #ffffff;

  /* Grey scale */
  --grey-50:  #f9fafb;
  --grey-100: #f2f4f6;
  --grey-200: #e5e8eb;
  --grey-300: #d1d6db;
  --grey-400: #b0b8c1;
  --grey-500: #8b95a1;
  --grey-600: #6b7684;
  --grey-700: #4e5968;
  --grey-800: #333d4b;
  --grey-900: #191f28;

  /* Brand — HagentOS Teal */
  --teal-50:  #e6fafa;
  --teal-100: #b3f0f0;
  --teal-300: #26c7c7;
  --teal-500: #0ea5b0;   /* PRIMARY BRAND */
  --teal-600: #0891a0;
  --teal-700: #077e8d;

  /* 시맨틱 — 브랜드 */
  --color-primary:      var(--teal-500);
  --color-primary-hover: var(--teal-600);
  --color-primary-bg:   var(--teal-50);

  /* 시맨틱 — 상태 */
  --color-success: #03b26c;
  --color-warning: #ffc342;
  --color-danger:  #f04452;
  --color-info:    var(--teal-500);

  /* 텍스트 */
  --text-primary:   #191f28;
  --text-secondary: #4e5968;
  --text-tertiary:  #8b95a1;
  --text-disabled:  #b0b8c1;
  --text-brand:     var(--teal-600);

  /* 테두리 */
  --border-default: #e5e8eb;
  --border-focus:   var(--teal-500);

  /* 그림자 — Toss 스타일 navy-tinted */
  --shadow-sm: 0 1px 4px rgba(2,32,71,0.05);
  --shadow-md: 0 4px 16px rgba(2,32,71,0.08), 0 1px 4px rgba(2,32,71,0.04);
  --shadow-lg: 0 8px 32px rgba(2,32,71,0.10), 0 2px 8px rgba(2,32,71,0.06);

  --radius: 0.625rem;
}
```

### Dark 모드 (`.dark` 클래스)

```css
.dark {
  --bg-base:        #17171c;
  --bg-secondary:   #202027;
  --bg-tertiary:    #2c2c35;
  --bg-elevated:    #2c2c35;

  --grey-900: #ffffff;
  --grey-800: #e4e4e5;
  --grey-700: #c3c3c6;

  --text-primary:   #ffffff;
  --text-secondary: #c3c3c6;
  --text-tertiary:  #8b8b92;

  --border-default: #2c2c35;
  --color-primary:  #26c7c7;   /* teal-300, 다크에서 더 밝게 */
  --color-primary-hover: #0ea5b0;
}
```

---

## 타이포그래피

기본 폰트: `"Toss Product Sans", "Noto Sans KR", -apple-system, sans-serif`
기본 크기: **16px** (40-50대 원장 모바일 배려 — 토스 기본 14px보다 크게)

| 패턴 | 크기 | 용도 |
|------|------|------|
| 페이지 제목 | 24px / `font-bold` | 페이지 상단 H1 |
| 섹션 제목 | 20px / `font-semibold` | 주요 섹션 H2 |
| 카드 제목 | 17px / `font-medium` | 카드·패널 헤더 |
| 본문 | 16px / `font-normal` | 기본 텍스트 |
| 보조 | 14px / `text-secondary` | 설명, 부제목 |
| 메타 | 12px / `text-tertiary` | 타임스탬프, 뱃지 |
| 운영 수치 | 28px / `font-bold` | 대시보드 KPI 숫자 |

스케일 제한: 12 / 14 / 16 / 17 / 20 / 24 / 28px — 이 외 임의 크기 사용 금지.

---

## 레이아웃 (4-zone)

```
┌──────┬──────────┬───────────────────────┬─────────────┐
│ Z0   │ Z1       │ Z2 (Main)             │ Z3          │
│ 72px │ 240px    │ flex-1                │ 320px       │
│ 레일  │ 사이드바   │ 메인 콘텐츠              │ 속성 패널     │
└──────┴──────────┴───────────────────────┴─────────────┘
```

**모바일 (< md):** Z0+Z1 → 오버레이, Z3 → 숨김 → 하단 탭 바 5개 (홈 / 케이스 / 등록 / 에이전트 / 알림)
탭 높이 56px, 아이콘 24px, 활성 탭 `--color-primary` 표시.

---

## 핵심 컴포넌트

### 승인 카드 (Approval Card)
상담·결제·환불 등 원장 결재가 필요한 에이전트 요청 카드. 한 탭으로 승인/거절.

| prop | type | 설명 |
|------|------|------|
| `title` | string | 요청 제목 |
| `requester` | string | 요청 에이전트명 |
| `status` | `pending\|approved\|rejected` | 현재 상태 |
| `onApprove` | () => void | 승인 콜백 |
| `onReject` | () => void | 거절 콜백 |

### 케이스 행 (Case Row)
상담 내역·원생 목록 등 케이스 리스트의 기본 행 단위.
제목, 보조 텍스트, 상태 뱃지, 우측 액션 슬롯으로 구성.

### 에이전트 상태 뱃지 (Agent Status Badge)
에이전트 실행 상태를 인라인으로 표시.

| 상태 | 색상 | 아이콘 | 한국어 레이블 |
|------|------|--------|--------------|
| `running` | `--color-info` + animate-pulse | Loader2 | 처리중 |
| `completed` | `--color-success` | CheckCircle2 | 완료 |
| `waiting` | `--color-warning` | Clock | 대기중 |
| `error` | `--color-danger` | AlertCircle | 오류 |
| `idle` | `--text-tertiary` | Minus | 대기 |

### 운영 지표 카드 (Ops Metric Card)
핵심 KPI 1개를 표시. `value`, `label`, `delta`, `icon` props.
대시보드 그리드에서 4열 또는 2열(모바일) 배치.

### 스케줄 캘린더 셀 (Schedule Calendar Cell)
주간/월간 수업 일정 뷰의 단위 셀. 수업명·원생 수·담당 강사 표시. 터치 스크롤 최적화.

### 처리 이력 행 (History Row)
에이전트 실행 감사 로그의 행 단위. 타임스탬프, 에이전트명, 액션 요약, 결과 뱃지.

### 그룹형 목록 (Grouped List)
상태·날짜·카테고리별 섹션 헤더를 가진 묶음 목록.
섹션 헤더: 14px / `font-semibold` / `--text-tertiary` / uppercase.

### 스킬 카드 (Skill Card)
k-skill 레지스트리 아이템. 스킬명, 버전, 활성/비활성 상태, 마지막 실행 시각 표시.

---

## 다크 모드

- 전환 방식: `document.documentElement.classList.toggle('dark')`
- 저장: `localStorage.setItem('theme', 'dark' | 'light')`
- 초기화: `<html>` 태그 인라인 스크립트로 깜빡임 방지
- CSS는 `.dark` 클래스 기반 — `prefers-color-scheme` media query 방식 아님

---

## 금지 규칙

- 토큰 밖 색상 하드코딩 금지 — `#0ea5b0` 직접 사용 금지 → `var(--color-primary)` 사용
- 타이포 스케일 표 밖의 임의 폰트 크기 금지
- `--shadow-lg` 초과 그림자 금지 (sm, md, lg만 허용)
- `rounded-2xl` 이상 금지 (최대 `rounded-xl`, 알약형은 `rounded-full`)
- 상태 색상 직접 지정 금지 → `에이전트 상태 뱃지` 컴포넌트 사용
- 새 재사용 컴포넌트 추가 시 `/design-guide` 페이지 업데이트 필수
- 터치 타겟 48px 미만 금지
