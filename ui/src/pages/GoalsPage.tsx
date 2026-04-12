import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/components/ToastContext"
import { goalsApi } from "@/api/goals"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/EmptyState"
import { Target, Plus, Loader2, Calendar, ChevronRight } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active:      { label: "진행중", bg: "var(--color-primary-bg)",       color: "var(--color-teal-500)" },
  achieved:    { label: "달성",   bg: "rgba(16,185,129,0.12)",         color: "var(--color-success)" },
  completed:   { label: "달성",   bg: "rgba(16,185,129,0.12)",         color: "var(--color-success)" },
  delayed:     { label: "지연",   bg: "rgba(239,68,68,0.12)",          color: "#ef4444" },
  in_progress: { label: "진행중", bg: "var(--color-primary-bg)",       color: "var(--color-teal-500)" },
  paused:      { label: "중단",   bg: "rgba(245,158,11,0.12)",         color: "#f59e0b" },
}

function statusCfg(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.active
}

function formatDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
}

export function GoalsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newStatus, setNewStatus] = useState("active")
  const [newDate, setNewDate] = useState("")

  useEffect(() => {
    setBreadcrumbs([{ label: "목표" }])
  }, [setBreadcrumbs])

  const { data: goals = [], isLoading } = useQuery({
    queryKey: queryKeys.goals.list(selectedOrgId ?? ""),
    queryFn: () => goalsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      goalsApi.create(selectedOrgId!, {
        title: newTitle.trim(),
        status: newStatus,
        targetDate: newDate || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedOrgId ?? "") })
      success("목표를 추가했습니다.")
      setShowNew(false)
      setNewTitle("")
      setNewStatus("active")
      setNewDate("")
    },
    onError: () => toastError("목표 추가에 실패했습니다."),
  })

  const list = Array.isArray(goals) ? goals : []

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>목표</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {list.length}개
            </p>
          </div>
          <Button
            size="sm"
            className="border-0 text-white gap-1 text-xs"
            style={{ backgroundColor: "var(--color-teal-500)" }}
            onClick={() => setShowNew(true)}
          >
            <Plus size={14} />
            새 목표
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="목표가 없습니다"
            description="운영 목표를 추가하고 달성 현황을 추적하세요."
            action={{ label: "새 목표", onClick: () => setShowNew(true) }}
          />
        ) : (
          <div className="space-y-2">
            {list.map((goal: any) => {
              const cfg = statusCfg(goal.status ?? "active")
              const due = formatDate(goal.targetDate)
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => navigate(`/${orgPrefix}/goals/${goal.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors group"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-teal-500)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block" style={{ color: "var(--text-primary)" }}>
                      {goal.title}
                    </span>
                    {due && (
                      <span className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <Calendar size={11} />
                        {due}
                      </span>
                    )}
                  </div>
                  <Badge
                    className="border-0 px-2 py-0.5 text-xs shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </Badge>
                  <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* New Goal Dialog */}
      <Dialog open={showNew} onOpenChange={(o) => { if (!o) { setShowNew(false); setNewTitle(""); setNewStatus("active"); setNewDate("") } }}>
        <DialogContent style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-primary)" }}>새 목표</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>목표 이름</p>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 이탈률 5% 이하 유지"
                onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) createMutation.mutate() }}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>상태</p>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="achieved">달성</SelectItem>
                  <SelectItem value="paused">중단</SelectItem>
                  <SelectItem value="delayed">지연</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>목표 기한 (선택)</p>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>취소</Button>
            <Button
              disabled={!newTitle.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="border-0 text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
