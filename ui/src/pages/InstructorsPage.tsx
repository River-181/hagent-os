// v0.3.1
import { useContext, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { api } from "@/api/client"
import { instructorsApi } from "@/api/students"
import { casesApi } from "@/api/cases"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToastContext } from "@/components/ToastContext"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

type InstructorStatus = "active" | "inactive" | string

interface Instructor {
  id: string
  name: string
  subject: string
  phone: string
  email: string
  status: InstructorStatus
  classCount: number
  createdAt: string
}

interface ScheduleSummary {
  id: string
  instructorId: string | null
}

interface StudentScheduleSummary {
  studentId: string
  scheduleId: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toStr(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
}

function toNum(...values: unknown[]): number {
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim()) {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

function normalizeDate(value: unknown): string {
  const raw = toStr(value)
  if (!raw) return "-"
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
}

function normalizeInstructor(value: unknown): Instructor {
  const r = isRecord(value) ? value : {}
  return {
    id: toStr(r.id),
    name: toStr(r.name, "이름 없음"),
    subject: toStr(r.subject, "미분류"),
    phone: toStr(r.phone),
    email: toStr(r.email),
    status: toStr(r.status, "active"),
    classCount: toNum(r.classCount, r.scheduleCount),
    createdAt: normalizeDate(r.createdAt ?? r.created_at),
  }
}

function statusLabel(status: InstructorStatus): string {
  const map: Record<string, string> = {
    active: "재직중",
    inactive: "휴직",
    on_leave: "출장",
  }
  return map[status] ?? status
}

function statusBadgeClass(status: InstructorStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "inactive":
      return "bg-slate-100 text-slate-500 border-slate-200"
    default:
      return "bg-amber-50 text-amber-700 border-amber-200"
  }
}

function classifyWorkRole(subject: string) {
  if (["영어", "수학", "국어", "과학", "사회"].includes(subject)) return "강의"
  if (["상담", "입학상담", "학생관리"].includes(subject)) return "상담/학생관리"
  if (["운영", "행정", "원무", "마케팅", "차량"].includes(subject)) return "운영"
  return "직원/강사"
}

const SUBJECT_OPTIONS = [
  "영어", "수학", "국어", "과학", "사회",
  "상담", "운영", "행정", "원무", "마케팅",
  "차량", "입학상담", "학생관리", "기타",
]

const STATUS_OPTIONS = [
  { value: "active", label: "재직중" },
  { value: "inactive", label: "휴직" },
  { value: "on_leave", label: "출장" },
]

// ── Dialogs ──────────────────────────────────────────────────────────────────

interface InstructorFormState {
  name: string
  subject: string
  phone: string
  email: string
  status: string
}

const emptyForm: InstructorFormState = {
  name: "",
  subject: "",
  phone: "",
  email: "",
  status: "active",
}

function InstructorDialog({
  open,
  onOpenChange,
  orgId,
  instructor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string | null
  instructor?: Instructor | null
}) {
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const isEdit = !!instructor
  const [form, setForm] = useState<InstructorFormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<InstructorFormState>>({})

  useEffect(() => {
    if (open) {
      setForm(
        instructor
          ? {
              name: instructor.name,
              subject: instructor.subject,
              phone: instructor.phone,
              email: instructor.email,
              status: instructor.status,
            }
          : emptyForm
      )
      setErrors({})
    }
  }, [open, instructor])

  const createMutation = useMutation({
    mutationFn: (data: InstructorFormState) => {
      if (!orgId) throw new Error("orgId required")
      return instructorsApi.create(orgId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors.list(orgId ?? "") })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId ?? "") })
      toast?.success("직원/강사가 등록되었습니다.")
      onOpenChange(false)
    },
    onError: () => {
      toast?.error("직원/강사 등록에 실패했습니다.")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: InstructorFormState) => {
      if (!instructor?.id) throw new Error("instructor id required")
      return instructorsApi.update(instructor.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors.list(orgId ?? "") })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId ?? "") })
      toast?.success("직원/강사 정보가 수정되었습니다.")
      onOpenChange(false)
    },
    onError: () => {
      toast?.error("직원/강사 수정에 실패했습니다.")
    },
  })

  function validate(): boolean {
    const next: Partial<InstructorFormState> = {}
    if (!form.name.trim()) next.name = "이름을 입력하세요"
    if (!form.subject.trim()) next.subject = "과목을 선택하세요"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    if (isEdit) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>
            {isEdit ? "직원/강사 정보 수정" : "직원/강사 등록"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--text-tertiary)" }}>
            {isEdit ? "직원/강사 정보를 수정합니다." : "새 직원 또는 강사를 등록합니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* 이름 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              이름 <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="직원 또는 강사 이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: errors.name ? "#ef4444" : "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            {errors.name && <span className="text-xs text-rose-500">{errors.name}</span>}
          </div>

          {/* 과목 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              담당 영역 <span className="text-rose-500">*</span>
            </label>
            <Select
              value={form.subject}
              onValueChange={(v) => setForm({ ...form, subject: v })}
            >
              <SelectTrigger
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: errors.subject ? "#ef4444" : "var(--border-default)",
                  color: form.subject ? "var(--text-primary)" : "var(--text-tertiary)",
                }}
              >
                <SelectValue placeholder="담당 영역 선택" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subject && <span className="text-xs text-rose-500">{errors.subject}</span>}
          </div>

          {/* 연락처 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              연락처
            </label>
            <Input
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* 이메일 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              이메일
            </label>
            <Input
              type="email"
              placeholder="teacher@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* 상태 */}
          {isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                상태
              </label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              background: "var(--color-teal-500)",
              color: "#fff",
            }}
          >
            {isPending && <Loader2 size={14} className="animate-spin mr-1" />}
            {isEdit ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteConfirmDialog({
  instructor,
  open,
  onOpenChange,
  orgId,
}: {
  instructor: Instructor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string | null
}) {
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!instructor?.id) throw new Error("instructor id required")
      return instructorsApi.delete(instructor.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors.list(orgId ?? "") })
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId ?? "") })
      toast?.success("직원/강사가 삭제되었습니다.")
      onOpenChange(false)
    },
    onError: () => {
      toast?.error("직원/강사 삭제에 실패했습니다.")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>직원/강사 삭제</DialogTitle>
          <DialogDescription style={{ color: "var(--text-tertiary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {instructor?.name}
            </span>{" "}
            이 직원/강사 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
          >
            취소
          </Button>
          <Button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {deleteMutation.isPending && <Loader2 size={14} className="animate-spin mr-1" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Sheet ─────────────────────────────────────────────────────────────

function InstructorDetailSheet({
  instructor,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  stats,
}: {
  instructor: Instructor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (instructor: Instructor) => void
  onDelete: (instructor: Instructor) => void
  stats?: {
    linkedSchedules: number
    linkedStudents: number
    linkedCases: number
  }
}) {
  if (!instructor) return null
  const workRole = classifyWorkRole(instructor.subject)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0" style={{ backgroundColor: "var(--bg-base)" }}>
        <SheetHeader className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border-default)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: "var(--color-teal-500)" }}
              >
                {instructor.name.charAt(0)}
              </div>
              <div>
                <SheetTitle style={{ color: "var(--text-primary)" }}>{instructor.name}</SheetTitle>
                <SheetDescription style={{ color: "var(--text-tertiary)" }}>
                  {instructor.subject} 담당 · {workRole}
                </SheetDescription>
              </div>
            </div>
            <Badge
              className={cn("text-xs border shrink-0", statusBadgeClass(instructor.status))}
            >
              {statusLabel(instructor.status)}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 flex flex-col gap-5">
            {/* 기본 정보 */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
                기본 정보
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <BookOpen size={14} style={{ color: "var(--color-teal-500)" }} />
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>담당 과목</div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{instructor.subject}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <UserCheck size={14} style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>업무 역할</div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{workRole}</div>
                  </div>
                </div>

                {instructor.phone && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--bg-tertiary)" }}
                    >
                      <Phone size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>연락처</div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{instructor.phone}</div>
                    </div>
                  </div>
                )}

                {instructor.email && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--bg-tertiary)" }}
                    >
                      <Mail size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>이메일</div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{instructor.email}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <GraduationCap size={14} style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>등록일</div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{instructor.createdAt}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 담당 수업 */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
                담당 수업
              </h3>
              {instructor.classCount > 0 || (stats?.linkedStudents ?? 0) > 0 || (stats?.linkedCases ?? 0) > 0 ? (
                <div className="grid gap-3">
                  <div
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    <BookOpen size={16} style={{ color: "var(--color-teal-500)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      연결 일정 <span className="font-bold">{stats?.linkedSchedules ?? instructor.classCount}</span>개
                    </span>
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    <GraduationCap size={16} style={{ color: "var(--color-teal-500)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      연결 학생 <span className="font-bold">{stats?.linkedStudents ?? 0}</span>명
                    </span>
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    <BookOpen size={16} style={{ color: "var(--color-teal-500)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      관련 케이스 <span className="font-bold">{stats?.linkedCases ?? 0}</span>건
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  배정된 수업이 없습니다.
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div
          className="px-6 py-4 flex gap-2"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(instructor)}
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
          >
            수정
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(instructor)}
            className="text-rose-500 border-rose-200 hover:bg-rose-50"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <GraduationCap size={28} style={{ color: "var(--color-teal-500)" }} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          등록된 직원/강사가 없습니다
        </p>
        <p className="text-sm max-w-xs" style={{ color: "var(--text-tertiary)" }}>
          직원/강사를 등록하면 수업 배정과 일정 관리가 연결됩니다
        </p>
      </div>
      <Button
        onClick={onAdd}
        size="sm"
        style={{ background: "var(--color-teal-500)", color: "#fff" }}
      >
        <Plus size={14} className="mr-1" />
        직원/강사 등록
      </Button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function InstructorsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { setPanelContent } = usePanel()
  const navigate = useNavigate()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [editTarget, setEditTarget] = useState<Instructor | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Instructor | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Instructor | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: "직원/강사 관리" }])
  }, [setBreadcrumbs])

  const instructorsQuery = useQuery<Instructor[]>({
    queryKey: queryKeys.instructors.list(selectedOrgId ?? ""),
    enabled: !!selectedOrgId,
    queryFn: async () => {
      if (!selectedOrgId) return []
      try {
        const response = await instructorsApi.list(selectedOrgId)
        return (Array.isArray(response) ? response : []).map(normalizeInstructor)
      } catch {
        return []
      }
    },
  })

  const schedulesQuery = useQuery<ScheduleSummary[]>({
    queryKey: queryKeys.schedules.list(selectedOrgId ?? ""),
    enabled: !!selectedOrgId,
    queryFn: async () => {
      if (!selectedOrgId) return []
      try {
        const response = await api.get<ScheduleSummary[]>(`/organizations/${selectedOrgId}/schedules`)
        return Array.isArray(response) ? response : []
      } catch {
        return []
      }
    },
  })

  const studentSchedulesQuery = useQuery<StudentScheduleSummary[]>({
    queryKey: ["student-schedules", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      if (!selectedOrgId) return []
      try {
        const response = await api.get<StudentScheduleSummary[]>(`/organizations/${selectedOrgId}/student-schedules`)
        return Array.isArray(response) ? response : []
      } catch {
        return []
      }
    },
  })

  const casesQuery = useQuery<any[]>({
    queryKey: queryKeys.cases.list(selectedOrgId ?? ""),
    enabled: !!selectedOrgId,
    queryFn: async () => {
      if (!selectedOrgId) return []
      try {
        return await casesApi.list(selectedOrgId)
      } catch {
        return []
      }
    },
  })

  const scheduleCountByInstructor = useMemo(() => {
    const counts = new Map<string, number>()
    for (const schedule of schedulesQuery.data ?? []) {
      if (!schedule.instructorId) continue
      counts.set(schedule.instructorId, (counts.get(schedule.instructorId) ?? 0) + 1)
    }
    return counts
  }, [schedulesQuery.data])

  const instructors = useMemo(
    () =>
      (instructorsQuery.data ?? []).map((instructor) => ({
        ...instructor,
        classCount: scheduleCountByInstructor.get(instructor.id) ?? instructor.classCount ?? 0,
      })),
    [instructorsQuery.data, scheduleCountByInstructor]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return instructors.filter((inst) => {
      if (statusFilter !== "all" && inst.status !== statusFilter) return false
      if (q) {
        return (
          inst.name.toLowerCase().includes(q) ||
          inst.subject.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [instructors, search, statusFilter])

  useEffect(() => {
    const detailId = searchParams.get("detail")
    if (!detailId) return
    const target = instructors.find((item) => item.id === detailId)
    if (!target) return
    setDetailTarget(target)
    setShowDetail(true)
  }, [instructors, searchParams])

  function openEdit(instructor: Instructor) {
    setEditTarget(instructor)
    setShowDetail(false)
    setShowEditDialog(true)
  }

  function openDelete(instructor: Instructor) {
    setDeleteTarget(instructor)
    setShowDetail(false)
    setShowDeleteDialog(true)
  }

  function openDetail(instructor: Instructor) {
    setDetailTarget(instructor)
    setShowDetail(true)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("detail", instructor.id)
      return next
    })
  }

  const activeCount = instructors.filter((i) => i.status === "active").length
  const inactiveCount = instructors.filter((i) => i.status !== "active").length
  const detailStats = useMemo(() => {
    if (!detailTarget) return { linkedSchedules: 0, linkedStudents: 0, linkedCases: 0 }
    const linkedScheduleIds = new Set(
      (schedulesQuery.data ?? [])
        .filter((schedule) => schedule.instructorId === detailTarget.id)
        .map((schedule) => schedule.id)
    )
    const linkedStudentIds = new Set(
      (studentSchedulesQuery.data ?? [])
        .filter((item) => linkedScheduleIds.has(item.scheduleId))
        .map((item) => item.studentId)
    )
    const linkedCases = (casesQuery.data ?? []).filter((item: any) => linkedStudentIds.has(String(item.studentId ?? "")))
    return {
      linkedSchedules: linkedScheduleIds.size,
      linkedStudents: linkedStudentIds.size,
      linkedCases: linkedCases.length,
    }
  }, [casesQuery.data, detailTarget, schedulesQuery.data, studentSchedulesQuery.data])

  const panelContent = useMemo(() => {
    if (!detailTarget) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">직원/강사 운영 요약</p>
            <p className="mt-1 text-sm text-slate-500">
              직원을 선택하면 담당 수업, 연결 학생, 최근 케이스를 바로 확인할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">전체 직원/강사</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{instructors.length}명</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">재직중</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900">{activeCount}명</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-600">바로 실행</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button size="sm" className="justify-start bg-teal-600 text-white hover:bg-teal-700" onClick={() => setShowNewDialog(true)}>
                직원/강사 등록
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">{detailTarget.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {detailTarget.subject} · {classifyWorkRole(detailTarget.subject)} · {statusLabel(detailTarget.status)}
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">담당 수업</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{detailStats.linkedSchedules}개</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">연결 학생</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{detailStats.linkedStudents}명</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">운영 연결</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span>연락처</span>
              <span className="font-medium text-slate-900">{detailTarget.phone || "미등록"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>이메일</span>
              <span className="font-medium text-slate-900">{detailTarget.email || "미등록"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>관련 케이스</span>
              <span className="font-medium text-slate-900">{detailStats.linkedCases}건</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-600">바로 실행</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => {
                setEditTarget(detailTarget)
                setShowDetail(false)
                setShowEditDialog(true)
              }}
            >
              정보 수정
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => orgPrefix && navigate(`/${orgPrefix}/schedule`)}
            >
              연결 일정 보기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() => orgPrefix && navigate(`/${orgPrefix}/cases`)}
            >
              관련 케이스 보기
            </Button>
          </div>
        </div>
      </div>
    )
  }, [
    activeCount,
    casesQuery.data,
    detailTarget,
    detailStats.linkedCases,
    detailStats.linkedSchedules,
    detailStats.linkedStudents,
    instructors.length,
    schedulesQuery.data,
    studentSchedulesQuery.data,
  ])

  const panelContentKey = useMemo(
    () =>
      JSON.stringify({
        detailTargetId: detailTarget?.id ?? null,
        instructorCount: instructors.length,
        activeCount,
        caseCount: Array.isArray(casesQuery.data) ? casesQuery.data.length : 0,
        scheduleCount: Array.isArray(schedulesQuery.data) ? schedulesQuery.data.length : 0,
        studentScheduleCount: Array.isArray(studentSchedulesQuery.data) ? studentSchedulesQuery.data.length : 0,
      }),
    [
      activeCount,
      casesQuery.data,
      detailTarget?.id,
      instructors.length,
      schedulesQuery.data,
      studentSchedulesQuery.data,
    ],
  )

  useEffect(() => {
    setPanelContent(panelContent)
    return () => setPanelContent(null)
  }, [panelContentKey, setPanelContent])

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <div
        className="px-6 pt-6 pb-4"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              직원/강사 관리
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              총 {instructors.length}명 · 재직중 {activeCount}명 · 기타 {inactiveCount}명
            </p>
          </div>

          <Button
            onClick={() => setShowNewDialog(true)}
            size="sm"
            style={{ background: "var(--color-teal-500)", color: "#fff" }}
          >
            <Plus size={14} className="mr-1" />
            직원/강사 등록
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <Input
              placeholder="이름, 과목으로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "text-white"
                    : "hover:bg-[var(--bg-tertiary)]"
                )}
                style={
                  statusFilter === s
                    ? { background: "var(--color-teal-500)" }
                    : { color: "var(--text-secondary)" }
                }
              >
                {s === "all" ? "전체" : s === "active" ? "재직중" : "기타"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {instructorsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-teal-500)" }} />
            </div>
          ) : filtered.length === 0 && instructors.length === 0 ? (
            <EmptyState onAdd={() => setShowNewDialog(true)} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Search size={28} style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                검색 결과가 없습니다
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((instructor) => (
                <InstructorCard
                  key={instructor.id}
                  instructor={instructor}
                  onClick={() => openDetail(instructor)}
                  onEdit={() => openEdit(instructor)}
                  onDelete={() => openDelete(instructor)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs & Sheet */}
      <InstructorDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        orgId={selectedOrgId}
      />

      <InstructorDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) setEditTarget(null)
        }}
        orgId={selectedOrgId}
        instructor={editTarget}
      />

      <DeleteConfirmDialog
        instructor={deleteTarget}
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) setDeleteTarget(null)
        }}
        orgId={selectedOrgId}
      />

      <InstructorDetailSheet
        instructor={detailTarget}
        open={showDetail}
        onOpenChange={(open) => {
          setShowDetail(open)
          if (!open) {
            setDetailTarget(null)
            setSearchParams((current) => {
              const next = new URLSearchParams(current)
              next.delete("detail")
              return next
            })
          }
        }}
        onEdit={openEdit}
        onDelete={openDelete}
        stats={detailStats}
      />
    </div>
  )
}

// ── Instructor Card ──────────────────────────────────────────────────────────

function InstructorCard({
  instructor,
  onClick,
  onEdit,
  onDelete,
}: {
  instructor: Instructor
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card
      className="cursor-pointer transition-all duration-150 hover:shadow-md"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-default)",
      }}
      onClick={onClick}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ background: "var(--color-teal-500)" }}
            >
              {instructor.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {instructor.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {instructor.subject}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {classifyWorkRole(instructor.subject)}
                </Badge>
              </div>
            </div>
          </div>
          <Badge
            className={cn("text-xs border shrink-0", statusBadgeClass(instructor.status))}
          >
            {statusLabel(instructor.status)}
          </Badge>
        </div>

        {/* Info rows */}
        <div className="flex flex-col gap-1.5">
          {instructor.phone && (
            <div className="flex items-center gap-2">
              <Phone size={12} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {instructor.phone}
              </span>
            </div>
          )}
          {instructor.email && (
            <div className="flex items-center gap-2">
              <Mail size={12} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                {instructor.email}
              </span>
            </div>
          )}
          {!instructor.phone && !instructor.email && (
            <span className="text-xs" style={{ color: "var(--text-disabled)" }}>
              연락처 미등록
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center gap-1.5">
            {instructor.status === "active" ? (
              <UserCheck size={12} style={{ color: "var(--color-teal-500)" }} />
            ) : (
              <UserX size={12} style={{ color: "var(--text-tertiary)" }} />
            )}
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              연결 일정 {instructor.classCount}개
            </span>
          </div>

          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="px-2 py-1 rounded text-xs transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: "var(--text-tertiary)" }}
              onClick={onEdit}
            >
              수정
            </button>
            <button
              className="px-2 py-1 rounded text-xs transition-colors hover:bg-rose-50 text-rose-400"
              onClick={onDelete}
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
