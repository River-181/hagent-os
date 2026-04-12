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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Calendar, FolderKanban, Loader2, Pencil, Trash2, Check, X, Link2, Link2Off } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "active",      label: "진행중", bg: "var(--color-primary-bg)",  color: "var(--color-teal-500)" },
  { value: "achieved",    label: "달성",   bg: "rgba(16,185,129,0.12)",    color: "var(--color-success)" },
  { value: "delayed",     label: "지연",   bg: "rgba(239,68,68,0.12)",     color: "#ef4444" },
  { value: "paused",      label: "중단",   bg: "rgba(245,158,11,0.12)",    color: "#f59e0b" },
]

function statusCfg(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]
}

function formatDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
}

export function GoalDetailPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix, id } = useParams<{ orgPrefix: string; id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [memo, setMemo] = useState("")
  const [memoSaved, setMemoSaved] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [linkingProject, setLinkingProject] = useState(false)

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects.list(selectedOrgId ?? ""),
    queryFn: () => projectsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const { data: goal, isLoading, isError } = useQuery({
    queryKey: ["goals", id],
    queryFn: () => goalsApi.get(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (!goal) return
    setBreadcrumbs([
      { label: "목표", href: `/${orgPrefix}/goals` },
      { label: goal.title },
    ])
    setMemo(goal.description ?? "")
    setTitleDraft(goal.title ?? "")
  }, [goal, setBreadcrumbs, orgPrefix])

  const patchMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsApi.update(id!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goals", id] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedOrgId ?? "") })
    },
    onError: () => toastError("저장에 실패했습니다."),
  })

  const deleteMutation = useMutation({
    mutationFn: () => goalsApi.delete(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(selectedOrgId ?? "") })
      navigate(`/${orgPrefix}/goals`)
    },
    onError: () => toastError("삭제에 실패했습니다."),
  })

  const handleMemoBlur = () => {
    if (!goal || memo === (goal.description ?? "")) return
    patchMutation.mutate({ description: memo })
    setMemoSaved(true)
    setTimeout(() => setMemoSaved(false), 2000)
  }

  const handleStatusChange = (value: string) => {
    patchMutation.mutate({ status: value })
  }

  const handleTitleSave = () => {
    if (!titleDraft.trim() || titleDraft === goal?.title) { setEditingTitle(false); return }
    patchMutation.mutate({ title: titleDraft.trim() })
    setEditingTitle(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    )
  }

  if (isError || !goal) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>목표를 찾을 수 없습니다.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(`/${orgPrefix}/goals`)}>목록으로</Button>
      </div>
    )
  }

  const cfg = statusCfg(goal.status ?? "active")
  const due = formatDate(goal.targetDate)
  const projectList = Array.isArray(projects) ? projects : []
  const linkedProject = projectList.find((p: any) => p.id === goal.opsGroupId) ?? null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(`/${orgPrefix}/goals`)}
          className="flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          <ArrowLeft size={14} />
          목표 목록
        </button>

        {/* Title */}
        <div className="flex items-start gap-2 mb-4">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setEditingTitle(false) }}
                className="flex-1 text-xl font-bold rounded-lg px-3 py-1.5 focus:outline-none"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--color-teal-500)",
                  color: "var(--text-primary)",
                }}
              />
              <button type="button" onClick={handleTitleSave} className="p-1.5 rounded-lg" style={{ color: "var(--color-success)" }}>
                <Check size={16} />
              </button>
              <button type="button" onClick={() => setEditingTitle(false)} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2 flex-1 group">
              <h1 className="text-xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>
                {goal.title}
              </h1>
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                style={{ color: "var(--text-tertiary)" }}
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Select value={goal.status ?? "active"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-auto h-7 border-0 px-2 py-0 text-xs gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <Badge className="border-0 px-2 py-0.5 text-xs" style={{ backgroundColor: o.bg, color: o.color }}>
                    {o.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {due && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              <Calendar size={12} />
              {due}
            </span>
          )}

          {patchMutation.isPending && (
            <Loader2 size={13} className="animate-spin ml-1" style={{ color: "var(--text-tertiary)" }} />
          )}
        </div>

        {/* Linked Project */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>연결 프로젝트</p>
            {linkedProject && (
              <button
                type="button"
                className="text-xs flex items-center gap-1"
                style={{ color: "var(--text-tertiary)" }}
                onClick={() => patchMutation.mutate({ opsGroupId: null })}
                title="연결 해제"
              >
                <Link2Off size={12} />
                연결 해제
              </button>
            )}
          </div>

          {linkedProject ? (
            <button
              type="button"
              onClick={() => navigate(`/${orgPrefix}/projects/${linkedProject.id}`)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-teal-500)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
            >
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: linkedProject.color ? `${linkedProject.color}20` : "var(--bg-tertiary)" }}
              >
                <FolderKanban size={13} style={{ color: linkedProject.color ?? "var(--color-teal-500)" }} />
              </span>
              <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>
                {linkedProject.name}
              </span>
              <span className="text-xs" style={{ color: "var(--color-teal-500)" }}>→</span>
            </button>
          ) : linkingProject ? (
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(val) => {
                  patchMutation.mutate({ opsGroupId: val })
                  setLinkingProject(false)
                }}
              >
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="프로젝트 선택…" />
                </SelectTrigger>
                <SelectContent>
                  {projectList.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setLinkingProject(false)}
                className="p-2 rounded-lg"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLinkingProject(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px dashed var(--border-default)",
                color: "var(--text-tertiary)",
              }}
            >
              <Link2 size={14} />
              프로젝트 연결
            </button>
          )}
        </div>

        {/* Memo */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>메모</p>
            {memoSaved && (
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-success)" }}>
                <Check size={11} /> 저장됨
              </span>
            )}
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={handleMemoBlur}
            rows={10}
            placeholder="목표에 대한 메모, 전략, 진행 상황 등을 자유롭게 기록하세요."
            className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-teal-500)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
            ��커스를 벗어나면 자동 저장됩니다.
          </p>
        </div>

        {/* Delete */}
        <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--border-default)" }}>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={13} />
            목표 삭제
          </Button>
        </div>
      </div>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-primary)" }}>목표 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>{goal.title}</strong>을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button
              disabled={deleteMutation.isPending}
              style={{ backgroundColor: "#ef4444", color: "#fff" }}
              className="border-0 gap-1.5"
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
