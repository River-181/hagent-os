const STAFF_KEYWORDS = [
  "상담",
  "입학상담",
  "학생관리",
  "운영",
  "행정",
  "원무",
  "마케팅",
  "차량",
]

const TEACHING_KEYWORDS = [
  "영어",
  "수학",
  "국어",
  "과학",
  "사회",
  "초등부",
  "중등부",
  "고등부",
  "성인부",
  "파닉스",
  "회화",
  "문법",
  "독해",
  "토익",
]

export type InstructorRole = "teacher" | "staff" | "hybrid"

export function isInstructorRole(value: unknown): value is InstructorRole {
  return value === "teacher" || value === "staff" || value === "hybrid"
}

export function inferInstructorRoleFromSubject(subject: string | null | undefined): InstructorRole {
  const normalized = String(subject ?? "").trim()
  if (STAFF_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "staff"
  if (TEACHING_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "teacher"
  return "hybrid"
}

export function normalizeInstructorRole(
  value: unknown,
  subject: string | null | undefined,
): InstructorRole {
  return isInstructorRole(value) ? value : inferInstructorRoleFromSubject(subject)
}
