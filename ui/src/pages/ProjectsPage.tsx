// v0.4.0 — working new-project dialog
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { projectsApi } from "@/api/projects"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { FolderKanban, Plus } from "lucide-react"
import { useParams } from "react-router-dom"
import { EmptyState } from "@/components/EmptyState"

// ─── Color options ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#10b981", // emerald
  "#f97316", // orange
  "#ec4899", // pink
]

// ─── New Project Dialog ───────────────────────────────────────────────────────

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  orgId: string
}

function NewProjectDialog({
  open,
  onClose,
  onCreated,
  orgId,
}: NewProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = name.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await projectsApi.create(orgId, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      })
      onCreated()
      handleClose()
    } catch {
      setError("프로젝트 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setColor(COLOR_OPTIONS[0])
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>
            새 프로젝트
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* 이름 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              프로젝트 이름 <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <Input
              placeholder="예: 2분기 신규 회원 확보"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              style={{
                backgroundColor: "var(--bg-base)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* 설명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              설명
            </label>
            <Textarea
              placeholder="프로젝트 목적이나 목표를 간략히 설명하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                backgroundColor: "var(--bg-base)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
                resize: "vertical",
              }}
            />
          </div>

          {/* 색상 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              색상
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: c,
                    border: color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                    outline: color === c ? "2px solid var(--bg-elevated)" : "none",
                    outlineOffset: 1,
                    cursor: "pointer",
                    transition: "transform 0.1s",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={submitting}
            style={{ color: "var(--text-secondary)" }}
          >
            취소
          </Button>
          <Button
            disabled={!isValid || submitting}
            onClick={handleSubmit}
            className="border-0 text-white"
            style={{ backgroundColor: isValid ? "var(--color-teal-500)" : undefined }}
          >
            {submitting ? "생성 중…" : "프로젝트 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const navigate = useNavigate()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: "프로젝트" }])
  }, [setBreadcrumbs])

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: queryKeys.projects.list(selectedOrgId ?? ""),
    queryFn: () => projectsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const handleCreated = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.list(selectedOrgId ?? ""),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div
          className="h-8 w-48 rounded animate-pulse mb-6"
          style={{ background: "var(--bg-tertiary)" }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl animate-pulse"
              style={{ background: "var(--bg-tertiary)" }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            프로젝트
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {projects.length > 0
              ? `${projects.length}개의 프로젝트`
              : "프로젝트가 없습니다"}
          </p>
        </div>
        <Button
          size="sm"
          className="flex items-center gap-2 text-sm border-0 text-white"
          style={{ background: "var(--color-teal-500)" }}
          onClick={() => setDialogOpen(true)}
          disabled={!selectedOrgId}
        >
          <Plus size={14} />
          새 프로젝트
        </Button>
      </div>

      {projects.length === 0 ? (
        <div
          className="rounded-xl"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <EmptyState
            icon={<FolderKanban size={22} />}
            title="프로젝트가 없습니다"
            description="프로젝트를 생성하면 관련 케이스를 그룹으로 관리할 수 있습니다."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/${orgPrefix}/projects/${project.id}`)}
              className="text-left rounded-xl p-5 transition-all hover:shadow-md"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                  style={{
                    backgroundColor: project.color ?? "var(--color-teal-500)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-sm truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {project.name}
                  </h3>
                  {project.description && (
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {project.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {project.caseCount ?? 0}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    전체 케이스
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium" style={{ color: "#f59e0b" }}>
                    {project.activeCases ?? 0}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    진행 중
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedOrgId && (
        <NewProjectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreated={handleCreated}
          orgId={selectedOrgId}
        />
      )}
    </div>
  )
}
