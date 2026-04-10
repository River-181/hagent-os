// v0.2.0
import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  Bot,
  Network,
  Bell,
  Activity,
  Puzzle,
  Settings,
  BookOpen,
  Clock,
  Target,
  Wallet,
  Calendar,
  Plus,
  UserPlus,
  Sparkles,
  Search,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useQuery } from "@tanstack/react-query"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { useOrganization } from "@/context/OrganizationContext"
import { cn } from "@/lib/utils"

interface PageEntry {
  label: string
  href: string
  icon: React.ReactNode
  category: "page"
}

interface AgentEntry {
  label: string
  href: string
  icon: React.ReactNode
  category: "agent"
  status?: string
}

type Entry = PageEntry | AgentEntry

const PAGE_ENTRIES: Omit<PageEntry, "category">[] = [
  { label: "대시보드", href: "dashboard", icon: <LayoutDashboard size={15} /> },
  { label: "케이스", href: "cases", icon: <FileText size={15} /> },
  { label: "에이전트 목록", href: "agents", icon: <Bot size={15} /> },
  { label: "에이전트 조직도", href: "org", icon: <Network size={15} /> },
  { label: "알림함", href: "inbox", icon: <Bell size={15} /> },
  { label: "처리 이력", href: "activity", icon: <Activity size={15} /> },
  { label: "k-skill 레지스트리", href: "skills", icon: <Puzzle size={15} /> },
  { label: "설정", href: "settings", icon: <Settings size={15} /> },
  { label: "문서", href: "documents", icon: <BookOpen size={15} /> },
  { label: "자동 실행", href: "routines", icon: <Clock size={15} /> },
  { label: "운영 목표", href: "goals", icon: <Target size={15} /> },
  { label: "비용", href: "costs", icon: <Wallet size={15} /> },
  { label: "일정", href: "schedule", icon: <Calendar size={15} /> },
  { label: "새 케이스", href: "cases/new", icon: <Plus size={15} /> },
  { label: "새 에이전트", href: "agents/new", icon: <UserPlus size={15} /> },
  { label: "온보딩", href: "onboarding", icon: <Sparkles size={15} /> },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CategoryHeader({ label }: { label: string }) {
  return (
    <div
      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
      style={{ color: "var(--text-tertiary)" }}
    >
      {label}
    </div>
  )
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const { selectedOrgId } = useOrganization()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId && open,
  })

  const base = orgPrefix ? `/${orgPrefix}` : ""

  const pageEntries: Entry[] = PAGE_ENTRIES.map((p) => ({ ...p, category: "page" as const }))

  const agentEntries: Entry[] = (agents as any[]).map((agent) => ({
    label: agent.name,
    href: `agents/${agent.id}`,
    icon: <Bot size={15} />,
    category: "agent" as const,
    status: agent.status,
  }))

  const allEntries = [...pageEntries, ...agentEntries]

  const filtered = query.trim()
    ? allEntries.filter((e) => e.label.toLowerCase().includes(query.toLowerCase()))
    : allEntries

  const filteredPages = filtered.filter((e) => e.category === "page")
  const filteredAgents = filtered.filter((e) => e.category === "agent")

  const flatFiltered: Entry[] = [...filteredPages, ...filteredAgents]

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = useCallback(
    (entry: Entry) => {
      navigate(`${base}/${entry.href}`)
      onOpenChange(false)
    },
    [base, navigate, onOpenChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const entry = flatFiltered[activeIndex]
      if (entry) handleSelect(entry)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector("[data-active='true']") as HTMLElement | null
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const renderEntry = (entry: Entry, index: number) => {
    const isActive = index === activeIndex
    return (
      <button
        key={`${entry.category}-${entry.href}`}
        data-active={isActive}
        onClick={() => handleSelect(entry)}
        onMouseEnter={() => setActiveIndex(index)}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2 text-sm text-left rounded-md transition-colors",
          isActive ? "bg-[var(--color-primary-bg)]" : "hover:bg-[var(--bg-tertiary)]"
        )}
        style={{
          color: isActive ? "var(--color-teal-500)" : "var(--text-secondary)",
        }}
      >
        <span className="shrink-0" style={{ color: isActive ? "var(--color-teal-500)" : "var(--text-tertiary)" }}>
          {entry.icon}
        </span>
        <span className="flex-1 truncate">{entry.label}</span>
        {entry.category === "agent" && (entry as AgentEntry).status && (
          <StatusDot status={(entry as AgentEntry).status!} />
        )}
      </button>
    )
  }

  let cursor = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden max-w-lg"
        style={{
          backgroundColor: "var(--bg-base)",
          border: "1px solid var(--border-default)",
          borderRadius: 12,
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Search size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="페이지, 에이전트 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ color: "var(--text-tertiary)", background: "var(--bg-tertiary)" }}
            >
              지우기
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto px-2 py-2" style={{ maxHeight: 360 }}>
          {flatFiltered.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
              검색 결과가 없습니다
            </div>
          )}

          {filteredPages.length > 0 && (
            <>
              <CategoryHeader label="페이지" />
              {filteredPages.map((entry) => {
                const idx = cursor++
                return renderEntry(entry, idx)
              })}
            </>
          )}

          {filteredAgents.length > 0 && (
            <>
              <CategoryHeader label="에이전트" />
              {filteredAgents.map((entry) => {
                const idx = cursor++
                return renderEntry(entry, idx)
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-xs"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-disabled)",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          <span>↑↓ 이동</span>
          <span>↵ 열기</span>
          <span>esc 닫기</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusDot({ status }: { status: string }) {
  const cls: Record<string, string> = {
    running: "w-2 h-2 rounded-full bg-teal-500 animate-pulse",
    idle: "w-2 h-2 rounded-full bg-gray-400",
    error: "w-2 h-2 rounded-full bg-red-500",
    paused: "w-2 h-2 rounded-full bg-amber-500",
  }
  return <span className={cls[status] ?? cls.idle} />
}

// Global command palette controller — used in Layout
import { useState as useGlobalState } from "react"

export function useCommandPalette() {
  const [open, setOpen] = useGlobalState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return { open, setOpen }
}

export function GlobalCommandPalette() {
  const { open, setOpen } = useCommandPalette()
  return <CommandPalette open={open} onOpenChange={setOpen} />
}
