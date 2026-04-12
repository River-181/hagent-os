/**
 * HagentOS 심사용 풍부한 데모 시드 데이터
 * 탄자니아 영어학원 데모 org에 AI 상호작용 이력을 추가한다.
 *
 * 케이스 25개 + 코멘트 + CEO 에이전트 메모리
 */

export type RichCaseSeed = {
  title: string
  type: "complaint" | "refund" | "schedule" | "inquiry" | "makeup" | "churn"
  status: "backlog" | "todo" | "in_progress" | "done"
  severity: "immediate" | "same_day" | "normal" | "low"
  source: "kakao" | "telegram" | "web" | "manual"
  agentDraft: string
  caseKind: string
  daysAgo: number
  comments: Array<{ authorType: "agent" | "system" | "user"; content: string; offsetHours: number }>
}

export const RICH_CASES: RichCaseSeed[] = [
  // ── COMPLAINT (6) ──────────────────────────────────────────────────────────
  {
    title: "이수아 무단결석 3회 연속 — 학부모 긴급 상담 필요",
    type: "complaint",
    status: "done",
    severity: "same_day",
    source: "kakao",
    caseKind: "counseling",
    daysAgo: 5,
    agentDraft:
      "이수아 학생(중2)이 최근 3주 연속 월·수요일 수업에 무단결석하고 있습니다. 담임 강사 박문법 선생님과 협의 후 이번 주 금요일 오후 2시에 학부모 전화 상담을 예약했습니다. 상담 전 출결 데이터와 학습 성취도 리포트를 준비해 드리겠습니다.",
    comments: [
      { authorType: "agent", content: "카카오톡으로 학부모(이수아 보호자)에게 상담 일정 안내 메시지를 발송했습니다.", offsetHours: 1 },
      { authorType: "system", content: "담당 에이전트: 상담·민원 에이전트 → 케이스 in_progress로 변경", offsetHours: 2 },
      { authorType: "agent", content: "학부모 통화 완료. 가정 내 사정(조부모 입원)으로 등원이 어려웠음을 확인. 이번 달 보강 2회 일정 조율 완료.", offsetHours: 26 },
      { authorType: "system", content: "케이스 완료 처리. 보강 일정이 일정 관리 에이전트에 전달되었습니다.", offsetHours: 27 },
    ],
  },
  {
    title: "김서준 어머니 — 학원비 환불 및 이탈 의사 표시",
    type: "complaint",
    status: "done",
    severity: "same_day",
    source: "kakao",
    caseKind: "complaint",
    daysAgo: 12,
    agentDraft:
      "김서준 학생 보호자께서 '아이가 학원 다니기 싫어한다'며 이번 달 수강료 전액 환불을 요청했습니다. 학원 규정상 개강 후 7일 이내에는 전액, 이후에는 잔여 일수 비례 환불이 가능합니다. 현재 17일이 경과했으므로 잔여 13일분(약 43%) 환불이 적용됩니다. 학부모 동의 후 처리하겠습니다.",
    comments: [
      { authorType: "agent", content: "환불 규정 안내 메시지를 카카오톡으로 발송. 잔여분 환불(약 65,000원) 동의 요청.", offsetHours: 1 },
      { authorType: "user", content: "그렇게 처리해 주세요. 아이 상담도 한 번만 해주세요.", offsetHours: 3 },
      { authorType: "agent", content: "환불 처리 완료. 상담 일정을 다음 주 화요일 오후 3시로 예약했습니다. 이후 재등록 여부를 확인할 예정입니다.", offsetHours: 4 },
    ],
  },
  {
    title: "중등부 수업 태도 불량 학생 신고 — 홍길동 보호자",
    type: "complaint",
    status: "done",
    severity: "normal",
    source: "web",
    caseKind: "complaint",
    daysAgo: 18,
    agentDraft:
      "홍길동 학생이 수업 중 타 학생을 방해한다는 민원이 접수되었습니다. 박문법 강사님과 면담 후 해당 학생에게 개별 주의 조치를 취했으며, 보호자에게 상황을 안내했습니다. 재발 시 반 배정 변경을 검토하겠습니다.",
    comments: [
      { authorType: "agent", content: "박문법 강사님과 면담 완료. 수업 중 경고 1회 조치 기록.", offsetHours: 4 },
      { authorType: "system", content: "민원 접수 학생 기록에 주의 이력 1건 추가됨.", offsetHours: 5 },
    ],
  },
  {
    title: "한지민 수능 스트레스 상담 요청 — 보호자 직접 연락",
    type: "complaint",
    status: "in_progress",
    severity: "normal",
    source: "kakao",
    caseKind: "counseling",
    daysAgo: 3,
    agentDraft:
      "한지민 학생(고3)이 수능 스트레스로 심리적 어려움을 겪고 있다고 보호자가 연락했습니다. 학원 내 심리 상담은 지원하지 않으나, 인근 청소년 상담 센터 정보를 안내했습니다. 담당 강사 이수능 선생님께 케어 요청을 전달했습니다.",
    comments: [
      { authorType: "agent", content: "이수능 강사님께 케어 요청 전달 완료. 청소년 상담 센터 연락처를 학부모에게 카카오톡 발송.", offsetHours: 2 },
    ],
  },
  {
    title: "이수아 보강 수업 중 다른 학생과 다툼",
    type: "complaint",
    status: "done",
    severity: "same_day",
    source: "manual",
    caseKind: "complaint",
    daysAgo: 8,
    agentDraft:
      "보강 수업 중 이수아 학생과 다른 학생 사이에 다툼이 발생했습니다. 강사 중재 후 양측 보호자에게 상황을 안내했습니다. 이수아 학생의 잦은 문제 행동으로 인해 반 배정 변경을 원장님께 건의드립니다.",
    comments: [
      { authorType: "agent", content: "양측 학부모에게 상황 안내 완료. 원장님께 반 배정 변경 검토 요청.", offsetHours: 1 },
      { authorType: "system", content: "원장 승인 대기 중.", offsetHours: 2 },
      { authorType: "agent", content: "원장님 승인 완료. 다음 달부터 반 변경 예정.", offsetHours: 24 },
    ],
  },
  {
    title: "성인반 수강생 강사 교체 요청",
    type: "complaint",
    status: "done",
    severity: "normal",
    source: "web",
    caseKind: "complaint",
    daysAgo: 22,
    agentDraft:
      "임현우 수강생(성인부)이 강사 교체를 요청했습니다. 수업 방식이 본인에게 맞지 않는다는 이유였습니다. 정토익 강사님과 면담 후 수업 방식 조율에 합의했습니다. 강사 교체 없이 해결하였습니다.",
    comments: [
      { authorType: "agent", content: "정토익 강사님과 임현우 수강생 3자 면담 주선. 수업 방식 개선안 합의.", offsetHours: 6 },
    ],
  },

  // ── REFUND (4) ──────────────────────────────────────────────────────────────
  {
    title: "권나연 어머니 — 개인 사정으로 3월 수강료 환불 요청",
    type: "refund",
    status: "done",
    severity: "same_day",
    source: "kakao",
    caseKind: "refund",
    daysAgo: 15,
    agentDraft:
      "권나연 학생(초4) 보호자께서 가정 사정으로 이번 달 수강을 중단하고 싶다고 하셨습니다. 개강 후 5일이 경과하여 잔여 일수 비례 환불(약 83%) 처리가 가능합니다. 환불 금액: 약 99,600원. 3~5 영업일 내 지정 계좌로 입금 예정입니다.",
    comments: [
      { authorType: "agent", content: "환불 계좌 정보 수령 완료. 재무팀에 처리 요청.", offsetHours: 2 },
      { authorType: "system", content: "환불 처리 완료. 환불금 99,600원 입금 완료.", offsetHours: 48 },
    ],
  },
  {
    title: "배소영 — 토익 시험 합격 후 수강 종료, 잔여분 환불",
    type: "refund",
    status: "done",
    severity: "normal",
    source: "web",
    caseKind: "refund",
    daysAgo: 30,
    agentDraft:
      "배소영 수강생이 토익 목표 점수(870점) 달성 후 수강을 종료하겠다고 알려왔습니다. 잔여 2주분 환불(60,000원)을 처리했습니다. 재등록 시 수강료 5% 할인 혜택을 안내해 드렸습니다.",
    comments: [
      { authorType: "agent", content: "수강 종료 처리 완료. 재등록 할인 쿠폰 발급.", offsetHours: 3 },
      { authorType: "user", content: "감사합니다! 나중에 비즈니스 영어반 등록할게요.", offsetHours: 5 },
    ],
  },
  {
    title: "윤도현 어머니 — 발목 부상으로 1개월 수강 중단 요청",
    type: "refund",
    status: "done",
    severity: "normal",
    source: "kakao",
    caseKind: "refund",
    daysAgo: 10,
    agentDraft:
      "윤도현 학생(초6)이 발목 부상으로 1개월간 수강이 어렵다고 합니다. 의사 진단서를 제출하면 잔여 기간 동안 수강을 일시 정지(홀드)하고 완치 후 재개하는 옵션을 제공했습니다. 환불 대신 홀드를 선택하셨습니다.",
    comments: [
      { authorType: "agent", content: "수강 홀드 처리 완료. 진단서 수령 확인. 재개 예정일: 다음 달 15일.", offsetHours: 4 },
    ],
  },
  {
    title: "중등부 수강생 전학으로 인한 전액 환불",
    type: "refund",
    status: "done",
    severity: "normal",
    source: "web",
    caseKind: "refund",
    daysAgo: 25,
    agentDraft:
      "오예진 학생(중1) 보호자가 타 지역 전학으로 인해 수강을 전면 중단하고 전액 환불을 요청했습니다. 개강 2일 후 요청으로 전액 환불(120,000원) 처리했습니다.",
    comments: [
      { authorType: "agent", content: "전액 환불 처리 완료. 120,000원 입금 예정.", offsetHours: 2 },
    ],
  },

  // ── SCHEDULE (5) ────────────────────────────────────────────────────────────
  {
    title: "김영어 강사 갑작스러운 병가 — 오늘 초등부 수업 대체 요청",
    type: "schedule",
    status: "done",
    severity: "immediate",
    source: "manual",
    caseKind: "schedule",
    daysAgo: 7,
    agentDraft:
      "김영어 강사님이 오늘 오전 갑작스러운 발열로 출근이 어렵다고 연락하셨습니다. 오늘 오후 4시 초등부 파닉스 기초반과 기초회화반 수업을 박문법 강사님이 대체 진행하기로 협의했습니다. 수강생 학부모 15명에게 문자 안내를 발송했습니다.",
    comments: [
      { authorType: "agent", content: "박문법 강사 대체 수업 동의 확인. 학부모 15명 SMS 발송 완료.", offsetHours: 1 },
      { authorType: "system", content: "일정 관리 에이전트가 대체 일정을 시스템에 반영했습니다.", offsetHours: 2 },
      { authorType: "agent", content: "수업 정상 진행 확인. 대체 수업 완료.", offsetHours: 9 },
    ],
  },
  {
    title: "이수아 문법반 보강 일정 조율 — 학부모 요청",
    type: "schedule",
    status: "done",
    severity: "normal",
    source: "kakao",
    caseKind: "schedule",
    daysAgo: 6,
    agentDraft:
      "이수아 학생 보강 수업 일정을 수요일 오후 2시로 확정했습니다. 박문법 강사님과 이수아 보호자 모두 동의하셨습니다. 다음 보강은 2주 후 동일 시간에 진행됩니다.",
    comments: [
      { authorType: "agent", content: "보강 일정 카카오톡 확인 메시지 발송. 보호자 동의 수령.", offsetHours: 1 },
    ],
  },
  {
    title: "4월 영어 스피치 대회 준비 일정 공지",
    type: "schedule",
    status: "done",
    severity: "low",
    source: "manual",
    caseKind: "schedule",
    daysAgo: 14,
    agentDraft:
      "4월 25일(토) 오후 1시 학원 내 영어 스피치 대회를 공지했습니다. 참가 희망 학생은 이번 주 금요일까지 신청 가능하며, 지도 강사 배정을 완료했습니다. 참가 신청 안내 문자를 전체 수강생 학부모에게 발송했습니다.",
    comments: [
      { authorType: "agent", content: "전체 학부모 SMS 발송 완료. 현재 신청 학생 7명.", offsetHours: 2 },
    ],
  },
  {
    title: "차량 하원 노선 변경 요청 — 조예린 어머니",
    type: "schedule",
    status: "done",
    severity: "normal",
    source: "kakao",
    caseKind: "schedule",
    daysAgo: 9,
    agentDraft:
      "조예린 학생(초3)의 하원 차량 하차 위치를 기존 아파트 정문에서 후문으로 변경 요청하셨습니다. 차량 기사님과 협의 후 다음 주부터 후문 하차로 변경 완료했습니다.",
    comments: [
      { authorType: "agent", content: "차량 기사 확인 완료. 노선 변경 카카오톡 안내 발송.", offsetHours: 3 },
    ],
  },
  {
    title: "고등부 모의고사 특강 추가 개설 요청",
    type: "schedule",
    status: "in_progress",
    severity: "normal",
    source: "web",
    caseKind: "schedule",
    daysAgo: 2,
    agentDraft:
      "고3 수강생 4명이 추가 모의고사 특강 개설을 요청했습니다. 이수능 강사님 일정 확인 결과 다음 주 토요일 오전 10시~1시 특강 편성이 가능합니다. 원장님 승인 후 확정 예정입니다.",
    comments: [
      { authorType: "agent", content: "이수능 강사 일정 확인. 원장님께 승인 요청 발송.", offsetHours: 2 },
    ],
  },

  // ── INQUIRY (5) ─────────────────────────────────────────────────────────────
  {
    title: "신규 입학 상담 — 초6 학생 영어 수준 테스트 문의",
    type: "inquiry",
    status: "done",
    severity: "normal",
    source: "web",
    caseKind: "inquiry",
    daysAgo: 11,
    agentDraft:
      "초등학교 6학년 학생 입학 상담 요청입니다. 파닉스 완성 여부, 기초 회화 수준을 확인하기 위해 무료 레벨 테스트를 안내했습니다. 이번 주 목요일 오후 3시 방문 테스트로 예약했습니다.",
    comments: [
      { authorType: "agent", content: "레벨 테스트 예약 확인 SMS 발송.", offsetHours: 1 },
      { authorType: "system", content: "레벨 테스트 일정이 일정 관리 에이전트에 등록됨.", offsetHours: 1 },
    ],
  },
  {
    title: "성인부 토익 강의 커리큘럼 문의",
    type: "inquiry",
    status: "done",
    severity: "low",
    source: "web",
    caseKind: "inquiry",
    daysAgo: 20,
    agentDraft:
      "성인부 토익 집중반의 커리큘럼, 수강료, 강사 이력에 대한 문의입니다. 강의 계획서와 정토익 강사님 프로필을 이메일로 발송했습니다. 다음 기수 모집은 5월 1일 시작입니다.",
    comments: [
      { authorType: "agent", content: "강의 계획서 이메일 발송 완료.", offsetHours: 2 },
    ],
  },
  {
    title: "학원 교습비 게시판 정보 확인 요청 (행정)",
    type: "inquiry",
    status: "done",
    severity: "normal",
    source: "manual",
    caseKind: "inquiry",
    daysAgo: 16,
    agentDraft:
      "교육청 교습비 신고 및 게시판 규정 준수 여부를 확인했습니다. 현재 학원 입구 및 웹사이트에 교습비가 정상 게시되어 있습니다. 다음 신고 기한: 4월 15일. 자동 알림을 일정에 등록했습니다.",
    comments: [
      { authorType: "agent", content: "교습비 게시 현황 확인 완료. 다음 신고 기한 알림 등록.", offsetHours: 3 },
    ],
  },
  {
    title: "비즈니스 영어 단기 집중 과정 개설 가능 여부 문의",
    type: "inquiry",
    status: "done",
    severity: "low",
    source: "kakao",
    caseKind: "inquiry",
    daysAgo: 28,
    agentDraft:
      "기업체 직원 5명을 위한 비즈니스 영어 단기 특강(4주 과정) 개설 가능 여부를 검토했습니다. 정토익 강사님이 진행 가능하며, 주 2회 2시간씩 맞춤 커리큘럼을 제안했습니다. 견적서를 이메일로 발송했습니다.",
    comments: [
      { authorType: "agent", content: "기업 단체 특강 견적서 발송 완료. 담당자 회신 대기 중.", offsetHours: 5 },
    ],
  },
  {
    title: "텔레그램 채널 통해 이번 주 수업 일정 문의",
    type: "inquiry",
    status: "done",
    severity: "low",
    source: "telegram",
    caseKind: "inquiry",
    daysAgo: 4,
    agentDraft:
      "이번 주 수업 일정을 안내드립니다. 월요일: 초등부 파닉스/회화반, 고등부 수능반. 화요일: 중등부 문법반, 성인부 비즈니스영어반. 수요일: 중등부 독해반 보강 포함. 자세한 일정은 학원 앱에서 확인하실 수 있습니다.",
    comments: [
      { authorType: "agent", content: "텔레그램으로 이번 주 일정 자동 발송 완료.", offsetHours: 0 },
    ],
  },

  // ── PAYMENT (3) ─────────────────────────────────────────────────────────────
  {
    title: "3월 수강료 미납 안내 — 김서준",
    type: "inquiry",
    status: "done",
    severity: "normal",
    source: "manual",
    caseKind: "payment",
    daysAgo: 13,
    agentDraft:
      "김서준 학생(중2) 3월 수강료가 미납 상태입니다. 학부모에게 납부 안내 문자를 1차 발송했습니다. 5일 이내 미납 시 자동 2차 안내가 발송됩니다. 현재 총 미납액: 150,000원.",
    comments: [
      { authorType: "agent", content: "1차 수강료 미납 안내 SMS 발송.", offsetHours: 1 },
      { authorType: "system", content: "납부 완료 확인. 케이스 종료.", offsetHours: 72 },
    ],
  },
  {
    title: "4대보험 납부일 알림 — 운영 태스크",
    type: "inquiry",
    status: "done",
    severity: "normal",
    source: "manual",
    caseKind: "payment",
    daysAgo: 19,
    agentDraft:
      "이번 달 4대보험 납부 기한(매월 10일)이 이틀 후입니다. 강사 6명, 직원 2명분 납부 금액을 확인했습니다. 총 납부 예정액: 약 1,240,000원. 담당 행정직원에게 처리 요청 알림을 발송했습니다.",
    comments: [
      { authorType: "agent", content: "담당 직원에게 4대보험 납부 처리 알림 발송.", offsetHours: 1 },
      { authorType: "system", content: "납부 완료 확인.", offsetHours: 48 },
    ],
  },
  {
    title: "상반기 수강료 인상 안내 초안 작성 요청",
    type: "inquiry",
    status: "in_progress",
    severity: "low",
    source: "manual",
    caseKind: "payment",
    daysAgo: 1,
    agentDraft:
      "5월부터 적용될 수강료 인상(5% 인상)에 대한 공지문 초안을 작성했습니다. 인상 사유(강사 처우 개선, 시설 투자), 적용 시기, 환불 정책 변경 없음 등을 포함했습니다. 원장님 검토 후 4월 20일에 전체 학부모에게 발송 예정입니다.",
    comments: [
      { authorType: "agent", content: "수강료 인상 공지문 초안 완성. 원장님께 검토 요청.", offsetHours: 2 },
    ],
  },

  // ── CHURN (2) ───────────────────────────────────────────────────────────────
  {
    title: "이탈 위험 학생 주간 보고 — 4월 2주차",
    type: "churn",
    status: "done",
    severity: "normal",
    source: "manual",
    caseKind: "churn",
    daysAgo: 10,
    agentDraft:
      "이번 주 이탈 위험 학생 현황입니다.\n\n■ 즉시 조치 필요\n- 이수아 (riskScore 0.82): 3주 연속 결석, 학부모 상담 진행 중\n\n■ 주의 관찰\n- 김서준 (riskScore 0.65): 월요일 결석 패턴, 보강 이력 누적\n- 한지민 (riskScore 0.45): 수능 스트레스, 강사 케어 중\n\n다음 주 월요일 출결 현황을 다시 보고드리겠습니다.",
    comments: [
      { authorType: "agent", content: "원장님께 이탈 위험 학생 보고서 발송 완료.", offsetHours: 1 },
      { authorType: "system", content: "주간 보고 케이스 완료 처리.", offsetHours: 2 },
    ],
  },
  {
    title: "배소영 토익 시험 합격 — 이탈 전환 모니터링",
    type: "churn",
    status: "done",
    severity: "low",
    source: "kakao",
    caseKind: "churn",
    daysAgo: 30,
    agentDraft:
      "배소영 수강생의 토익 목표 달성 축하 메시지와 함께 비즈니스 영어반 등록 제안을 발송했습니다. 재등록 시 5% 할인 쿠폰을 제공하여 이탈 방지를 시도했습니다. 수강생이 향후 재등록 의향을 밝혀 관계 유지에 성공했습니다.",
    comments: [
      { authorType: "agent", content: "합격 축하 메시지 + 재등록 할인 쿠폰 카카오톡 발송.", offsetHours: 1 },
      { authorType: "user", content: "감사합니다! 나중에 비즈니스 영어반 등록할게요.", offsetHours: 3 },
    ],
  },
]

/** CEO 에이전트 메모리 — 학원 운영 상황 축적 */
export const CEO_MEMORY = {
  studentInsights: {
    이수아: "이탈 위험 최고 (riskScore 0.82). 3주 연속 결석/지각 반복. 2026-04-08 학부모 상담 완료. 반 변경 검토 중. 추적 계속 필요.",
    김서준: "이탈 위험 중간 (riskScore 0.65). 월요일 결석 패턴 3회. 보강 요청 2회 누적. 학부모 납부 지연 이력 있음.",
    한지민: "고3 수능 압박 스트레스 표출. 심리 상담 연계 안내 완료. 강사(이수능) 밀착 케어 중. riskScore 0.45.",
    홍길동: "수업 태도 주의 1회 조치. 이후 개선됨. 현재 안정적 출결.",
    윤도현: "발목 부상으로 수강 홀드 1개월. 재개 예정일: 2026-05-15.",
    배소영: "토익 목표 달성(870점) 후 수강 종료. 재등록 의향 있음. 비즈니스 영어반 잠재 수강생.",
  },
  monthlyStats: {
    resolvedCases: 21,
    pendingCases: 4,
    escalatedCases: 3,
    totalMessages: 127,
    telegramInbound: 14,
    kakaoInbound: 89,
    webInbound: 24,
  },
  recurringIssues: [
    "월요일 결석 집중 (김서준, 이수아)",
    "상반기 환불 요청 증가 추세",
    "고3 수험 스트레스 관련 상담 증가",
    "성인부 수강생 일정 변경 빈번",
  ],
  lastInsight:
    "이번 달 이탈 위험 학생 3명 — 이수아(즉시) > 김서준(주의) > 한지민(관찰) 순 우선순위. 이수아 케이스가 가장 시급하며 반 배정 변경이 핵심 해결책.",
  updatedAt: "2026-04-13T09:00:00+09:00",
  version: 2,
}
