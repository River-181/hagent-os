import { useContext, useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { casesApi } from "@/api/cases"
import { studentsApi } from "@/api/students"
import { queryKeys } from "@/lib/queryKeys"
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
import {
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-surface"
import { ToastContext } from "@/components/ToastContext"
import { Loader2, Plus } from "lucide-react"

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

function SectionTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {description ? (
        <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

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
    <div className="space-y-2">
      <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {label}
        {required ? (
          <span className="ml-0.5" style={{ color: "var(--color-danger)" }}>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function CaseNewPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const toast = useContext(ToastContext)
  const titleRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [urgency, setUrgency] = useState("normal")
  const [reporterName, setReporterName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [errors, setErrors] = useState<{ type?: string; title?: string }>({})

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students.list(selectedOrgId ?? ""),
    queryFn: () => studentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  useEffect(() => {
    setBreadcrumbs([
      { label: "케이스", href: `/${orgPrefix}/cases` },
      { label: "새 케이스" },
    ])
    titleRef.current?.focus()
  }, [setBreadcrumbs, orgPrefix])

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

  function validate(): boolean {
    const nextErrors: typeof errors = {}
    if (!type) nextErrors.type = "유형을 선택해주세요."
    if (!title.trim()) nextErrors.title = "제목을 입력해주세요."
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    create.mutate()
  }

  const isDirty = !!(type || title || description || reporterName || studentId)

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="새 케이스"
        description="민원, 환불, 보강 요청을 한 화면에서 빠르게 등록합니다."
        action={
          <>
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
              form="case-new-form"
              disabled={create.isPending || !isDirty}
              className="gap-2"
            >
              {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              등록
            </Button>
          </>
        }
      />

      <WorkspacePanel>
        <form
          id="case-new-form"
          onSubmit={handleSubmit}
          className="space-y-6 p-6 md:p-8"
        >
          <SectionTitle
            title="기본 정보"
            description="케이스의 성격을 먼저 정리하면 이후 승인과 담당 배정이 쉬워집니다."
          />

          <div className="space-y-5">
            <FieldGroup label="유형" required error={errors.type}>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger
                  className="h-11"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderColor: errors.type ? "var(--color-danger)" : "var(--border-default)",
                    color: type ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="제목" required error={errors.title}>
              <Input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="케이스 제목을 입력하세요"
                className="h-11"
                style={{
                  backgroundColor: "var(--bg-muted)",
                  borderColor: errors.title ? "var(--color-danger)" : "var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </FieldGroup>

            <FieldGroup label="설명">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="케이스 내용을 간단히 정리하세요"
                rows={5}
                className="resize-none"
                style={{
                  backgroundColor: "var(--bg-muted)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </FieldGroup>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--border-default)" }}>
            <SectionTitle
              title="보조 정보"
              description="긴급도, 신고자, 학생 연결은 후속 처리 우선순위를 잡는 데 도움됩니다."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <FieldGroup label="긴급도">
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger
                    className="h-11"
                    style={{
                      backgroundColor: "var(--bg-muted)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup label="신고자">
                <Input
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="신고자/보호자 이름"
                  className="h-11"
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </FieldGroup>
            </div>

            <div className="mt-5">
              <FieldGroup label="학생">
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger
                    className="h-11"
                    style={{
                      backgroundColor: "var(--bg-muted)",
                      borderColor: "var(--border-default)",
                      color: studentId ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}
                  >
                    <SelectValue placeholder="학생 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(students as any[]).map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        <span className="flex items-center gap-2">
                          {student.name}
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {student.grade}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
          </div>
        </form>
      </WorkspacePanel>
    </div>
  )
}
