import React, { useContext, useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { studentsApi } from "@/api/students"
import { schedulesApi } from "@/api/schedules"
import { casesApi } from "@/api/cases"
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
import { CommonPropertiesRows, PropertiesCard, PropertiesRow } from "@/components/PropertiesRows"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useActiveOrgId, useOrganization } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
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

interface BillingProfile {
  payerName: string
  paymentMethod: string
  bankName: string
  accountHolder: string
  accountNumberMasked: string
  cardLabel: string
  cardLast4: string
  billingMemo: string
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
  billing: BillingProfile
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

const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "계좌이체" },
  { value: "card", label: "카드" },
  { value: "mixed", label: "혼합" },
  { value: "cash", label: "현금" },
]

const GRADE_FILTERS = ["", "초", "중", "고", "성인"] as const

const themeClass = {
  surface: "border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]",
  surfaceMuted: "border-[var(--border-default)] bg-[var(--bg-secondary)]",
  surfaceTertiary: "bg-[var(--bg-tertiary)]",
  textPrimary: "text-[var(--text-primary)]",
  textSecondary: "text-[var(--text-secondary)]",
  textTertiary: "text-[var(--text-tertiary)]",
}

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

function statusBadgeStyle(status: StudentStatus): React.CSSProperties {
  switch (status) {
    case "active":
      return { backgroundColor: "rgba(16,185,129,0.12)", color: "var(--color-success)" }
    case "inactive":
      return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }
    case "at_risk":
      return { backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }
    case "withdrawn":
      return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-disabled)" }
    default:
      return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }
  }
}

function paymentMethodLabel(value: string): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? (value || "-")
}

function billingSummary(billing: BillingProfile): string {
  if (billing.bankName || billing.accountNumberMasked) {
    return `${billing.bankName || "계좌"} ${billing.accountNumberMasked}`.trim()
  }
  if (billing.cardLabel || billing.cardLast4) {
    return `${billing.cardLabel || "카드"}${billing.cardLast4 ? ` · **** ${billing.cardLast4}` : ""}`.trim()
  }
  return "-"
}

function hasGuardianRecord(student: StudentRecord): boolean {
  return Boolean(student.parent?.name || student.parents.length > 0)
}

function hasGuardianContact(student: StudentRecord): boolean {
  return Boolean(student.parent?.phone || student.parents.some((parent) => Boolean(parent.phone)))
}

function hasBillingRecord(billing: BillingProfile): boolean {
  return Boolean(
    billing.paymentMethod &&
      (
        (billing.bankName && billing.accountNumberMasked) ||
        billing.cardLast4 ||
        billing.cardLabel
      ),
  )
}

function autoBillingLabel(billing: BillingProfile): string {
  if (/자동/.test(billing.billingMemo)) return "자동 청구"
  if (billing.paymentMethod) return "수동 확인"
  return "미정"
}

function studentOpsAlerts(student: StudentRecord, relatedCaseCount = 0): string[] {
  const alerts: string[] = []
  if (!hasGuardianRecord(student)) alerts.push("보호자 미등록")
  if (!hasGuardianContact(student)) alerts.push("보호자 연락처 보완")
  if (!student.billing.paymentMethod) alerts.push("결제 방식 미등록")
  if (!hasBillingRecord(student.billing)) alerts.push("결제 수단 보완")
  if (student.riskPercent >= 70) alerts.push("이탈 위험 높음")
  if (student.riskPercent >= 60 && relatedCaseCount === 0) alerts.push("점검 케이스 없음")
  return alerts
}

function studentOpsReadiness(student: StudentRecord): {
  guardian: "ready" | "attention"
  billing: "ready" | "attention"
} {
  return {
    guardian: hasGuardianRecord(student) && hasGuardianContact(student) ? "ready" : "attention",
    billing: hasBillingRecord(student.billing) ? "ready" : "attention",
  }
}

function summarizeAttendance(records: AttendanceRecord[]) {
  return records.reduce(
    (acc, record) => {
      if (record.status === "absent") acc.absent += 1
      if (record.status === "late") acc.late += 1
      if (record.status === "excused") acc.excused += 1
      return acc
    },
    { absent: 0, late: 0, excused: 0 },
  )
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
    row: "hover:bg-[var(--bg-secondary)]",
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
  const billingRecord = isRecord(record.billing) ? record.billing : isRecord(record.metadata) && isRecord(record.metadata.billing) ? record.metadata.billing : {}
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
    billing: {
      payerName: toStringValue(billingRecord.payerName, parent?.name),
      paymentMethod: toStringValue(billingRecord.paymentMethod),
      bankName: toStringValue(billingRecord.bankName),
      accountHolder: toStringValue(billingRecord.accountHolder),
      accountNumberMasked: toStringValue(billingRecord.accountNumberMasked),
      cardLabel: toStringValue(billingRecord.cardLabel),
      cardLast4: toStringValue(billingRecord.cardLast4),
      billingMemo: toStringValue(billingRecord.billingMemo, billingRecord.memo),
    },
    attendance,
    counselingHistory: normalizeCounselingHistory(record.counselingHistory ?? record.counselings ?? record.consultations),
    shuttle,
    classCount: toNumberValue(record.classCount, record.scheduleCount, record.courseCount),
    classGroup: toStringValue(record.classGroup, record.class_group, record.className) || undefined,
  }
}

function normalizeSchedule(value: unknown): ScheduleRecord {
  const record = isRecord(value) ? value : {}
  const gradeSource =
    record.grades ??
    (typeof record.grade === "string" && record.grade.trim() ? [record.grade] : [])
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
    grades: toArray<unknown>(gradeSource).map((entry) => {
      if (typeof entry === "string") return entry
      return ""
    }).filter(Boolean),
  }
}

function normalizeSchedules(value: unknown): ScheduleRecord[] {
  return toArray<unknown>(value).map(normalizeSchedule)
}

function matchesScheduleToStudent(schedule: ScheduleRecord, student: StudentRecord): boolean {
  const studentIds = Array.isArray(schedule.studentIds) ? schedule.studentIds : []
  const grades = Array.isArray(schedule.grades) ? schedule.grades : []
  const title = typeof schedule.title === "string" ? schedule.title : ""
  if (studentIds.includes(student.id)) return true
  if (grades.includes(student.grade)) return true
  const group = gradeGroup(student.grade)
  return title.includes(student.grade) || title.includes(group)
}

function matchesScheduleToStudentStrict(schedule: ScheduleRecord, student: StudentRecord): boolean {
  return schedule.studentIds.includes(student.id)
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
  if (!active || !direction) return <span className={themeClass.textTertiary}>·</span>
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
      <DialogContent className={cn("max-w-3xl", themeClass.surface)}>
        <DialogHeader>
          <DialogTitle className={cn("text-lg", themeClass.textPrimary)}>CSV 가져오기</DialogTitle>
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
              dragging ? "border-teal-400 bg-teal-50" : "border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
            )}
          >
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleInputChange} />
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", themeClass.surface)}>
              <Upload className={cn("h-5 w-5", themeClass.textSecondary)} />
            </div>
            <div>
              <p className={cn("text-sm font-medium", themeClass.textPrimary)}>파일을 끌어다 놓거나 클릭해서 선택</p>
              <p className={cn("mt-1 text-xs", themeClass.textSecondary)}>지원 형식: `.csv`</p>
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
              <Card className={cn("gap-3 py-4", themeClass.surface)}>
                <div className="px-5">
                  <div className="mb-3 flex items-center gap-2">
                    <FileSpreadsheet className={cn("h-4 w-4", themeClass.textSecondary)} />
                    <h3 className={cn("text-sm font-semibold", themeClass.textPrimary)}>미리보기</h3>
                  </div>
                  <div className={cn("overflow-hidden rounded-xl border", themeClass.surfaceMuted)}>
                    <table className="w-full border-collapse text-sm">
                      <thead className={themeClass.surfaceTertiary}>
                        <tr>
                          {preview.headers.map((header) => (
                            <th key={header} className={cn("border-b px-3 py-2 text-left font-medium", themeClass.surfaceMuted, themeClass.textSecondary)}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={`preview-row-${rowIndex}`} className="border-b border-[var(--border-default)] last:border-b-0">
                            {preview.headers.map((header, columnIndex) => (
                              <td key={`${header}-${rowIndex}`} className={cn("px-3 py-2", themeClass.textSecondary)}>
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

              <Card className={cn("gap-4 py-4", themeClass.surface)}>
                <div className="space-y-3 px-5">
                  <h3 className={cn("text-sm font-semibold", themeClass.textPrimary)}>열 매핑</h3>
                  <div className="space-y-2">
                    <p className={cn("text-xs", themeClass.textSecondary)}>이름 열</p>
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
                    <p className={cn("text-xs", themeClass.textSecondary)}>학년 열</p>
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
                    <p className={cn("text-xs", themeClass.textSecondary)}>연락처 열</p>
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
            className="border-0 text-white"
            style={{ backgroundColor: "var(--color-teal-500)" }}
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
  const [parentRelation, setParentRelation] = useState("부모")
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [payerName, setPayerName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [cardLabel, setCardLabel] = useState("")
  const [cardLast4, setCardLast4] = useState("")
  const [billingMemo, setBillingMemo] = useState("")
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
    setParentRelation(student?.parent?.relation ?? "부모")
    setPaymentMethod(student?.billing.paymentMethod || "bank_transfer")
    setPayerName(student?.billing.payerName ?? student?.parent?.name ?? "")
    setBankName(student?.billing.bankName ?? "")
    setAccountHolder(student?.billing.accountHolder ?? "")
    setAccountNumber(student?.billing.accountNumberMasked ?? "")
    setCardLabel(student?.billing.cardLabel ?? "")
    setCardLast4(student?.billing.cardLast4 ?? "")
    setBillingMemo(student?.billing.billingMemo ?? "")
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
        parentRelation,
        billing: {
          payerName,
          paymentMethod,
          bankName,
          accountHolder,
          accountNumber,
          cardLabel,
          cardLast4,
          memo: billingMemo,
        },
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
      <DialogContent className={cn("max-w-md", themeClass.surface)}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "학생 정보 수정" : "학생 등록"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "학생 기본 정보와 보호자 정보를 수정합니다." : "새 학생 정보를 입력합니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className={cn("text-xs font-medium", themeClass.textSecondary)}>기본 정보</p>
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
            <p className={cn("text-xs font-medium", themeClass.textSecondary)}>보호자 정보</p>
            <Input value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="보호자 이름" />
            <Input value={parentRelation} onChange={(event) => setParentRelation(event.target.value)} placeholder="관계 (모/부/본인)" />
            <Input value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} placeholder="연락처 (010-0000-0000)" />
            <Input value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder="이메일" />
          </div>

          <div className="space-y-2">
            <p className={cn("text-xs font-medium", themeClass.textSecondary)}>결제 정보</p>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="결제 방식 선택" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={payerName} onChange={(event) => setPayerName(event.target.value)} placeholder="납부자명" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="은행명" />
              <Input value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} placeholder="예금주" />
            </div>
            <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="계좌번호 또는 마스킹값" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={cardLabel} onChange={(event) => setCardLabel(event.target.value)} placeholder="카드 라벨" />
              <Input value={cardLast4} onChange={(event) => setCardLast4(event.target.value)} placeholder="카드 끝 4자리" />
            </div>
            <Input value={billingMemo} onChange={(event) => setBillingMemo(event.target.value)} placeholder="납부 메모" />
          </div>

          <div className={cn("flex items-center justify-between rounded-xl border px-4 py-3", themeClass.surfaceMuted)}>
            <div>
              <p className={cn("text-sm font-medium", themeClass.textPrimary)}>차량 탑승</p>
              <p className={cn("text-xs", themeClass.textSecondary)}>등하원 차량 이용 여부를 기록합니다.</p>
            </div>
            <Switch checked={shuttle} onCheckedChange={setShuttle} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="border-0 text-white" style={{ backgroundColor: "var(--color-teal-500)" }}>
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
  orgPrefix,
  relatedCases,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentRecord | null
  orgId: string | null
  orgPrefix?: string
  relatedCases: any[]
}) {
  const toast = useContext(ToastContext)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
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
            .filter((schedule) => matchesScheduleToStudentStrict(schedule, student))
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
  const relatedProjects = Array.from(
    new Map(
      relatedCases
        .filter((item: any) => item.projectId || item.project?.id || item.opsGroupId)
        .map((item: any) => [
          String(item.projectId ?? item.project?.id ?? item.opsGroupId),
          {
            id: String(item.projectId ?? item.project?.id ?? item.opsGroupId),
            name: String(item.projectName ?? item.project?.name ?? "연결 프로젝트"),
          },
        ]),
    ).values(),
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={cn("min-h-0 w-full max-w-xl border-l p-0 sm:max-w-xl", themeClass.surface)}>
          {!mergedStudent ? (
            <div className={cn("flex h-full items-center justify-center", themeClass.textSecondary)}>
              학생을 선택하세요.
            </div>
          ) : (
            <>
              {(() => {
                const opsAlerts = studentOpsAlerts(mergedStudent, relatedCases.length)
                const readiness = studentOpsReadiness(mergedStudent)
                return (
                  <SheetHeader className={cn("border-b px-6 py-5 text-left", themeClass.surfaceMuted)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Badge className="border-0" style={{ backgroundColor: "var(--color-primary-bg)", color: "var(--color-teal-500)" }}>학생 상세</Badge>
                        <SheetTitle className={cn("text-xl", themeClass.textPrimary)}>{mergedStudent.name}</SheetTitle>
                        <SheetDescription className={cn("text-sm", themeClass.textSecondary)}>
                          {mergedStudent.grade} · {statusLabel(mergedStudent.status)}
                        </SheetDescription>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={cn("border", readiness.guardian === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                            보호자 {readiness.guardian === "ready" ? "준비됨" : "보완 필요"}
                          </Badge>
                          <Badge className={cn("border", readiness.billing === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                            결제 {readiness.billing === "ready" ? "준비됨" : "보완 필요"}
                          </Badge>
                          {opsAlerts.slice(0, 2).map((alert) => (
                            <Badge key={alert} className="border-amber-200 bg-[var(--bg-elevated)] text-amber-800">{alert}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                        수정
                      </Button>
                    </div>
                  </SheetHeader>
                )
              })()}
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 px-6 py-5 pb-8">
                  <DetailSection icon={<User className={cn("h-4 w-4", themeClass.textSecondary)} />} title="기본 정보">
                    <div className={cn("grid gap-3 rounded-[18px] p-4 sm:grid-cols-2", themeClass.surfaceTertiary)}>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>이름</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.name}</p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>학년</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.grade}</p>
                        </div>
                        {mergedStudent.classGroup && (
                          <div>
                            <p className={cn("text-xs", themeClass.textSecondary)}>반</p>
                            <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.classGroup}</p>
                          </div>
                        )}
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>연락처</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{formatPhone(mergedStudent.primaryPhone)}</p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>등록일</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.registeredAt}</p>
                        </div>
                      </div>
                  </DetailSection>

                  <DetailSection icon={<Phone className={cn("h-4 w-4", themeClass.textSecondary)} />} title="보호자 · 결제 정보">
                    <div className={cn("grid gap-3 rounded-[18px] p-4 sm:grid-cols-2", themeClass.surfaceTertiary)}>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>주 보호자</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.parent?.name ?? "-"}</p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>관계</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.parent?.relation ?? "-"}</p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>보호자 연락처</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{formatPhone(mergedStudent.parent?.phone ?? "")}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className={cn("text-xs", themeClass.textSecondary)}>등록된 보호자</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {mergedStudent.parents.length > 0 ? (
                              mergedStudent.parents.map((parent) => (
                                <Badge key={parent.id} variant="outline">
                                  {parent.name} · {parent.relation || "보호자"}
                                </Badge>
                              ))
                            ) : (
                              <span className={cn("text-sm font-medium", themeClass.textPrimary)}>미등록</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>납부자</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.billing.payerName || "-"}</p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>결제 방식</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{paymentMethodLabel(mergedStudent.billing.paymentMethod)}</p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>계좌</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>
                            {mergedStudent.billing.bankName || mergedStudent.billing.accountNumberMasked
                              ? `${mergedStudent.billing.bankName || "계좌"} ${mergedStudent.billing.accountNumberMasked}`.trim()
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>카드</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>
                            {mergedStudent.billing.cardLabel || mergedStudent.billing.cardLast4
                              ? `${mergedStudent.billing.cardLabel || "카드"} ${mergedStudent.billing.cardLast4 ? `· **** ${mergedStudent.billing.cardLast4}` : ""}`.trim()
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className={cn("text-xs", themeClass.textSecondary)}>메모</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{mergedStudent.billing.billingMemo || "-"}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className={cn("text-xs", themeClass.textSecondary)}>결제 요약</p>
                          <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{billingSummary(mergedStudent.billing)}</p>
                        </div>
                      </div>
                  </DetailSection>

                  <DetailSection icon={<BookOpen className={cn("h-4 w-4", themeClass.textSecondary)} />} title="수강 중인 수업">

                      {scheduleQuery.isLoading ? (
                        <div className={cn("flex items-center gap-2 rounded-[18px] border px-4 py-6 text-sm", themeClass.surfaceMuted, themeClass.textSecondary)}>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          수업 정보를 불러오는 중입니다.
                        </div>
                      ) : schedules.length === 0 ? (
                        <div className={cn("rounded-[18px] border px-4 py-4 text-sm", themeClass.surfaceMuted, themeClass.textSecondary)}>
                          연결된 수업이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {schedules.map((schedule) => (
                            <div key={schedule.id} className={cn("rounded-[18px] border px-4 py-3", themeClass.surfaceMuted)}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className={cn("text-sm font-semibold", themeClass.textPrimary)}>{schedule.title}</p>
                                  <p className={cn("mt-1 text-xs", themeClass.textSecondary)}>
                                    {dayLabel(schedule.dayOfWeek)}요일 / {schedule.startTime} - {schedule.endTime}
                                  </p>
                                </div>
                                <Badge variant="outline">담당 {schedule.instructorName}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </DetailSection>

                  <DetailSection icon={<MessageSquare className={cn("h-4 w-4", themeClass.textSecondary)} />} title="상담 기록">

                      {mergedStudent.counselingHistory.length === 0 ? (
                        <div className={cn("rounded-[18px] border px-4 py-4 text-sm", themeClass.surfaceMuted, themeClass.textSecondary)}>
                          상담 기록이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mergedStudent.counselingHistory.map((entry) => (
                            <div key={entry.id} className={cn("rounded-[18px] border px-4 py-3", themeClass.surfaceMuted)}>
                              <p className={cn("text-xs font-medium", themeClass.textSecondary)}>{entry.date}</p>
                              <p className={cn("mt-2 text-sm", themeClass.textPrimary)}>{entry.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                  </DetailSection>

                  <DetailSection icon={<Bus className={cn("h-4 w-4", themeClass.textSecondary)} />} title="차량 탑승" muted>
                      <div className={cn("flex items-center justify-between rounded-[18px] border px-4 py-4", themeClass.surfaceMuted)}>
                        <div>
                          <p className={cn("text-sm font-medium", themeClass.textPrimary)}>셔틀 이용 여부</p>
                          <p className={cn("mt-1 text-xs", themeClass.textSecondary)}>수강생 등하원 차량 상태를 관리합니다.</p>
                        </div>
                        <Switch
                          checked={shuttleEnabled}
                          onCheckedChange={(checked) => shuttleMutation.mutate(checked)}
                          disabled={shuttleMutation.isPending}
                        />
                      </div>
                  </DetailSection>

                  <DetailSection icon={<BookOpen className={cn("h-4 w-4", themeClass.textSecondary)} />} title="운영 바로가기">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button variant="outline" onClick={() => orgPrefix && navigate(`/${orgPrefix}/cases`)}>
                          관련 케이스 보기
                        </Button>
                        <Button variant="outline" onClick={() => orgPrefix && navigate(`/${orgPrefix}/schedule`)}>
                          연결 일정 보기
                        </Button>
                        <Button
                          variant="outline"
                          disabled={relatedProjects.length === 0}
                          onClick={() => {
                            const firstProject = relatedProjects[0]
                            if (orgPrefix && firstProject) navigate(`/${orgPrefix}/projects/${firstProject.id}`)
                          }}
                        >
                          연결 프로젝트 보기
                        </Button>
                        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                          학생 정보 수정
                        </Button>
                      </div>
                  </DetailSection>
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
    <div className={cn("flex flex-col items-center justify-center rounded-[20px] border border-dashed px-8 py-14 text-center", themeClass.surface)}>
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", themeClass.surfaceTertiary)}>
        <GraduationCap className={cn("h-7 w-7", themeClass.textSecondary)} />
      </div>
      <h3 className={cn("mt-4 text-base font-semibold", themeClass.textPrimary)}>
        {hasFilter ? "검색 결과가 없습니다" : "등록된 학생이 없습니다"}
      </h3>
      <p className={cn("mt-2 max-w-sm text-sm", themeClass.textSecondary)}>
        {hasFilter ? "검색어 또는 필터를 조정해 보세요." : "첫 학생을 등록하거나 CSV로 한 번에 불러올 수 있습니다."}
      </p>
      {!hasFilter && (
        <Button onClick={onCreate} className="mt-5 border-0 text-white" style={{ backgroundColor: "var(--color-teal-500)" }}>
          <Plus className="h-4 w-4" />
          학생 등록
        </Button>
      )}
    </div>
  )
}

function DetailSection({
  icon,
  title,
  children,
  muted = false,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section className={cn("space-y-4 rounded-[20px] border p-5", muted ? themeClass.surfaceMuted : themeClass.surface)}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={cn("text-sm font-semibold", themeClass.textPrimary)}>{title}</h3>
      </div>
      {children}
    </section>
  )
}

export function StudentsPage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { setPanelContent, openPanel } = usePanel()
  const navigate = useNavigate()
  const { orgPrefix, id: routeStudentId } = useParams<{ orgPrefix: string; id?: string }>()
  const activeOrgId = useActiveOrgId(orgPrefix)
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
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
    queryKey: queryKeys.students.list(activeOrgId ?? ""),
    enabled: !!activeOrgId,
    queryFn: async () => {
      if (!activeOrgId) return []
      try {
        const response = await studentsApi.list(activeOrgId)
        return toArray<unknown>(response).map(normalizeStudent)
      } catch (error) {
        throw error
      }
    },
  })

  const schedulesQuery = useQuery<ScheduleRecord[]>({
    queryKey: queryKeys.schedules.list(activeOrgId ?? ""),
    enabled: !!activeOrgId,
    queryFn: async () => {
      if (!activeOrgId) return []
      try {
        return await schedulesApi.list(activeOrgId)
      } catch (error) {
        return []
      }
    },
    select: normalizeSchedules,
  })

  const casesQuery = useQuery<any[]>({
    queryKey: queryKeys.cases.list(activeOrgId ?? ""),
    enabled: !!activeOrgId,
    queryFn: async () => {
      if (!activeOrgId) return []
      try {
        return await casesApi.list(activeOrgId)
      } catch {
        return []
      }
    },
  })

  const students = studentsQuery.data ?? []
  const schedules = schedulesQuery.data ?? []
  const cases = casesQuery.data ?? []

  useEffect(() => {
    if (!routeStudentId) {
      setSelectedStudentId(null)
      return
    }
    setSelectedStudentId(routeStudentId)
  }, [routeStudentId])

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
  const selectedStudentSchedules = useMemo(
    () =>
      selectedStudent
        ? schedules.filter((schedule) => schedule.studentIds.includes(selectedStudent.id))
        : [],
    [selectedStudent, schedules]
  )

  const selectedStudentCases = useMemo(
    () =>
      selectedStudent
        ? cases.filter((item: any) => String(item.studentId ?? "") === selectedStudent.id)
        : [],
    [cases, selectedStudent]
  )

  const projectCountByStudentId = useMemo(() => {
    const counts = new Map<string, number>()
    const buckets = new Map<string, Set<string>>()
    for (const item of cases) {
      const studentId = String((item as any).studentId ?? "")
      if (!studentId) continue
      const projectId = String((item as any).projectId ?? (item as any).project?.id ?? (item as any).opsGroupId ?? "")
      if (!projectId) continue
      if (!buckets.has(studentId)) buckets.set(studentId, new Set())
      buckets.get(studentId)?.add(projectId)
    }
    for (const [studentId, projectIds] of buckets.entries()) {
      counts.set(studentId, projectIds.size)
    }
    return counts
  }, [cases])

  const createStudentCaseMutation = useMutation({
    mutationFn: async (input: { type: "inquiry" | "churn"; title: string; description: string }) => {
      if (!activeOrgId || !selectedStudent) {
        throw new Error("학생을 먼저 선택하세요.")
      }

      return casesApi.create(activeOrgId, {
        title: input.title,
        description: input.description,
        type: input.type,
        severity: input.type === "churn" ? "same_day" : "normal",
        studentId: selectedStudent.id,
        source: "manual",
        metadata: {
          createdFrom: "students-panel",
          studentName: selectedStudent.name,
          parentName: selectedStudent.parent?.name ?? null,
          paymentMethod: selectedStudent.billing.paymentMethod || null,
        },
      })
    },
    onSuccess: async (created: any) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(activeOrgId ?? "") })
      toast?.success("학생 운영 케이스를 생성했습니다.")
      if (orgPrefix && created?.id) navigate(`/${orgPrefix}/cases/${created.id}`)
    },
    onError: (error) => {
      toast?.error(error instanceof Error ? error.message : "학생 운영 케이스 생성에 실패했습니다.")
    },
  })

  const atRiskStudents = filteredStudents.filter((student) => student.riskPercent > 50)
  const guardianAttentionCount = filteredStudents.filter((student) => studentOpsReadiness(student).guardian === "attention").length
  const billingAttentionCount = filteredStudents.filter((student) => studentOpsReadiness(student).billing === "attention").length

  const panelContent = useMemo(() => {
    if (!selectedStudent) {
      return (
        <div className="space-y-4">
          <CommonPropertiesRows
            status="unselected"
            priority={atRiskStudents.length > 0 ? "high" : "normal"}
            assignee="-"
            project="-"
            created="-"
            updated="-"
          />
          <PropertiesCard>
            <PropertiesRow label="Students" value={`${students.length}명`} />
            <PropertiesRow label="At Risk" value={`${atRiskStudents.length}명`} />
            <PropertiesRow label="Guardian Alert" value={`${guardianAttentionCount}명`} />
            <PropertiesRow label="Billing Alert" value={`${billingAttentionCount}명`} />
          </PropertiesCard>
        </div>
      )
    }

    const primaryGuardian = selectedStudent.parent ?? selectedStudent.parents[0] ?? null
    const attendanceSummary = summarizeAttendance(selectedStudent.attendance)
    const riskPriority = selectedStudent.riskPercent >= 70 ? "high" : selectedStudent.riskPercent >= 40 ? "medium" : "normal"
    const relatedProjects = Array.from(
      new Map(
        selectedStudentCases
          .filter((item: any) => item.projectName || item.project?.name || item.opsGroupId)
          .map((item: any) => [
            String(item.projectId ?? item.project?.id ?? item.opsGroupId),
            {
              id: String(item.projectId ?? item.project?.id ?? item.opsGroupId),
              name: String(item.projectName ?? item.project?.name ?? "연결 프로젝트"),
            },
          ]),
      ).values(),
    )
    const latestCounselingDate = selectedStudent.counselingHistory[0]?.date ?? "-"
    const relatedProjectLabel = relatedProjects[0]?.name ?? (relatedProjects.length > 1 ? `${relatedProjects.length} projects` : "-")

    return (
      <div className="space-y-4">
        <CommonPropertiesRows
          status={statusLabel(selectedStudent.status)}
          priority={`${riskPriority} (${selectedStudent.riskPercent}%)`}
          assignee={primaryGuardian?.name ?? "미배정"}
          project={relatedProjectLabel}
          created={selectedStudent.registeredAt}
          updated={latestCounselingDate}
        />

        <PropertiesCard>
          <PropertiesRow label="Schedules" value={`${selectedStudentSchedules.length}개`} />
          <PropertiesRow label="Cases" value={`${selectedStudentCases.length}건`} />
          <PropertiesRow label="Attendance" value={`결석 ${attendanceSummary.absent} / 지각 ${attendanceSummary.late}`} />
          <PropertiesRow label="Billing" value={paymentMethodLabel(selectedStudent.billing.paymentMethod)} />
        </PropertiesCard>

        <PropertiesCard className={cn(themeClass.surfaceMuted)}>
          <p className={cn("text-xs font-semibold", themeClass.textSecondary)}>바로 실행</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              size="sm"
              className="justify-start border-0 text-white"
              style={{ backgroundColor: "var(--color-teal-500)" }}
              disabled={createStudentCaseMutation.isPending}
              onClick={() =>
                createStudentCaseMutation.mutate({
                  type: "inquiry",
                  title: `${selectedStudent.name} 보호자 상담 팔로업`,
                  description: [
                    `학생: ${selectedStudent.name} (${selectedStudent.grade})`,
                    `보호자: ${primaryGuardian?.name ?? "미등록"}${primaryGuardian?.phone ? ` / ${formatPhone(primaryGuardian.phone)}` : ""}`,
                    `결제 수단: ${billingSummary(selectedStudent.billing)}`,
                    "메모: 보호자 연락 후 상담 및 안내 필요",
                  ].join("\n"),
                })
              }
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              보호자 상담 케이스 생성
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              disabled={createStudentCaseMutation.isPending}
              onClick={() =>
                createStudentCaseMutation.mutate({
                  type: "churn",
                  title: `${selectedStudent.name} 출결/이탈 위험 점검`,
                  description: [
                    `학생: ${selectedStudent.name} (${selectedStudent.grade})`,
                    `이탈 위험: ${selectedStudent.riskPercent}%`,
                    `출결: 결석 ${attendanceSummary.absent}회 / 지각 ${attendanceSummary.late}회 / 공결 ${attendanceSummary.excused}회`,
                    `기존 관련 케이스: ${selectedStudentCases.length}건`,
                  ].join("\n"),
                })
              }
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              출결/이탈 점검 케이스 생성
            </Button>
          </div>
        </PropertiesCard>
      </div>
    )
  }, [
    createStudentCaseMutation.isPending,
    navigate,
    orgPrefix,
    atRiskStudents.length,
    selectedStudent,
    selectedStudentCases,
    selectedStudentSchedules,
    setShowImportDialog,
    setShowNewDialog,
    students.length,
  ])

  useEffect(() => {
    openPanel()
  }, [openPanel])

  useEffect(() => {
    setPanelContent(panelContent)
    return () => setPanelContent(null)
  }, [panelContent, setPanelContent])

  function openStudentDetail(studentId: string) {
    setSelectedStudentId(studentId)
    if (orgPrefix) {
      navigate(`/${orgPrefix}/students/${studentId}`)
    }
  }

  function closeStudentDetail() {
    setSelectedStudentId(null)
    if (orgPrefix) {
      navigate(`/${orgPrefix}/students`)
    }
  }

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
      <div className={cn("overflow-hidden rounded-[20px] border", themeClass.surface)}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className={themeClass.surfaceTertiary}>
              <tr className="border-b border-[var(--border-default)]">
                {columns.map((column) => {
                  const isActive = sortState.key === column.key
                  return (
                    <th key={column.key} className={cn("px-4 py-3 text-left text-xs font-semibold tracking-wide", themeClass.textSecondary)}>
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors",
                          isActive ? themeClass.textPrimary : "hover:text-[var(--text-primary)]"
                        )}
                      >
                        {column.label}
                        <SortIndicator active={isActive} direction={sortState.direction} />
                      </button>
                    </th>
                  )
                })}
                <th className={cn("px-4 py-3 text-left text-xs font-semibold tracking-wide", themeClass.textSecondary)}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const tone = riskTone(student.riskPercent)
                const classCount = countStudentSchedules(student, schedules)
                const relatedCaseCount = cases.filter((item: any) => String(item.studentId ?? "") === student.id).length
                const opsAlerts = studentOpsAlerts(student, relatedCaseCount)
                return (
                  <tr
                    key={student.id}
                    className={cn(
                      "cursor-pointer border-b transition-colors last:border-b-0",
                      "border-[var(--border-default)]",
                      tone.row,
                      selectedStudentId === student.id && "ring-2 ring-teal-500/40"
                    )}
                    onClick={() => openStudentDetail(student.id)}
                  >
                    <td className="px-4 py-4">
                      <div className={cn("text-sm font-semibold", themeClass.textPrimary)}>{student.name}</div>
                      <div className={cn("mt-1 text-xs", themeClass.textSecondary)}>
                        보호자 {student.parents.length || (student.parent ? 1 : 0)}명 · {paymentMethodLabel(student.billing.paymentMethod)} · 프로젝트 {projectCountByStudentId.get(student.id) ?? 0}건
                      </div>
                      {opsAlerts.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {opsAlerts.slice(0, 2).map((alert) => (
                            <Badge key={alert} className="border-amber-200 bg-amber-50 text-amber-700">{alert}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className={cn("px-4 py-4 text-sm", themeClass.textPrimary)}>{student.grade}</td>
                    <td className={cn("px-4 py-4 text-sm", themeClass.textSecondary)}>{maskPhone(student.primaryPhone)}</td>
                    <td className={cn("px-4 py-4 text-sm", themeClass.textSecondary)}>{student.registeredAt}</td>
                    <td className={cn("px-4 py-4 text-sm", themeClass.textPrimary)}>{classCount}</td>
                    <td className="min-w-44 px-4 py-4">
                      <RiskBar score={student.riskPercent} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge className="border-0" style={student.shuttle ? { backgroundColor: "var(--color-primary-bg)", color: "var(--color-teal-500)" } : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}>
                        {student.shuttle ? "탑승" : "미탑승"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className="border-0" style={statusBadgeStyle(student.status)}>
                        {statusLabel(student.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          openStudentDetail(student.id)
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
          const opsAlerts = studentOpsAlerts(student)
          return (
            <button
              key={student.id}
              type="button"
              onClick={() => openStudentDetail(student.id)}
              className="text-left"
            >
              <Card className={cn("h-full gap-4 py-5 transition-transform hover:-translate-y-0.5 hover:shadow-md", themeClass.surface)}>
                <div className="flex items-start justify-between gap-3 px-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={cn("text-base font-semibold", themeClass.textPrimary)}>{student.name}</h3>
                      <Badge className="border-0" style={statusBadgeStyle(student.status)}>{statusLabel(student.status)}</Badge>
                    </div>
                    <p className={cn("mt-1 text-sm", themeClass.textSecondary)}>{student.grade} · 등록일 {student.registeredAt}</p>
                  </div>
                  <Badge className="border-0" style={student.shuttle ? { backgroundColor: "var(--color-primary-bg)", color: "var(--color-teal-500)" } : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}>
                    {student.shuttle ? "차량 탑승" : "차량 미탑승"}
                  </Badge>
                </div>

                <div className="space-y-4 px-5">
                  <div className={cn("rounded-[18px] p-4", themeClass.surfaceTertiary)}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn("text-xs font-medium", themeClass.textSecondary)}>이탈 위험</span>
                      <span className={cn("text-xs font-semibold", tone.text)}>{student.riskPercent}%</span>
                    </div>
                    <RiskBar score={student.riskPercent} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn("rounded-[18px] border p-4", themeClass.surfaceMuted)}>
                      <p className={cn("text-xs", themeClass.textSecondary)}>연락처</p>
                      <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{maskPhone(student.primaryPhone)}</p>
                    </div>
                    <div className={cn("rounded-[18px] border p-4", themeClass.surfaceMuted)}>
                      <p className={cn("text-xs", themeClass.textSecondary)}>수업 수</p>
                      <p className={cn("mt-1 text-sm font-medium", themeClass.textPrimary)}>{classCount}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      보호자 {student.parents.length || (student.parent ? 1 : 0)}명
                    </Badge>
                    <Badge variant="outline" className="border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      {paymentMethodLabel(student.billing.paymentMethod)}
                    </Badge>
                    <Badge variant="outline" className="border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      프로젝트 {projectCountByStudentId.get(student.id) ?? 0}건
                    </Badge>
                    {opsAlerts.slice(0, 2).map((alert) => (
                      <Badge key={alert} className="border-amber-200 bg-amber-50 text-amber-700">
                        {alert}
                      </Badge>
                    ))}
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
        <div
          style={{
            background:
              "radial-gradient(circle at top left, color-mix(in srgb, var(--color-teal-500) 12%, transparent), transparent 28%), linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
          }}
        >
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 py-6">
            <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-sm">
              학생 개인정보는 마스킹 처리되어 표시됩니다. 상세 패널에서도 최소 정보만 노출합니다.
            </div>

            <section
              className="rounded-[24px] border p-5 backdrop-blur"
              style={{
                borderColor: "var(--border-default)",
                backgroundColor: "color-mix(in srgb, var(--bg-elevated) 90%, transparent)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--text-primary)] text-[var(--bg-elevated)]">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className={cn("text-2xl font-semibold tracking-tight", themeClass.textPrimary)}>학생 관리</h1>
                      <p className={cn("mt-1 text-sm", themeClass.textSecondary)}>
                        총 {students.length}명 · 현재 표시 {filteredStudents.length}명
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className={cn("inline-flex rounded-[18px] border p-1", themeClass.surfaceMuted)}>
                    <Button
                      size="sm"
                      variant={viewMode === "table" ? "default" : "ghost"}
                      className={cn(viewMode === "table" ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90" : themeClass.textSecondary)}
                      onClick={() => setViewMode("table")}
                    >
                      <Table2 className="h-4 w-4" />
                      Table
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === "card" ? "default" : "ghost"}
                      className={cn(viewMode === "card" ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90" : themeClass.textSecondary)}
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
                  <Button className="border-0 text-white" style={{ backgroundColor: "var(--color-teal-500)" }} onClick={() => setShowNewDialog(true)}>
                    <Plus className="h-4 w-4" />
                    학생 등록
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <Search className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", themeClass.textTertiary)} />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="이름 / 학년 / 상태 검색"
                    className="h-11 rounded-[18px] border-[var(--border-default)] bg-[var(--bg-secondary)] pl-10 text-[var(--text-primary)]"
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
                          ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90"
                          : "border-[var(--border-default)] text-[var(--text-secondary)]"
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
              <div className="flex items-center gap-3 rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-4 text-[var(--text-primary)] shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[var(--bg-elevated)]">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">위험 학생 {atRiskStudents.length}명이 있습니다</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>이탈위험 50% 초과 학생을 우선 확인해 주세요.</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <div className={cn("rounded-[20px] border px-5 py-4", themeClass.surface)}>
                <p className={cn("text-xs", themeClass.textSecondary)}>보호자 보완 필요</p>
                <p className={cn("mt-1 text-xl font-semibold", themeClass.textPrimary)}>{guardianAttentionCount}명</p>
              </div>
              <div className={cn("rounded-[20px] border px-5 py-4", themeClass.surface)}>
                <p className={cn("text-xs", themeClass.textSecondary)}>결제 레코드 보완</p>
                <p className={cn("mt-1 text-xl font-semibold", themeClass.textPrimary)}>{billingAttentionCount}명</p>
              </div>
              <div className={cn("rounded-[20px] border px-5 py-4", themeClass.surface)}>
                <p className={cn("text-xs", themeClass.textSecondary)}>이탈 위험 학생</p>
                <p className={cn("mt-1 text-xl font-semibold", themeClass.textPrimary)}>{atRiskStudents.length}명</p>
              </div>
            </div>

            <section>
              {studentsQuery.isLoading ? (
                <div className={cn("flex min-h-[320px] items-center justify-center rounded-[20px] border", themeClass.surface)}>
                  <div className={cn("flex items-center gap-2 text-sm", themeClass.textSecondary)}>
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
      <CsvImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} orgId={activeOrgId} />
      {Boolean(selectedStudentId) ? (
        <StudentDetailSheet
          open={Boolean(selectedStudentId)}
          onOpenChange={(open) => {
            if (!open) closeStudentDetail()
          }}
          student={selectedStudent}
          orgId={activeOrgId}
          orgPrefix={orgPrefix}
          relatedCases={selectedStudentCases}
        />
      ) : null}
    </>
  )
}
