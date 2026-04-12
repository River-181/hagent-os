import { usePanel } from "@/context/PanelContext"
import { X } from "lucide-react"

export function PropertiesPanel() {
  const { panelContent, panelVisible, closePanel } = usePanel()

  if (!panelVisible) return null

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 320,
        backgroundColor: "var(--bg-base)",
        borderLeft: "1px solid var(--border-default)",
        flexShrink: 0,
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Properties
        </span>
        <button
          type="button"
          onClick={closePanel}
          className="rounded-md p-1 transition-colors hover:bg-[var(--bg-secondary)]"
          aria-label="Close properties panel"
          style={{ color: "var(--text-tertiary)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 p-4">
        {panelContent ?? (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              아직 선택된 항목이 없습니다.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              케이스, 프로젝트, 학생, 일정, AI 팀을 선택하면 연결 속성과 바로 수정할 항목이 여기에 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
