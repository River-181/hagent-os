---
tags:
  - area/product
  - type/reference
  - status/active
date: 2026-04-09
up: "[[HagentOS]]"
---

# HagentOS Agent Roles

## 개요
한국 학원을 위한 AI 네이티브 OS의 에이전트 롤 정의. 각 에이전트는 특정 운영 영역을 담당하며, 제로휴먼(Zero Human) 레벨에 따라 자동화 수준이 결정된다.

## 에이전트 목록 (배포 우선순위)

### Phase 1 (즉시 배포 가능)
1. **[[orchestrator]]** - 태스크 라우팅 에이전트 (Level 0)
2. **[[complaint]]** - 민원 대응 에이전트 (Level 1-2)
3. **[[retention]]** - 이탈 방어 에이전트 (Level 1)
4. **[[scheduler]]** - 일정 조율 에이전트 (Level 1-2)
5. **[[intake]]** - 신규 수강생 수집 에이전트 (Level 1)
6. **[[notification]]** - 알림 전달 에이전트 (Level 0-1, cross-cutting)
7. **[[finance]]** - 재무 관리 에이전트 (Level 3-4)
8. **[[compliance]]** - 법규 준수 에이전트 (Level 3-4)

### Phase 2 (기초 데이터 축적 후)
9. **[[staff]]** - 강사 관리 에이전트 (Level 2-3)
10. **[[analytics]]** - 분석 리포팅 에이전트 (Level 0)

## 제로휴먼 레벨 정의

| 레벨 | 설명 | 예시 |
|------|------|------|
| 0 | 완전 자동화, 사람 개입 없음 | Analytics 리포트 자동 생성 |
| 1 | 자동 실행 후 제안, 최종 승인 필수 | 상담사 추천까지는 AI, 예약 확정은 사람 |
| 2-3 | 자동 분석, 권고 후 사람 최종 결정 | 임금 계산 자동, 지급 확인은 사람 |
| 3-4 | 모든 중요 결정에 사람 승인 필수 | 환불, 법적 판단, 경로 변경 |

## 핵심 설계 원칙

1. **법규 우선**: 모든 자동화는 한국 법령(학원법, 근로기준법, 개인정보보호법) 준수
2. **원장 신뢰**: 금전·법적·인사 판단은 항상 사람(원장/법무팀) 최종 확인
3. **k-skill 의존성**: 한국 특화 기술(법률, 임금, 공문 해석)은 k-skill로 구현
4. **Cross-cutting**: Notification Agent는 모든 에이전트의 output을 전달

## 의존 관계도

```
Intake ──┐
         ├─→ Notification (cross-cutting)
Finance ─┤
         ├─→ Staff (인사)
Staff ───┤
         └─→ Analytics (리포팅)
Compliance ──→ (항상 사람 에스컬레이션)
```

## 배포 체크리스트

- [ ] k-skill 개발 및 테스트 완료
- [ ] MCP 서버(카카오, Aligo, 법률 DB) 연동 확인
- [ ] 원장/스태프 교육 및 동의
- [ ] 감사 로그(audit log) 시스템 구축
- [ ] 에이전트 간 API 표준화
