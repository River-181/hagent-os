import { X } from "lucide-react"
import { usePanel } from "@/context/PanelContext"

export function PropertiesPanel() {
  const { panelContent, panelVisible, togglePanel } = usePanel()

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
          속성
        </span>
        <button
          onClick={togglePanel}
          className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
          aria-label="패널 닫기"
        >
          <X size={16} style={{ color: "var(--text-tertiary)" }} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 p-4">
        {panelContent ?? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            항목을 선택하면 여기에 속성이 표시됩니다.
          </p>
        )}
      </div>
    </div>
  )
}
