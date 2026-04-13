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
