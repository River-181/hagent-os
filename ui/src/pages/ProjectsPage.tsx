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
import { WorkspaceEmptyState, WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { FolderKanban, Plus, Sparkles } from "lucide-react"
import { useParams } from "react-router-dom"

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

function projectStatus(project: any) {
  const activeCases = Number(project.activeCases ?? 0)
  const caseCount = Number(project.caseCount ?? 0)
  if (activeCases > 0) {
    return {
      label: `진행 ${activeCases}`,
      bg: "var(--status-info-soft)",
      color: "var(--color-info)",
    }
  }
  if (caseCount > 0) {
    return {
      label: "대기",
      bg: "var(--bg-muted)",
      color: "var(--text-secondary)",
    }
  }
  return {
    label: "비어 있음",
    bg: "var(--status-warning-soft)",
    color: "var(--color-warning)",
  }
}

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
            style={{ backgroundColor: isValid ? "var(--color-primary)" : undefined }}
          >
            {submitting ? "생성 중…" : "프로젝트 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateFromInstructionDialog({
  open,
  onClose,
  onCreated,
  orgId,
}: NewProjectDialogProps) {
  const [instruction, setInstruction] = useState("상반기 프로모션 준비해볼까?")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!instruction.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await projectsApi.createFromInstruction({
        organizationId: orgId,
        instruction: instruction.trim(),
      })
      onCreated()
      handleClose()
    } catch {
      setError("instruction 기반 프로젝트 생성에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setInstruction("상반기 프로모션 준비해볼까?")
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>Instruction으로 프로젝트 생성</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={5}
            placeholder="예: 상반기 프로모션 준비해볼까?"
            style={{
              backgroundColor: "var(--bg-base)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            project + child cases + brief document를 함께 생성합니다.
          </div>
          {error ? <div className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</div> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting} style={{ color: "var(--text-secondary)" }}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!instruction.trim() || submitting} className="border-0 text-white" style={{ backgroundColor: "var(--color-primary)" }}>
            {submitting ? "생성 중…" : "생성"}
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
  const [instructionDialogOpen, setInstructionDialogOpen] = useState(false)

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

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="프로젝트"
        description="프로젝트를 묶어 관련 케이스와 후속 작업을 한 흐름으로 관리합니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setInstructionDialogOpen(true)}
              disabled={!selectedOrgId}
            >
              <Sparkles size={14} />
              Instruction으로 생성
            </Button>
            <Button
              size="sm"
              className="gap-2 border-0 text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
              onClick={() => setDialogOpen(true)}
              disabled={!selectedOrgId}
            >
              <Plus size={14} />
              새 프로젝트
            </Button>
          </div>
        }
      />

      <WorkspacePanel className="overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 py-12">
            <div className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              프로젝트를 불러오는 중...
            </div>
          </div>
        ) : projects.length === 0 ? (
          <WorkspaceEmptyState
            icon={<FolderKanban size={22} />}
            title="프로젝트가 없습니다"
            description="프로젝트를 생성하면 관련 케이스를 그룹으로 관리할 수 있습니다."
            className="rounded-none border-0 bg-transparent"
          />
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
            {projects.map((project: any) => {
              const status = projectStatus(project)
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/${orgPrefix}/projects/${project.id}`)}
                  className="w-full px-5 py-4 text-left transition-colors"
                  style={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-subtle)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color ?? "var(--color-primary)" }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {project.name}
                          </p>
                          {project.description ? (
                            <p className="mt-1 line-clamp-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                              {project.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <span>케이스 {project.caseCount ?? 0}개</span>
                        <span>진행 {project.activeCases ?? 0}개</span>
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </WorkspacePanel>

      {selectedOrgId && (
        <>
          <NewProjectDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onCreated={handleCreated}
            orgId={selectedOrgId}
          />
          <CreateFromInstructionDialog
            open={instructionDialogOpen}
            onClose={() => setInstructionDialogOpen(false)}
            onCreated={handleCreated}
            orgId={selectedOrgId}
          />
        </>
      )}
    </div>
  )
}
