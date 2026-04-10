import { eq } from "drizzle-orm"
import { createDb } from "./client.js"
import * as schema from "./schema/index.js"

async function seed() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://hagent:hagent@localhost:5432/hagent"

  const db = createDb(connectionString)

  // ── Idempotency: delete existing org with prefix "tanzania" and all its data ──
  const [existingOrg] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.prefix, "tanzania"))

  if (existingOrg) {
    const oid = existingOrg.id
    // Delete in reverse FK dependency order
    await db.delete(schema.activityEvents).where(eq(schema.activityEvents.organizationId, oid))
    await db.delete(schema.notifications).where(eq(schema.notifications.organizationId, oid))
    await db.delete(schema.approvals).where(eq(schema.approvals.organizationId, oid))
    await db.delete(schema.wakeupRequests).where(eq(schema.wakeupRequests.organizationId, oid))
    await db.delete(schema.agentRuns).where(eq(schema.agentRuns.organizationId, oid))
    // Delete case_comments before cases (FK constraint)
    const orgCases = await db.select({ id: schema.cases.id }).from(schema.cases).where(eq(schema.cases.organizationId, oid))
    for (const c of orgCases) {
      await db.delete(schema.caseComments).where(eq(schema.caseComments.caseId, c.id))
    }
    await db.delete(schema.cases).where(eq(schema.cases.organizationId, oid))
    await db.delete(schema.attendance).where(eq(schema.attendance.organizationId, oid))
    await db.delete(schema.schedules).where(eq(schema.schedules.organizationId, oid))
    await db.delete(schema.parents).where(eq(schema.parents.organizationId, oid))
    await db.delete(schema.students).where(eq(schema.students.organizationId, oid))
    await db.delete(schema.instructors).where(eq(schema.instructors.organizationId, oid))
    await db.delete(schema.opsGoals).where(eq(schema.opsGoals.organizationId, oid))
    await db.delete(schema.opsGroups).where(eq(schema.opsGroups.organizationId, oid))
    await db.delete(schema.routines).where(eq(schema.routines.organizationId, oid))
    await db.delete(schema.documents).where(eq(schema.documents.organizationId, oid))
    await db.delete(schema.agents).where(eq(schema.agents.organizationId, oid))
    await db.delete(schema.organizations).where(eq(schema.organizations.id, oid))
  }

  // 1. Organization
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "탄자니아 영어학원",
      prefix: "tanzania",
      description:
        "대치동에서 세상을 향해 — 수준별 맞춤 영어 교육. 서울특별시 강남구 대치동 316-1 / 평일 10:00~22:00 / 토 09:00~18:00 / 일·공휴일 휴원",
      agentTeamConfig: {
        orchestratorEnabled: true,
        maxConcurrentRuns: 4,
        channels: {
          kakao: { enabled: true, channelUrl: "http://pf.kakao.com/_raDdX", chatUrl: "http://pf.kakao.com/_raDdX/chat", botId: "69d80717ce25e33033041230" },
          sms: { enabled: false, provider: "solapi" },
        },
      },
    })
    .returning()

  // 2. Agents
  const [orchestratorAgent, complaintAgent, retentionAgent, schedulerAgent] =
    await db
      .insert(schema.agents)
      .values([
        {
          organizationId: org.id,
          name: "오케스트레이터",
          slug: "orchestrator",
          agentType: "orchestrator",
          status: "idle",
          systemPrompt:
            "탄자니아 영어학원 운영 전반을 조율하는 오케스트레이터입니다. 학부모 영어 관련 민원, 수강생 이탈, 수업 스케줄 등 모든 케이스를 분류하고 적절한 에이전트에게 배정합니다.",
          skills: ["complaint-classifier"],
          adapterType: "claude_local",
          icon: "brain",
          memory: {
            soul: "탄자니아 영어학원의 총괄 매니저. 모든 업무를 조율하고 적절한 에이전트에게 배분합니다.",
            dailyNotes: {
              "2026-04-10": "학원 시스템 초기 설정 완료. 4개 에이전트 팀 구성됨. 민원 처리 파이프라인 가동 시작.",
              "2026-04-09": "탄자니아 영어학원 온보딩 프로세스 시작. 학원 정보 수집 및 기본 설정 진행.",
            },
            learnedPatterns: ["민원은 민원담당에게 즉시 배분", "이탈 위험은 주 1회 체크"],
          },
        },
        {
          organizationId: org.id,
          name: "민원담당",
          slug: "complaint",
          agentType: "complaint",
          status: "idle",
          systemPrompt:
            "탄자니아 영어학원 학부모 민원을 접수하고 분석하여 적절한 답변 초안을 작성합니다. 영어 수업 관련 성적 불만, 반 변경, 환불 등 민원 유형을 파악하고 항상 공감적이고 해결 지향적인 톤으로 응대합니다.",
          skills: ["complaint-classifier", "korean-tone-guide"],
          adapterType: "claude_local",
          icon: "shield",
          memory: {
            soul: "학부모 민원을 전문적으로 처리합니다. 탄자니아 영어학원의 톤앤매너를 유지하면서 신속하게 대응합니다.",
            dailyNotes: {
              "2026-04-10": "C-001 수업 불만족 민원 처리. 학부모에게 보강 수업 안내 초안 작성 완료.",
            },
            learnedPatterns: ["환불 요청은 항상 Level 2 승인 필요", "수업 불만은 보강으로 먼저 제안"],
          },
        },
        {
          organizationId: org.id,
          name: "이탈방어",
          slug: "retention",
          agentType: "retention",
          status: "idle",
          systemPrompt:
            "탄자니아 영어학원 수강생의 출석 패턴, 단어 시험 점수, 상담 이력 등을 분석하여 이탈 위험 학생을 조기에 감지하고 맞춤형 대응 전략을 제안합니다.",
          skills: ["churn-risk-calculator", "korean-tone-guide"],
          adapterType: "claude_local",
          icon: "heart",
          memory: {
            soul: "학생 이탈 위험을 분석하고 예방 조치를 제안합니다. 출석률, 성적 변화, 수납 지연 등을 종합적으로 분석합니다.",
            dailyNotes: {
              "2026-04-10": "이수아(중2) 이탈 위험 점수 0.82 감지. 최근 3주 출석률 40% 하락, 수납 2개월 지연.",
            },
            learnedPatterns: ["출석률 60% 이하 + 수납 지연 = 높은 이탈 위험"],
          },
        },
        {
          organizationId: org.id,
          name: "스케줄러",
          slug: "scheduler",
          agentType: "scheduler",
          status: "idle",
          systemPrompt:
            "탄자니아 영어학원 강사 대타, 보강 수업, 시간표 조정 등 영어 수업 스케줄 관련 요청을 처리합니다.",
          skills: ["google-calendar-mcp"],
          adapterType: "claude_local",
          icon: "calendar",
          memory: {
            soul: "수업 일정, 상담 예약, 보강 일정을 관리합니다. 강사와 교실 가용성을 고려하여 최적 일정을 배정합니다.",
            dailyNotes: {},
            learnedPatterns: [],
          },
        },
      ])
      .returning()

  // 3. Instructors (영어 강사 4명)
  const [instElem, instMiddle, instHigh, instAdult] = await db
    .insert(schema.instructors)
    .values([
      {
        organizationId: org.id,
        name: "김영어",
        subject: "초등부 (파닉스/기초회화)",
        status: "active",
        phone: "010-2673-1001",
      },
      {
        organizationId: org.id,
        name: "박문법",
        subject: "중등부 (내신/문법)",
        status: "active",
        phone: "010-2673-1002",
      },
      {
        organizationId: org.id,
        name: "이수능",
        subject: "고등부 (수능영어/심화독해)",
        status: "active",
        phone: "010-2673-1003",
      },
      {
        organizationId: org.id,
        name: "정토익",
        subject: "성인부 (비즈니스영어/토익)",
        status: "active",
        phone: "010-2673-1004",
      },
    ])
    .returning()

  // 4. Students (15명 — 초등5, 중등5, 고등3, 성인2)
  const students = await db
    .insert(schema.students)
    .values([
      // 초등부 (5명)
      {
        organizationId: org.id,
        name: "홍길동",
        grade: "초5",
        enrolledAt: "2024-03-01",
        riskScore: 0.2,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "권나연",
        grade: "초4",
        enrolledAt: "2024-09-01",
        riskScore: 0.05,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "윤도현",
        grade: "초6",
        enrolledAt: "2024-03-01",
        riskScore: 0.3,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "조예린",
        grade: "초3",
        enrolledAt: "2025-03-01",
        riskScore: 0.1,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "강민서",
        grade: "초5",
        enrolledAt: "2024-09-01",
        riskScore: 0.15,
        status: "active",
      },
      // 중등부 (5명) — 이수아가 고위험
      {
        organizationId: org.id,
        name: "김서준",
        grade: "중2",
        enrolledAt: "2024-03-01",
        riskScore: 0.65,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "박민준",
        grade: "중1",
        enrolledAt: "2024-09-01",
        riskScore: 0.1,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "이수아",
        grade: "중2",
        enrolledAt: "2024-03-01",
        riskScore: 0.82,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "신재원",
        grade: "중3",
        enrolledAt: "2023-09-01",
        riskScore: 0.25,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "오예진",
        grade: "중1",
        enrolledAt: "2025-03-01",
        riskScore: 0.2,
        status: "active",
      },
      // 고등부 (3명)
      {
        organizationId: org.id,
        name: "최지후",
        grade: "고1",
        enrolledAt: "2024-03-01",
        riskScore: 0.3,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "장하은",
        grade: "고2",
        enrolledAt: "2023-03-01",
        riskScore: 0.1,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "한지민",
        grade: "고3",
        enrolledAt: "2022-03-01",
        riskScore: 0.45,
        status: "active",
      },
      // 성인부 (2명)
      {
        organizationId: org.id,
        name: "임현우",
        grade: "성인",
        enrolledAt: "2024-09-01",
        riskScore: 0.2,
        status: "active",
      },
      {
        organizationId: org.id,
        name: "배소영",
        grade: "성인",
        enrolledAt: "2024-03-01",
        riskScore: 0.05,
        status: "active",
      },
    ])
    .returning()

  // Alias students for FK use
  const [
    stdHong,   // 홍길동 (초5)
    ,          // 권나연
    ,          // 윤도현
    ,          // 조예린
    ,          // 강민서
    stdKim,    // 김서준 (중2)
    stdPark,   // 박민준 (중1)
    stdSua,    // 이수아 (중2, 고위험)
    ,          // 신재원
    ,          // 오예진
    stdChoi,   // 최지후 (고1)
  ] = students

  // 5. Parents (10명 — 초등, 중등 학생 학부모)
  await db.insert(schema.parents).values([
    {
      organizationId: org.id,
      name: "홍어머니",
      phone: "010-9000-0001",
      email: "hong.mom@example.com",
      relation: "모",
      studentId: stdHong.id,
    },
    {
      organizationId: org.id,
      name: "권어머니",
      phone: "010-9000-0002",
      email: "kwon.mom@example.com",
      relation: "모",
      studentId: students[1].id,
    },
    {
      organizationId: org.id,
      name: "윤아버지",
      phone: "010-9000-0003",
      email: "yoon.dad@example.com",
      relation: "부",
      studentId: students[2].id,
    },
    {
      organizationId: org.id,
      name: "김어머니",
      phone: "010-9000-0006",
      email: "kim.mom@example.com",
      relation: "모",
      studentId: stdKim.id,
    },
    {
      organizationId: org.id,
      name: "박아버지",
      phone: "010-9000-0007",
      email: "park.dad@example.com",
      relation: "부",
      studentId: stdPark.id,
    },
    {
      organizationId: org.id,
      name: "이어머니",
      phone: "010-9000-0008",
      email: "lee.mom@example.com",
      relation: "모",
      studentId: stdSua.id,
    },
    {
      organizationId: org.id,
      name: "신어머니",
      phone: "010-9000-0009",
      email: "shin.mom@example.com",
      relation: "모",
      studentId: students[8].id,
    },
    {
      organizationId: org.id,
      name: "최어머니",
      phone: "010-9000-0011",
      email: "choi.mom@example.com",
      relation: "모",
      studentId: stdChoi.id,
    },
    {
      organizationId: org.id,
      name: "장아버지",
      phone: "010-9000-0012",
      email: "jang.dad@example.com",
      relation: "부",
      studentId: students[11].id,
    },
    {
      organizationId: org.id,
      name: "한어머니",
      phone: "010-9000-0013",
      email: "han.mom@example.com",
      relation: "모",
      studentId: students[12].id,
    },
  ])

  // 6. Schedules (이번 주 영어 수업 10개)
  const [schedElem1, schedMiddle1, , schedHigh1] = await db
    .insert(schema.schedules)
    .values([
      {
        organizationId: org.id,
        instructorId: instElem.id,
        title: "초등부 파닉스 기초반",
        type: "regular",
        dayOfWeek: 1,
        startTime: "16:00",
        endTime: "17:30",
        room: "A101",
      },
      {
        organizationId: org.id,
        instructorId: instElem.id,
        title: "초등부 기초회화반",
        type: "regular",
        dayOfWeek: 3,
        startTime: "16:00",
        endTime: "17:30",
        room: "A101",
      },
      {
        organizationId: org.id,
        instructorId: instMiddle.id,
        title: "중등부 내신 문법반",
        type: "regular",
        dayOfWeek: 2,
        startTime: "16:00",
        endTime: "18:00",
        room: "B201",
      },
      {
        organizationId: org.id,
        instructorId: instMiddle.id,
        title: "중등부 영어 독해반",
        type: "regular",
        dayOfWeek: 4,
        startTime: "16:00",
        endTime: "18:00",
        room: "B202",
      },
      {
        organizationId: org.id,
        instructorId: instHigh.id,
        title: "고등부 수능영어반",
        type: "regular",
        dayOfWeek: 1,
        startTime: "19:00",
        endTime: "21:00",
        room: "C301",
      },
      {
        organizationId: org.id,
        instructorId: instHigh.id,
        title: "고등부 심화독해반",
        type: "regular",
        dayOfWeek: 5,
        startTime: "19:00",
        endTime: "21:00",
        room: "C302",
      },
      {
        organizationId: org.id,
        instructorId: instAdult.id,
        title: "성인부 비즈니스영어반",
        type: "regular",
        dayOfWeek: 2,
        startTime: "20:00",
        endTime: "21:30",
        room: "D401",
      },
      {
        organizationId: org.id,
        instructorId: instAdult.id,
        title: "성인부 토익 집중반",
        type: "regular",
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "12:00",
        room: "D402",
      },
      {
        organizationId: org.id,
        instructorId: instMiddle.id,
        title: "중등부 어휘·쓰기 심화반",
        type: "regular",
        dayOfWeek: 6,
        startTime: "14:00",
        endTime: "16:00",
        room: "B203",
      },
      {
        organizationId: org.id,
        instructorId: instHigh.id,
        title: "고등부 모의고사 특강",
        type: "special",
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "13:00",
        room: "C303",
      },
    ])
    .returning()

  // 6b. Additional schedules — diverse types for realistic calendar
  await db.insert(schema.schedules).values([
    // 상담 (counseling)
    {
      organizationId: org.id,
      instructorId: null,
      title: "이수아 학부모 상담",
      type: "counseling",
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "14:30",
      room: "상담실",
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "신규 입학 상담 (김OO)",
      type: "counseling",
      dayOfWeek: 4,
      startTime: "15:00",
      endTime: "15:30",
      room: "상담실",
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "월말 성적 상담 (일괄)",
      type: "counseling",
      dayOfWeek: 5,
      startTime: "14:00",
      endTime: "16:00",
      room: "상담실",
    },
    // 보강 (makeup)
    {
      organizationId: org.id,
      instructorId: instMiddle.id,
      title: "이수아 문법반 보강",
      type: "makeup",
      dayOfWeek: 3,
      startTime: "14:00",
      endTime: "15:30",
      room: "B201",
    },
    {
      organizationId: org.id,
      instructorId: instHigh.id,
      title: "김영수 수능반 보강",
      type: "makeup",
      dayOfWeek: 6,
      startTime: "16:00",
      endTime: "17:30",
      room: "C301",
    },
    // 등하원 (shuttle) — 차량 운행
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 등원 (1호차)",
      type: "shuttle",
      dayOfWeek: 1,
      startTime: "15:00",
      endTime: "15:40",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 등원 (2호차)",
      type: "shuttle",
      dayOfWeek: 1,
      startTime: "15:20",
      endTime: "16:00",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 하원 (1호차)",
      type: "shuttle",
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "18:40",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 등원 (1호차)",
      type: "shuttle",
      dayOfWeek: 3,
      startTime: "15:00",
      endTime: "15:40",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 하원 (1호차)",
      type: "shuttle",
      dayOfWeek: 3,
      startTime: "18:00",
      endTime: "18:40",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 등원 (1호차)",
      type: "shuttle",
      dayOfWeek: 5,
      startTime: "15:00",
      endTime: "15:40",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "차량 하원 (1호차)",
      type: "shuttle",
      dayOfWeek: 5,
      startTime: "18:00",
      endTime: "18:40",
      room: null,
    },
    // 행정 (admin) — 강사 미팅, 점검 등
    {
      organizationId: org.id,
      instructorId: null,
      title: "주간 강사 회의",
      type: "admin",
      dayOfWeek: 1,
      startTime: "10:00",
      endTime: "11:00",
      room: "회의실",
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "시설 안전 점검",
      type: "admin",
      dayOfWeek: 5,
      startTime: "10:00",
      endTime: "11:00",
      room: null,
    },
    // 이벤트 (event)
    {
      organizationId: org.id,
      instructorId: null,
      title: "영어 스피치 대회 (학원 내)",
      type: "event",
      dayOfWeek: 6,
      startTime: "13:00",
      endTime: "15:00",
      room: "대강당",
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "학부모 공개수업",
      type: "event",
      dayOfWeek: 5,
      startTime: "17:00",
      endTime: "18:30",
      room: "A101",
    },
    // 법정기한 (legal)
    {
      organizationId: org.id,
      instructorId: null,
      title: "학원 교습비 신고 마감",
      type: "legal",
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "09:30",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "부가가치세 예정신고 마감",
      type: "legal",
      dayOfWeek: 4,
      startTime: "09:00",
      endTime: "09:30",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "4대보험 납부일",
      type: "legal",
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "09:30",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "근로소득세 원천징수 신고",
      type: "legal",
      dayOfWeek: 2,
      startTime: "09:30",
      endTime: "10:00",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "소방시설 자체점검 보고",
      type: "legal",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "09:30",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: null,
      title: "학원 보험 갱신 마감",
      type: "legal",
      dayOfWeek: 4,
      startTime: "09:30",
      endTime: "10:00",
      room: null,
    },
    // 강사 휴가/연수 (leave)
    {
      organizationId: org.id,
      instructorId: instElem.id,
      title: "김초롱 강사 연차 (종일)",
      type: "leave",
      dayOfWeek: 4,
      startTime: "10:00",
      endTime: "22:00",
      room: null,
    },
    {
      organizationId: org.id,
      instructorId: instAdult.id,
      title: "외부 TESOL 연수",
      type: "leave",
      dayOfWeek: 6,
      startTime: "09:00",
      endTime: "13:00",
      room: null,
    },
  ])

  // 7. Attendance (~16개 — 이수아 결석 4회+지각 3회로 위험 신호 생성)
  const today = new Date()
  const dateStr = (offset: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    return d.toISOString().split("T")[0]
  }

  await db.insert(schema.attendance).values([
    // 홍길동 정상 출석 (초등부)
    {
      organizationId: org.id,
      studentId: stdHong.id,
      scheduleId: schedElem1.id,
      date: dateStr(7),
      status: "present",
    },
    {
      organizationId: org.id,
      studentId: stdHong.id,
      scheduleId: schedElem1.id,
      date: dateStr(14),
      status: "present",
    },
    // 김서준 간헐 결석 (중등부, 중위험)
    {
      organizationId: org.id,
      studentId: stdKim.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(5),
      status: "absent",
      note: "연락 없음",
    },
    {
      organizationId: org.id,
      studentId: stdKim.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(12),
      status: "present",
    },
    {
      organizationId: org.id,
      studentId: stdKim.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(19),
      status: "absent",
      note: "병결 문자",
    },
    // 이수아 결석 4회 + 지각 3회 (고위험 — C-004 트리거)
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(2),
      status: "absent",
      note: "연락 없음",
    },
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(7),
      status: "late",
      note: "30분 지각",
    },
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(9),
      status: "absent",
    },
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(14),
      status: "late",
    },
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(16),
      status: "absent",
      note: "전화 미응답",
    },
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(21),
      status: "late",
      note: "20분 지각",
    },
    {
      organizationId: org.id,
      studentId: stdSua.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(23),
      status: "absent",
      note: "무단 결석",
    },
    // 박민준 정상 출석
    {
      organizationId: org.id,
      studentId: stdPark.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(5),
      status: "present",
    },
    {
      organizationId: org.id,
      studentId: stdPark.id,
      scheduleId: schedMiddle1.id,
      date: dateStr(12),
      status: "present",
    },
    // 최지후 정상 출석 (고등부)
    {
      organizationId: org.id,
      studentId: stdChoi.id,
      scheduleId: schedHigh1.id,
      date: dateStr(7),
      status: "present",
    },
    {
      organizationId: org.id,
      studentId: stdChoi.id,
      scheduleId: schedHigh1.id,
      date: dateStr(14),
      status: "late",
      note: "10분 지각",
    },
  ])

  // 8. OpsGroups
  const [opsComplaint, opsStudent, opsOnboarding] = await db
    .insert(schema.opsGroups)
    .values([
      {
        organizationId: org.id,
        name: "학부모 민원 관리",
        description: "학부모 영어 관련 민원 접수 및 처리",
        color: "#ef4444",
      },
      {
        organizationId: org.id,
        name: "수강생 관리",
        description: "이탈 방지 및 재등록 관리",
        color: "#3b82f6",
      },
      {
        organizationId: org.id,
        name: "온보딩",
        description: "신규 수강생 등록 및 초기 적응 지원",
        color: "#10b981",
      },
    ])
    .returning()

  // 9. Cases (5개)
  const [caseC001, caseC002, caseC003, caseC004, caseC005] = await db
    .insert(schema.cases)
    .values([
      {
        organizationId: org.id,
        opsGroupId: opsComplaint.id,
        identifier: "C-001",
        title: "영어 단어 시험 점수 불만 — 보충수업 요청",
        description:
          "홍길동 어머니께서 이번 주 월요일 단어 시험 점수가 급격히 떨어졌다며 보충수업 여부를 문의하셨습니다. 지난 주 대비 30점 하락(95점→65점)으로 원인 파악 및 무료 보충수업 제공 여부 검토가 필요합니다.",
        type: "complaint",
        severity: "same_day",
        status: "in_progress",
        priority: 2,
        reporterId: "parent:hong-mom",
        studentId: stdHong.id,
        assigneeAgentId: complaintAgent.id,
      },
      {
        organizationId: org.id,
        opsGroupId: opsComplaint.id,
        identifier: "C-002",
        title: "반 친구 다툼 — 반 변경 요청",
        description:
          "김서준 어머니께서 아이가 영어 수업 중 같은 반 친구와 다퉈서 학원에 가기 싫다고 한다며 반 변경을 요청하셨습니다. 즉시 상담 및 반 조정 여부 검토가 필요합니다.",
        type: "complaint",
        severity: "immediate",
        status: "todo",
        priority: 1,
        reporterId: "parent:kim-mom",
        studentId: stdKim.id,
        assigneeAgentId: complaintAgent.id,
      },
      {
        organizationId: org.id,
        opsGroupId: opsComplaint.id,
        identifier: "C-003",
        title: "고등부 레벨업 전환 — 수강료 차액 환불 문의",
        description:
          "박민준 아버지께서 다음 달부터 중등부에서 고등부로 올라가는데 이번 달 잔여 수강료 차액 환불이 가능한지, 이번 달만 쉬고 다음 달부터 고등부로 등록할 수 있는지 문의하셨습니다. 학원법 환불 규정 확인 필요.",
        type: "refund",
        severity: "same_day",
        status: "backlog",
        priority: 2,
        reporterId: "parent:park-dad",
        studentId: stdPark.id,
      },
      {
        organizationId: org.id,
        opsGroupId: opsStudent.id,
        identifier: "C-004",
        title: "이탈 위험 감지 — 이수아 (중2, 결석 4회+지각 3회)",
        description:
          "시스템이 이수아 학생(중2)의 최근 4주 출석 패턴을 분석한 결과 결석 4회, 지각 3회를 감지했습니다. 이탈 위험 점수 0.82로 학부모 상담 및 맞춤형 관리 개입이 권장됩니다.",
        type: "churn",
        severity: "normal",
        status: "todo",
        priority: 2,
        reporterId: "system:retention-agent",
        studentId: stdSua.id,
        assigneeAgentId: retentionAgent.id,
      },
      {
        organizationId: org.id,
        opsGroupId: opsComplaint.id,
        identifier: "C-005",
        title: "성인부 대체 강사 요청 — 정토익 강사 급한 개인 사정",
        description:
          "정토익 강사님이 내일 성인부 비즈니스영어반(화 20:00~21:30) 수업 불가 통보. 대체 강사 배정 또는 보강 일정 조율이 급하게 필요합니다.",
        type: "schedule",
        severity: "same_day",
        status: "backlog",
        priority: 2,
        reporterId: "staff:jeong-toik",
        assigneeAgentId: schedulerAgent.id,
      },
    ])
    .returning()

  // 10. AgentRuns (3개)
  const now = new Date()
  const minsAgo = (n: number) => new Date(now.getTime() - n * 60 * 1000)

  const [run1, run2, run3] = await db
    .insert(schema.agentRuns)
    .values([
      {
        organizationId: org.id,
        caseId: caseC001.id,
        agentId: complaintAgent.id,
        status: "completed",
        approvalLevel: 1,
        input: {
          caseId: caseC001.id,
          title: "영어 단어 시험 점수 불만 — 보충수업 요청",
          description: caseC001.description,
        },
        output: {
          analysis: {
            category: "성적불만",
            urgency: "same_day",
            summary:
              "홍길동 학생의 월요 단어 시험 점수가 95점에서 65점으로 급락. 학부모가 보충수업 여부를 문의. 강사 확인 후 무료 보충수업 1회 제공 제안.",
            suggestedReply:
              "안녕하세요, 어머니. 길동이의 이번 주 단어 시험 결과 확인했습니다. 담당 강사 김영어 선생님께서 내용을 검토한 결과, 이번 주 토요일 오전 10시에 무료 보충수업을 진행해 드릴 수 있습니다. 참석 가능하신지 확인 부탁드립니다.",
            requiresApproval: true,
          },
        },
        reasoning:
          "단어 시험 점수 급락은 학습 이해도 문제 또는 가정 내 학습 환경 변화일 수 있음. 무료 보충수업 1회 제공으로 학부모 불안 해소 및 재등록 유지에 효과적.",
        tokensUsed: 912,
        inputTokens: 650,
        outputTokens: 262,
        startedAt: minsAgo(45),
        completedAt: minsAgo(44),
      },
      {
        organizationId: org.id,
        caseId: caseC004.id,
        agentId: retentionAgent.id,
        status: "completed",
        approvalLevel: 0,
        input: {
          studentId: stdSua.id,
          studentName: "이수아",
          grade: "중2",
          currentRiskScore: 0.82,
        },
        output: {
          assessment: {
            riskScore: 0.82,
            riskLevel: "high",
            reasons: [
              "4주간 결석 4회 (무단 포함)",
              "지각 3회 (최장 30분)",
              "전화 미응답 1회",
            ],
            recommendedActions: [
              "담임 강사 박문법 선생님 통해 학부모 전화 상담 즉시 진행",
              "이번 달 단어 시험 결과 학부모 공유 및 피드백 제공",
              "1회 무료 보강 수업 우선 배정 제안",
              "다음 달 형제 할인 또는 3개월 선납 할인 안내",
            ],
          },
        },
        reasoning:
          "결석·지각 패턴이 지속적이며 연락도 잘 안 됨. 중2 시기 영어 학습 공백이 중3·고등부 진학에 큰 영향을 미치므로 즉각적인 상담 개입 필요.",
        tokensUsed: 1156,
        inputTokens: 840,
        outputTokens: 316,
        startedAt: minsAgo(120),
        completedAt: minsAgo(119),
      },
      {
        organizationId: org.id,
        caseId: caseC002.id,
        agentId: complaintAgent.id,
        status: "completed",
        approvalLevel: 0,
        input: {
          caseId: caseC002.id,
          title: "반 친구 다툼 — 반 변경 요청",
          description: caseC002.description,
        },
        output: {
          analysis: {
            category: "환경불만",
            urgency: "immediate",
            summary:
              "김서준 학생이 같은 반 친구와 갈등으로 등원 거부. 반 변경 또는 좌석 배치 조정을 통한 갈등 해소가 우선. 즉시 담임 강사 상담 필요.",
            suggestedReply:
              "안녕하세요, 어머니. 서준이가 많이 속상했겠네요. 저희도 이 부분을 매우 중요하게 생각합니다. 담당 강사 박문법 선생님께서 오늘 중으로 상황을 파악하고 어머니께 연락드릴 예정입니다. 반 변경을 포함한 최선의 방법을 함께 찾아보겠습니다.",
            requiresApproval: false,
          },
        },
        reasoning:
          "즉각적인 공감 표현과 담임 강사 연결이 가장 중요. 반 변경 여부는 강사 상담 후 결정이 적절하므로 승인 불필요.",
        tokensUsed: 874,
        inputTokens: 620,
        outputTokens: 254,
        startedAt: minsAgo(30),
        completedAt: minsAgo(29),
      },
    ])
    .returning()

  // 11. Approvals (2개 — pending)
  const [approval1] = await db.insert(schema.approvals).values([
    {
      organizationId: org.id,
      agentRunId: run1.id,
      caseId: caseC001.id,
      level: 1,
      status: "pending",
      payload: {
        type: "send_reply",
        draft:
          "안녕하세요, 어머니. 길동이의 이번 주 단어 시험 결과 확인했습니다. 담당 강사 김영어 선생님께서 내용을 검토한 결과, 이번 주 토요일 오전 10시에 무료 보충수업을 진행해 드릴 수 있습니다. 참석 가능하신지 확인 부탁드립니다.",
        channel: "kakao",
        recipient: "홍어머니",
        phone: "010-9000-0001",
      },
    },
    {
      organizationId: org.id,
      agentRunId: run2.id,
      caseId: caseC004.id,
      level: 1,
      status: "pending",
      payload: {
        type: "schedule_consultation",
        studentName: "이수아",
        grade: "중2",
        riskScore: 0.82,
        recommendedActions: [
          "담임 강사 박문법 선생님 통해 학부모 전화 상담 즉시 진행",
          "이번 달 단어 시험 결과 학부모 공유",
          "1회 무료 보강 수업 우선 배정 제안",
        ],
        contactPhone: "010-9000-0008",
        parentName: "이어머니",
      },
    },
  ]).returning()

  // 12. ActivityEvents (15개)
  await db.insert(schema.activityEvents).values([
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: orchestratorAgent.id,
      action: "created",
      entityType: "agent_run",
      entityId: run3.id,
      entityTitle: "일일 오케스트레이션 시작",
      metadata: { trigger: "daily_wakeup" },
      createdAt: minsAgo(125),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: retentionAgent.id,
      action: "created",
      entityType: "agent_run",
      entityId: run2.id,
      entityTitle: "이수아 이탈 위험 분석 시작",
      createdAt: minsAgo(120),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: retentionAgent.id,
      action: "completed",
      entityType: "case",
      entityId: caseC004.id,
      entityTitle: "C-004 이수아 이탈 위험 분석 완료",
      metadata: { riskScore: 0.82, riskLevel: "high" },
      createdAt: minsAgo(119),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: complaintAgent.id,
      action: "created",
      entityType: "agent_run",
      entityId: run1.id,
      entityTitle: "C-001 영어 단어 시험 민원 분석 시작",
      createdAt: minsAgo(45),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: complaintAgent.id,
      action: "completed",
      entityType: "case",
      entityId: caseC001.id,
      entityTitle: "C-001 무료 보충수업 답변 초안 작성 완료",
      createdAt: minsAgo(44),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: complaintAgent.id,
      action: "pending_approval",
      entityType: "case",
      entityId: caseC001.id,
      entityTitle: "C-001 답변 승인 대기",
      createdAt: minsAgo(44),
    },
    {
      organizationId: org.id,
      actorType: "system",
      actorId: "system",
      action: "detected",
      entityType: "case",
      entityId: caseC004.id,
      entityTitle: "이수아 학생 이탈 위험 자동 감지 (결석 4회+지각 3회)",
      metadata: { riskScore: 0.82, trigger: "attendance_pattern" },
      createdAt: minsAgo(130),
    },
    {
      organizationId: org.id,
      actorType: "human",
      actorId: "parent:kim-mom",
      action: "created",
      entityType: "case",
      entityId: caseC002.id,
      entityTitle: "C-002 반 변경 요청 접수 (카카오 채널)",
      createdAt: minsAgo(200),
    },
    {
      organizationId: org.id,
      actorType: "human",
      actorId: "parent:park-dad",
      action: "created",
      entityType: "case",
      entityId: caseC003.id,
      entityTitle: "C-003 수강료 차액 환불 문의 접수",
      createdAt: minsAgo(300),
    },
    {
      organizationId: org.id,
      actorType: "human",
      actorId: "staff:jeong-toik",
      action: "created",
      entityType: "case",
      entityId: caseC005.id,
      entityTitle: "C-005 성인부 강사 대타 요청",
      createdAt: minsAgo(60),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: complaintAgent.id,
      action: "assigned",
      entityType: "case",
      entityId: caseC001.id,
      entityTitle: "C-001 민원담당 에이전트 배정",
      createdAt: minsAgo(124),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: complaintAgent.id,
      action: "assigned",
      entityType: "case",
      entityId: caseC002.id,
      entityTitle: "C-002 민원담당 에이전트 배정",
      createdAt: minsAgo(123),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: retentionAgent.id,
      action: "assigned",
      entityType: "case",
      entityId: caseC004.id,
      entityTitle: "C-004 이탈방어 에이전트 배정",
      createdAt: minsAgo(122),
    },
    {
      organizationId: org.id,
      actorType: "agent",
      actorId: schedulerAgent.id,
      action: "assigned",
      entityType: "case",
      entityId: caseC005.id,
      entityTitle: "C-005 스케줄러 에이전트 배정",
      createdAt: minsAgo(58),
    },
    {
      organizationId: org.id,
      actorType: "system",
      actorId: "system",
      action: "pending_approval",
      entityType: "case",
      entityId: caseC004.id,
      entityTitle: "C-004 이수아 학부모 상담 일정 승인 요청",
      createdAt: minsAgo(118),
    },
  ])

  // 13. WakeupRequests (2개)
  await db.insert(schema.wakeupRequests).values([
    {
      organizationId: org.id,
      caseId: caseC001.id,
      agentId: complaintAgent.id,
      status: "completed",
      dedupKey: `wakeup:complaint:${caseC001.id}:${dateStr(0)}`,
    },
    {
      organizationId: org.id,
      agentId: orchestratorAgent.id,
      status: "pending",
      dedupKey: `wakeup:orchestrator:daily:${dateStr(0)}`,
    },
  ])

  // 14. Documents (5개 — 학원 운영 문서)
  await db.insert(schema.documents).values([
    {
      organizationId: org.id,
      title: "학원 운영 정책",
      body: "탄자니아 영어학원 운영 정책입니다.\n\n1. 운영 시간: 평일 10:00~22:00, 토 09:00~18:00, 일·공휴일 휴원\n2. 수업 결석 시 사전 연락 필수 (최소 2시간 전)\n3. 보강 수업은 결석 후 2주 이내 신청 가능\n4. 수강 등록은 매월 1~5일, 재등록은 기존 수강생 우선",
      category: "policy",
      tags: ["운영", "정책", "공지"],
    },
    {
      organizationId: org.id,
      title: "환불 규정",
      body: "학원법 제18조에 따른 환불 규정입니다.\n\n- 수강 시작 전: 수강료 전액 환불\n- 수강 1/3 경과 전: 수강료의 2/3 환불\n- 수강 1/2 경과 전: 수강료의 1/2 환불\n- 수강 1/2 경과 후: 환불 불가\n\n환불 신청: 원장 면담 후 7영업일 이내 처리",
      category: "policy",
      tags: ["환불", "정책", "학원법"],
    },
    {
      organizationId: org.id,
      title: "자주 묻는 질문 (FAQ)",
      body: "Q. 레벨 테스트는 어떻게 진행되나요?\nA. 입원 시 무료 레벨 테스트(30분)를 실시하며, 문법·독해·회화 항목을 평가합니다.\n\nQ. 반 변경이 가능한가요?\nA. 수강 시작 후 1개월 이내 1회 무료 반 변경이 가능합니다.\n\nQ. 교재비는 별도인가요?\nA. 네, 교재비는 수강료와 별도입니다. 학기 시작 시 안내드립니다.\n\nQ. 결석한 경우 보강은 어떻게 받나요?\nA. 결석 후 2주 이내에 담당 강사에게 보강 신청 후 조율합니다.",
      category: "faq",
      tags: ["FAQ", "문의", "입원"],
    },
    {
      organizationId: org.id,
      title: "학부모 상담 스크립트",
      body: "## 민원 접수 초기 응대\n\n1. 인사: \"안녕하세요, 탄자니아 영어학원입니다. 무엇을 도와드릴까요?\"\n2. 공감 표현: \"불편을 드려서 죄송합니다. 말씀해 주신 내용 잘 들었습니다.\"\n3. 확인: \"확인 후 [시간] 이내에 연락드리겠습니다.\"\n4. 마무리: \"감사합니다. 좋은 하루 되세요.\"\n\n## 환불 요청 응대\n\n학원법 규정을 안내하고, 원장 면담 일정을 잡는다.\n환불 규정 문서 참조.",
      category: "script",
      tags: ["상담", "스크립트", "민원"],
    },
    {
      organizationId: org.id,
      title: "차량 안전 규정",
      body: "탄자니아 영어학원 셔틀버스 운행 안전 규정입니다.\n\n1. 셔틀버스 운행 노선: 대치역 ↔ 학원 (평일 오후 3회)\n2. 탑승 시 반드시 안전벨트 착용\n3. 하차 시 보호자 또는 교사 확인 필수\n4. 차량 내 음식물 섭취 금지\n5. 운전기사 연락처: 010-2673-9999",
      category: "manual",
      tags: ["셔틀", "안전", "운영"],
    },
  ])

  // 15. Routines (3개 — 자동화 루틴)
  await db.insert(schema.routines).values([
    {
      organizationId: org.id,
      agentId: complaintAgent.id,
      name: "매일 07:00 민원 처리",
      schedule: "0 7 * * *",
      enabled: true,
    },
    {
      organizationId: org.id,
      agentId: retentionAgent.id,
      name: "매주 월 이탈 위험 분석",
      schedule: "0 8 * * 1",
      enabled: true,
    },
    {
      organizationId: org.id,
      agentId: orchestratorAgent.id,
      name: "매월 1일 운영 리포트",
      schedule: "0 9 1 * *",
      enabled: true,
    },
  ])

  // 16. Goals (3개 — 계층형 운영 목표)
  const [goalParent] = await db.insert(schema.opsGoals).values({
    organizationId: org.id,
    title: "학원 운영 최적화",
    description: "AI 에이전트를 활용해 학원 운영 효율을 높이고 학부모·학생 만족도를 극대화한다.",
    status: "active",
    targetDate: "2026-12-31",
  }).returning()

  await db.insert(schema.opsGoals).values([
    {
      organizationId: org.id,
      parentGoalId: goalParent.id,
      title: "학생 만족도 향상",
      description: "이탈 위험 학생 조기 감지 및 맞춤 개입으로 재등록률 85% 이상 달성",
      status: "active",
      targetDate: "2026-06-30",
    },
    {
      organizationId: org.id,
      parentGoalId: goalParent.id,
      title: "민원 응답 시간 단축",
      description: "AI 에이전트 자동 초안 생성으로 학부모 민원 평균 응답 시간을 24시간 이내로 단축",
      status: "active",
      targetDate: "2026-03-31",
    },
  ])

  // 17. Link some cases to onboarding project
  await db.update(schema.cases)
    .set({ opsGroupId: opsOnboarding.id })
    .where(eq(schema.cases.id, caseC003.id))

  // 18. Notifications (5개)
  await db.insert(schema.notifications).values([
    {
      organizationId: org.id,
      type: "approval_needed",
      title: "승인 요청",
      body: "민원담당이 C-001 응답 초안을 생성했습니다",
      entityType: "approval",
      entityId: approval1.id,
      read: false,
      createdAt: minsAgo(5),
    },
    {
      organizationId: org.id,
      type: "agent_completed",
      title: "에이전트 작업 완료",
      body: "이탈위험분석이 완료되었습니다",
      entityType: "agent_run",
      entityId: run2.id,
      read: false,
      createdAt: minsAgo(10),
    },
    {
      organizationId: org.id,
      type: "case_created",
      title: "새 케이스 등록",
      body: "민원 C-003이 자동 등록되었습니다",
      entityType: "case",
      entityId: caseC003.id,
      read: true,
      createdAt: minsAgo(30),
    },
    {
      organizationId: org.id,
      type: "risk_detected",
      title: "이탈 위험 감지",
      body: "이수아(중2) 이탈 위험 점수 0.82",
      entityType: "student",
      entityId: stdSua.id,
      read: true,
      createdAt: minsAgo(60),
    },
    {
      organizationId: org.id,
      type: "reminder",
      title: "상담 일정 알림",
      body: "내일 14:00 김민서 학부모 상담 예정",
      entityType: "schedule",
      entityId: schedElem1.id,
      read: true,
      createdAt: minsAgo(120),
    },
  ])

  process.stdout.write(
    `Seed complete. Organization: ${org.id} (${org.name})\n`,
  )
  process.exit(0)
}

seed().catch((err) => {
  process.stderr.write(`Seed failed: ${String(err)}\n`)
  process.exit(1)
})
