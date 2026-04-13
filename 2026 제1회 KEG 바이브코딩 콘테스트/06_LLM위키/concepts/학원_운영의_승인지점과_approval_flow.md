---
tags:
  - area/wiki
  - type/reference
  - status/active
date: 2026-04-09
up: "[[index]]"
aliases:
  - approval_flow
  - 학원승인흐름
---
# 학원 운영의 승인 지점과 approval flow

## Summary First

학원 운영에서 AI가 전부 자동 처리하면 안 되는 이유는 명확하다. 환불, 할인, 법적 민원, 강사 계약, 대외 발송처럼 책임과 법적 효과가 큰 지점은 반드시 사람 승인 흐름이 필요하다.

## High-risk Approval Points

- 환불/할인/예외 승인
- 악성 민원 대응
- 강사 채용/해고 및 계약 변경
- 법정 서류/대외 발송
- 학생 이탈 방어를 위한 민감 커뮤니케이션

## Operational Pattern

1. 이슈 접수
2. 관련 학생/학부모/강사/결제/상담 맥락 조회
3. AI 초안 생성
4. 사람 승인 또는 수정
5. 발송/실행
6. 케이스 로그와 후속 일정 저장

## Product Implication

- MVP는 `auto-send`보다 [[케이스_승인_후속조치_모델|approval-centered operating system]]에 가까워야 한다.
- 좋은 UX는 "보내기" 버튼이 아니라 "왜 이 판단이 나왔는지"와 "누가 승인해야 하는지"를 분명히 보여준다.

## Linked Sources

- [[02_전략/04_research/20_domain-analysis/legal-requirements]]
- [[02_전략/04_research/10_reports/R-008_NLM_바텀업학원리서치합성]]
- [[02_전략/04_research/10_reports/R-006_통합리서치합성]]

## Related Pages

- [[학원_운영은_정규루틴보다_예외처리가_본체다]]
- [[운영_케이스_OS가_화이트스페이스다]]
- [[케이스_승인_후속조치_모델]]
