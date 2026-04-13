---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-12
up: "[[information-architecture]]"
aliases:
  - 사이드바 개선안
---
# 사이드바 네이밍 및 구조 개선안

> 작성일: 2026-04-12
> 현재 코드 기준: `hagent-os/ui/src/components/Sidebar.tsx`
> 관련: [[domain-ux-paperclip-gap]]

---

## 현재 상태 진단

### 섹션 구성 (현재)

| 섹션명 | 포함 항목 | 문제 |
|--------|----------|------|
| (무소속) | 대시보드, 알림함 | — |
| 업무 | 케이스, 프로젝트, 승인, 자동 실행, 운영 목표 | 업무 흐름 + 관리 항목 혼재 |
| 에이전트 팀 | 에이전트, 에이전트 조직도 + live list | — |
| 학원 관리 | **10개** | 과밀. 인프라/데이터/운영 구분 없음 |

### 네이밍 문제

| 현재 | 문제점 |
|------|--------|
| `자동 실행` | routines의 번역인데 "실행"은 동사형 → 명사 항목과 불일치 |
| `k-skill 레지스트리` | 너무 기술적, 레이블이 길어 truncate 위험 |
| `에이전트 조직도` | 다른 항목 대비 5글자로 길다 |
| `처리 이력` | activity인데 "처리"는 케이스 처리와 혼동 |
| `직원/강사 관리` | 슬래시 네이밍이 nav 항목에 부자연스러움 |
| `운영 목표` | 중요도 낮은 항목인데 주요 업무 섹션에 있음 |

### 아이콘 중복

- `학생 관리` + `직원/강사 관리` 둘 다 `GraduationCap` → 시각적으로 구분 불가
- `Cable` import되어 있으나 사용되지 않음 (어댑터에 `Cog` 사용)

### 기타

- 버전 표시 `v0.3.0` → 실제 코드는 v1.0
- `어댑터`는 사용 빈도 낮은데 메인 nav에 노출됨

---

## 개선안

### 섹션 구조 (제안)

```
[케이스 등록]

대시보드
알림함

── 업무 ──────────────────────────
케이스           FileText
프로젝트         FolderKanban
승인             CheckSquare
일정             Calendar

── AI 팀 ─────────────────────────
에이전트         Bot          (+ live agent list)
조직도           Network      ← "에이전트 조직도" 축약
자동화           RefreshCw    ← "자동 실행" → 명사형
목표             Target       ← "운영 목표" → 축약, AI팀 맥락으로 이동

── 학원 ──────────────────────────
학생             GraduationCap
강사             UserCheck    ← 아이콘 변경 (중복 해결)
문서             BookOpen

── 시스템 ────────────────────────
스킬             Puzzle       ← "k-skill 레지스트리" 축약
플러그인         Blocks
비용             Wallet
활동 이력        Activity     ← "처리 이력" → 의미 명확화
설정             Settings
```

> **어댑터**: 설정 페이지 내 탭으로 흡수 권장 (독립 nav 항목 불필요)

### 네이밍 대조표

| 현재 | 제안 | 근거 |
|------|------|------|
| 자동 실행 | **자동화** | 명사형, 짧음 |
| k-skill 레지스트리 | **스킬** | 기술 용어 제거, 직관적 |
| 에이전트 조직도 | **조직도** | 섹션이 "AI 팀"이므로 생략 가능 |
| 처리 이력 | **활동 이력** | activity 직역, 케이스 처리와 혼동 방지 |
| 직원/강사 관리 | **강사** | 슬래시 제거, 간결화 |
| 학생 관리 | **학생** | 섹션이 "학원"이므로 "관리" 생략 |
| 운영 목표 | **목표** | 간결화 |

### 아이콘 변경

| 항목 | 현재 | 제안 |
|------|------|------|
| 강사 | `GraduationCap` (학생과 동일) | `UserCheck` |
| 플러그인 | `Cpu` | `Blocks` (Cpu는 시스템 의미로 혼동) |
| 어댑터 | `Cog` | 설정 탭으로 통합 → 제거 |
| 자동화 | `Clock` | `RefreshCw` |

### 버전 표시

- `v0.3.0` → `v1.0` 로 수정 필요

---

## 구현 시 참고

```tsx
// 변경 요약 (Sidebar.tsx)

// 섹션 라벨
<SectionLabel label="업무" />      // 유지
<SectionLabel label="AI 팀" />     // "에이전트 팀" → "AI 팀"
<SectionLabel label="학원" />      // "학원 관리" → "학원"
<SectionLabel label="시스템" />    // 신규

// 항목
<NavItem label="자동화" />         // 자동 실행
<NavItem label="목표" />           // 운영 목표
<NavItem label="조직도" />         // 에이전트 조직도
<NavItem label="스킬" />           // k-skill 레지스트리
<NavItem label="강사" />           // 직원/강사 관리
<NavItem label="학생" />           // 학생 관리
<NavItem label="활동 이력" />      // 처리 이력
// 어댑터 항목 제거 → 설정 탭으로 이동

// 버전
<span>v1.0</span>
```

---

## 관련 문서

- [[information-architecture]] — 전체 라우트 맵
- [[domain-ux-paperclip-gap]] — Paperclip 비교 UX 개선 계획
