// v1.0
import { useState } from "react"
import { NavLink, useParams } from "react-router-dom"
import {
  LayoutDashboard,
  Bell,
  FileText,
  Bot,
  Settings,
  Activity,
  Puzzle,
  Plus,
  Search,
  Sun,
  Moon,
  Network,
  BookOpen,
  Target,
  Wallet,
  CheckSquare,
  Calendar,
  FolderKanban,
  GraduationCap,
  UserCheck,
  Blocks,
  RefreshCw,
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useSidebar } from "@/context/SidebarContext"
import { useQuery } from "@tanstack/react-query"
import { casesApi } from "@/api/cases"
import { queryKeys } from "@/lib/queryKeys"
import { NewCaseDialog } from "@/components/NewCaseDialog"
import { cn } from "@/lib/utils"

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
  badge?: string
}

function NavItem({ to, icon, label, disabled, badge }: NavItemProps) {
  if (disabled) {
    return (
      <div
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg-muted)", color: "var(--text-tertiary)" }}
          >
            준비중
          </span>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          isActive
            ? "font-semibold"
            : "hover:bg-[var(--bg-subtle)]"
        )
      }
      style={({ isActive }) => ({
        color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
        backgroundColor: isActive ? "var(--accent-primary-soft)" : "transparent",
        boxShadow: isActive ? "inset 2px 0 0 var(--accent-primary)" : "none",
      })}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
    </NavLink>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="mb-1 mt-3 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {label}
    </div>
  )
}

function Divider() {
  return <div className="my-2 mx-3" style={{ height: 1, background: "var(--border-default)" }} />
}

export function Sidebar() {
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const base = `/${orgPrefix}`
  const { theme, toggleTheme } = useTheme()
  const { organizations, selectedOrgId } = useOrganization()
  const { isMobile, closeSidebar } = useSidebar()
  const [dialogOpen, setDialogOpen] = useState(false)

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId)
  const orgName = selectedOrg?.name ?? "기관명"

  const { data: cases = [] } = useQuery({
    queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    queryFn: () => casesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const handleNavClick = () => {
    if (isMobile) closeSidebar()
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 240,
        backgroundColor: "var(--bg-canvas)",
        borderRight: "1px solid var(--border-default)",
      }}
    >
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {orgName}
          </span>
          <button
            className="rounded-md p-1.5 transition-colors hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            aria-label="검색"
          >
            <Search size={16} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold shadow-xs transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:brightness-105 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          style={{
            background: "var(--accent-primary)",
            color: "var(--text-on-primary)",
          }}
        >
          <Plus size={15} />
          케이스 등록
        </button>
      </div>

      <Divider />

      {/* Main nav */}
      <nav className="flex-1 px-2" onClick={handleNavClick}>
        <SectionLabel label="업무" />
        <NavItem to={`${base}/dashboard`} icon={<LayoutDashboard size={16} />} label="대시보드" />
        <NavItem to={`${base}/inbox`} icon={<Bell size={16} />} label="알림함" />
        <NavItem to={`${base}/cases`} icon={<FileText size={16} />} label="케이스" />
        <NavItem to={`${base}/projects`} icon={<FolderKanban size={16} />} label="프로젝트" />
        <NavItem to={`${base}/approvals`} icon={<CheckSquare size={16} />} label="승인" />
        <NavItem to={`${base}/schedule`} icon={<Calendar size={16} />} label="일정" />

        <SectionLabel label="AI 팀" />
        <NavItem to={`${base}/agents`} icon={<Bot size={16} />} label="AI 팀" />
        <NavItem to={`${base}/org`} icon={<Network size={16} />} label="조직도" />
        <NavItem to={`${base}/routines`} icon={<RefreshCw size={16} />} label="자동화" />
        <NavItem to={`${base}/goals`} icon={<Target size={16} />} label="목표" />

        <SectionLabel label="학원" />
        <NavItem to={`${base}/students`} icon={<GraduationCap size={16} />} label="학생" />
        <NavItem to={`${base}/instructors`} icon={<UserCheck size={16} />} label="강사" />
        <NavItem to={`${base}/documents`} icon={<BookOpen size={16} />} label="문서" />

        <SectionLabel label="시스템" />
        <NavItem to={`${base}/skills`} icon={<Puzzle size={16} />} label="스킬" />
        <NavItem to={`${base}/plugins`} icon={<Blocks size={16} />} label="플러그인" />
        <NavItem to={`${base}/costs`} icon={<Wallet size={16} />} label="비용" />
        <NavItem to={`${base}/activity`} icon={<Activity size={16} />} label="활동 이력" />
        <NavItem to={`${base}/settings`} icon={<Settings size={16} />} label="설정" />
      </nav>

      <Divider />

      {/* Footer */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-[background-color,color,box-shadow] hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          style={{
            backgroundColor: "var(--bg-muted)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          {theme === "dark" ? (
            <Sun size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
          ) : (
            <Moon size={15} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
          )}
          <span className="text-xs">
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </span>
        </button>
        <span className="px-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          v0.5.0
        </span>
      </div>

      {/* New Case Dialog */}
      <NewCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        casesCount={(cases as any[]).length}
      />
    </div>
  )
}
