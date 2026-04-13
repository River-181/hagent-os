import { useEffect, useContext, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToastContext } from "@/components/ToastContext"
import { Loader2, Plus } from "lucide-react"

// ─── constants ─────────────────────────────────────────────────────────────

const caseTypes = [
  { value: "complaint", label: "민원" },
  { value: "refund", label: "환불" },
  { value: "makeup", label: "보강" },
  { value: "inquiry", label: "문의" },
  { value: "churn", label: "이탈" },
  { value: "schedule", label: "일정" },
]

const urgencyOptions = [
  { value: "urgent", label: "즉시" },
  { value: "today", label: "당일" },
  { value: "normal", label: "일반" },
  { value: "low", label: "낮음" },
]

const DEMO_STUDENTS = [
  { id: "stu-001", name: "홍길동", grade: "중2" },
  { id: "stu-002", name: "이수아", grade: "중2" },
  { id: "stu-003", name: "김민준", grade: "고1" },
  { id: "stu-004", name: "박지은", grade: "고2" },
  { id: "stu-005", name: "최수민", grade: "중3" },
]

// ─── field wrapper ─────────────────────────────────────────────────────────

function FieldGroup({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
        {required && (
          <span
            className="ml-0.5"
            style={{ color: "var(--color-danger)" }}
          >
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────

export function CaseNewPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const toast = useContext(ToastContext)
  const titleRef = useRef<HTMLInputElement>(null)

  // ── form state ─────────────────────────────────────────────────────────
  const [type, setType] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [urgency, setUrgency] = useState("normal")
  const [reporterName, setReporterName] = useState("")
  const [studentId, setStudentId] = useState("")

  // ── validation errors ──────────────────────────────────────────────────
  const [errors, setErrors] = useState<{ type?: string; title?: string }>({})

  useEffect(() => {
    setBreadcrumbs([
      { label: "케이스", href: `/${orgPrefix}/cases` },
      { label: "새 케이스" },
    ])
    titleRef.current?.focus()
  }, [setBreadcrumbs, orgPrefix])

  // ── mutation ───────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: () =>
      casesApi.create(selectedOrgId!, {
        type,
        title,
        description: description || undefined,
        urgency,
        reporterName: reporterName || undefined,
        studentId: studentId || undefined,
      }),
    onSuccess: (created: any) => {
      toast?.success("케이스가 등록되었습니다.")
      navigate(`/${orgPrefix}/cases/${created.id}`)
    },
    onError: () => {
      toast?.error("케이스 등록에 실패했습니다.")
    },
  })

  // ── validation ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: typeof errors = {}
    if (!type) newErrors.type = "유형을 선택해주세요."
    if (!title.trim()) newErrors.title = "제목을 입력해주세요."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    create.mutate()
  }

  const isDirty = !!(type || title || description || reporterName || studentId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <h1
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          새 케이스 등록
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          className="p-6 max-w-xl mx-auto space-y-5"
        >
          {/* Type */}
          <FieldGroup label="유형" required error={errors.type}>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger
                className={cn("w-full", errors.type && "border-red-500")}
              >
                <SelectValue placeholder="유형 선택..." />
              </SelectTrigger>
              <SelectContent>
                {caseTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          {/* Title */}
          <FieldGroup label="제목" required error={errors.title}>
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="케이스 제목을 입력하세요"
              className={cn(errors.title && "border-red-500")}
            />
          </FieldGroup>

          {/* Description */}
          <FieldGroup label="설명">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="케이스 내용을 자세히 설명해주세요..."
              rows={4}
              className="resize-none"
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            {/* Urgency */}
            <FieldGroup label="긴급도">
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyOptions.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            {/* Reporter */}
            <FieldGroup label="신고자">
              <Input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="예: 홍길동 어머니"
              />
            </FieldGroup>
          </div>

          {/* Student */}
          <FieldGroup label="학생">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="학생 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {DEMO_STUDENTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.name}
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {s.grade}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/${orgPrefix}/cases`)}
              disabled={create.isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || !isDirty}
              className="gap-2"
            >
              {create.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              등록
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
