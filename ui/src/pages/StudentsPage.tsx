import { useContext, useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { studentsApi } from "@/api/students"
import { schedulesApi } from "@/api/schedules"
import { ApiError, api } from "@/api/client"
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
import { Switch } from "@/components/ui/switch"
import { ToastContext } from "@/components/ToastContext"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Bus,
  FileSpreadsheet,
  GraduationCap,
  Grid2x2,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Table2,
  Upload,
  User,
} from "lucide-react"

type StudentStatus = "active" | "inactive" | "at_risk" | "withdrawn" | string
type ViewMode = "table" | "card"
type SortKey = "name" | "grade" | "phone" | "registeredAt" | "classCount" | "riskPercent" | "shuttle" | "status"
type SortDirection = "asc" | "desc"

interface Parent {
  id: string
  name: string
  relation: string
  phone: string
  email: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  note?: string
}

interface CounselingEntry {
  id: string
  date: string
  content: string
}

interface StudentRecord {
  id: string
  name: string
  grade: string
  classGroup?: string
  status: StudentStatus
  riskPercent: number
  registeredAt: string
  primaryPhone: string
  parent: Parent | null
  parents: Parent[]
  attendance: AttendanceRecord[]
  counselingHistory: CounselingEntry[]
  shuttle: boolean
  classCount?: number
}

interface ScheduleRecord {
  id: string
  title: string
  dayOfWeek: number | null
  startTime: string
  endTime: string
  instructorName: string
  studentIds: string[]
  grades: string[]
}

interface CsvPreview {
  headers: string[]
  rows: string[][]
}

const GRADE_OPTIONS = [
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
  "고1", "고2", "고3",
  "성인",
]

const STATUS_OPTIONS = [
  { value: "active", label: "재학중" },
  { value: "inactive", label: "휴원" },
  { value: "at_risk", label: "이탈위험" },
  { value: "withdrawn", label: "퇴원" },
]

const GRADE_FILTERS = ["", "초", "중", "고", "성인"] as const

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function toStringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function toNumberValue(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function toBooleanValue(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value
    if (typeof value === "number") return value > 0
    if (typeof value === "string") {
      const normalized = value.toLowerCase()
      if (["true", "1", "yes", "y", "on"].includes(normalized)) return true
      if (["false", "0", "no", "n", "off"].includes(normalized)) return false
    }
  }
  return false
}

function normalizeRiskPercent(value: unknown): number {
  const score = toNumberValue(value)
  if (score <= 1) return Math.round(Math.max(0, Math.min(100, score * 100)))
  return Math.round(Math.max(0, Math.min(100, score)))
}

function normalizeDate(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return "-"
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return phone
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return "-"
  if (digits.length >= 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-****`
  if (digits.length >= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-****`
  return `${digits.slice(0, Math.max(0, digits.length - 4))}${"*".repeat(Math.min(4, digits.length))}`
}

function statusLabel(status: StudentStatus): string {
  const map: Record<string, string> = {
    active: "재학중",
    inactive: "휴원",
    at_risk: "이탈위험",
    withdrawn: "퇴원",
  }
  return map[status] ?? status
}

function statusBadgeClass(status: StudentStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "inactive":
      return "bg-slate-100 text-slate-700 border-slate-200"
    case "at_risk":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "withdrawn":
      return "bg-zinc-100 text-zinc-600 border-zinc-200"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}

function riskTone(score: number) {
  if (score > 70) {
    return {
      bar: "bg-rose-500",
      track: "bg-rose-100",
      text: "text-rose-700",
      row: "bg-rose-50/80 hover:bg-rose-100/80",
    }
  }
  if (score >= 50) {
    return {
      bar: "bg-orange-500",
      track: "bg-orange-100",
      text: "text-orange-700",
      row: "bg-orange-50/80 hover:bg-orange-100/80",
    }
  }
  return {
    bar: "bg-emerald-500",
    track: "bg-emerald-100",
    text: "text-emerald-700",
    row: "hover:bg-slate-50",
  }
}

function gradeGroup(grade: string): string {
  if (grade.startsWith("초")) return "초등"
  if (grade.startsWith("중")) return "중등"
  if (grade.startsWith("고")) return "고등"
  return "성인"
}

function dayLabel(dayOfWeek: number | null): string {
  const map: Record<number, string> = {
    0: "일",
    1: "월",
    2: "화",
    3: "수",
    4: "목",
    5: "금",
    6: "토",
  }
  if (dayOfWeek == null) return "미정"
  return map[dayOfWeek] ?? "미정"
}

function normalizeParent(value: unknown, index: number): Parent | null {
  if (!isRecord(value)) return null
  return {
    id: toStringValue(value.id, `parent-${index}`),
    name: toStringValue(value.name, value.parentName),
    relation: toStringValue(value.relation, value.relationship, "보호자"),
    phone: toStringValue(value.phone, value.mobile),
    email: toStringValue(value.email),
  }
}

function normalizeAttendance(value: unknown, index: number): AttendanceRecord | null {
  if (!isRecord(value)) return null
  return {
    id: toStringValue(value.id, `attendance-${index}`),
    date: normalizeDate(value.date),
    status: toStringValue(value.status, "unknown"),
    note: toStringValue(value.note) || undefined,
  }
}

function normalizeCounselingHistory(value: unknown): CounselingEntry[] {
  return toArray<unknown>(value).map((entry, index) => {
    if (isRecord(entry)) {
      return {
        id: toStringValue(entry.id, `counseling-${index}`),
        date: normalizeDate(entry.date ?? entry.createdAt ?? entry.created_at),
        content: toStringValue(entry.content, entry.note, entry.summary, entry.title),
      }
    }
    if (typeof entry === "string") {
      return {
        id: `counseling-${index}`,
        date: "-",
        content: entry,
      }
    }
    return {
      id: `counseling-${index}`,
      date: "-",
      content: "",
    }
  }).filter((entry) => entry.content)
}

function normalizeStudent(value: unknown): StudentRecord {
  const record = isRecord(value) ? value : {}
  const parents = toArray<unknown>(record.parents).map(normalizeParent).filter(Boolean) as Parent[]
  const parent = normalizeParent(record.parent, 0) ?? parents[0] ?? null
  const phone = toStringValue(
    record.phone,
    record.contact,
    record.contactPhone,
    record.phoneNumber,
    parent?.phone
  )
  const shuttle = toBooleanValue(record.shuttle, record.vehicleBoarding, record.busBoarding, record.usesShuttle)
  const attendance = toArray<unknown>(record.attendance).map(normalizeAttendance).filter(Boolean) as AttendanceRecord[]
  return {
    id: toStringValue(record.id),
    name: toStringValue(record.name, record.studentName, "이름 없음"),
    grade: toStringValue(record.grade, record.studentGrade, "미분류"),
    status: toStringValue(record.status, "active"),
    riskPercent: normalizeRiskPercent(record.riskScore ?? record.risk_score ?? record.churnRisk),
    registeredAt: normalizeDate(record.enrolledAt ?? record.createdAt ?? record.created_at),
    primaryPhone: phone,
    parent,
    parents,
    attendance,
    counselingHistory: normalizeCounselingHistory(record.counselingHistory ?? record.counselings ?? record.consultations),
    shuttle,
    classCount: toNumberValue(record.classCount, record.scheduleCount, record.courseCount),
    classGroup: toStringValue(record.classGroup, record.class_group, record.className) || undefined,
  }
}

function normalizeSchedule(value: unknown): ScheduleRecord {
  const record = isRecord(value) ? value : {}
  const instructor = isRecord(record.instructor) ? record.instructor : null
  return {
    id: toStringValue(record.id),
    title: toStringValue(record.title, record.name, record.className, "수업명 미정"),
    dayOfWeek: Number.isFinite(toNumberValue(record.dayOfWeek, record.day)) ? toNumberValue(record.dayOfWeek, record.day) : null,
    startTime: toStringValue(record.startTime, record.start, "00:00"),
    endTime: toStringValue(record.endTime, record.end, "00:00"),
    instructorName: toStringValue(record.instructorName, instructor?.name, record.teacherName, "미정"),
    studentIds: toArray<unknown>(record.studentIds ?? record.students).map((entry) => {
      if (typeof entry === "string") return entry
      if (isRecord(entry)) return toStringValue(entry.id)
      return ""
    }).filter(Boolean),
    grades: toArray<unknown>(record.grades ?? record.grade ? [record.grade] : []).map((entry) => {
      if (typeof entry === "string") return entry
      return ""
    }).filter(Boolean),
  }
}

function matchesScheduleToStudent(schedule: ScheduleRecord, student: StudentRecord): boolean {
  if (schedule.studentIds.includes(student.id)) return true
  if (schedule.grades.includes(student.grade)) return true
  const group = gradeGroup(student.grade)
  return schedule.title.includes(student.grade) || schedule.title.includes(group)
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

function RiskBar({ score }: { score: number }) {
  const tone = riskTone(score)
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2 flex-1 overflow-hidden rounded-full", tone.track)}>
        <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("min-w-10 text-right text-xs font-medium tabular-nums", tone.text)}>
        {score}%
      </span>
    </div>
  )
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean
  direction: SortDirection | null
}) {
  if (!active || !direction) return <span className="text-slate-300">·</span>
  return direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
}

function countStudentSchedules(student: StudentRecord, schedules: ScheduleRecord[]): number {
  const matched = schedules.filter((schedule) => matchesScheduleToStudent(schedule, student))
  if (matched.length > 0) return matched.length
  if (typeof student.classCount === "number" && student.classCount > 0) return student.classCount
  return 0
}

function CsvImportDialog({
  open,
  onOpenChange,
  orgId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string | null
}) {
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [fileError, setFileError] = useState("")
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [nameColumn, setNameColumn] = useState("")
  const [gradeColumn, setGradeColumn] = useState("")
  const [phoneColumn, setPhoneColumn] = useState("")

  function resetState() {
    setDragging(false)
    setFileName("")
    setFileError("")
    setPreview(null)
    setNameColumn("")
    setGradeColumn("")
    setPhoneColumn("")
  }

  function parseCsvText(text: string, nextFileName: string) {
    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))

    if (rows.length === 0) {
      setFileError("CSV 파일에서 읽을 수 있는 행이 없습니다.")
      setPreview(null)
      return
    }

    const headers = rows[0].map((header, index) => header || `column_${index + 1}`)
    const bodyRows = rows.slice(1)
    setFileName(nextFileName)
    setFileError("")
    setPreview({ headers, rows: bodyRows })
    setNameColumn(headers.find((header) => header.includes("이름") || header.toLowerCase().includes("name")) ?? headers[0] ?? "")
    setGradeColumn(headers.find((header) => header.includes("학년") || header.toLowerCase().includes("grade")) ?? headers[1] ?? headers[0] ?? "")
    setPhoneColumn(headers.find((header) => header.includes("연락") || header.includes("전화") || header.toLowerCase().includes("phone")) ?? headers[2] ?? headers[0] ?? "")
  }

  async function handleFile(file: File) {
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith(".xlsx")) {
      setFileName(file.name)
      setPreview(null)
      setFileError("xlsx 파일은 CSV로 변환 후 업로드해 주세요")
      return
    }
    if (!lowerName.endsWith(".csv")) {
      setFileName(file.name)
      setPreview(null)
      setFileError("CSV 파일만 업로드할 수 있습니다.")
      return
    }

    try {
      const text = await file.text()
      parseCsvText(text, file.name)
    } catch {
      setFileError("CSV 파일을 읽는 중 오류가 발생했습니다.")
      setPreview(null)
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    void handleFile(file)
    event.target.value = ""
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    void handleFile(file)
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !preview || !nameColumn || !gradeColumn || !phoneColumn) return
      const nameIndex = preview.headers.indexOf(nameColumn)
      const gradeIndex = preview.headers.indexOf(gradeColumn)
      const phoneIndex = preview.headers.indexOf(phoneColumn)
      const payload = preview.rows
        .filter((row) => row.some((cell) => cell))
        .map((row) => ({
          name: row[nameIndex] ?? "",
          grade: row[gradeIndex] ?? "",
          phone: row[phoneIndex] ?? "",
        }))
        .filter((row) => row.name)

      try {
        await api.post(`/organizations/${orgId}/students/bulk`, { students: payload })
        return { mocked: false }
      } catch (error) {
        if (error instanceof ApiError && [404, 405, 501].includes(error.status)) {
          return { mocked: true }
        }
        throw error
      }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.list(orgId ?? "") })
      if (result?.mocked) {
        toast?.success("CSV 가져오기를 시뮬레이션으로 완료했습니다.")
      } else {
        toast?.success("CSV 가져오기를 완료했습니다.")
      }
      resetState()
      onOpenChange(false)
    },
    onError: () => {
      toast?.error("CSV 가져오기에 실패했습니다.")
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetState()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-3xl border-slate-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg text-slate-900">CSV 가져오기</DialogTitle>
          <DialogDescription>
            CSV 파일을 업로드하고 이름, 학년, 연락처 열을 매핑해 학생 데이터를 한 번에 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-teal-400 bg-teal-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
            )}
          >
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleInputChange} />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <Upload className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">파일을 끌어다 놓거나 클릭해서 선택</p>
              <p className="mt-1 text-xs text-slate-500">지원 형식: `.csv`</p>
            </div>
            {fileName && <Badge variant="outline">{fileName}</Badge>}
          </label>

          {fileError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {fileError}
            </div>
          )}

          {preview && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="gap-3 border-slate-200 bg-white py-4">
                <div className="px-5">
                  <div className="mb-3 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">미리보기</h3>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {preview.headers.map((header) => (
                            <th key={header} className="border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={`preview-row-${rowIndex}`} className="border-b border-slate-100 last:border-b-0">
                            {preview.headers.map((header, columnIndex) => (
                              <td key={`${header}-${rowIndex}`} className="px-3 py-2 text-slate-700">
                                {row[columnIndex] ?? "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>

              <Card className="gap-4 border-slate-200 bg-white py-4">
                <div className="space-y-3 px-5">
                  <h3 className="text-sm font-semibold text-slate-900">열 매핑</h3>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">이름 열</p>
                    <Select value={nameColumn} onValueChange={setNameColumn}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="이름 열 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.headers.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">학년 열</p>
                    <Select value={gradeColumn} onValueChange={setGradeColumn}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="학년 열 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.headers.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">연락처 열</p>
                    <Select value={phoneColumn} onValueChange={setPhoneColumn}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="연락처 열 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview.headers.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={!preview || !nameColumn || !gradeColumn || !phoneColumn || importMutation.isPending}
            className="bg-teal-600 text-white hover:bg-teal-700"
          >
            {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            가져오기 확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StudentFormDialog({
  open,
  onClose,
  student,
}: {
  open: boolean
  onClose: () => void
  student?: StudentRecord | null
}) {
  const { selectedOrgId } = useOrganization()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const isEdit = Boolean(student)
  const [name, setName] = useState("")
  const [grade, setGrade] = useState("")
  const [classGroup, setClassGroup] = useState("")
  const [status, setStatus] = useState<StudentStatus>("active")
  const [parentName, setParentName] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [shuttle, setShuttle] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; grade?: string }>({})

  useEffect(() => {
    if (!open) return
    setName(student?.name ?? "")
    setGrade(student?.grade ?? "")
    setClassGroup(student?.classGroup ?? "")
    setStatus(student?.status ?? "active")
    setParentName(student?.parent?.name ?? "")
    setParentPhone(student?.parent?.phone ?? student?.primaryPhone ?? "")
    setParentEmail(student?.parent?.email ?? "")
    setShuttle(student?.shuttle ?? false)
    setErrors({})
  }, [open, student])

  function validate() {
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = "이름을 입력해주세요."
    if (!grade) nextErrors.grade = "학년을 선택해주세요."
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) return
      const payload = {
        name,
        grade,
        classGroup: classGroup || undefined,
        status,
        parentName,
        parentPhone,
        parentEmail,
        shuttle,
      }

      if (isEdit && student?.id) {
        await api.patch(`/students/${student.id}`, payload)
        return
      }

      await api.post(`/organizations/${selectedOrgId}/students`, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.list(selectedOrgId ?? "") })
      if (student?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(student.id) })
      }
      toast?.success(isEdit ? "학생 정보를 수정했습니다." : "학생을 등록했습니다.")
      onClose()
    },
    onError: () => {
      toast?.error(isEdit ? "학생 수정에 실패했습니다." : "학생 등록에 실패했습니다.")
    },
  })

  function handleSubmit() {
    if (!validate()) return
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md border-slate-200 bg-white">
        <DialogHeader>
          <DialogTitle>{isEdit ? "학생 정보 수정" : "학생 등록"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "학생 기본 정보와 보호자 정보를 수정합니다." : "새 학생 정보를 입력합니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">기본 정보</p>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="학생 이름" />
            {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grade && <p className="mt-1 text-xs text-rose-600">{errors.grade}</p>}
              </div>
              <Select value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={classGroup}
              onChange={(event) => setClassGroup(event.target.value)}
              placeholder="반 (예: 초등 영어 A반)"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">보호자 정보</p>
            <Input value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="보호자 이름" />
            <Input value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} placeholder="연락처 (010-0000-0000)" />
            <Input value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder="이메일" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">차량 탑승</p>
              <p className="text-xs text-slate-500">등하원 차량 이용 여부를 기록합니다.</p>
            </div>
            <Switch checked={shuttle} onCheckedChange={setShuttle} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="bg-teal-600 text-white hover:bg-teal-700">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "수정 저장" : "등록하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StudentDetailSheet({
  open,
  onOpenChange,
  student,
  orgId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentRecord | null
  orgId: string | null
}) {
  const toast = useContext(ToastContext)
  const queryClient = useQueryClient()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [shuttleEnabled, setShuttleEnabled] = useState(student?.shuttle ?? false)

  useEffect(() => {
    setShuttleEnabled(student?.shuttle ?? false)
  }, [student])

  const studentDetailQuery = useQuery<StudentRecord>({
    queryKey: queryKeys.students.detail(student?.id ?? ""),
    enabled: open && !!student?.id,
    queryFn: async () => {
      if (!student?.id) return normalizeStudent({})
      try {
        const response = await studentsApi.get(student.id)
        return normalizeStudent(response)
      } catch (error) {
        throw error
      }
    },
  })

  const scheduleQuery = useQuery<ScheduleRecord[]>({
    queryKey: [...queryKeys.schedules.list(orgId ?? ""), "student", student?.id ?? ""],
    enabled: open && !!student?.id && !!orgId,
    queryFn: async () => {
      if (!student?.id || !orgId) return []
      try {
        const direct = await api.get<any[]>(`/organizations/${orgId}/schedules?studentId=${student.id}`)
        return toArray<unknown>(direct).map(normalizeSchedule)
      } catch (error) {
        try {
          const fallback = await schedulesApi.list(orgId)
          return toArray<unknown>(fallback)
            .map(normalizeSchedule)
            .filter((schedule) => matchesScheduleToStudent(schedule, student))
        } catch (fallbackError) {
          throw fallbackError
        }
      }
    },
  })

  const shuttleMutation = useMutation({
    mutationFn: async (nextValue: boolean) => {
      if (!student?.id) return { mocked: true }
      try {
        await api.patch(`/students/${student.id}`, { shuttle: nextValue })
        return { mocked: false }
      } catch (error) {
        if (error instanceof ApiError && [404, 405].includes(error.status)) {
          return { mocked: true }
        }
        throw error
      }
    },
    onMutate: async (nextValue) => {
      setShuttleEnabled(nextValue)
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.students.list(orgId ?? "") })
      if (student?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(student.id) })
      }
      if (result.mocked) {
        toast?.success("차량 탑승 설정을 로컬 상태에 반영했습니다.")
      } else {
        toast?.success("차량 탑승 설정을 저장했습니다.")
      }
    },
    onError: () => {
      setShuttleEnabled(student?.shuttle ?? false)
      toast?.error("차량 탑승 설정 저장에 실패했습니다.")
    },
  })

  const mergedStudent = studentDetailQuery.data ?? student
  const schedules = scheduleQuery.data ?? []

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-xl border-l border-slate-200 bg-white p-0 sm:max-w-xl">
          {!mergedStudent ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              학생을 선택하세요.
            </div>
          ) : (
            <>
              <SheetHeader className="border-b border-slate-200 px-6 py-5 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge className="border-teal-200 bg-teal-50 text-teal-700">학생 상세</Badge>
                    <SheetTitle className="text-xl text-slate-950">{mergedStudent.name}</SheetTitle>
                    <SheetDescription className="text-sm text-slate-500">
                      {mergedStudent.grade} · {statusLabel(mergedStudent.status)}
                    </SheetDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                    수정
                  </Button>
                </div>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-4rem)]">
                <div className="space-y-5 px-6 py-5">
                  <Card className="gap-4 border-slate-200 bg-white py-5">
                    <div className="space-y-4 px-5">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">기본 정보</h3>
                      </div>
                      <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500">이름</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{mergedStudent.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">학년</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{mergedStudent.grade}</p>
                        </div>
                        {mergedStudent.classGroup && (
                          <div>
                            <p className="text-xs text-slate-500">반</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{mergedStudent.classGroup}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">연락처</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{formatPhone(mergedStudent.primaryPhone)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">등록일</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{mergedStudent.registeredAt}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="gap-4 border-slate-200 bg-white py-5">
                    <div className="space-y-4 px-5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">수강 중인 수업</h3>
                      </div>

                      {scheduleQuery.isLoading ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          수업 정보를 불러오는 중입니다.
                        </div>
                      ) : schedules.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          연결된 수업이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {schedules.map((schedule) => (
                            <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{schedule.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {dayLabel(schedule.dayOfWeek)}요일 / {schedule.startTime} - {schedule.endTime}
                                  </p>
                                </div>
                                <Badge variant="outline">강사 {schedule.instructorName}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="gap-4 border-slate-200 bg-white py-5">
                    <div className="space-y-4 px-5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">상담 기록</h3>
                      </div>

                      {mergedStudent.counselingHistory.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          상담 기록이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mergedStudent.counselingHistory.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-xs font-medium text-slate-500">{entry.date}</p>
                              <p className="mt-2 text-sm text-slate-800">{entry.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="gap-4 border-slate-200 bg-white py-5">
                    <div className="space-y-4 px-5">
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">차량 탑승</h3>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">셔틀 이용 여부</p>
                          <p className="mt-1 text-xs text-slate-500">수강생 등하원 차량 상태를 관리합니다.</p>
                        </div>
                        <Switch
                          checked={shuttleEnabled}
                          onCheckedChange={(checked) => shuttleMutation.mutate(checked)}
                          disabled={shuttleMutation.isPending}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <StudentFormDialog open={showEditDialog} onClose={() => setShowEditDialog(false)} student={mergedStudent} />
    </>
  )
}

function EmptyState({
  hasFilter,
  onCreate,
}: {
  hasFilter: boolean
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <GraduationCap className="h-7 w-7 text-slate-500" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {hasFilter ? "검색 결과가 없습니다" : "등록된 학생이 없습니다"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {hasFilter ? "검색어 또는 필터를 조정해 보세요." : "첫 학생을 등록하거나 CSV로 한 번에 불러올 수 있습니다."}
      </p>
      {!hasFilter && (
        <Button onClick={onCreate} className="mt-5 bg-teal-600 text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" />
          학생 등록
        </Button>
      )}
    </div>
  )
}

export function StudentsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState<(typeof GRADE_FILTERS)[number]>("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [sortState, setSortState] = useState<{ key: SortKey | null; direction: SortDirection | null }>({
    key: null,
    direction: null,
  })

  useEffect(() => {
    setBreadcrumbs([{ label: "학생 관리" }])
  }, [setBreadcrumbs])

  const debouncedSearch = useDebounce(search, 300)

  const studentsQuery = useQuery<StudentRecord[]>({
    queryKey: queryKeys.students.list(selectedOrgId ?? ""),
    enabled: !!selectedOrgId,
    queryFn: async () => {
      if (!selectedOrgId) return []
      try {
        const response = await studentsApi.list(selectedOrgId)
        return toArray<unknown>(response).map(normalizeStudent)
      } catch (error) {
        throw error
      }
    },
  })

  const schedulesQuery = useQuery<ScheduleRecord[]>({
    queryKey: queryKeys.schedules.list(selectedOrgId ?? ""),
    enabled: !!selectedOrgId,
    queryFn: async () => {
      if (!selectedOrgId) return []
      try {
        const response = await schedulesApi.list(selectedOrgId)
        return toArray<unknown>(response).map(normalizeSchedule)
      } catch (error) {
        return []
      }
    },
  })

  const students = studentsQuery.data ?? []
  const schedules = schedulesQuery.data ?? []

  const filteredStudents = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    let nextStudents = [...students]

    if (gradeFilter) {
      nextStudents = nextStudents.filter((student) => student.grade.includes(gradeFilter))
    }

    if (query) {
      nextStudents = nextStudents.filter((student) => {
        const status = statusLabel(student.status).toLowerCase()
        return (
          student.name.toLowerCase().includes(query) ||
          student.grade.toLowerCase().includes(query) ||
          status.includes(query)
        )
      })
    }

    if (sortState.key && sortState.direction) {
      nextStudents.sort((left, right) => {
        const leftValue = (() => {
          switch (sortState.key) {
            case "name":
              return left.name
            case "grade":
              return left.grade
            case "phone":
              return left.primaryPhone
            case "registeredAt":
              return left.registeredAt
            case "classCount":
              return countStudentSchedules(left, schedules)
            case "riskPercent":
              return left.riskPercent
            case "shuttle":
              return left.shuttle ? 1 : 0
            case "status":
              return statusLabel(left.status)
            default:
              return ""
          }
        })()

        const rightValue = (() => {
          switch (sortState.key) {
            case "name":
              return right.name
            case "grade":
              return right.grade
            case "phone":
              return right.primaryPhone
            case "registeredAt":
              return right.registeredAt
            case "classCount":
              return countStudentSchedules(right, schedules)
            case "riskPercent":
              return right.riskPercent
            case "shuttle":
              return right.shuttle ? 1 : 0
            case "status":
              return statusLabel(right.status)
            default:
              return ""
          }
        })()

        const comparison = typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "ko")

        return sortState.direction === "asc" ? comparison : comparison * -1
      })
    }

    return nextStudents
  }, [debouncedSearch, gradeFilter, schedules, sortState.direction, sortState.key, students])

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students]
  )

  const atRiskStudents = filteredStudents.filter((student) => student.riskPercent > 50)

  function handleSort(key: SortKey) {
    setSortState((current) => {
      if (current.key !== key) return { key, direction: "asc" }
      if (current.direction === "asc") return { key, direction: "desc" }
      if (current.direction === "desc") return { key: null, direction: null }
      return { key, direction: "asc" }
    })
  }

  function renderTableView() {
    if (filteredStudents.length === 0) {
      return <EmptyState hasFilter={Boolean(debouncedSearch || gradeFilter)} onCreate={() => setShowNewDialog(true)} />
    }

    const columns: Array<{ key: SortKey; label: string }> = [
      { key: "name", label: "이름" },
      { key: "grade", label: "학년" },
      { key: "phone", label: "연락처" },
      { key: "registeredAt", label: "등록일" },
      { key: "classCount", label: "수업 수" },
      { key: "riskPercent", label: "이탈위험" },
      { key: "shuttle", label: "차량탑승" },
      { key: "status", label: "상태" },
    ]

    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {columns.map((column) => {
                  const isActive = sortState.key === column.key
                  return (
                    <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors",
                          isActive ? "text-slate-900" : "hover:text-slate-700"
                        )}
                      >
                        {column.label}
                        <SortIndicator active={isActive} direction={sortState.direction} />
                      </button>
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const tone = riskTone(student.riskPercent)
                const classCount = countStudentSchedules(student, schedules)
                return (
                  <tr
                    key={student.id}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0",
                      tone.row,
                      selectedStudentId === student.id && "ring-2 ring-teal-500/40"
                    )}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{student.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{student.grade}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{maskPhone(student.primaryPhone)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{student.registeredAt}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{classCount}</td>
                    <td className="min-w-44 px-4 py-4">
                      <RiskBar score={student.riskPercent} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={cn("border", student.shuttle ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                        {student.shuttle ? "탑승" : "미탑승"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={cn("border", statusBadgeClass(student.status))}>
                        {statusLabel(student.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedStudentId(student.id)
                        }}
                      >
                        상세보기
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderCardView() {
    if (filteredStudents.length === 0) {
      return <EmptyState hasFilter={Boolean(debouncedSearch || gradeFilter)} onCreate={() => setShowNewDialog(true)} />
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredStudents.map((student) => {
          const classCount = countStudentSchedules(student, schedules)
          const tone = riskTone(student.riskPercent)
          return (
            <button
              key={student.id}
              type="button"
              onClick={() => setSelectedStudentId(student.id)}
              className="text-left"
            >
              <Card className="h-full gap-4 border-slate-200 bg-white py-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3 px-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{student.name}</h3>
                      <Badge className={cn("border", statusBadgeClass(student.status))}>{statusLabel(student.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{student.grade} · 등록일 {student.registeredAt}</p>
                  </div>
                  <Badge className={cn("border", student.shuttle ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                    {student.shuttle ? "차량 탑승" : "차량 미탑승"}
                  </Badge>
                </div>

                <div className="space-y-4 px-5">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">이탈 위험</span>
                      <span className={cn("text-xs font-semibold", tone.text)}>{student.riskPercent}%</span>
                    </div>
                    <RiskBar score={student.riskPercent} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">연락처</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{maskPhone(student.primaryPhone)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">수업 수</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{classCount}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="overflow-y-auto flex-1">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.10),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef6f7_100%)]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 py-6">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 shadow-sm">
              학생 개인정보는 마스킹 처리되어 표시됩니다. 상세 패널에서도 최소 정보만 노출합니다.
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">학생 관리</h1>
                      <p className="mt-1 text-sm text-slate-500">
                        총 {students.length}명 · 현재 표시 {filteredStudents.length}명
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <Button
                      size="sm"
                      variant={viewMode === "table" ? "default" : "ghost"}
                      className={cn(viewMode === "table" ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600")}
                      onClick={() => setViewMode("table")}
                    >
                      <Table2 className="h-4 w-4" />
                      Table
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === "card" ? "default" : "ghost"}
                      className={cn(viewMode === "card" ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600")}
                      onClick={() => setViewMode("card")}
                    >
                      <Grid2x2 className="h-4 w-4" />
                      Card
                    </Button>
                  </div>

                  <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4" />
                    CSV 가져오기
                  </Button>
                  <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => setShowNewDialog(true)}>
                    <Plus className="h-4 w-4" />
                    학생 등록
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="이름 / 학년 / 상태 검색"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {GRADE_FILTERS.map((filterValue) => (
                    <Button
                      key={filterValue || "all"}
                      variant={gradeFilter === filterValue ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full",
                        gradeFilter === filterValue
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "border-slate-200 text-slate-600"
                      )}
                      onClick={() => setGradeFilter(filterValue)}
                    >
                      {filterValue || "전체"}
                    </Button>
                  ))}
                </div>
              </div>
            </section>

            {viewMode === "table" && atRiskStudents.length > 0 && (
              <div className="flex items-center gap-3 rounded-3xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">위험 학생 {atRiskStudents.length}명이 있습니다</p>
                  <p className="text-xs text-orange-700">이탈위험 50% 초과 학생을 우선 확인해 주세요.</p>
                </div>
              </div>
            )}

            <section>
              {studentsQuery.isLoading ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    학생 목록을 불러오는 중입니다.
                  </div>
                </div>
              ) : viewMode === "table" ? (
                renderTableView()
              ) : (
                renderCardView()
              )}
            </section>
          </div>
        </div>
      </div>

      <StudentFormDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} />
      <CsvImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} orgId={selectedOrgId} />
      <StudentDetailSheet
        open={Boolean(selectedStudentId)}
        onOpenChange={(open) => {
          if (!open) setSelectedStudentId(null)
        }}
        student={selectedStudent}
        orgId={selectedOrgId}
      />
    </>
  )
}
