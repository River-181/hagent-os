export interface BundleRoleTemplate {
  agentType: string
  label: string
  createName: string
  required?: boolean
  skills: string[]
}

export interface CapabilityBundleDefinition {
  id: string
  title: string
  summary: string
  primarySlug: string
  primaryKind: "skill" | "pack" | "system"
  includedSlugs: string[]
  examples: string[]
  settingsHint: string
  teamTemplate: {
    label: string
    roles: BundleRoleTemplate[]
  }
}

export const CAPABILITY_BUNDLES: CapabilityBundleDefinition[] = [
  {
    id: "complaint",
    title: "민원 응대",
    summary: "민원 분류, 답변 톤, 승인, 발송까지 한 흐름으로 처리합니다.",
    primarySlug: "kakao-complaint-pack",
    primaryKind: "pack",
    includedSlugs: [
      "kakao-complaint-pack",
      "complaint-classifier",
      "korean-tone-guide",
      "message-template-pack",
      "approval-flow-designer",
      "payment-reminder",
    ],
    examples: ["카카오 문의 응답", "학부모 불만 처리", "승인 후 회신 발송"],
    settingsHint: "카카오/문자 연결이 필요할 수 있습니다.",
    teamTemplate: {
      label: "민원 응대 팀",
      roles: [
        {
          agentType: "complaint",
          label: "민원담당",
          createName: "민원담당",
          required: true,
          skills: ["kakao-complaint-pack", "complaint-classifier", "korean-tone-guide", "message-template-pack"],
        },
        {
          agentType: "notification",
          label: "알림담당",
          createName: "알림담당",
          required: true,
          skills: ["kakao-complaint-pack", "message-template-pack", "payment-reminder"],
        },
        {
          agentType: "orchestrator",
          label: "총괄",
          createName: "원장 오케스트레이터",
          required: true,
          skills: ["kakao-complaint-pack", "approval-flow-designer"],
        },
      ],
    },
  },
  {
    id: "refund",
    title: "환불/법령 검토",
    summary: "환불 계산과 교육 법령 근거를 함께 검토합니다.",
    primarySlug: "compliance-refund-pack",
    primaryKind: "pack",
    includedSlugs: ["compliance-refund-pack", "k-education-law-lookup", "refund-calculator", "compliance-setup-pack"],
    examples: ["환불 가능 금액 계산", "법령 근거 포함 답변", "규정 검토 메모"],
    settingsHint: "법령 조회 연결과 문서 출력 환경이 준비되어야 합니다.",
    teamTemplate: {
      label: "컴플라이언스 팀",
      roles: [
        {
          agentType: "compliance",
          label: "컴플라이언스",
          createName: "컴플라이언스 담당",
          required: true,
          skills: ["compliance-refund-pack", "k-education-law-lookup"],
        },
        {
          agentType: "finance",
          label: "재무",
          createName: "재무담당",
          required: true,
          skills: ["compliance-refund-pack", "refund-calculator"],
        },
        {
          agentType: "orchestrator",
          label: "총괄",
          createName: "원장 오케스트레이터",
          required: true,
          skills: ["compliance-refund-pack", "compliance-setup-pack"],
        },
      ],
    },
  },
  {
    id: "schedule",
    title: "보강/일정 조정",
    summary: "보강, 상담, 대체 수업 일정을 팀 단위로 조정합니다.",
    primarySlug: "schedule-operations-pack",
    primaryKind: "pack",
    includedSlugs: ["schedule-operations-pack", "schedule-manager", "schedule-optimizer", "google-calendar-mcp"],
    examples: ["보강 일정 이동", "상담 시간 조정", "캘린더 동기화"],
    settingsHint: "Google Calendar 연결이 준비되면 일정 조정 품질이 높아집니다.",
    teamTemplate: {
      label: "일정 운영 팀",
      roles: [
        {
          agentType: "scheduler",
          label: "스케줄러",
          createName: "스케줄러",
          required: true,
          skills: ["schedule-operations-pack", "schedule-manager", "schedule-optimizer"],
        },
        {
          agentType: "notification",
          label: "알림담당",
          createName: "알림담당",
          required: true,
          skills: ["schedule-operations-pack", "message-template-pack"],
        },
        {
          agentType: "orchestrator",
          label: "총괄",
          createName: "원장 오케스트레이터",
          required: true,
          skills: ["schedule-operations-pack", "google-calendar-mcp"],
        },
      ],
    },
  },
  {
    id: "documents",
    title: "문서 자동화",
    summary: "HWPX/문서 산출물을 자동으로 작성하고 첨부 흐름까지 연결합니다.",
    primarySlug: "hwpx-document-pack",
    primaryKind: "pack",
    includedSlugs: ["hwpx-document-pack", "hwpx-document-processor", "document-setup-pack"],
    examples: ["운영 보고서 초안", "법령 검토 문서", "학부모 안내문"],
    settingsHint: "HWPX 처리 도구와 문서 경로 설정이 필요합니다.",
    teamTemplate: {
      label: "문서 자동화 팀",
      roles: [
        {
          agentType: "staff",
          label: "문서담당",
          createName: "문서담당",
          required: true,
          skills: ["hwpx-document-pack", "hwpx-document-processor"],
        },
        {
          agentType: "compliance",
          label: "검토담당",
          createName: "문서 검토담당",
          required: false,
          skills: ["hwpx-document-pack"],
        },
        {
          agentType: "orchestrator",
          label: "총괄",
          createName: "원장 오케스트레이터",
          required: true,
          skills: ["hwpx-document-pack", "document-setup-pack"],
        },
      ],
    },
  },
  {
    id: "retention",
    title: "학생 상담/재등록",
    summary: "학생 상태 파악, 상담 기록, 재등록 유도 흐름을 정리합니다.",
    primarySlug: "re-enrollment-playbook",
    primaryKind: "skill",
    includedSlugs: ["re-enrollment-playbook", "attendance-followup", "student-360-view", "trial-lesson-coordinator"],
    examples: ["이탈 징후 학생 추적", "재등록 제안 초안", "상담 후속 액션"],
    settingsHint: "메시지/상담 채널 연결이 있으면 후속 응대가 쉬워집니다.",
    teamTemplate: {
      label: "상담/재등록 팀",
      roles: [
        {
          agentType: "retention",
          label: "재등록담당",
          createName: "재등록담당",
          required: true,
          skills: ["re-enrollment-playbook", "attendance-followup", "student-360-view"],
        },
        {
          agentType: "intake",
          label: "상담담당",
          createName: "상담담당",
          required: true,
          skills: ["trial-lesson-coordinator", "student-360-view"],
        },
        {
          agentType: "orchestrator",
          label: "총괄",
          createName: "원장 오케스트레이터",
          required: false,
          skills: ["re-enrollment-playbook"],
        },
      ],
    },
  },
  {
    id: "setup",
    title: "기관 세팅 시작",
    summary: "학원 운영에 필요한 기본 팀, 연결, 문서, 법령 환경을 한 번에 점검합니다.",
    primarySlug: "academy-bootstrap-pack",
    primaryKind: "system",
    includedSlugs: ["academy-bootstrap-pack", "channel-setup-pack", "compliance-setup-pack", "document-setup-pack", "agent-runtime-checker", "k-skill-registry"],
    examples: ["초기 운영팀 준비", "채널 연결 점검", "문서/법령 도구 준비"],
    settingsHint: "프로그램 설정의 연결 센터와 함께 사용하는 온보딩 묶음입니다.",
    teamTemplate: {
      label: "기관 세팅 팀",
      roles: [
        {
          agentType: "orchestrator",
          label: "총괄",
          createName: "원장 오케스트레이터",
          required: true,
          skills: ["academy-bootstrap-pack", "agent-runtime-checker", "k-skill-registry"],
        },
        {
          agentType: "staff",
          label: "운영담당",
          createName: "운영담당",
          required: true,
          skills: ["channel-setup-pack", "document-setup-pack"],
        },
        {
          agentType: "compliance",
          label: "컴플라이언스",
          createName: "컴플라이언스 담당",
          required: false,
          skills: ["compliance-setup-pack"],
        },
      ],
    },
  },
]

export function findBundleByCapability(slug?: string | null) {
  return CAPABILITY_BUNDLES.find((bundle) => bundle.includedSlugs.includes(String(slug ?? ""))) ?? null
}
