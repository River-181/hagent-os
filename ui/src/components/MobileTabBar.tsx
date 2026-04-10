import { NavLink, useParams } from "react-router-dom"
import { Home, FileText, PlusCircle, Bot, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabItem {
  label: string
  icon: React.ReactNode
  path: string
}

export function MobileTabBar() {
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const base = `/${orgPrefix}`

  const tabs: TabItem[] = [
    { label: "홈", icon: <Home size={20} />, path: `${base}/dashboard` },
    { label: "케이스", icon: <FileText size={20} />, path: `${base}/cases` },
    { label: "등록", icon: <PlusCircle size={22} />, path: `${base}/cases/new` },
    { label: "에이전트", icon: <Bot size={20} />, path: `${base}/agents` },
    { label: "알림", icon: <Bell size={20} />, path: `${base}/inbox` },
  ]

  return (
    <div
      className="flex items-center justify-around"
      style={{
        height: 60,
        backgroundColor: "var(--bg-base)",
        borderTop: "1px solid var(--border-default)",
        boxShadow: "0 -2px 8px rgba(2,32,71,0.06)",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors",
              isActive ? "font-semibold" : ""
            )
          }
          style={({ isActive }) => ({
            color: isActive ? "var(--color-teal-500)" : "var(--text-tertiary)",
          })}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
