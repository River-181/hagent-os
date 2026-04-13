# SHARE-PACKAGE

> External share guide for the HagentOS contest workspace package

## 목적

이 저장소는 **HagentOS 대회용 패키지 스냅샷**입니다. 제품 개요, 기획 정본, 증빙, 제출 문서, 대회 시점 코드 스냅샷을 한 번에 공유할 수 있도록 정리합니다.

최신 구현 정본은 이 패키지 자체가 아니라 별도 제품 저장소를 기준으로 봅니다.

- latest runnable product: `River-181/hagent-os`
- contest-time code snapshot: `03_제품/app/`
- product docs source: `03_제품/hagent-os/`

## 추천 읽기 순서

1. `README.md`
2. `03_제품/hagent-os/README.md`
3. `03_제품/hagent-os/02_product/prd.md`
4. `03_제품/hagent-os/02_product/mvp-scope.md`
5. `03_제품/hagent-os/09_uxui/domain-ux-paperclip-gap.md`
6. `05_제출/live-final-verification.md`
7. `05_제출/ai-report-final.md`

## 포함 범위

- `01_대회정보/`: 대회 규칙, 일정, 심사 자료
- `02_전략/`: 문제 정의, 전략, 의사결정, 리서치
- `03_제품/hagent-os/`: 제품 문서 정본
- `03_제품/app/`: 대회 시점 코드 스냅샷
- `04_증빙/`: AI 활용 및 개발 증빙
- `05_제출/`: 최종 제출 문서와 체크리스트
- `06_LLM위키/`: 장기 지식 베이스
- `assets/`: 스크린샷, PDF, 도식 소스

## 내부 보존 영역

아래 폴더는 보존 가치는 있지만 외부 독자가 필수로 볼 필요는 없습니다.

- `.agent/`: AI 협업 운영 규칙
- `.claude/`: Claude runtime adapter
- `_MOC/`: Obsidian navigation
- `_system/`: 내부 운영 대시보드와 툴 문서

## 로컬 전용 / 공유 제외 원칙

다음 종류의 파일은 패키지 본문에서 직접 의존하지 않고, `.gitignore`로 재유입을 막습니다.

- `.env`, `03_제품/app/.env`, 그 변형 파일
- `output/`, `test-results/`, `.tmp-paperclip-capture/`
- `**/*.tsbuildinfo`
- Word lock file (`~$*.docx`)
- 개인별 workspace 설정, 브라우저 프로필, 런타임 로그

## 자산 위치 규칙

- `assets/excaildraw/`: Excalidraw source files
- `03_제품/hagent-os/diagrams/`: 공유 문서에 사용하는 rendered diagrams
- `assets/screenshots/`: 제품 UI 증빙 스크린샷
- `assets/pdf/`: 대회 안내 PDF, 동의서, 각서 등 제출 부속 파일

## 업데이트 규칙

- 새 문서는 가장 구체적인 기존 폴더에 둡니다. 새 top-level 폴더는 만들지 않습니다.
- 제품 동작이 바뀌면 구현 저장소 기준을 우선 확인하고, 필요한 경우 이 패키지 문서를 동기화합니다.
- 외부 공유용 진입점은 `README.md`, `SHARE-PACKAGE.md`, `00 HOME.md`, `05_제출/`을 기준으로 유지합니다.
