import { Link } from "react-router-dom"
import { ChevronRight, PanelRightOpen, PanelRightClose, Sparkles, Menu } from "lucide-react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useSidebar } from "@/context/SidebarContext"
import { usePanel } from "@/context/PanelContext"
import { useAssistant } from "@/context/AssistantContext"

export function BreadcrumbBar() {
  const { breadcrumbs } = useBreadcrumbs()
  const { toggleSidebar, isMobile } = useSidebar()
  const { panelContent, panelVisible, togglePanel } = usePanel()
  const { openAssistant } = useAssistant()

  // Properties 토글은 페이지가 panelContent를 등록한 경우에만 노출
  const showPropertiesToggle = !isMobile && panelContent !== null

  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{
        height: 52,
        borderBottom: "1px solid var(--border-default)",
        backgroundColor: "var(--bg-page)",
      }}
    >
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="mr-1 p-1 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
          aria-label="사이드바 열기"
        >
          <Menu size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
      )}

      <nav className="flex items-center gap-1 text-sm flex-1">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  size={14}
                  style={{ color: "var(--text-tertiary)" }}
                />
              )}
              {crumb.href && !isLast ? (
                <Link
                  to={crumb.href}
                  className="hover:underline"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    color: isLast ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isLast ? 600 : 400,
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      {/* Assistant 트리거 (구 FAB 대체) */}
      <button
        type="button"
        onClick={openAssistant}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-muted)]"
        style={{
          color: "var(--text-tertiary)",
          border: "1px solid var(--border-default)",
        }}
        aria-label="Assistant 열기"
      >
        <Sparkles size={13} />
        Assistant
      </button>

      {/* Cmd+K hint */}
      <kbd
        className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs sm:inline-flex"
        style={{
          backgroundColor: "var(--bg-muted)",
          color: "var(--text-tertiary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <span style={{ fontSize: 11 }}>&#8984;</span>K
      </kbd>

      {showPropertiesToggle && (
        <button
          type="button"
          onClick={togglePanel}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-[var(--bg-muted)]"
          style={{
            color: "var(--text-tertiary)",
            border: "1px solid var(--border-default)",
          }}
          aria-label={panelVisible ? "속성 패널 닫기" : "속성 패널 열기"}
        >
          {panelVisible ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          속성
        </button>
      )}
    </div>
  )
}
