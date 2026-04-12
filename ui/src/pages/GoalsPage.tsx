import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useToast } from "@/components/ToastContext"
import { goalsApi } from "@/api/goals"
import { projectsApi } from "@/api/projects"
import { queryKeys } from "@/lib/queryKeys"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WorkspaceEmptyState, WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Plus, Loader2, Calendar, ChevronRight, FolderKanban } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active:      { label: "진행중", bg: "var(--status-info-soft)",    color: "var(--color-info)" },
  achieved:    { label: "달성",   bg: "var(--status-success-soft)", color: "var(--color-success)" },
  completed:   { label: "달성",   bg: "var(--status-success-soft)", color: "var(--color-success)" },
  delayed:     { label: "지연",   bg: "var(--status-danger-soft)",  color: "var(--color-danger)" },
  in_progress: { label: "진행중", bg: "var(--status-info-soft)",    color: "var(--color-info)" },
  paused:      { label: "중단",   bg: "var(--status-warning-soft)", color: "var(--color-warning)" },
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
  const [newProjectId, setNewProjectId] = useState("")

  useEffect(() => {
    setBreadcrumbs([{ label: "목표" }])
  }, [setBreadcrumbs])

  const { data: goals = [], isLoading } = useQuery({
    queryKey: queryKeys.goals.list(selectedOrgId ?? ""),
    queryFn: () => goalsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects.list(selectedOrgId ?? ""),
    queryFn: () => projectsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const projectMap = Object.fromEntries(
    (Array.isArray(projects) ? projects : []).map((p: any) => [p.id, p])
  )

  const createMutation = useMutation({
    mutationFn: () =>
      goalsApi.create(selectedOrgId!, {
        title: newTitle.trim(),
        status: newStatus,
        targetDate: newDate || undefined,
        opsGroupId: newProjectId || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedOrgId ?? "") })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(selectedOrgId ?? "") })
      success("목표를 추가했습니다.")
      setShowNew(false)
      setNewTitle("")
      setNewStatus("active")
      setNewDate("")
      setNewProjectId("")
    },
    onError: () => toastError("목표 추가에 실패했습니다."),
  })

  const list = Array.isArray(goals) ? goals : []

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="목표"
        description="운영 목표를 연결 프로젝트와 함께 추적하고 상태를 한눈에 봅니다."
        action={
          <Button
            size="sm"
            className="gap-2 border-0 text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
            onClick={() => setShowNew(true)}
            disabled={!selectedOrgId}
          >
            <Plus size={14} />
            새 목표
          </Button>
        }
      />

      <WorkspacePanel className="overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        ) : list.length === 0 ? (
          <WorkspaceEmptyState
            icon={<Target size={22} />}
            title="목표가 없습니다"
            description="운영 목표를 추가하고 달성 현황을 추적하세요."
            className="rounded-none border-0 bg-transparent"
          />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
            {list.map((goal: any) => {
              const cfg = statusCfg(goal.status ?? "active")
              const due = formatDate(goal.targetDate)
              const linkedProject = goal.opsGroupId ? projectMap[goal.opsGroupId] : null
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => navigate(`/${orgPrefix}/goals/${goal.id}`)}
                  className="w-full px-5 py-4 text-left transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-subtle)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {goal.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {due ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {due}
                          </span>
                        ) : null}
                        {linkedProject ? (
                          <span className="flex items-center gap-1">
                            <FolderKanban size={11} />
                            {linkedProject.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        className="border-0 px-2.5 py-1 text-xs"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </Badge>
                      <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </WorkspacePanel>

      {/* New Goal Dialog */}
      <Dialog open={showNew} onOpenChange={(o) => { if (!o) { setShowNew(false); setNewTitle(""); setNewStatus("active"); setNewDate(""); setNewProjectId("") } }}>
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
            {(Array.isArray(projects) ? projects : []).length > 0 && (
              <div>
                <p className="mb-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>프로젝트 연결 (선택)</p>
                <Select value={newProjectId} onValueChange={setNewProjectId}>
                  <SelectTrigger><SelectValue placeholder="프로젝트 선택…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">연결 안 함</SelectItem>
                    {(Array.isArray(projects) ? projects : []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>취소</Button>
            <Button
              disabled={!newTitle.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="border-0 text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
