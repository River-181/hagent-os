---
tags:
  - area/submission
  - type/checklist
  - status/active
date: 2026-04-13
up: "[[_05_제출_MOC]]"
status: active
---
# 제출 체크리스트

> 2026-04-13 제출 기록과 현재 패키지 포함 상태를 함께 관리하는 문서
> 실접속 검증: [[05_제출/live-final-verification|제출 직전 라이브 최종 검증]]

## 제출 시점 완료 항목

- [x] **GitHub 저장소** — public 설정, 저장소 URL `HTTP 200` 확인
- [x] **배포된 라이브 URL** — `hagent-os.up.railway.app` `HTTP 200` 확인
- [x] **AI 리포트** — 공식 양식(docx) 작성 및 제출본 준비
- [x] **개인정보 수집/이용 동의서** — 팀원 각각 서명 (PDF)
- [x] **참가 각서** — 팀 단위 서명 (PDF)

## 현재 패키지에 포함된 파일

- [x] `README.md` — 외부 공유용 진입점
- [x] `SHARE-PACKAGE.md` — 패키지 범위/가이드
- [x] `05_제출/ai-report-final.md` — AI 리포트 Markdown 정본
- [x] `05_제출/20260413_③_2026_KIT_바이브코딩_공모전_망상궤도_AI리포트_AI활용전략.docx` — 공식 양식 docx
- [x] `assets/pdf/①_2026_KIT_바이브코딩_공모전_이름_개인정보_수집_및_이용_동의서.pdf`
- [x] `assets/pdf/②_2026_KIT_바이브코딩_공모전_팀명_개인은_이름_참가_각서.pdf`
- [ ] AI 리포트 PDF export본 — 현재 repo에는 포함되어 있지 않음

## 패키지 정합성 체크

- [x] README가 contest workspace package와 구현 저장소를 구분해 설명한다
- [x] 제품 문서 진입 순서가 `03_제품/hagent-os/` 기준으로 정리되어 있다
- [x] 라이브 검증 기록이 별도 문서로 분리되어 있다
- [x] 로컬 산출물과 시크릿 파일은 `.gitignore`로 재유입을 막는다

## 비고

- 제출 메일 첨부물의 실제 최종본과 이 저장소의 포함 상태는 다를 수 있다.
- 현재 패키지 범위 기준은 [[SHARE-PACKAGE]]를 따른다.
