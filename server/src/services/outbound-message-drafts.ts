import * as schema from "@hagent/db"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim()
}

function dedupeParagraphs(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

  const deduped: string[] = []
  for (const paragraph of paragraphs) {
    if (deduped[deduped.length - 1] === paragraph) continue
    deduped.push(paragraph)
  }
  return deduped.join("\n\n")
}

function formatWeekday(dayOfWeek: unknown) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
  const numeric = Number(dayOfWeek)
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 6) return null
  return weekdays[numeric] ?? null
}

function buildScheduleReply(payload: Record<string, unknown>) {
  const schedule = isPlainObject(payload.suggestedSchedule) ? payload.suggestedSchedule : null
  if (!schedule) return null

  const title = String(schedule.title ?? "").trim()
  const scheduleType = String(schedule.type ?? "").trim()
  const weekday = formatWeekday(schedule.dayOfWeek)
  const startTime = String(schedule.startTime ?? "").trim()
  const endTime = String(schedule.endTime ?? "").trim()
  const room = String(schedule.room ?? "").trim()
  const noun = scheduleType === "counseling" ? "상담 일정" : "보강 일정"
  const timeLabel = [weekday ? `${weekday}요일` : null, startTime && endTime ? `${startTime}-${endTime}` : null]
    .filter(Boolean)
    .join(" ")

  return [
    `문의 주신 ${noun} 확인했습니다.`,
    timeLabel
      ? `${timeLabel}${room ? ` ${room}에서` : ""} 진행 가능한 안으로 보고 있습니다.`
      : `${room ? `${room}에서 ` : ""}진행 가능한 안을 확인했습니다.`,
    `가능하시면 바로 확정하고, 다른 시간이 더 편하시면 말씀해 주세요.${title ? ` ${title} 기준으로 이어서 조정하겠습니다.` : ""}`,
  ].join(" ")
}

function buildFallbackReply(channelLabel: string) {
  if (channelLabel === "telegram") {
    return "문의 주신 내용 확인했습니다. 내부 확인 후 가능한 안내를 정리해 다시 말씀드리겠습니다."
  }
  return "문의 주신 내용 확인했습니다. 내부 확인 후 가능한 안내를 정리해 드리겠습니다."
}

export function buildOutboundReplyDraft(
  channelLabel: "telegram" | "kakao",
  approval: typeof schema.approvals.$inferSelect,
) {
  const payload = isPlainObject(approval.payload) ? approval.payload : {}
  const decision = isPlainObject(approval.decision) ? approval.decision : {}
  const sideEffects = isPlainObject(decision.sideEffects) ? decision.sideEffects : {}
  const channelKey = channelLabel === "telegram" ? "telegramMessage" : "kakaoMessage"
  const channelMessage = isPlainObject(sideEffects[channelKey]) ? sideEffects[channelKey] : {}

  const resolved =
    (typeof payload.suggestedReply === "string" && payload.suggestedReply) ||
    (typeof payload.draft === "string" && payload.draft) ||
    buildScheduleReply(payload) ||
    (typeof payload.summary === "string" && payload.summary) ||
    (typeof channelMessage.draft === "string" && channelMessage.draft) ||
    buildFallbackReply(channelLabel)

  return dedupeParagraphs(normalizeWhitespace(String(resolved)))
}

export function getExistingOutboundDelivery(
  channelLabel: "telegram" | "kakao",
  approval: typeof schema.approvals.$inferSelect,
) {
  const decision = isPlainObject(approval.decision) ? approval.decision : {}
  const sideEffects = isPlainObject(decision.sideEffects) ? decision.sideEffects : {}
  const channelKey = channelLabel === "telegram" ? "telegramMessage" : "kakaoMessage"
  return isPlainObject(sideEffects[channelKey]) ? sideEffects[channelKey] : null
}
