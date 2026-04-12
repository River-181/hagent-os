import { eq } from "drizzle-orm"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { z } from "zod"
import type { Db } from "@hagent/db"
import * as schema from "@hagent/db"
import { dispatchInstruction } from "./orchestration.js"
import { installSkillForOrganization, updateAgentSkillMounts } from "./skills.js"
import { createCaseWithRetry } from "../lib/case-create.js"
import { inferInstructorRoleFromSubject } from "../lib/instructor-roles.js"
import { TANZANIA_PRESET } from "../data/tanzania-preset.js"
import { RICH_CASES, CEO_MEMORY, DEMO_DOCUMENTS } from "../data/rich-demo-seed.js"

const AGENT_DATA_DIR = path.join(import.meta.dirname, "../../data/agents")

// ── 데모 지식베이스 문서 ────────────────────────────────────────────────────

const COUNSELING_POLICY_DEMO = `# 상담 정책

## 상담 예약 원칙

- 상담 예약은 최소 **하루 전(전날 오후 6시 이전)** 카카오 채널 또는 전화로 신청합니다.
- 예약 확인 문자는 당일 오전 9시에 자동 발송됩니다.
- 노쇼(No-show) 시 다음 예약은 48시간 후부터 가능합니다.

## 상담 운영 시간

| 요일 | 시간 |
|------|------|
| 월~금 | 14:00 ~ 18:00 |
| 토 | 10:00 ~ 14:00 |
| 일·공휴일 | 휴무 |

## 상담 유형별 처리 기준

### 학습 상담 (20분)
- 담임 강사가 직접 진행합니다.
- 학습 태도, 성적 추이, 반 배정 변경 요청을 다룹니다.
- 필요 시 원장 상담으로 연계합니다.

### 이탈 위험 학생 상담 (30분)
- AI 에이전트 리포트에서 이탈 위험 점수 0.5 이상인 학생은 월 1회 의무 상담입니다.
- 보호자 동반을 권장합니다.
- 상담 결과는 학생 카드에 기록하고 담당 에이전트에 공유합니다.

### 신규 상담 (30분)
- 등록 전 1회 무료 상담 진행합니다.
- 학생 레벨 테스트 + 보호자 상담 동시 진행 가능합니다.
- 당일 등록 시 등록비 면제 혜택을 제공합니다.

### 환불·불만 상담
- 원장 또는 부원장이 직접 처리합니다.
- 접수 후 24시간 이내 1차 연락을 드립니다.

## 상담 기록 및 팔로업

- 모든 상담 내용은 시스템에 케이스로 등록합니다.
- 상담 후 3일 이내 팔로업 문자를 자동 발송합니다.
- 상담 결과에 따른 후속 액션(반 이동, 보강 추가, 환불 처리 등)은 담당 에이전트가 케이스로 관리합니다.
`

const REFUND_POLICY_DEMO = `# 환불 정책

## 환불 기준 (학원법 제18조 준용)

수강료 환불은 학원의 설립·운영 및 과외교습에 관한 법률 시행령 제18조에 따릅니다.

| 환불 시점 | 환불 금액 |
|----------|---------|
| 수강 전 (등록일로부터 7일 이내) | **전액 환불** |
| 수강 시작 후 1/3 경과 전 | 수강료의 **2/3** |
| 수강 시작 후 1/2 경과 전 | 수강료의 **1/2** |
| 수강 시작 후 1/2 이상 경과 | **환불 불가** |

> ⚠️ 이벤트·특강 할인가로 등록한 경우 정가 기준으로 환불액을 산정합니다.

## 환불 신청 절차

1. 카카오 채널 또는 방문으로 환불 의사 표시
2. 담당 직원이 수강 일수 확인 및 환불액 안내 (24시간 이내)
3. 환불 동의서 작성 (방문 또는 전자서명)
4. 영업일 기준 **5일 이내** 지정 계좌로 입금

## 재료비·교재비

- 수업 시작 후 제공된 교재 및 재료비는 환불 대상에서 제외됩니다.
- 미개봉 교재는 반납 시 50% 환불 가능합니다.

## 특수 상황

### 장기 결석 (의사 소견서 제출 시)
- 질병, 사고 등 불가피한 사유로 수강이 불가능한 경우 잔여 수강료 전액 환불 가능
- 소견서는 접수일로부터 2주 이내 제출 필수

### 강사 귀책 사유
- 학원 측 귀책 사유(강사 교체, 수업 중단 등)로 인한 환불은 잔여 수강료 전액 환불
- 추가로 등록비의 50% 보상 가능 (원장 판단)

## 보강 우선 원칙

환불 요청 전 **보강 수업**을 먼저 제안합니다.
보강이 어려운 경우에만 환불 절차로 진행합니다.

## 문의

- 카카오 채널: @탄자니아영어학원
- 전화: 02-XXX-XXXX (평일 09:00~20:00)
`

const ATTENDANCE_POLICY_DEMO = `# 출결 정책

## 출석 확인 방법

- 수업 시작 5분 전 ~ 시작 후 10분 이내 입실 → **출석**
- 수업 시작 후 10분 초과 ~ 30분 이내 입실 → **지각**
- 30분 이상 경과 또는 미입실 → **결석**

## 결석 처리 기준

### 공결 (출결 불이익 없음)
- 학교 공식 행사 (수학여행, 체육대회 등) — 선생님 확인서 필요
- 수능·모의고사 시험일
- 법정 공휴일

### 병결
- 당일 오전 10시까지 카카오 채널 또는 전화로 통보
- 1주일 이내 진단서 또는 소견서 제출 시 공결 처리
- 미통보 병결은 무단결석으로 처리

### 무단결석
- 2회 연속 무단결석 시 보호자에게 자동 알림
- 3회 이상 무단결석 시 이탈 위험 케이스로 등록, 에이전트 팔로업 시작

## 보강 수업 정책

- 결석 1회당 보강 1회 신청 가능 (당일 결석 기준 2주 이내)
- 보강 예약은 카카오 채널로 신청
- 보강 정원: 기존 반 수강생 + 최대 3명
- **3회 이상 결석** 시 보강 신청 우선순위 부여

## 출결 리포트

- 매주 월요일 오전 전주 출결 현황 리포트 자동 발송 (카카오 채널)
- 월간 출결률 80% 미만 학생은 학습 상담 권유
- 출결률 70% 미만 지속 시 이탈 위험 레드 등급으로 상향

## 강사 결석 처리

- 강사 사전 통보(2일 전) 결석 → 보강 수업 자동 일정 수립
- 당일 긴급 결석 → 해당 수업 보강 또는 수강료 비례 차감
- 연속 3일 이상 결석 → 대체 강사 투입 또는 학부모 개별 안내
`

const DEMO_EXTRA_DOCUMENTS = [
  {
    title: "강사 플레이북",
    category: "manual",
    body: `# 강사 플레이북

## 수업 운영 기본 원칙

1. **수업 시작 10분 전** 도착하여 교실 준비 완료
2. 수업 시작 시 출결 확인 후 시스템 입력
3. 수업 종료 후 5분 이내 특이사항 기록 (결석, 태도, 이해도 등)

## 학생 관리

### 이탈 위험 학생 대응
- 이탈 위험 점수 0.4 이상 → 수업 시 개별 관심 강화
- 이탈 위험 점수 0.6 이상 → 담임 에이전트에 상담 케이스 생성 요청
- 직접 보호자에게 연락하지 않고 **반드시 시스템을 통해** 처리

### 학습 부진 학생
- 2주 연속 하위 30% 성적 → 학습 상담 케이스 등록
- 수업 중 질문 시도 3회 이상 무응답 → 수업 후 개별 면담

## 성적 리포트 작성

- 월 1회, 당월 마지막 주 금요일까지 제출
- 항목: 출석률, 월말평가 성적, 전월 대비 변화, 강사 의견 (3줄 이내)
- 시스템 문서 탭 > 성적 리포트 카테고리에 업로드

## 커뮤니케이션 원칙

- 학부모 직접 연락은 **금지** (모든 연락은 카카오 채널 또는 담당 에이전트 경유)
- 수업 관련 민원은 담당 에이전트에게 케이스로 전달
- 긴급 상황(학생 부상, 사고)은 즉시 원장 직통 연락

## 보강 수업 운영

- 보강 수업은 원칙적으로 기존 수업과 동일 커리큘럼 진행
- 보강 수업 출결도 동일하게 시스템 입력 필수
- 보강 수업 초과 시간은 수업료에 포함 (별도 청구 불가)
`,
  },
  {
    title: "학부모 FAQ",
    category: "faq",
    body: `# 학부모 FAQ

## 등록 및 수강료

**Q. 수강료는 언제까지 납부해야 하나요?**
A. 매월 1일부터 5일 이내에 납부해 주세요. 5일 이후 납부 시 다음 달 정상 수강에 지장이 생길 수 있습니다.

**Q. 형제·자매 할인이 있나요?**
A. 네, 2인 이상 등록 시 둘째부터 수강료의 10%를 할인합니다. 등록 시 말씀해 주세요.

**Q. 체험 수업이 가능한가요?**
A. 첫 방문 시 1회 무료 체험 수업을 제공합니다. 카카오 채널로 예약해 주세요.

## 수업 및 출결

**Q. 결석 시 어떻게 연락해야 하나요?**
A. 카카오 채널(@탄자니아영어학원)으로 당일 오전 10시 이전에 알려주세요. 당일 연락 없이 결석할 경우 무단결석으로 처리됩니다.

**Q. 보강 수업은 어떻게 신청하나요?**
A. 카카오 채널에서 "보강 신청"을 입력하면 가능한 일정을 안내드립니다. 결석일로부터 2주 이내에 신청해 주세요.

**Q. 우리 아이 출석률은 어디서 확인하나요?**
A. 매주 월요일 오전, 전주 출결 현황을 카카오 채널로 자동 발송합니다.

## 성적 및 상담

**Q. 성적이 낮아 걱정되는데 상담이 가능한가요?**
A. 카카오 채널 또는 전화로 상담을 신청해 주세요. 담임 강사와의 학습 상담을 20분간 진행합니다.

**Q. 반 배정 변경을 원합니다.**
A. 레벨 테스트 후 반 이동이 가능합니다. 상담 신청 후 담임 강사 및 원장 검토를 거쳐 결정됩니다.

## 차량 및 기타

**Q. 차량 서비스는 어떻게 신청하나요?**
A. 등록 시 셔틀 서비스 신청이 가능합니다. 학원에서 1km 이내 지역을 운행합니다. 자세한 노선은 원장에게 문의해 주세요.

**Q. 카카오 채널 연결은 어떻게 하나요?**
A. 카카오톡에서 '@탄자니아영어학원'을 검색하거나, 등록 시 안내드리는 QR코드를 스캔해 주세요.
`,
  },
  {
    title: "수업 레벨 기준표",
    category: "manual",
    body: `# 수업 레벨 기준표

## 반 구성 개요

탄자니아 영어학원은 학생의 학년, 영어 실력, 목표에 따라 반을 구성합니다.

## 초등부

| 반 이름 | 대상 | 수준 | 주요 학습 내용 |
|--------|------|------|-------------|
| 파닉스 기초반 | 초1~초4 | 입문 | 알파벳, 파닉스, 기초 단어 500개 |
| 기초회화반 | 초4~초6 | 초급 | 기초 회화, Sight Words, 패턴 문장 |

**레벨 테스트 기준**: 파닉스 기초반 → 파닉스 테스트 통과 시 기초회화반으로 이동

## 중등부

| 반 이름 | 대상 | 수준 | 주요 학습 내용 |
|--------|------|------|-------------|
| 내신 문법반 | 중1~중2 | 중급 | 학교 내신 완성, 핵심 문법, 서술형 |
| 영어 독해반 | 중2~중3 | 중급 | 독해 전략, 빈칸·순서·요약 유형 |
| 어휘·쓰기 심화반 | 중2~중3 | 중상급 | 어휘 1800, 단락 쓰기, 서술형 심화 |

**반 이동 조건**: 내신 문법반 → 독해반: 월말평가 85점 이상 2회 연속

## 고등부

| 반 이름 | 대상 | 수준 | 주요 학습 내용 |
|--------|------|------|-------------|
| 수능영어반 | 고1~고3 | 상급 | 수능 유형별 풀이, 빠른 독해, EBS 연계 |
| 심화독해반 | 고2~고3 | 심화 | 장문독해, 추론, 수능 고난도 34~45번 |
| 모의고사 특강 | 고2~고3 | 상급 이상 | 실전 모의고사 풀이·해설 (주 1회) |

**배정 기준**: 입학 시 자체 레벨 테스트 60분 + 강사 인터뷰 15분

## 성인부

| 반 이름 | 대상 | 주요 학습 내용 |
|--------|------|-------------|
| 비즈니스영어반 | 직장인 | 이메일 작성, 회의 영어, 프레젠테이션 |
| 토익 집중반 | 취업 준비생/직장인 | LC/RC 파트별 전략, 실전 모의고사 |

## 레벨 테스트 신청

- 신규 등록 시 자동 진행 (별도 비용 없음)
- 재원생 반 이동 요청 시: 카카오 채널로 신청 → 익월 1일 기준 테스트
`,
  },
  {
    title: "민원 응대 스크립트",
    category: "script",
    body: `# 민원 응대 스크립트

> 이 스크립트는 AI 에이전트와 직원 모두가 사용하는 표준 응대 가이드입니다.

## 기본 응대 원칙

1. **24시간 이내** 1차 응답 (업무시간 외 수신 포함)
2. **공감 먼저, 해결 다음** — 먼저 불편함에 공감하고 해결책 제시
3. **약속한 내용은 반드시 이행** — 모든 약속은 케이스에 기록
4. **에스컬레이션 기준** — 보호자가 2회 이상 같은 문제를 제기하면 원장 상담 연계

---

## 유형별 스크립트

### 1. 수강료 환불 요청

**수신 시:**
> "안녕하세요, [학생 이름] 보호자님. 불편을 드려 죄송합니다. 환불 관련 문의 주셨군요. 정확한 처리를 위해 등록일과 수강 시작일을 확인하겠습니다. 잠시만 기다려 주세요."

**처리 후:**
> "확인 결과 [환불 금액]원이 환불 가능합니다. 동의서 작성 후 영업일 기준 5일 이내 [계좌번호] 계좌로 입금됩니다. 진행해 드릴까요?"

**보강 우선 제안 시:**
> "혹시 환불 대신 보강 수업으로 해결이 가능한 상황인지 먼저 여쭤봐도 될까요? 보강이 어려우신 경우 환불 절차로 바로 진행하겠습니다."

---

### 2. 무단결석 알림 후 보호자 반응

**첫 번째 무단결석 알림 발송 후 연락 없을 때:**
> "[학생 이름] 학생이 [날짜] 수업에 연락 없이 결석하였습니다. 혹시 특별한 사유가 있으신가요? 건강에 이상이 없는지 확인 차 연락드립니다."

**보호자가 불만을 표시할 때:**
> "불편하게 느끼셨다면 죄송합니다. 저희는 학생 안전과 학습 공백 방지를 위해 결석 확인을 진행하고 있습니다. 앞으로는 카카오 채널로 미리 알려주시면 바로 처리해 드리겠습니다."

---

### 3. 강사 교체 요청

> "강사 교체 요청을 주셨군요. 현재 담당 강사 [이름] 선생님과의 수업 관련해 불편하신 점을 좀 더 구체적으로 말씀해 주시면 최선의 방법을 찾아드리겠습니다. 원장님과 상담 후 2일 이내 회신 드리겠습니다."

---

### 4. 성적 문의

> "[학생 이름] 학생의 성적에 대해 걱정이 크신 것 같습니다. 최근 월말 평가 결과와 출결 현황을 함께 검토해 드리겠습니다. 담임 강사와의 학습 상담(20분)을 예약해 드릴까요? 이번 주 [요일] [시간]이 가능합니다."

---

### 5. 시설·안전 불만

> "불편을 드려 진심으로 죄송합니다. 해당 내용을 즉시 원장님께 전달하여 [처리 기한]까지 개선 조치를 취하겠습니다. 조치 완료 후 다시 연락 드리겠습니다."

---

## 에스컬레이션 판단 기준

| 상황 | 처리자 |
|------|--------|
| 일반 문의 / 정보 안내 | AI 에이전트 자동 처리 |
| 환불 요청 (100만원 미만) | 직원 처리 |
| 환불 요청 (100만원 이상) | 원장 직접 처리 |
| 강사 교체 요청 | 원장 상담 연계 |
| 법적 분쟁 언급 | 즉시 원장 에스컬레이션 |
| 아동 안전 관련 | 즉시 원장 + 필요시 신고 |
`,
  },
]

const channelBindingSchema = z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().optional(),
  botId: z.string().optional(),
  searchId: z.string().optional(),
  displayName: z.string().optional(),
  channelUrl: z.string().optional(),
  chatUrl: z.string().optional(),
  inboundPurpose: z.string().optional(),
  routingPriority: z.number().int().min(1).max(5).default(3),
  webhookSecret: z.string().optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
  phoneNumber: z.string().optional(),
})

const selectedAgentSchema = z.object({
  role: z.string().min(2),
  name: z.string().min(1),
  adapterType: z.enum(["codex_qauth", "codex_local", "claude_local", "mock_local"]).optional(),
  model: z.string().optional(),
  persona: z.string().optional(),
  mountedSkills: z.array(z.string()).optional(),
  allowedChannels: z.array(z.string()).optional(),
  autoRun: z.boolean().optional(),
})

const bootstrapSchema = z.object({
  institutionName: z.string().min(2),
  institutionType: z.string().min(2),
  institutionSize: z.string().min(1),
  topGoal: z.string().min(2),
  description: z.string().optional(),
  principalName: z.string().min(1).default("원장"),
  starterProjectName: z.string().min(2).default("운영 시작"),
  starterTeamPreset: z.string().min(2).default("academy-core"),
  initialInstruction: z.string().min(2).default("오늘 민원 처리하고 이번 주 이탈 위험 학생 알려줘"),
  selectedAdapterType: z.enum(["codex_qauth", "codex_local", "claude_local", "mock_local"]).default("codex_qauth"),
  selectedModel: z.string().min(2).default("gpt-5-codex"),
  byoApiKey: z.string().optional(),
  mode: z.enum(["scratch", "demo"]).default("scratch"),
  setupProjectName: z.string().min(2).default("Academy Setup"),
  channels: z
    .object({
      kakao: channelBindingSchema.optional(),
      telegram: channelBindingSchema.optional(),
      sms: channelBindingSchema.optional(),
      naver: channelBindingSchema.optional(),
    })
    .default({}),
  dataImports: z
    .object({
      students: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
      parents: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
      instructors: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
      schedules: z
        .object({
          mode: z.enum(["manual", "csv", "preset"]).default("manual"),
          countHint: z.number().int().min(0).optional(),
          sourceName: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
  policyInputs: z
    .object({
      counselingPolicy: z.string().optional(),
      refundPolicy: z.string().optional(),
      attendancePolicy: z.string().optional(),
      faqNotes: z.string().optional(),
    })
    .default({}),
  selectedAgents: z.array(selectedAgentSchema).default([]),
})

const STARTER_SKILLS: Record<string, string[]> = {
  orchestrator: ["complaint-classifier", "schedule-manager", "student-data-import"],
  complaint: ["complaint-classifier", "korean-tone-guide", "message-template-pack"],
  retention: ["churn-risk-calculator", "student-360-view", "korean-tone-guide"],
  scheduler: ["google-calendar-mcp", "schedule-manager", "schedule-optimizer"],
}

const ROLE_PRESETS: Record<
  string,
  {
    slug: string
    agentType: "orchestrator" | "complaint" | "retention" | "scheduler" | "intake" | "staff" | "compliance" | "notification"
    icon: string
    defaultName: string
    systemPrompt: (orgName: string, topGoal: string) => string
    skillSlugs: string[]
  }
> = {
  orchestrator: {
    slug: "orchestrator",
    agentType: "orchestrator",
    icon: "brain",
    defaultName: "원장 오케스트레이터",
    systemPrompt: (orgName, topGoal) => `${orgName}의 운영 전반을 조율하고 ${topGoal}를 우선순위로 실행합니다.`,
    skillSlugs: ["complaint-classifier", "schedule-manager", "student-data-import"],
  },
  complaint: {
    slug: "complaint",
    agentType: "complaint",
    icon: "shield",
    defaultName: "민원 담당",
    systemPrompt: (orgName) => `${orgName}의 민원, 환불, 민감한 학부모 응대를 담당합니다.`,
    skillSlugs: ["complaint-classifier", "korean-tone-guide", "message-template-pack"],
  },
  counseling: {
    slug: "counseling",
    agentType: "complaint",
    icon: "message-square",
    defaultName: "상담 코디네이터",
    systemPrompt: (orgName) => `${orgName}의 상담 문의를 분류하고 답변/상담 예약까지 이어갑니다.`,
    skillSlugs: ["korean-tone-guide", "message-template-pack", "student-360-view"],
  },
  retention: {
    slug: "retention",
    agentType: "retention",
    icon: "heart",
    defaultName: "재등록 분석가",
    systemPrompt: (orgName) => `${orgName}의 이탈 위험 학생을 탐지하고 재등록 개입안을 제안합니다.`,
    skillSlugs: ["churn-risk-calculator", "student-360-view", "korean-tone-guide"],
  },
  operations: {
    slug: "operations",
    agentType: "notification",
    icon: "bell",
    defaultName: "출결·결제 운영자",
    systemPrompt: (orgName) => `${orgName}의 출결, 결제, 공지 후속 작업을 관리합니다.`,
    skillSlugs: ["message-template-pack", "student-data-import"],
  },
  scheduler: {
    slug: "scheduler",
    agentType: "scheduler",
    icon: "calendar",
    defaultName: "스케줄러",
    systemPrompt: (orgName) => `${orgName}의 보강, 상담, 대체수업, 캘린더 동기화를 담당합니다.`,
    skillSlugs: ["google-calendar-mcp", "schedule-manager", "schedule-optimizer"],
  },
  marketing: {
    slug: "marketing",
    agentType: "staff",
    icon: "megaphone",
    defaultName: "프로모션 담당",
    systemPrompt: (orgName) => `${orgName}의 프로모션, 안내문, 메시지 초안을 제작합니다.`,
    skillSlugs: ["message-template-pack", "korean-tone-guide"],
  },
}

function resolveChannelConfig(input: z.infer<typeof bootstrapSchema>) {
  const integrations = {
    channels: {
      kakao: {
        key: "kakao",
        connected: Boolean(input.channels.kakao?.enabled && (input.channels.kakao?.channelId || input.channels.kakao?.botId)),
        readiness:
          input.channels.kakao?.enabled
            ? (input.channels.kakao?.channelId || input.channels.kakao?.botId)
              ? "connected"
              : "missing_credentials"
            : "inactive",
        ...input.channels.kakao,
      },
      telegram: {
        key: "telegram",
        connected: Boolean(input.channels.telegram?.enabled && input.channels.telegram?.botToken),
        readiness:
          input.channels.telegram?.enabled
            ? input.channels.telegram?.botToken
              ? "connected"
              : "missing_credentials"
            : "inactive",
        ...input.channels.telegram,
      },
      sms: {
        key: "sms",
        connected: false,
        readiness: input.channels.sms?.enabled ? "missing_credentials" : "inactive",
        ...input.channels.sms,
      },
      naver: {
        key: "naver",
        connected: false,
        readiness: input.channels.naver?.enabled ? "missing_credentials" : "inactive",
        ...input.channels.naver,
      },
    },
  }

  return integrations
}

function buildSelectedAgentDefinitions(input: z.infer<typeof bootstrapSchema>, organizationName: string) {
  const selected = input.selectedAgents.length > 0
    ? input.selectedAgents
    : [
        { role: "orchestrator", name: input.principalName, mountedSkills: ROLE_PRESETS.orchestrator.skillSlugs },
        { role: "complaint", name: "민원담당", mountedSkills: ROLE_PRESETS.complaint.skillSlugs },
        { role: "retention", name: "이탈방어", mountedSkills: ROLE_PRESETS.retention.skillSlugs },
        { role: "scheduler", name: "스케줄러", mountedSkills: ROLE_PRESETS.scheduler.skillSlugs },
      ]

  return selected.map((agent) => {
    const preset = ROLE_PRESETS[agent.role] ?? ROLE_PRESETS.complaint
    return {
      name: agent.name || preset.defaultName,
      slug: preset.slug,
      agentType: preset.agentType,
      icon: preset.icon,
      systemPrompt: agent.persona || preset.systemPrompt(organizationName, input.topGoal),
      adapterType: agent.adapterType ?? input.selectedAdapterType,
      adapterModel: agent.model ?? input.selectedModel,
      mountedSkills: agent.mountedSkills?.length ? agent.mountedSkills : preset.skillSlugs,
      allowedChannels: agent.allowedChannels ?? [],
      autoRun: agent.autoRun ?? true,
      role: agent.role,
    }
  })
}

function buildSetupCases(input: z.infer<typeof bootstrapSchema>, projectId: string, studentId: string, parentId: string, agents: Array<{ id: string; slug: string }>) {
  const complaintAgentId = agents.find((agent) => agent.slug === "complaint" || agent.slug === "counseling")?.id ?? null
  const retentionAgentId = agents.find((agent) => agent.slug === "retention")?.id ?? null
  const schedulerAgentId = agents.find((agent) => agent.slug === "scheduler")?.id ?? null
  const orchestratorAgentId = agents.find((agent) => agent.slug === "orchestrator")?.id ?? null

  return [
    {
      title: "채널 연결 점검",
      description: "Kakao/Telegram 인바운드 설정과 라우팅 우선순위를 검증합니다.",
      type: "inquiry" as const,
      assigneeAgentId: orchestratorAgentId,
      reporterId: "system:bootstrap",
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "channels",
      } as Record<string, unknown>,
    },
    {
      title: "학생 데이터 검증",
      description: `${input.institutionName}의 학생/학부모 데이터 연결 상태를 확인하고 누락 필드를 정리합니다.`,
      type: "inquiry" as const,
      assigneeAgentId: complaintAgentId,
      reporterId: "system:bootstrap",
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "students",
      } as Record<string, unknown>,
    },
    {
      title: "강사 데이터 및 스케줄 검증",
      description: "강사 역할, 수업 시간표, 보강 가능 슬롯을 점검합니다.",
      type: "schedule" as const,
      assigneeAgentId: schedulerAgentId,
      reporterId: "system:bootstrap",
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "schedule",
      } as Record<string, unknown>,
    },
    {
      title: "운영 정책 문서화",
      description: "상담/환불/출결 정책을 문서와 답변 톤 가이드로 정리합니다.",
      type: "complaint" as const,
      assigneeAgentId: complaintAgentId,
      reporterId: `parent:${parentId}`,
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "policy",
      } as Record<string, unknown>,
    },
    {
      title: "에이전트 역할 검수",
      description: "초기 고용한 에이전트들의 역할, 채널 접근권한, mounted skills를 검수합니다.",
      type: "churn" as const,
      assigneeAgentId: retentionAgentId,
      reporterId: "system:bootstrap",
      studentId,
      source: "manual",
      metadata: {
        caseKind: "setup-task",
        bootstrap: true,
        setupTask: "team",
      } as Record<string, unknown>,
    },
    {
      title: "학부모 민원 초안 검토",
      description: `${input.institutionName}의 학부모 민원 응답 흐름을 데모용으로 준비합니다.`,
      type: "complaint" as const,
      assigneeAgentId: complaintAgentId,
      reporterId: `parent:${parentId}`,
      studentId,
      source: input.channels.kakao?.enabled ? "kakao" : "manual",
      metadata: {
        caseKind: "complaint",
        bootstrap: true,
        setupTask: "demo-complaint",
      } as Record<string, unknown>,
    },
  ].map((item) => ({
    ...item,
    opsGroupId: projectId,
  }))
}

function slugify(input: string) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || `org-${Date.now()}`
  )
}

function buildInstructionFile(name: string, agentType: string, topGoal: string) {
  const heartbeats: Record<string, string> = {
    orchestrator: `# HEARTBEAT — ${name}

## 일일 루틴
- **07:00** 전일 케이스 요약 + 오늘 처리 필요 사항 정리 → 원장 브리핑
- **09:00** 대기 중인 승인 요청 확인 및 원장에게 알림
- **12:00** 오전 수업 출결 이상 여부 확인
- **17:00** 오후 수업 시작 전 강사 출근 확인
- **21:00** 당일 처리된 케이스 요약 기록

## 주간 루틴 (월요일)
- 이번 주 예정된 법정 신고 기한 확인
- 이번 주 이탈 위험 학생 현황 → retention 에이전트에 전달
- 강사 연차/부재 일정 확인 및 대체 계획 수립

## 월간 루틴 (매월 1일)
- 전월 케이스 통계 분석 (유형별, 에이전트별)
- 이탈 학생 수 vs 신규 입학 수 비교 보고
- 수강료 미납 현황 요약 → notification 에이전트 지시`,

    complaint: `# HEARTBEAT — ${name}

## 일일 루틴
- **08:30** 전날 접수된 미처리 민원 확인
- **09:30** 48시간 내 응답 필요한 케이스 점검
- **14:00** 당일 상담 예약 학부모 사전 자료 준비
- **18:00** 당일 처리된 상담 결과 기록 및 마무리

## 주간 루틴 (금요일)
- 이번 주 민원 유형 분석 (환불/강사/시설/커리큘럼)
- 반복 민원 패턴 → orchestrator에게 구조적 문제 보고
- 다음 주 상담 예약 일정 확인

## 긴급 대응
민원 접수 즉시:
1. 케이스 생성 + 접수 확인 메시지 발송
2. 관련 학생/강사 기록 조회
3. 48시간 내 응답 계획 수립`,

    scheduler: `# HEARTBEAT — ${name}

## 일일 루틴
- **07:30** 오늘 수업 일정 점검 + 결석 예고 확인
- **08:00** 강사 출근 확인 (문자/카카오 체크인)
- **16:00** 오전 수업 결석 학생 집계 → 학부모 알림 발송
- **18:30** 오후 수업 시작 전 출결 현황 확인
- **21:30** 당일 결석·지각 최종 기록

## 주간 루틴 (일요일)
- 다음 주 수업 일정 최종 확인
- 강사 연차/외부 일정 충돌 점검
- 차량 운행 일정 확인

## 월간 루틴 (말일)
- 전월 출결 통계 정리 (학생별 결석률)
- 보강 미완료 학생 목록 → 원장 보고
- 다음 달 법정 신고 기한 캘린더 업데이트`,

    retention: `# HEARTBEAT — ${name}

## 일일 루틴
- **10:00** scheduler로부터 전날 결석 데이터 수신
- **10:30** riskScore 임계값 초과 학생 리스트 업데이트
- **14:00** 당일 개입 필요 학생 접촉 (카카오 메시지)
- **19:00** 당일 학부모 응답 확인 및 케이스 업데이트

## 주간 루틴 (수요일)
- 이번 주 이탈 위험 학생 현황 리포트 작성
- 접촉 후 응답 없는 학생 → 원장 에스컬레이션 목록 작성
- 최근 재등록 성공 사례 분석 → 성공 패턴 기록

## 월간 루틴 (매월 25일)
- 다음 달 등록 예정 vs 이탈 예상 학생 수 예측
- 재등록 유도 캠페인 제안서 → orchestrator에게 전달
- 전월 이탈 방지 성공률 분석`,

    notification: `# HEARTBEAT — ${name}

## 일일 루틴
- **08:00** 오늘 발송 예정 알림 목록 확인
- **09:00** 전날 미납 학생 수강료 알림 상태 확인
- **15:00** 당일 결석 학생 학부모 알림 발송 (scheduler 연동)
- **20:00** 당일 발송 완료 내역 기록

## 주간 루틴 (월요일)
- 이번 주 발송 예정 주요 공지 확인
- 미확인 메시지 재발송 검토

## 월간 루틴 (매월 25일)
- 다음 달 수강료 납부 안내 발송 준비
- 전월 발송 성공률·응답률 분석`,
  }

  const defaultHeartbeat = `# HEARTBEAT — ${name}
- 매일 오전 07:00 기본 브리핑
- 대기 케이스와 승인 요청을 먼저 확인
- 48시간 이상 미처리 케이스는 원장에게 보고`

  const tools: Record<string, string> = {
    orchestrator: `# TOOLS — ${name}
- **케이스 관리**: 케이스 생성, 분류, 에이전트 배정, 상태 변경
- **승인 요청**: 원장 승인이 필요한 사안 승인 요청서 제출
- **에이전트 지시**: complaint / scheduler / retention / notification에게 작업 위임
- **메모리 조회/갱신**: 학원 운영 현황, 학생 인사이트 기록
- **문서 생성**: 정책 문서, 운영 보고서 작성`,
    complaint: `# TOOLS — ${name}
- **케이스 코멘트**: 상담 내용, 합의 사항, 후속 조치 기록
- **카카오 메시지**: 학부모에게 상담 결과·안내 메시지 발송
- **학생/학부모 조회**: 출결 이력, 결제 현황, 이전 민원 이력 조회
- **승인 요청**: 환불, 강사 교체, 특별 처리 원장 승인 요청
- **문서 생성**: 상담 결과 기록, 합의서 초안 작성`,
    scheduler: `# TOOLS — ${name}
- **출결 기록**: 결석, 지각, 조퇴 기록 및 조회
- **일정 생성/수정**: 보강, 대체 수업, 상담 일정 등록
- **강사 조회**: 강사 가용 시간, 담당 수업 조회
- **카카오 알림**: 학부모·강사에게 일정 변경 알림 발송
- **retention 신호 전달**: 결석 누적 학생 이탈 위험 신호 전달`,
    retention: `# TOOLS — ${name}
- **riskScore 조회/갱신**: 학생별 이탈 위험 점수 확인 및 업데이트
- **출결 이력 분석**: 결석 패턴, 지각 빈도, 추이 분석
- **카카오 메시지**: 학부모 맞춤 안부 및 유도 메시지 발송
- **승인 요청**: 할인 쿠폰, 수강료 조정 원장 승인 요청
- **케이스 생성**: 이탈 위험 학생별 개입 케이스 생성`,
    notification: `# TOOLS — ${name}
- **카카오 발송**: 개인 메시지, 채널 공지 발송
- **발송 내역 조회**: 수신 확인, 발송 실패 이력 조회
- **수강료 조회**: 미납 학생 목록, 납부 기한 조회
- **템플릿 관리**: 자주 쓰는 메시지 템플릿 저장·활용
- **케이스 코멘트**: 모든 발송 내역을 케이스에 기록`,
  }

  const defaultTools = `# TOOLS — ${name}
- mounted skills
- organization data
- case/activity/approval context`

  return {
    soul: `# ${name}\n\n${topGoal}를 달성하기 위해 학원 운영을 지원하는 ${agentType} 에이전트입니다.\n\n## 최우선 목표\n${topGoal}\n`,
    agents: `# AGENTS — ${name}\n\n- 역할: ${agentType}\n- 최우선 목표: ${topGoal}\n- 학생/학부모/강사 맥락을 함께 본다.\n- 불확실한 사안은 원장에게 에스컬레이션한다.\n`,
    heartbeat: heartbeats[agentType] ?? defaultHeartbeat,
    tools: tools[agentType] ?? defaultTools,
  }
}

function writeAgentInstructionFiles(agentId: string, name: string, agentType: string, topGoal: string) {
  const dir = path.join(AGENT_DATA_DIR, agentId, "instructions")
  mkdirSync(dir, { recursive: true })
  const files = buildInstructionFile(name, agentType, topGoal)
  writeFileSync(path.join(dir, "SOUL.md"), files.soul, "utf8")
  writeFileSync(path.join(dir, "AGENTS.md"), files.agents, "utf8")
  writeFileSync(path.join(dir, "HEARTBEAT.md"), files.heartbeat, "utf8")
  writeFileSync(path.join(dir, "TOOLS.md"), files.tools, "utf8")
}

async function deleteOrganizationCascade(db: Db, organizationId: string) {
  const orgAgents = await db
    .select({ id: schema.agents.id })
    .from(schema.agents)
    .where(eq(schema.agents.organizationId, organizationId))
  await db.delete(schema.activityEvents).where(eq(schema.activityEvents.organizationId, organizationId))
  await db.delete(schema.notifications).where(eq(schema.notifications.organizationId, organizationId))
  await db.delete(schema.approvals).where(eq(schema.approvals.organizationId, organizationId))
  await db.delete(schema.wakeupRequests).where(eq(schema.wakeupRequests.organizationId, organizationId))
  await db.delete(schema.agentRuns).where(eq(schema.agentRuns.organizationId, organizationId))
  const orgCases = await db.select({ id: schema.cases.id }).from(schema.cases).where(eq(schema.cases.organizationId, organizationId))
  for (const item of orgCases) {
    await db.delete(schema.caseComments).where(eq(schema.caseComments.caseId, item.id))
  }
  await db.delete(schema.cases).where(eq(schema.cases.organizationId, organizationId))
  await db.delete(schema.attendance).where(eq(schema.attendance.organizationId, organizationId))
  await db.delete(schema.studentSchedules).where(eq(schema.studentSchedules.organizationId, organizationId))
  await db.delete(schema.schedules).where(eq(schema.schedules.organizationId, organizationId))
  await db.delete(schema.parents).where(eq(schema.parents.organizationId, organizationId))
  await db.delete(schema.students).where(eq(schema.students.organizationId, organizationId))
  await db.delete(schema.instructors).where(eq(schema.instructors.organizationId, organizationId))
  await db.delete(schema.opsGoals).where(eq(schema.opsGoals.organizationId, organizationId))
  await db.delete(schema.opsGroups).where(eq(schema.opsGroups.organizationId, organizationId))
  await db.delete(schema.routines).where(eq(schema.routines.organizationId, organizationId))
  await db.delete(schema.documents).where(eq(schema.documents.organizationId, organizationId))
  for (const agent of orgAgents) {
    await db.delete(schema.agentSkills).where(eq(schema.agentSkills.agentId, agent.id))
  }
  await db.delete(schema.agents).where(eq(schema.agents.organizationId, organizationId))
  await db.delete(schema.organizationSkills).where(eq(schema.organizationSkills.organizationId, organizationId))
  await db.delete(schema.organizations).where(eq(schema.organizations.id, organizationId))
}

export async function bootstrapOrganization(db: Db, payload: unknown) {
  const input = bootstrapSchema.parse(payload)
  const basePrefix = slugify(input.institutionName)

  const [existing] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.prefix, basePrefix))

  const prefix = existing ? `${basePrefix}-${Date.now().toString(36).slice(-4)}` : basePrefix

  let organizationId: string | null = null

  try {
    const [organization] = await db
      .insert(schema.organizations)
      .values({
        name: input.institutionName,
        prefix,
        description: input.description ?? `${input.institutionType} · ${input.institutionSize} · ${input.topGoal}`,
        agentTeamConfig: {
          bootstrap: {
            status: "pending",
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            starterTeamPreset: input.starterTeamPreset,
            selectedAdapterType: input.selectedAdapterType,
            selectedModel: input.selectedModel,
            setupProjectName: input.setupProjectName,
          },
          general: {
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            principalName: input.principalName,
            description: input.description ?? null,
          },
          aiPolicy: {
            primaryAdapterType: input.selectedAdapterType,
            primaryModel: input.selectedModel,
            fallbackAdapterType: "claude_local",
            autoRun: true,
            allowDegradedMode: true,
            // BYO API 키 (판사/사용자가 온보딩 시 자기 키 입력) — env var 보다 우선
            ...(input.byoApiKey && input.byoApiKey.trim().length > 0
              ? { apiKey: input.byoApiKey.trim() }
              : {}),
          },
          integrations: resolveChannelConfig(input),
          instance: {
            mode: "local_trusted",
          },
          dataImports: input.dataImports,
          hiringPlan: {
            selectedAgents: input.selectedAgents,
          },
          presetMode: input.mode,
        } as Record<string, unknown>,
      })
      .returning()

    organizationId = organization.id

    const [starterProject] = await db
      .insert(schema.opsGroups)
      .values({
        organizationId: organization.id,
        name: input.starterProjectName,
        description: `${input.topGoal}를 중심으로 starter workflow를 묶는 기본 프로젝트`,
        color: "#14b8a6",
      })
      .returning()

    const [setupProject] = await db
      .insert(schema.opsGroups)
      .values({
        organizationId: organization.id,
        name: input.setupProjectName,
        description: `${input.institutionName}의 채널, 데이터, 정책, 에이전트 구성 세팅 프로젝트`,
        color: "#0f766e",
      })
      .returning()

    await db.insert(schema.opsGoals).values({
      organizationId: organization.id,
      opsGroupId: starterProject.id,
      title: input.topGoal,
      description: `${input.institutionType} 기관의 핵심 목표`,
      status: "active",
    })

    const instructorSeeds = input.mode === "demo"
      ? TANZANIA_PRESET.instructors
      : [{ name: "기본 강사", subject: `${input.institutionType} 운영`, phone: "010-1234-1000" }]

    const createdInstructors = []
    for (const item of instructorSeeds) {
      const [createdInstructor] = await db
        .insert(schema.instructors)
        .values({
          organizationId: organization.id,
          name: item.name,
          subject: item.subject,
          role: inferInstructorRoleFromSubject(item.subject),
          status: "active",
          phone: item.phone,
        })
        .returning()
      createdInstructors.push(createdInstructor)
    }
    const instructor = createdInstructors[0]

    const studentSeeds = input.mode === "demo"
      ? TANZANIA_PRESET.students
      : [
          {
            name: "김하늘",
            grade: "중2",
            classGroup: "기본반",
            riskScore: 0.68,
            parent: {
              name: "김하늘 보호자",
              relation: "모",
              phone: "010-1234-5678",
              email: "guardian@example.com",
            },
          },
        ]

    const createdStudents = []
    const createdParents = []
    for (const [index, item] of studentSeeds.entries()) {
      const [createdStudent] = await db
        .insert(schema.students)
        .values({
          organizationId: organization.id,
          name: item.name,
          grade: item.grade,
          classGroup: item.classGroup,
          enrolledAt: new Date().toISOString().split("T")[0],
          riskScore: item.riskScore,
          status: "active",
          metadata: {
            billing: {
              payerName: item.parent.name,
              paymentMethod: index % 2 === 0 ? "bank_transfer" : "card",
              bankName: index % 2 === 0 ? "국민은행" : "",
              accountHolder: index % 2 === 0 ? item.parent.name : "",
              accountNumber: index % 2 === 0 ? `11012345${String(6700 + index).padStart(4, "0")}` : "",
              cardLabel: index % 2 === 1 ? "학부모 등록카드" : "",
              cardLast4: index % 2 === 1 ? String(4800 + index) : "",
              memo: item.grade === "성인" ? "본인 결제" : "매월 자동 청구",
            },
          },
        })
        .returning()
      createdStudents.push(createdStudent)

      const [createdParent] = await db
        .insert(schema.parents)
        .values({
          organizationId: organization.id,
          studentId: createdStudent.id,
          name: item.parent.name,
          relation: item.parent.relation,
          phone: item.parent.phone,
          email: item.parent.email,
        })
        .returning()
      createdParents.push(createdParent)
    }
    const student = createdStudents[0]
    const parent = createdParents[0]

    const scheduleSeeds = input.mode === "demo"
      ? TANZANIA_PRESET.schedules
      : [{ title: "기본 수업 시간표", type: "regular", dayOfWeek: 2, startTime: "18:00", endTime: "19:30", room: "A101" }]

    const createdSchedules: Array<typeof schema.schedules.$inferSelect> = []
    for (const [index, item] of scheduleSeeds.entries()) {
      const [createdSchedule] = await db
        .insert(schema.schedules)
        .values({
          organizationId: organization.id,
          instructorId: createdInstructors[index % createdInstructors.length]?.id ?? instructor.id,
          title: item.title,
          type: item.type,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          room: item.room,
        })
        .returning()
      createdSchedules.push(createdSchedule)
    }
    const schedule = createdSchedules[0]

    const scheduleByTitle = new Map(createdSchedules.map((item) => [item.title, item]))
    const studentByName = new Map(createdStudents.map((item) => [item.name, item]))

    for (const createdStudent of createdStudents) {
      const presetStudent = input.mode === "demo"
        ? TANZANIA_PRESET.students.find((item) => item.name === createdStudent.name)
        : null
      const linkedSchedules = presetStudent?.scheduleTitles?.length
        ? presetStudent.scheduleTitles
            .map((title) => scheduleByTitle.get(title))
            .filter(Boolean)
        : [createdSchedules[Math.floor(Math.random() * createdSchedules.length)] ?? schedule]

      for (const linkedSchedule of linkedSchedules) {
        await db.insert(schema.studentSchedules).values({
          organizationId: organization.id,
          studentId: createdStudent.id,
          scheduleId: linkedSchedule!.id,
        })
      }
    }

    if (input.mode === "demo") {
      await db.insert(schema.attendance).values(
        TANZANIA_PRESET.attendanceRecords.flatMap((record) => {
          const targetStudent = studentByName.get(record.studentName)
          const targetSchedule = scheduleByTitle.get(record.scheduleTitle)
          if (!targetStudent || !targetSchedule) return []

          return [{
            organizationId: organization.id,
            studentId: targetStudent.id,
            scheduleId: targetSchedule.id,
            date: new Date(Date.now() - record.daysAgo * 86400000).toISOString().split("T")[0],
            status: record.status,
            note: "note" in record ? record.note ?? null : null,
          }]
        }),
      )
    } else {
      await db.insert(schema.attendance).values(
        createdStudents.slice(0, 3).flatMap((createdStudent, index) => [
          {
            organizationId: organization.id,
            studentId: createdStudent.id,
            scheduleId: createdSchedules[index % createdSchedules.length]?.id ?? schedule.id,
            date: new Date(Date.now() - (7 + index) * 86400000).toISOString().split("T")[0],
            status: "absent",
            note: "상담 필요",
          },
          {
            organizationId: organization.id,
            studentId: createdStudent.id,
            scheduleId: createdSchedules[index % createdSchedules.length]?.id ?? schedule.id,
            date: new Date(Date.now() - (14 + index) * 86400000).toISOString().split("T")[0],
            status: "late",
            note: "10분 지각",
          },
        ]),
      )
    }

    const starterAgents = buildSelectedAgentDefinitions(input, organization.name)

    const createdAgents = []
    let reportsTo: string | null = null

    for (const definition of starterAgents) {
      const [agent]: Array<typeof schema.agents.$inferSelect> = await db
        .insert(schema.agents)
        .values({
          organizationId: organization.id,
          name: definition.name,
          slug: definition.slug,
          agentType: definition.agentType,
          status: "idle",
          systemPrompt: definition.systemPrompt,
          icon: definition.icon,
          adapterType: definition.adapterType,
          adapterConfig: {
            model: definition.adapterModel,
            autoRun: definition.autoRun,
            allowedChannels: definition.allowedChannels,
            role: definition.role,
          } as Record<string, unknown>,
          reportsTo,
        })
        .returning()

      if (!reportsTo) reportsTo = agent.id
      createdAgents.push(agent)
      writeAgentInstructionFiles(agent.id, agent.name, agent.agentType, input.topGoal)

      await db.insert(schema.activityEvents).values({
        organizationId: organization.id,
        actorType: "system",
        actorId: "bootstrap",
        action: "agent.created",
        entityType: "agent",
        entityId: agent.id,
        entityTitle: agent.name,
        metadata: {
          agentType: agent.agentType,
          adapterType: agent.adapterType,
          role: definition.role,
        } as Record<string, unknown>,
      })
    }

    const createdCases = []
    const starterCases = buildSetupCases(
      input,
      setupProject.id,
      student.id,
      parent.id,
      createdAgents.map((agent) => ({ id: agent.id, slug: agent.slug })),
    )

    for (const [index, definition] of starterCases.entries()) {
      const caseRecord = await createCaseWithRetry(db, {
        organizationId: organization.id,
        opsGroupId: definition.opsGroupId,
        title: definition.title,
        description: definition.description,
        type: definition.type,
        severity: index === 5 ? "same_day" : "normal",
        status: "todo",
        priority: index === 5 ? 1 : 2,
        reporterId: definition.reporterId,
        studentId: definition.studentId,
        assigneeAgentId: definition.assigneeAgentId,
        source: definition.source,
        metadata: definition.metadata,
      })
      createdCases.push(caseRecord)
      await db.insert(schema.activityEvents).values({
        organizationId: organization.id,
        actorType: "system",
        actorId: "bootstrap",
        action: "case.created",
        entityType: "case",
        entityId: caseRecord.id,
        entityTitle: caseRecord.title,
        metadata: {
          caseType: caseRecord.type,
        } as Record<string, unknown>,
      })
    }

    const installedSkills = []
    for (const slug of Array.from(new Set(createdAgents.flatMap((agent) => {
      const definition = starterAgents.find((item) => item.slug === agent.slug)
      return definition?.mountedSkills ?? STARTER_SKILLS[agent.slug] ?? []
    })))) {
      const result = await installSkillForOrganization(db, organization.id, slug).catch(() => null)
      if (result) {
        installedSkills.push({ slug, ...result })
        await db.insert(schema.activityEvents).values({
          organizationId: organization.id,
          actorType: "system",
          actorId: "bootstrap",
          action: "skill.installed",
          entityType: "organization",
          entityId: organization.id,
          entityTitle: organization.name,
          metadata: { slug } as Record<string, unknown>,
        })
      }
    }

    const mountedSkills = []
    for (const agent of createdAgents) {
      const skillSlugs = starterAgents.find((item) => item.slug === agent.slug)?.mountedSkills ?? STARTER_SKILLS[agent.slug] ?? []
      const updated = await updateAgentSkillMounts(
        db,
        agent.id,
        skillSlugs.map((slug, index) => ({
          slug,
          enabled: true,
          mountOrder: index,
        })),
      ).catch(() => null)

      if (updated) {
        mountedSkills.push({
          agentId: agent.id,
          agentName: agent.name,
          slugs: skillSlugs,
        })
      }
    }

    void dispatchInstruction(db, {
      organizationId: organization.id,
      instruction: input.initialInstruction,
      preferredProjectId: starterProject.id,
    }).catch((error) => {
      console.error("[bootstrap] launch dispatch failed", error)
    })

    const [updatedOrganization] = await db
      .update(schema.organizations)
      .set({
        agentTeamConfig: {
          ...(organization.agentTeamConfig as Record<string, unknown>),
          bootstrap: {
            status: "completed",
            institutionType: input.institutionType,
            institutionSize: input.institutionSize,
            topGoal: input.topGoal,
            starterTeamPreset: input.starterTeamPreset,
            selectedAdapterType: input.selectedAdapterType,
            selectedModel: input.selectedModel,
            setupProjectName: input.setupProjectName,
          },
          setupProject: {
            id: setupProject.id,
            name: setupProject.name,
          },
        } as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, organization.id))
      .returning()

    await db.insert(schema.activityEvents).values({
      organizationId: organization.id,
      actorType: "system",
      actorId: "bootstrap",
      action: "organization.bootstrapped",
      entityType: "organization",
      entityId: organization.id,
      entityTitle: organization.name,
      metadata: {
        selectedAdapterType: input.selectedAdapterType,
        selectedModel: input.selectedModel,
        presetMode: input.mode,
      } as Record<string, unknown>,
    })

    const setupDocuments = []
    const isDemoMode = input.mode === "demo"
    const documentSeeds = [
      {
        title: "상담 정책",
        category: "policy",
        body: input.policyInputs.counselingPolicy
          ? `# 상담 정책\n\n${input.policyInputs.counselingPolicy}`
          : isDemoMode
          ? COUNSELING_POLICY_DEMO
          : `# 상담 정책\n\n상담 예약은 최소 하루 전 확인합니다.`,
      },
      {
        title: "환불 정책",
        category: "policy",
        body: input.policyInputs.refundPolicy
          ? `# 환불 정책\n\n${input.policyInputs.refundPolicy}`
          : isDemoMode
          ? REFUND_POLICY_DEMO
          : `# 환불 정책\n\n수강 시작 후 환불은 등록 약관에 따라 처리합니다.`,
      },
      {
        title: "출결 정책",
        category: "policy",
        body: input.policyInputs.attendancePolicy
          ? `# 출결 정책\n\n${input.policyInputs.attendancePolicy}`
          : isDemoMode
          ? ATTENDANCE_POLICY_DEMO
          : `# 출결 정책\n\n결석·지각은 주간 리포트와 상담 후속조치로 연결합니다.`,
      },
      ...(isDemoMode ? DEMO_EXTRA_DOCUMENTS : []),
    ]
    for (const documentSeed of documentSeeds) {
      const [document] = await db
        .insert(schema.documents)
        .values({
          organizationId: organization.id,
          title: documentSeed.title,
          body: documentSeed.body,
          category: documentSeed.category,
          tags: [`project:${setupProject.id}`, "artifact:setup-policy"],
        })
        .returning()
      setupDocuments.push(document)
    }

    // demo 모드: 풍부한 케이스 이력 + CEO 메모리 시드
    if (input.mode === "demo") {
      await seedRichDemoData(db, organization.id, createdAgents)
    }

    return {
      organization: updatedOrganization,
      agents: createdAgents,
      project: starterProject,
      setupProject,
      setupCases: createdCases.filter((item) => (item.metadata as Record<string, unknown> | null)?.caseKind === "setup-task"),
      cases: createdCases,
      installedSkills,
      mountedSkills,
      launch: {
        status: "queued",
        instruction: input.initialInstruction,
        preferredProjectId: starterProject.id,
      },
      connectedChannels: resolveChannelConfig(input).channels,
      preview: {
        student,
        parent,
        instructor,
        schedule,
        students: createdStudents,
        parents: createdParents,
        instructors: createdInstructors,
        schedules: createdSchedules,
        sampleInboundMessages: input.mode === "demo" ? TANZANIA_PRESET.sampleInboundMessages : null,
        sampleProjectInstruction: input.mode === "demo" ? TANZANIA_PRESET.sampleProjectInstruction : null,
        samplePolicyInstruction: input.mode === "demo" ? TANZANIA_PRESET.samplePolicyInstruction : null,
        sampleLegalQuestion: input.mode === "demo" ? TANZANIA_PRESET.sampleLegalQuestion : null,
      },
      documents: setupDocuments,
    }
  } catch (error) {
    if (organizationId) {
      await db
        .update(schema.organizations)
        .set({
          agentTeamConfig: {
            bootstrap: {
              status: "failed",
            },
          } as Record<string, unknown>,
        })
        .where(eq(schema.organizations.id, organizationId))
        .catch(() => undefined)
      await deleteOrganizationCascade(db, organizationId).catch(() => undefined)
    }
    throw error
  }
}

/**
 * 심사용 풍부한 데모 데이터 시드
 * bootstrapOrganization(mode==="demo") 에서 호출된다.
 */
async function seedRichDemoData(
  db: Db,
  organizationId: string,
  agents: Array<{ id: string; slug: string; agentType?: string }>,
) {
  const ceoAgent = agents.find((a) => a.slug === "ceo" || a.agentType === "ceo" || a.slug === "orchestrator")
  const complaintAgent = agents.find((a) => a.slug === "complaint" || a.slug === "counseling")
  const schedulerAgent = agents.find((a) => a.slug === "scheduler")

  for (const seed of RICH_CASES) {
    const daysAgo = seed.daysAgo ?? 0
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    const assigneeAgent =
      seed.type === "schedule" ? schedulerAgent :
      seed.type === "complaint" || seed.type === "refund" || seed.type === "churn" ? complaintAgent :
      ceoAgent

    try {
      const caseRecord = await createCaseWithRetry(db, {
        organizationId,
        title: seed.title,
        type: seed.type,
        status: seed.status,
        severity: seed.severity,
        source: seed.source as "manual" | "kakao" | "telegram" | "web",
        agentDraft: seed.agentDraft,
        assigneeAgentId: assigneeAgent?.id ?? null,
        metadata: { caseKind: seed.caseKind, seeded: true } as Record<string, unknown>,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + (seed.comments.length > 0 ? seed.comments[seed.comments.length - 1].offsetHours * 3600000 : 0)),
      })

      for (const comment of seed.comments) {
        const commentAt = new Date(createdAt.getTime() + comment.offsetHours * 3600000)
        await db.insert(schema.caseComments).values({
          caseId: caseRecord.id,
          authorType: comment.authorType,
          authorId: comment.authorType === "agent" ? (assigneeAgent?.id ?? "system") : "system",
          content: comment.content,
          createdAt: commentAt,
        }).catch(() => null) // caseComments 테이블 없으면 무시
      }
    } catch {
      // 개별 케이스 실패 시 전체 시드 중단하지 않음
    }
  }

  // CEO 에이전트 메모리 업데이트
  if (ceoAgent) {
    await db
      .update(schema.agents)
      .set({ memory: CEO_MEMORY as unknown as Record<string, unknown> })
      .where(eq(schema.agents.id, ceoAgent.id))
      .catch(() => null)
  }

  // 문서 12개 시딩
  for (const doc of DEMO_DOCUMENTS) {
    await db.insert(schema.documents).values({
      organizationId,
      title: doc.title,
      body: doc.body,
      category: doc.category,
      tags: doc.tags,
    }).catch(() => null)
  }
}
