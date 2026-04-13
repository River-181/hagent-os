import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useSidebar } from "@/context/SidebarContext"
import { Menu } from "lucide-react"

export function BreadcrumbBar() {
  const { breadcrumbs } = useBreadcrumbs()
  const { toggleSidebar, isMobile } = useSidebar()

  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{
        height: 52,
        borderBottom: "1px solid var(--border-default)",
        backgroundColor: "var(--bg-base)",
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

      {/* Cmd+K hint */}
      <kbd
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs shrink-0"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-tertiary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <span style={{ fontSize: 11 }}>&#8984;</span>K
      </kbd>
    </div>
  )
}
