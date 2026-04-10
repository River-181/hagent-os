export interface GoogleCalendarSyncInput {
  title: string
  description?: string | null
  location?: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface GoogleCalendarSyncResult {
  provider: "google-calendar"
  status: "synced" | "pending_credentials" | "error"
  calendarId?: string
  eventId?: string
  eventLink?: string
  missingEnv?: string[]
  error?: string
}

function getCalendarEnv() {
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN || ""
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary"
  const missingEnv = accessToken ? [] : ["GOOGLE_CALENDAR_ACCESS_TOKEN"]
  return {
    accessToken,
    calendarId,
    connected: Boolean(accessToken),
    missingEnv,
  }
}

function nextDateFromDayOfWeek(dayOfWeek: number) {
  const now = new Date()
  const current = now.getDay()
  const normalized = dayOfWeek % 7
  const delta = (normalized - current + 7) % 7 || 7
  const target = new Date(now)
  target.setDate(now.getDate() + delta)
  return target
}

function buildDateTime(baseDate: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map((value) => Number(value))
  const next = new Date(baseDate)
  next.setHours(hours || 0, minutes || 0, 0, 0)
  return next
}

export async function syncGoogleCalendarEvent(
  input: GoogleCalendarSyncInput,
): Promise<GoogleCalendarSyncResult> {
  const env = getCalendarEnv()
  if (!env.connected) {
    return {
      provider: "google-calendar",
      status: "pending_credentials",
      calendarId: env.calendarId,
      missingEnv: env.missingEnv,
    }
  }

  const baseDate = nextDateFromDayOfWeek(input.dayOfWeek)
  const startDateTime = buildDateTime(baseDate, input.startTime)
  const endDateTime = buildDateTime(baseDate, input.endTime)

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.accessToken}`,
        },
        body: JSON.stringify({
          summary: input.title,
          description: input.description ?? "",
          location: input.location ?? "",
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Seoul",
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Seoul",
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        provider: "google-calendar",
        status: "error",
        calendarId: env.calendarId,
        error: errorText || `HTTP ${response.status}`,
      }
    }

    const json = (await response.json()) as { id?: string; htmlLink?: string }
    return {
      provider: "google-calendar",
      status: "synced",
      calendarId: env.calendarId,
      eventId: json.id,
      eventLink: json.htmlLink,
    }
  } catch (error) {
    return {
      provider: "google-calendar",
      status: "error",
      calendarId: env.calendarId,
      error: error instanceof Error ? error.message : "Failed to sync Google Calendar event",
    }
  }
}
