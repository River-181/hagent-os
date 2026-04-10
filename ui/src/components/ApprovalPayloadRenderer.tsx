// v0.2.0
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
  type?: string
  payload?: any
}

export function ApprovalPayloadRenderer({ type, payload }: Props) {
  if (!payload) return null

  let data: any
  try {
    data = typeof payload === "string" ? JSON.parse(payload) : payload
  } catch {
    return (
      <pre
        className="rounded-lg p-3 text-xs overflow-auto"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-default)",
          color: "var(--text-secondary)",
          maxHeight: "200px",
        }}
      >
        {String(payload)}
      </pre>
    )
  }

  // Response draft (complaint/retention agent output)
  if (data.draft || data.response || data.message) {
    return (
      <div className="space-y-2">
        {data.classification && (
          <div className="flex items-center gap-2">
            <Badge
              className="text-xs border-0"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {data.classification}
            </Badge>
          </div>
        )}
        <div
          className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          {data.draft ?? data.response ?? data.message}
        </div>
        {data.reasoning && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            근거: {data.reasoning}
          </p>
        )}
      </div>
    )
  }

  if (data.suggestedReply || data.category || data.urgency) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {data.category && (
            <Badge
              className="text-xs border-0"
              style={{ backgroundColor: "rgba(20,184,166,0.08)", color: "var(--color-teal-500)" }}
            >
              {data.category}
            </Badge>
          )}
          {data.urgency && (
            <Badge
              className="text-xs border-0"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {data.urgency}
            </Badge>
          )}
        </div>
        {data.summary && (
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {data.summary}
          </p>
        )}
        {data.suggestedReply && (
          <div
            className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            {data.suggestedReply}
          </div>
        )}
        {data.legalBasis?.summary && (
          <div
            className="rounded-lg p-3 text-xs whitespace-pre-wrap"
            style={{
              backgroundColor: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.18)",
              color: "var(--text-secondary)",
            }}
          >
            <div className="font-medium mb-1">법령 참고</div>
            <div>{data.legalBasis.summary}</div>
          </div>
        )}
      </div>
    )
  }

  // Risk assessment
  if (data.riskScore != null || data.risk_score != null) {
    const score = data.riskScore ?? data.risk_score
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: "var(--color-danger)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            이탈 위험도: {Math.round(score * 100)}%
          </span>
        </div>
        {data.signals && (
          <ul className="text-xs space-y-1 ml-5" style={{ color: "var(--text-secondary)" }}>
            {(data.signals as string[]).map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        )}
        {data.recommendation && (
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            권장 조치: {data.recommendation}
          </p>
        )}
      </div>
    )
  }

  if (data.suggestedSchedule || data.calendarAction || data.summary) {
    const schedule = data.suggestedSchedule
    const calendarAction = data.calendarAction
    return (
      <div className="space-y-3">
        {data.summary && (
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {data.summary}
          </p>
        )}
        {schedule && (
          <div
            className="rounded-lg p-3 text-sm space-y-1"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <div className="font-medium">{schedule.title ?? "일정 초안"}</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              요일 {schedule.dayOfWeek} · {schedule.startTime} - {schedule.endTime}
              {schedule.room ? ` · ${schedule.room}` : ""}
            </div>
          </div>
        )}
        {calendarAction && (
          <div className="flex items-center gap-2">
            <Badge
              className="text-xs border-0"
              style={{
                backgroundColor:
                  calendarAction.status === "synced"
                    ? "rgba(34,197,94,0.10)"
                    : calendarAction.status === "pending_sync"
                    ? "rgba(245,158,11,0.10)"
                    : "rgba(107,114,128,0.10)",
                color:
                  calendarAction.status === "synced"
                    ? "var(--color-success)"
                    : calendarAction.status === "pending_sync"
                    ? "#d97706"
                    : "var(--text-secondary)",
              }}
            >
              {calendarAction.provider} · {calendarAction.status}
            </Badge>
          </div>
        )}
      </div>
    )
  }

  // Fallback: show as formatted JSON
  return (
    <pre
      className="rounded-lg p-3 text-xs overflow-auto"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-default)",
        color: "var(--text-secondary)",
        maxHeight: "200px",
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
