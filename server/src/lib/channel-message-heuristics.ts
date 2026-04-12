const LOW_SIGNAL_MESSAGES = new Set([
  "안녕",
  "안녕하세요",
  "안녕하세요.",
  "ㅎㅇ",
  "ㅎㅇㅎ",
  "하이",
  "hello",
  "test",
])

const ACADEMY_TOPIC_HINTS = [
  "수강",
  "상담",
  "등록",
  "입학",
  "체험",
  "레벨테스트",
  "보강",
  "수업",
  "시간표",
  "일정",
  "결석",
  "출석",
  "지각",
  "환불",
  "수강료",
  "결제",
  "납부",
  "학원",
  "학생",
  "부모",
  "학부모",
  "teacher",
  "class",
  "schedule",
  "tuition",
]

const AMBIGUOUS_PATTERNS = [
  /그냥.*그래/,
  /뭔가.*이상/,
  /잘\s*모르겠/,
  /좀\s*이상/,
  /그렇네요/,
  /애매/,
  /모호/,
  /이상해요/,
]

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export function summarizeInboundMessage(message: string, maxLength = 120) {
  const compact = normalizeWhitespace(message)
  if (!compact) return ""
  return compact.length > maxLength ? `${compact.slice(0, Math.max(0, maxLength - 3))}...` : compact
}

export function isLowSignalInboundMessage(message: string) {
  const normalized = normalizeWhitespace(message).toLowerCase()
  if (!normalized) return true
  if (normalized.startsWith("/")) return true
  return LOW_SIGNAL_MESSAGES.has(normalized)
}

function hasEnoughTextSignal(message: string) {
  const normalized = normalizeWhitespace(message)
  if (normalized.length >= 8) return true
  const hangulOrAsciiWords = normalized.match(/[가-힣a-zA-Z0-9]/g) ?? []
  return hangulOrAsciiWords.length >= 4
}

function isMostlyNoise(message: string) {
  const normalized = normalizeWhitespace(message)
  if (!normalized) return true
  if (/^[!?.,~ㅋㅎㅠㅜㄷㅇ\s]+$/.test(normalized)) return true
  if (/^(.)\1{4,}$/.test(normalized)) return true
  return false
}

export function isAcademyRelevantMessage(message: string) {
  const normalized = normalizeWhitespace(message).toLowerCase()
  if (!normalized) return false
  return ACADEMY_TOPIC_HINTS.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

export function classifyInboundMessage(message: string) {
  const normalized = normalizeWhitespace(message).toLowerCase()
  if (isLowSignalInboundMessage(message)) {
    return { kind: "ignore" as const, reason: "low_signal" }
  }
  if (isMostlyNoise(message)) {
    return { kind: "ignore" as const, reason: "noise" }
  }
  if (!isAcademyRelevantMessage(message) && AMBIGUOUS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { kind: "guarded" as const, reason: "ambiguous" }
  }
  if (!hasEnoughTextSignal(message) && !isAcademyRelevantMessage(message)) {
    return { kind: "guarded" as const, reason: "underspecified" }
  }
  if (!isAcademyRelevantMessage(message) && message.length > 20) {
    return { kind: "guarded" as const, reason: "off_topic_or_ambiguous" }
  }
  return { kind: "normal" as const, reason: "relevant" }
}

export function buildChannelCaseTitle(
  channelKey: string,
  senderName: string | undefined,
  senderId: string | undefined,
  message: string,
) {
  const prefix = channelKey === "kakao"
    ? "KAKAO"
    : channelKey === "telegram"
      ? "TELEGRAM"
      : channelKey.toUpperCase()
  return `[${prefix}] ${senderName ?? senderId ?? "익명"} · ${summarizeInboundMessage(message, 40)}`
}

function getTitleSnippet(title: string) {
  const dividerIndex = title.indexOf("·")
  if (dividerIndex === -1) return title
  return title.slice(dividerIndex + 1).trim()
}

export function shouldRefreshCaseHeadline(input: {
  title?: string | null
  description?: string | null
  lastMessagePreview?: string | null
  nextMessage: string
}) {
  const nextClass = classifyInboundMessage(input.nextMessage)
  if (nextClass.kind === "ignore") return false

  const currentDescription = typeof input.description === "string" ? input.description : ""
  const currentPreview = typeof input.lastMessagePreview === "string" ? input.lastMessagePreview : ""
  const currentTitleSnippet = typeof input.title === "string" ? getTitleSnippet(input.title) : ""
  const representative = currentDescription || currentPreview || currentTitleSnippet
  const representativeClass = classifyInboundMessage(representative)
  return representativeClass.kind !== "normal" && nextClass.kind === "normal"
}
