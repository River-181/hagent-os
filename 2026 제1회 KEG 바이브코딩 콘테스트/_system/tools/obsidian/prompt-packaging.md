---
tags:
  - area/system
  - type/guide
  - status/active
  - workflow/review
date: 2026-04-07
up: "[[obsidian-cli-and-skills]]"
aliases:
  - prompt-packaging
  - 프롬프트패키징
---
# Prompt Packaging

좋은 규칙은 대화에서 끝내지 않고 재사용 가능한 프롬프트 자산으로 승격한다.

## 목적

- 구조 규칙을 1회성 지시가 아니라 반복 가능한 운영 자산으로 만든다.
- 1년 뒤에도 같은 품질로 다시 실행할 수 있게 한다.
- 프롬프트와 결과물을 함께 저장한다.

## 저장 위치

- 원장: [[master-evidence-ledger]]
- 승격본: [[prompt-catalog]]

## 저장 형식

반드시 아래 6가지를 같이 저장한다.

1. `Intent`
2. `Prompt`
3. `Input contract`
4. `Output contract`
5. `Reuse rule`
6. `Linked evidence`

## 승격 기준

- 같은 유형의 작업에 다시 쓸 수 있는가
- 입력 조건이 명확한가
- 출력 형식이 반복 가능한가
- 결과물 note, script, template가 생겼는가
- 사람이 나중에 읽어도 문맥 없이 재실행 가능한가

## 권장 절차

1. 세션 작업을 `master-evidence-ledger.md`에 기록
2. 반복 가치가 검증되면 `prompt-catalog.md`로 승격
3. 필요하면 guide, script, template를 같이 생성
4. 다음부터는 새 설명 대신 카탈로그 프롬프트를 기준으로 실행
