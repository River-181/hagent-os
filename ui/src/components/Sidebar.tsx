// v0.3.0
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
  Clock,
  Target,
  Wallet,
  CheckSquare,
  Calendar,
  FolderKanban,
  GraduationCap,
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
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-not-allowed"
        style={{ color: "var(--text-disabled)" }}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
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
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
          isActive
            ? "text-teal-500 font-semibold"
            : "hover:bg-[var(--bg-tertiary)]"
        )
      }
      style={({ isActive }) => ({
        color: isActive ? "var(--color-teal-500)" : "var(--text-secondary)",
        backgroundColor: isActive ? "var(--color-primary-bg)" : undefined,
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
      className="px-3 py-1 text-xs font-semibold tracking-wider mt-2 mb-1"
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
        backgroundColor: "var(--bg-base)",
        borderRight: "1px solid var(--border-default)",
      }}
    >
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {orgName}
          </span>
          <button
            className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="검색"
          >
            <Search size={16} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110 hover:shadow-md active:scale-[0.98]"
          style={{
            background: "var(--color-teal-500)",
            color: "#fff",
          }}
        >
          <Plus size={15} />
          케이스 등록
        </button>
      </div>

      <Divider />

      {/* Main nav */}
      <nav className="flex-1 px-2" onClick={handleNavClick}>
        <SectionLabel label="오늘 운영" />
        <NavItem to={`${base}/dashboard`} icon={<LayoutDashboard size={16} />} label="대시보드" />
        <NavItem to={`${base}/inbox`} icon={<Bell size={16} />} label="알림함" />
        <NavItem to={`${base}/cases`} icon={<FileText size={16} />} label="케이스" />
        <NavItem to={`${base}/approvals`} icon={<CheckSquare size={16} />} label="승인" />

        <SectionLabel label="학원 운영" />
        <NavItem to={`${base}/students`} icon={<GraduationCap size={16} />} label="학생 관리" />
        <NavItem to={`${base}/instructors`} icon={<GraduationCap size={16} />} label="직원/강사 관리" />
        <NavItem to={`${base}/schedule`} icon={<Calendar size={16} />} label="일정" />
        <NavItem to={`${base}/documents`} icon={<BookOpen size={16} />} label="문서" />

        <SectionLabel label="AI 운영" />
        <NavItem to={`${base}/agents`} icon={<Bot size={16} />} label="AI 팀" />
        <NavItem to={`${base}/org`} icon={<Network size={16} />} label="조직도" />
        <NavItem to={`${base}/routines`} icon={<Clock size={16} />} label="자동 실행" />
        <NavItem to={`${base}/capabilities`} icon={<Puzzle size={16} />} label="역량" />

        <SectionLabel label="운영 관리" />
        <NavItem to={`${base}/projects`} icon={<FolderKanban size={16} />} label="프로젝트" />
        <NavItem to={`${base}/goals`} icon={<Target size={16} />} label="운영 목표" />
        <NavItem to={`${base}/costs`} icon={<Wallet size={16} />} label="비용" />
        <NavItem to={`${base}/activity`} icon={<Activity size={16} />} label="처리 이력" />
        <NavItem to={`${base}/settings`} icon={<Settings size={16} />} label="설정" />
      </nav>

      <Divider />

      {/* Footer */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full transition-colors hover:bg-[var(--bg-secondary)]"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          {theme === "dark" ? (
            <Sun size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
          ) : (
            <Moon size={15} style={{ color: "var(--color-teal-500)", flexShrink: 0 }} />
          )}
          <span className="text-xs">
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </span>
        </button>
        <span className="text-xs px-1" style={{ color: "var(--text-disabled)" }}>
          v0.3.0
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
