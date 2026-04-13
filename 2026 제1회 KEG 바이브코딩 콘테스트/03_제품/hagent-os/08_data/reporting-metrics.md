---
tags: [area/product, type/reference, status/active]
date: 2026-04-09
up: "[[hagent-os/README]]"
---

# Reporting & Metrics (리포팅 지표)

> HagentOS Analytics Agent가 생성하는 지표 정의와 보고서 구조.

---

## 원장 대시보드 핵심 지표 (실시간)

| 지표 | 정의 | 갱신 주기 |
|------|------|-----------|
| 오늘 출석률 | 출석 / 전체 수업 인원 × 100 | 수업 시작 후 30분 |
| 미처리 민원 수 | `Case.status = 'open'` 건수 | 실시간 |
| 에이전트 대기 승인 | `AgentRun.status = 'pending_approval'` 건수 | 실시간 |
| 이번 달 AI 비용 | `AgentRun.costCents` 합계 | 시간별 집계 |
| 이탈 위험 학생 수 | `Student.riskScore >= 0.7` 건수 | 1일 1회 |
| 이번 달 수납률 | 납부 완료 / 전체 청구 × 100 | 일별 갱신 |

---

## 주간 자동 리포트 항목 (매주 월요일 오전 8시)

1. **출결 현황** — 주간 출석률, 연속 결석 학생 목록
2. **민원 처리 현황** — 접수·처리·미처리 건수, 평균 처리 시간
3. **이탈 위험 학생** — riskScore 상위 10명 + 추천 액션
4. **보강 일정 현황** — 처리된 보강 건수, 미배정 보강 건수
5. **AI 비용 요약** — 에이전트별 주간 소비 토큰·비용 상위 3개
6. **스케줄 충돌** — 주간 발생한 스케줄 충돌 건수 (목표: 0건)

---

## 월간 자동 리포트 항목 (매월 1일)

1. **학생 현황** — 신규 등록, 퇴원, 순증감, 과목별 분포
2. **수납 현황** — 청구 총액, 수납 총액, 미수납 목록
3. **강사 성과** — 담당 수업 수, 보강 처리율, 학부모 만족도(민원 역산)
4. **에이전트 성과** — 에이전트별 처리 건수, 승인 통과율, 자동화 절감 시간(추정)
5. **AI 비용 분석** — 월 예산 대비 사용률, 에이전트별 ROI 추정
6. **이탈 분석** — 퇴원 사유 분류, 이탈 예측 정확도

---

## 에이전트별 성과 지표 (KPI)

| 에이전트 | 핵심 KPI | 목표 |
|----------|----------|------|
| Complaint Agent | 민원 초안 생성률 | 접수 건의 90% 이상 24시간 내 초안 |
| Complaint Agent | 초안 승인율 | 수정 없이 승인 ≥ 80% |
| Retention Agent | 이탈 감지 정확도 | 퇴원 전 7일 내 high-risk 감지율 ≥ 70% |
| Scheduler Agent | 스케줄 충돌 건수 | 0건/주 |
| Scheduler Agent | 보강 자동 배정률 | ≥ 85% |
| Notification Agent | 발송 성공률 | ≥ 98% |
| Notification Agent | 알림 오발송 건수 | 0건/월 |
| Analytics Agent | 리포트 생성 지연 | 트리거 후 5분 이내 |
| Intake Agent | 온보딩 완료율 | ≥ 95% (정보 누락 없이) |

---

## Analytics Agent 보고서 구조

Analytics Agent가 생성하는 JSON 보고서 스키마:

```json
{
  "reportId": "uuid",
  "orgId": "uuid",
  "type": "weekly | monthly | on-demand",
  "generatedAt": "ISO8601",
  "period": { "from": "date", "to": "date" },
  "sections": [
    {
      "title": "출결 현황",
      "metrics": [
        { "key": "attendance_rate", "value": 92.3, "unit": "%" },
        { "key": "absent_students", "value": 5, "unit": "명" }
      ],
      "trend": "up | down | stable",
      "highlight": "3학년 출석률 전주 대비 +4%p"
    }
  ],
  "agentRunId": "uuid"
}
```

---

## 엑셀 Export 형식

| 시트 | 주요 컬럼 | 비고 |
|------|-----------|------|
| 학생 현황 | 이름, 학년, 과목, 등록일, 출석률, 수납 상태, 이탈위험 | |
| 출결 상세 | 날짜, 학생명, 수업명, 출결, 비고 | 기간 필터 |
| 민원 이력 | 접수일, 유형, 심각도, 처리 상태, 처리일, 처리자 | |
| 수납 현황 | 학생명, 청구액, 수납액, 미수납액, 납부일 | |
| 에이전트 로그 | 에이전트명, 실행시각, 상태, 토큰, 비용 | AgentRun 기반 |

> Export 호출: `/api/export?type=students&from=2026-04-01&to=2026-04-30`
> 파일명 규칙: `hagent-{orgId}-{type}-{YYYYMMDD}.xlsx`
