// v0.4.0
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useActiveOrgId } from "@/context/OrganizationContext"
import { usePanel } from "@/context/PanelContext"
import { schedulesApi } from "@/api/schedules"
import { casesApi } from "@/api/cases"
import { instructorsApi } from "@/api/students"
import { api } from "@/api/client"
import { queryKeys } from "@/lib/queryKeys"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { WorkspaceHeader, WorkspacePanel } from "@/components/ui/workspace-surface"
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Plus, Pencil, Trash2, CalendarDays } from "lucide-react"
import { useToast } from "@/components/ToastContext"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleItem {
  id: string
  organizationId: string
  instructorId: string | null
  title: string
  type: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  instructor: {
    id: string
    name: string
    subject: string
  } | null
  instructorName?: string | null
  instructorRole?: string | null
  instructorStatus?: string | null
  instructorSubject?: string | null
  studentCount?: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"]
const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"]
const DAY_START_MINUTES = 6 * 60
const DAY_END_MINUTES = 24 * 60
const SLOT_MINUTES = 15
const SLOT_HEIGHT = 18
const TIME_SLOTS = Array.from({ length: (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES }, (_, index) => {
  const totalMinutes = DAY_START_MINUTES + index * SLOT_MINUTES
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
})

// dayOfWeek: 1=월,2=화,3=수,4=목,5=금,6=토,0=일 (matching seed data convention)
const DAY_INDEX_MAP: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

// ─── Type color config ─────────────────────────────────────────────────────────

type ScheduleType = "regular" | "special" | "makeup" | "counseling" | "event" | "admin" | "legal" | "shuttle" | "leave"

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string; icon: string }> = {
  regular:    { bg: "var(--color-primary-soft)", text: "var(--color-primary)", dot: "var(--color-primary)", label: "수업", icon: "📚" },
  special:    { bg: "var(--status-warning-soft)", text: "var(--color-warning)", dot: "var(--color-warning)", label: "특강", icon: "⭐" },
  makeup:     { bg: "var(--status-info-soft)", text: "var(--color-info)", dot: "var(--color-info)", label: "보강", icon: "🔄" },
  counseling: { bg: "var(--status-success-soft)", text: "var(--color-success)", dot: "var(--color-success)", label: "상담", icon: "💬" },
  event:      { bg: "var(--bg-muted)", text: "var(--color-primary)", dot: "var(--color-primary)", label: "이벤트", icon: "🎉" },
  admin:      { bg: "var(--bg-muted)", text: "var(--text-secondary)", dot: "var(--text-tertiary)", label: "행정", icon: "📋" },
  legal:      { bg: "var(--status-danger-soft)", text: "var(--color-danger)", dot: "var(--color-danger)", label: "법정기한", icon: "⚖️" },
  shuttle:    { bg: "var(--status-info-soft)", text: "var(--color-info)", dot: "var(--color-info)", label: "등하원", icon: "🚐" },
  leave:      { bg: "var(--status-warning-soft)", text: "var(--color-warning)", dot: "var(--color-warning)", label: "휴가", icon: "🏖️" },
}

function getTypeColor(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.regular
}

function instructorRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "teacher":
      return "강사"
    case "staff":
      return "직원"
    case "hybrid":
      return "운영+강의"
    default:
      return "직원/강사"
  }
}


// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseHour(time: string): number {
  return parseInt(time.split(":")[0], 10)
}

function parseMinute(time: string): number {
  return parseInt(time.split(":")[1], 10)
}

function formatTimeRange(start: string, end: string): string {
  return `${start.substring(0, 5)} – ${end.substring(0, 5)}`
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hoursRaw, minutesRaw] = time.split(":")
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  const total = hours * 60 + minutes + minutesToAdd
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const nextHours = Math.floor(normalized / 60)
  const nextMinutes = normalized % 60
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`
}

function timeToMinutes(time: string): number {
  const [hoursRaw, minutesRaw] = time.split(":")
  return Number(hoursRaw) * 60 + Number(minutesRaw)
}

function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

type PositionedSchedule = ScheduleItem & {
  startMinutes: number
  endMinutes: number
  columnIndex: number
  columnCount: number
  top: number
  height: number
}

function overlaps(a: { startMinutes: number; endMinutes: number }, b: { startMinutes: number; endMinutes: number }) {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
}

function scheduleDurationMinutes(item: Pick<ScheduleItem, "startTime" | "endTime">) {
  return Math.max(SLOT_MINUTES, timeToMinutes(item.endTime) - timeToMinutes(item.startTime))
}

function isAllDaySchedule(item: Pick<ScheduleItem, "startTime" | "endTime">) {
  return item.startTime === "00:00" && item.endTime === "23:59"
}

function isLongSpanSchedule(item: Pick<ScheduleItem, "type" | "startTime" | "endTime">) {
  if (isAllDaySchedule(item)) return false // all-day items go to the all-day row, not background
  return item.type === "leave" || scheduleDurationMinutes(item) >= 4 * 60
}

function layoutDaySchedules(items: ScheduleItem[]) {
  const normalized = items
    .map((item) => {
      const startMinutes = Math.max(DAY_START_MINUTES, timeToMinutes(item.startTime))
      const endMinutes = Math.max(startMinutes + SLOT_MINUTES, Math.min(DAY_END_MINUTES, timeToMinutes(item.endTime)))
      return {
        ...item,
        startMinutes,
        endMinutes,
      }
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)

  const groups: Array<Array<typeof normalized[number]>> = []
  let currentGroup: Array<typeof normalized[number]> = []
  let currentGroupEnd = -1

  for (const item of normalized) {
    if (currentGroup.length === 0 || item.startMinutes < currentGroupEnd) {
      currentGroup.push(item)
      currentGroupEnd = Math.max(currentGroupEnd, item.endMinutes)
      continue
    }
    groups.push(currentGroup)
    currentGroup = [item]
    currentGroupEnd = item.endMinutes
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  const positioned: PositionedSchedule[] = []

  for (const group of groups) {
    const columnEndTimes: number[] = []
    const assigned: Array<(typeof group)[number] & { columnIndex: number }> = []

    for (const item of group) {
      let columnIndex = columnEndTimes.findIndex((endMinutes) => endMinutes <= item.startMinutes)
      if (columnIndex === -1) {
        columnIndex = columnEndTimes.length
        columnEndTimes.push(item.endMinutes)
      } else {
        columnEndTimes[columnIndex] = item.endMinutes
      }
      assigned.push({ ...item, columnIndex })
    }

    const columnCount = Math.max(columnEndTimes.length, 1)
    for (const item of assigned) {
      positioned.push({
        ...item,
        columnCount,
        top: ((item.startMinutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT,
        height: Math.max(SLOT_HEIGHT, ((item.endMinutes - item.startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT),
      })
    }
  }

  return positioned
}

function getWeekDates(baseDate: Date): Date[] {
  // Returns Mon–Sun of the week containing baseDate
  const day = baseDate.getDay() // 0=Sun
  const monday = new Date(baseDate)
  const offset = day === 0 ? -6 : 1 - day
  monday.setDate(baseDate.getDate() + offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthCalendarRows(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const rows: (Date | null)[][] = []
  let current = new Date(firstDay)
  current.setDate(current.getDate() - startDow)

  for (let row = 0; row < 6; row++) {
    const week: (Date | null)[] = []
    for (let col = 0; col < 7; col++) {
      if (current > lastDay && current.getMonth() !== month) {
        week.push(null)
      } else {
        week.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
    }
    rows.push(week)
    if (current > lastDay) break
  }
  return rows
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

function formatWeekLabel(dates: Date[]): string {
  const first = dates[0]
  const last = dates[dates.length - 1]
  return `${first.getFullYear()}년 ${first.getMonth() + 1}월 ${first.getDate()}일 – ${last.getMonth() + 1}월 ${last.getDate()}일`
}

// ─── ScheduleDetailDialog ──────────────────────────────────────────────────────

interface InstructorOption {
  id: string
  name: string
  subject: string
  role?: string | null
}

interface StudentScheduleRow {
  id: string
  studentId: string
  scheduleId: string
}

interface StudentOption {
  id: string
  name: string
}

function ScheduleDetailDialog({
  orgId,
  schedule,
  open,
  onClose,
  startInEditMode = false,
}: {
  orgId: string | null
  schedule: ScheduleItem | null
  open: boolean
  onClose: () => void
  startInEditMode?: boolean
}) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editType, setEditType] = useState("regular")
  const [editDayOfWeek, setEditDayOfWeek] = useState(1)
  const [editStartTime, setEditStartTime] = useState("09:00")
  const [editEndTime, setEditEndTime] = useState("10:00")
  const [editRoom, setEditRoom] = useState("")
  const [editInstructorId, setEditInstructorId] = useState<string>("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Instructor list for edit mode
  const { data: instructors = [] } = useQuery<InstructorOption[]>({
    queryKey: ["instructors", orgId, "schedule-detail"],
    queryFn: () => api.get<InstructorOption[]>(`/organizations/${orgId}/instructors`),
    enabled: !!orgId && isEditing,
  })

  // Students and enrollment rows for this schedule
  const { data: allStudents = [] } = useQuery<StudentOption[]>({
    queryKey: ["students", orgId, "schedule-detail"],
    queryFn: () => api.get<StudentOption[]>(`/organizations/${orgId}/students`),
    enabled: !!orgId && !!schedule && (schedule.type === "regular" || schedule.type === "special" || schedule.type === "makeup"),
  })

  const { data: studentSchedules = [] } = useQuery<StudentScheduleRow[]>({
    queryKey: ["student-schedules", orgId, schedule?.id ?? ""],
    queryFn: () =>
      api.get<StudentScheduleRow[]>(`/organizations/${orgId}/student-schedules`),
    enabled: !!orgId && !!schedule && (schedule.type === "regular" || schedule.type === "special" || schedule.type === "makeup"),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      schedulesApi.update(orgId!, schedule!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId ?? "") })
      setIsEditing(false)
      onClose()
    },
  })

  const { success: toastSuccess, error: toastError } = useToast()

  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.remove(orgId!, schedule!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId ?? "") })
      toastSuccess("일정이 삭제되었습니다")
      setConfirmDelete(false)
      onClose()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "일정 삭제에 실패했습니다"
      toastError(msg)
    },
  })

  const handleStartEdit = () => {
    if (!schedule) return
    setEditTitle(schedule.title)
    setEditType(schedule.type)
    setEditDayOfWeek(schedule.dayOfWeek)
    setEditStartTime(schedule.startTime.substring(0, 5))
    setEditEndTime(schedule.endTime.substring(0, 5))
    setEditRoom(schedule.room ?? "")
    setEditInstructorId(schedule.instructorId ?? "")
    setIsEditing(true)
  }

  useEffect(() => {
    if (!schedule || !open) return
    setEditTitle(schedule.title)
    setEditType(schedule.type)
    setEditDayOfWeek(schedule.dayOfWeek)
    setEditStartTime(schedule.startTime.substring(0, 5))
    setEditEndTime(schedule.endTime.substring(0, 5))
    setEditRoom(schedule.room ?? "")
    setEditInstructorId(schedule.instructorId ?? "")
    setConfirmDelete(false)
    setIsEditing(startInEditMode)
  }, [open, schedule?.id, schedule?.instructorId, schedule?.title, schedule?.type, schedule?.dayOfWeek, schedule?.startTime, schedule?.endTime, schedule?.room, startInEditMode])

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle,
      type: editType,
      dayOfWeek: editDayOfWeek,
      startTime: editStartTime,
      endTime: editEndTime,
      room: editRoom || null,
      instructorId: editInstructorId || null,
    })
  }

  const handleClose = () => {
    setIsEditing(false)
    setConfirmDelete(false)
    onClose()
  }

  if (!schedule) return null

  const colors = getTypeColor(schedule.type)
  const dayLabel = DAYS_KO[schedule.dayOfWeek] ?? "?"
  const startH = parseHour(schedule.startTime)
  const endH = parseHour(schedule.endTime)
  const startM = parseMinute(schedule.startTime)
  const endM = parseMinute(schedule.endTime)
  const durationMin = (endH * 60 + endM) - (startH * 60 + startM)
  const durationLabel = durationMin >= 60
    ? `${Math.floor(durationMin / 60)}시간${durationMin % 60 > 0 ? ` ${durationMin % 60}분` : ""}`
    : `${durationMin}분`

  const isLegal = schedule.type === "legal"
  const isShuttle = schedule.type === "shuttle"
  const isLeave = schedule.type === "leave"
  const isClassType = schedule.type === "regular" || schedule.type === "special" || schedule.type === "makeup"

  const enrolledStudents = allStudents.filter((student) =>
    studentSchedules.some((row) => row.scheduleId === schedule.id && row.studentId === student.id)
  )

  const inputStyle = {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              <span>{colors.icon}</span>
              {colors.label}
            </span>
            {isLegal && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--status-danger-soft)", color: "var(--color-danger)" }}>
                필수
              </span>
            )}
          </div>
          <DialogTitle className="text-lg" style={{ color: "var(--text-primary)" }}>
            {isEditing ? "일정 수정" : schedule.title}
          </DialogTitle>
          {!isEditing && (
            <DialogDescription>
              매주 {dayLabel}요일 · {formatTimeRange(schedule.startTime, schedule.endTime)} · {durationLabel}
            </DialogDescription>
          )}
        </DialogHeader>

        {isEditing ? (
          /* ─── Edit mode ─── */
          <div className="space-y-3 mt-2">
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
              placeholder="일정 제목" className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <select value={editType} onChange={e => setEditType(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                {Object.entries(TYPE_COLORS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <select value={editDayOfWeek} onChange={e => setEditDayOfWeek(Number(e.target.value))}
                className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                {[1,2,3,4,5,6].map(d => <option key={d} value={d}>{DAYS_KO[d]}요일</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-tertiary)" }}>시작</label>
                <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-tertiary)" }}>종료</label>
                <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
              </div>
            </div>
            <input type="text" value={editRoom} onChange={e => setEditRoom(e.target.value)}
              placeholder="장소 (선택)" className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle} />
            <select value={editInstructorId} onChange={e => setEditInstructorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="">직원/강사 미지정</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name} ({inst.subject})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="text-xs">취소</Button>
              <Button size="sm" disabled={!editTitle.trim() || updateMutation.isPending}
                onClick={handleSave}
                className="text-xs text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                {updateMutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                저장
              </Button>
            </div>
          </div>
        ) : (
          /* ─── View mode ─── */
          <div className="space-y-3 mt-2">
            {/* Color-coded time block */}
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.dot}30` }}
            >
              <div className="text-2xl">{colors.icon}</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: colors.text }}>
                  {formatTimeRange(schedule.startTime, schedule.endTime)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.7 }}>
                  {durationLabel} · 매주 {dayLabel}요일
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
              {!isShuttle && !isLeave && schedule.instructor && (
                <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <span className="text-xs w-20 shrink-0" style={{ color: "var(--text-tertiary)" }}>담당 직원/강사</span>
                  <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                    {schedule.instructor.name}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>
                    {instructorRoleLabel(schedule.instructorRole)} · {schedule.instructor.subject}
                  </span>
                </div>
              )}
              {!isShuttle && !isLeave && (
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>담당 직원/강사 빠른 변경</p>
                  <div className="flex flex-col gap-2">
                    <select value={editInstructorId} onChange={e => setEditInstructorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                      <option value="">직원/강사 미지정</option>
                      {instructors.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.subject})</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={updateMutation.isPending || editInstructorId === (schedule.instructorId ?? "")}
                        onClick={() => updateMutation.mutate({ instructorId: editInstructorId || null })}
                        className="text-xs text-white"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      >
                        {updateMutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                        담당 저장
                      </Button>
                      {schedule.instructorId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMutation.mutate({ instructorId: null })}
                          disabled={updateMutation.isPending}
                          className="text-xs"
                        >
                          담당 해제
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
              {schedule.room && (
                <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <span className="text-xs w-14 shrink-0" style={{ color: "var(--text-tertiary)" }}>장소</span>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{schedule.room}</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs w-14 shrink-0" style={{ color: "var(--text-tertiary)" }}>반복</span>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>매주 {dayLabel}요일</span>
              </div>
            </div>

            {/* Context-specific notes */}
            {isLegal && (
              <div className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: "var(--status-danger-soft)", color: "var(--color-danger)", border: "1px solid var(--border-default)" }}>
                법정 기한입니다. 기한 내 처리하지 않으면 과태료가 부과될 수 있습니다.
                에이전트가 D-3일에 자동 알림을 보냅니다.
              </div>
            )}
            {isShuttle && (
              <div className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: "var(--status-info-soft)", color: "var(--color-info)", border: "1px solid var(--border-default)" }}>
                차량 운행 일정입니다. 학생 탑승 명단은 학생 관리에서 확인하세요.
              </div>
            )}
            {isClassType && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>수강 학생</p>
                {enrolledStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {enrolledStudents.map(s => (
                      <span key={s.id} className="px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    연결된 학생 없음 (학생 관리에서 배정)
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {confirmDelete ? (
              <div className="rounded-lg px-4 py-3 text-xs space-y-2"
                style={{ backgroundColor: "var(--status-danger-soft)", border: "1px solid var(--border-default)" }}>
                <p style={{ color: "var(--color-danger)" }}>이 일정을 삭제하시겠습니까?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="text-xs h-7">취소</Button>
                  <Button size="sm" disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    className="text-xs h-7 text-white" style={{ backgroundColor: "var(--color-danger)" }}>
                    {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                    삭제 확인
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}
                  className="text-xs gap-1" style={{ color: "var(--color-danger)", borderColor: "var(--border-default)" }}>
                  <Trash2 size={12} />
                  삭제
                </Button>
                <Button variant="outline" size="sm" onClick={handleStartEdit} className="text-xs gap-1">
                  <Pencil size={12} />
                  수정
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── NewScheduleDialog ─────────────────────────────────────────────────────────

function NewScheduleDialog({ orgId, open, onClose }: { orgId: string | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [type, setType] = useState("regular")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [room, setRoom] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [instructorId, setInstructorId] = useState<string>("")

  const { data: instructors = [] } = useQuery<InstructorOption[]>({
    queryKey: ["instructors", orgId, "new-schedule"],
    queryFn: () => api.get<InstructorOption[]>(`/organizations/${orgId}/instructors`),
    enabled: !!orgId && open,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post(`/organizations/${orgId}/schedules`, {
      title, type, dayOfWeek, startTime: allDay ? "00:00" : startTime,
      endTime: allDay ? "23:59" : endTime, room: room || null,
      instructorId: instructorId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId ?? "") })
      setTitle("")
      setType("regular")
      setDayOfWeek(1)
      setStartTime("09:00")
      setEndTime("10:00")
      setRoom("")
      setAllDay(false)
      setInstructorId("")
      onClose()
    },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>새 일정 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* Title */}
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="일정 제목" className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />

          {/* Type + Day row */}
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={e => setType(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              {Object.entries(TYPE_COLORS).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              {[1,2,3,4,5,6].map(d => <option key={d} value={d}>{DAYS_KO[d]}요일</option>)}
            </select>
          </div>

          {/* All-day toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded" />
            종일 일정
          </label>

          {/* Time row */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-tertiary)" }}>시작</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-tertiary)" }}>종료</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              </div>
            </div>
          )}

          {/* Room */}
          <input type="text" value={room} onChange={e => setRoom(e.target.value)}
            placeholder="장소 (선택)" className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />

          {/* Instructor */}
          <select value={instructorId} onChange={e => setInstructorId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
            <option value="">직원/강사 미지정</option>
            {instructors.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name} ({inst.subject})</option>
            ))}
          </select>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">취소</Button>
            <Button size="sm" disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="text-xs text-white" style={{ backgroundColor: "var(--color-primary)" }}>
              {createMutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
              추가
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── WeeklyView ────────────────────────────────────────────────────────────────

function WeeklyView({
  schedules,
  weekDates,
  onSelectSchedule,
  onMoveSchedule,
  onResizeSchedule,
}: {
  schedules: ScheduleItem[]
  weekDates: Date[]
  onSelectSchedule: (s: ScheduleItem) => void
  onMoveSchedule: (scheduleId: string, dayOfWeek: number, nextStartTime: string) => void
  onResizeSchedule: (scheduleId: string, boundary: "start" | "end", nextTime: string) => void
}) {
  const today = new Date()
  const [draggedOperation, setDraggedOperation] = useState<{ scheduleId: string; type: "move" | "resize-start" | "resize-end" } | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const totalHeight = TIME_SLOTS.length * SLOT_HEIGHT
  const todayDow = today.getDay() === 0 ? 0 : today.getDay()
  const currentMinutes = today.getHours() * 60 + today.getMinutes()
  const currentLineTop = ((currentMinutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT
  const todayRangeVisible = currentMinutes >= DAY_START_MINUTES && currentMinutes <= DAY_END_MINUTES

  const allDayByDay = useMemo(
    () =>
      weekDates.map((_, idx) => {
        const dayOfWeek = idx === 6 ? 0 : idx + 1
        return schedules.filter((item) => item.dayOfWeek === dayOfWeek && isAllDaySchedule(item))
      }),
    [schedules, weekDates],
  )

  const dayLayouts = useMemo(
    () =>
      weekDates.map((_, idx) => {
        const dayOfWeek = idx === 6 ? 0 : idx + 1
        const dayItems = schedules.filter((item) => item.dayOfWeek === dayOfWeek && !isAllDaySchedule(item))
        return {
          dayOfWeek,
          backgroundEvents: layoutDaySchedules(dayItems.filter((item) => isLongSpanSchedule(item))),
          foregroundEvents: layoutDaySchedules(dayItems.filter((item) => !isLongSpanSchedule(item))),
        }
      }),
    [schedules, weekDates],
  )

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const first = weekDates[0]
    const last = weekDates[weekDates.length - 1]
    const withinCurrentWeek = today >= first && today <= last
    const targetMinutes = withinCurrentWeek ? currentMinutes : 15 * 60
    const targetTop = Math.max(0, ((targetMinutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT - 220)
    container.scrollTop = targetTop
  }, [currentMinutes, weekDates])

  const resolveDropTime = (container: HTMLDivElement, clientY: number) => {
    const rect = container.getBoundingClientRect()
    const relativeY = Math.min(Math.max(clientY - rect.top, 0), totalHeight)
    const snappedMinutes = Math.round(relativeY / SLOT_HEIGHT) * SLOT_MINUTES + DAY_START_MINUTES
    const clampedMinutes = Math.min(Math.max(snappedMinutes, DAY_START_MINUTES), DAY_END_MINUTES)
    return minutesToTime(clampedMinutes)
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-auto"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      <div className="min-w-[1080px]">
        {/* Sticky header + all-day row wrapper */}
        <div style={{ position: "sticky", top: 0, zIndex: 20 }}>
          {/* Day headers */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "84px repeat(7, minmax(150px, 1fr))",
              backgroundColor: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <div
              className="px-3 py-3 text-xs font-medium"
              style={{ color: "var(--text-tertiary)", borderRight: "1px solid var(--border-default)" }}
            >
              시간
            </div>
            {weekDates.map((date, idx) => {
              const isToday = isSameDay(date, today)
              return (
                <div
                  key={idx}
                  className="px-2 py-3 text-center"
                  style={{
                    borderLeft: idx > 0 ? "1px solid var(--border-default)" : undefined,
                    backgroundColor: isToday ? "var(--color-primary-soft)" : "var(--bg-secondary)",
                    color: isToday ? "var(--color-primary)" : "var(--text-secondary)",
                  }}
                >
                  <div className="text-xs font-semibold">{WEEK_DAYS[idx]}</div>
                  <div
                    className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: isToday ? "var(--color-primary)" : "transparent",
                      color: isToday ? "var(--text-on-primary)" : "inherit",
                    }}
                  >
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day row */}
          {allDayByDay.some((d) => d.length > 0) && (
            <div
              className="grid"
              style={{
                gridTemplateColumns: "84px repeat(7, minmax(150px, 1fr))",
                backgroundColor: "var(--bg-secondary)",
                borderBottom: "2px solid var(--border-default)",
              }}
            >
              <div
                className="px-3 py-2 text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)", borderRight: "1px solid var(--border-default)" }}
              >
                종일
              </div>
              {allDayByDay.map((items, idx) => (
                <div
                  key={idx}
                  className="px-1 py-1 min-h-[28px]"
                  style={{ borderLeft: idx > 0 ? "1px solid var(--border-default)" : undefined }}
                >
                  {items.map((item) => {
                    const colors = getTypeColor(item.type)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectSchedule(item)}
                        className="mb-0.5 flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        <span>{colors.icon}</span>
                        <span className="truncate">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "84px repeat(7, minmax(150px, 1fr))",
            minHeight: totalHeight,
          }}
        >
          <div
            className="relative"
            style={{
              height: totalHeight,
              backgroundColor: "var(--bg-secondary)",
              borderRight: "1px solid var(--border-default)",
            }}
          >
            {TIME_SLOTS.map((slot) => {
              const slotMinutes = timeToMinutes(slot)
              const top = ((slotMinutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT
              const hour = parseHour(slot)
              const minute = parseMinute(slot)
              return (
                <div
                  key={slot}
                  className="absolute inset-x-0"
                  style={{
                    top,
                    height: SLOT_HEIGHT,
                    borderTop:
                      minute === 0
                        ? "1px solid var(--border-default)"
                        : minute === 30
                          ? "1px solid var(--border-default)"
                          : "1px solid var(--border-default)",
                  }}
                >
                  {minute === 0 ? (
                    <span
                      className="absolute left-3 -translate-y-1/2 text-[11px] font-medium"
                      style={{ top: 0, color: "var(--text-tertiary)" }}
                    >
                      {`${hour}:00`}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {dayLayouts.map(({ dayOfWeek, backgroundEvents, foregroundEvents }, idx) => {
            const isTodayColumn = todayDow === dayOfWeek && todayRangeVisible
            return (
              <div
                key={dayOfWeek}
                className="relative"
                style={{
                  height: totalHeight,
                  borderLeft: idx > 0 ? "1px solid var(--border-default)" : undefined,
                  backgroundColor: isTodayColumn ? "var(--color-primary-soft)" : "var(--bg-elevated)",
                }}
                onDragOver={(event) => {
                  if (!draggedOperation) return
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  const rawType = event.dataTransfer.getData("application/hagent-drag-type") as "move" | "resize-start" | "resize-end" | ""
                  const rawId = event.dataTransfer.getData("text/plain")
                  const nextOperation = draggedOperation ?? (rawId
                    ? { scheduleId: rawId, type: rawType || "move" }
                    : null)
                  if (!nextOperation) return
                  event.preventDefault()
                  const nextTime = resolveDropTime(event.currentTarget, event.clientY)
                  if (nextOperation.type === "move") {
                    onMoveSchedule(nextOperation.scheduleId, dayOfWeek, nextTime)
                  } else if (nextOperation.type === "resize-start") {
                    onResizeSchedule(nextOperation.scheduleId, "start", nextTime)
                  } else {
                    onResizeSchedule(nextOperation.scheduleId, "end", nextTime)
                  }
                  setDraggedOperation(null)
                }}
              >
                {TIME_SLOTS.map((slot) => {
                  const slotMinutes = timeToMinutes(slot)
                  const top = ((slotMinutes - DAY_START_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT
                  return (
                    <div
                      key={`${dayOfWeek}-${slot}`}
                      className="absolute inset-x-0"
                      style={{
                        top,
                        height: SLOT_HEIGHT,
                        borderTop:
                          parseMinute(slot) === 0
                            ? "1px solid var(--border-default)"
                            : parseMinute(slot) === 30
                              ? "1px solid var(--border-default)"
                              : "1px solid var(--border-default)",
                      }}
                    />
                  )
                })}

                {isTodayColumn ? (
                  <>
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10"
                      style={{
                        top: currentLineTop,
                        borderTop: "2px solid var(--color-danger)",
                        boxShadow: "0 0 0 1px var(--status-danger-soft)",
                        zIndex: 4,
                      }}
                    />
                    <span
                      className="pointer-events-none absolute left-2 z-10 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ top: currentLineTop, backgroundColor: "var(--color-danger)", zIndex: 5 }}
                    >
                      지금 {minutesToTime(currentMinutes)}
                    </span>
                  </>
                ) : null}

                {backgroundEvents.map((event) => {
                  const colors = getTypeColor(event.type)
                  const eventHeight = Math.max(event.height - 4, SLOT_HEIGHT * 2)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectSchedule(event)}
                      className="absolute rounded-2xl text-left transition-colors focus:outline-none focus:ring-2"
                      draggable
                      onDragStart={(actionEvent) => {
                        setDraggedOperation({ scheduleId: event.id, type: "move" })
                        actionEvent.dataTransfer.effectAllowed = "move"
                        actionEvent.dataTransfer.setData("text/plain", event.id)
                        actionEvent.dataTransfer.setData("application/hagent-drag-type", "move")
                      }}
                      onDragEnd={() => setDraggedOperation(null)}
                      style={{
                        top: event.top + 2,
                        left: 8,
                        right: 8,
                        height: eventHeight,
                        background: `linear-gradient(180deg, ${colors.bg}cc 0%, ${colors.bg}80 100%)`,
                        color: colors.text,
                        border: `1px solid ${colors.dot}35`,
                        boxShadow: "var(--shadow-xs)",
                        overflow: "hidden",
                        zIndex: 6,
                        padding: "8px 10px",
                        opacity: 0.78,
                      }}
                    >
                      <span
                        className="absolute inset-x-1 top-0 h-2 cursor-ns-resize rounded-full"
                        draggable
                        onClick={(actionEvent) => actionEvent.stopPropagation()}
                        onDragStart={(actionEvent) => {
                          actionEvent.stopPropagation()
                          setDraggedOperation({ scheduleId: event.id, type: "resize-start" })
                          actionEvent.dataTransfer.effectAllowed = "move"
                          actionEvent.dataTransfer.setData("text/plain", event.id)
                          actionEvent.dataTransfer.setData("application/hagent-drag-type", "resize-start")
                        }}
                        onDragEnd={() => setDraggedOperation(null)}
                        style={{ backgroundColor: "transparent" }}
                      />
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <span>{colors.icon}</span>
                        <span className="truncate">{event.title}</span>
                      </div>
                      <div className="mt-1 text-[11px] opacity-75">
                        {formatTimeRange(event.startTime, event.endTime)}
                      </div>
                      <span
                        className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-full"
                        draggable
                        onClick={(actionEvent) => actionEvent.stopPropagation()}
                        onDragStart={(actionEvent) => {
                          actionEvent.stopPropagation()
                          setDraggedOperation({ scheduleId: event.id, type: "resize-end" })
                          actionEvent.dataTransfer.effectAllowed = "move"
                          actionEvent.dataTransfer.setData("text/plain", event.id)
                          actionEvent.dataTransfer.setData("application/hagent-drag-type", "resize-end")
                        }}
                        onDragEnd={() => setDraggedOperation(null)}
                        style={{ backgroundColor: "transparent" }}
                      />
                    </button>
                  )
                })}

                {foregroundEvents.map((event) => {
                  const colors = getTypeColor(event.type)
                  const width = `calc(${100 / event.columnCount}% - 10px)`
                  const left = `calc(${(100 / event.columnCount) * event.columnIndex}% + 5px)`
                  const durationMinutes = event.endMinutes - event.startMinutes
                  const compactByHeight = durationMinutes < 45
                  const compactByOverlap = event.columnCount >= 3
                  const compactCard = compactByHeight || compactByOverlap
                  const ultraCompactCard = durationMinutes < 30 || event.columnCount >= 4
                  const showInstructor = !ultraCompactCard && durationMinutes >= 30
                  const showMeta = !compactCard && durationMinutes >= 45
                  const showTime = !compactByOverlap && durationMinutes >= 60
                  const eventHeight = Math.max(event.height - 4, SLOT_HEIGHT)

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectSchedule(event)}
                      className="absolute rounded-xl text-left text-xs transition-colors focus:outline-none focus:ring-2"
                      draggable
                      onDragStart={(actionEvent) => {
                        setDraggedOperation({ scheduleId: event.id, type: "move" })
                        actionEvent.dataTransfer.effectAllowed = "move"
                        actionEvent.dataTransfer.setData("text/plain", event.id)
                        actionEvent.dataTransfer.setData("application/hagent-drag-type", "move")
                      }}
                      onDragEnd={() => setDraggedOperation(null)}
                      style={{
                        top: event.top + 2,
                        left,
                        width,
                        height: eventHeight,
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.dot}40`,
                        boxShadow: "var(--shadow-sm)",
                        overflow: "hidden",
                        zIndex: 12,
                        padding: ultraCompactCard ? "6px 7px" : "8px 9px",
                      }}
                    >
                      <span
                        className="absolute inset-x-1 top-0 h-2 cursor-ns-resize rounded-full"
                        draggable
                        onClick={(actionEvent) => actionEvent.stopPropagation()}
                        onDragStart={(actionEvent) => {
                          actionEvent.stopPropagation()
                          setDraggedOperation({ scheduleId: event.id, type: "resize-start" })
                          actionEvent.dataTransfer.effectAllowed = "move"
                          actionEvent.dataTransfer.setData("text/plain", event.id)
                          actionEvent.dataTransfer.setData("application/hagent-drag-type", "resize-start")
                        }}
                        onDragEnd={() => setDraggedOperation(null)}
                        style={{ backgroundColor: "transparent" }}
                      />
                      <div className="flex items-center gap-1 font-semibold leading-tight">
                        <span className={ultraCompactCard ? "text-[9px]" : "text-[10px]"}>{colors.icon}</span>
                        <span className="truncate">{event.title}</span>
                      </div>
                      {showInstructor ? (
                        <>
                          <div className="mt-0.5 truncate opacity-80">
                            {event.instructor?.name ?? event.instructorName ?? "담당 미지정"}
                            {event.instructorRole ? ` · ${instructorRoleLabel(event.instructorRole)}` : ""}
                          </div>
                        </>
                      ) : null}
                      {showMeta ? (
                        <>
                          {typeof event.studentCount === "number" && event.studentCount > 0 ? (
                            <div className="truncate opacity-65">학생 {event.studentCount}명</div>
                          ) : null}
                          {event.room ? <div className="truncate opacity-65">{event.room}</div> : null}
                        </>
                      ) : null}
                      {showTime ? (
                        <div className="mt-1 truncate text-[11px] opacity-75">
                          {formatTimeRange(event.startTime, event.endTime)}
                        </div>
                      ) : null}
                      <span
                        className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-full"
                        draggable
                        onClick={(actionEvent) => actionEvent.stopPropagation()}
                        onDragStart={(actionEvent) => {
                          actionEvent.stopPropagation()
                          setDraggedOperation({ scheduleId: event.id, type: "resize-end" })
                          actionEvent.dataTransfer.effectAllowed = "move"
                          actionEvent.dataTransfer.setData("text/plain", event.id)
                          actionEvent.dataTransfer.setData("application/hagent-drag-type", "resize-end")
                        }}
                        onDragEnd={() => setDraggedOperation(null)}
                        style={{ backgroundColor: "transparent" }}
                      />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── MonthlyView ───────────────────────────────────────────────────────────────

function MonthlyView({
  schedules,
  year,
  month,
  onDayClick,
  onSelectSchedule,
}: {
  schedules: ScheduleItem[]
  year: number
  month: number
  onDayClick: (date: Date, daySchedules: ScheduleItem[]) => void
  onSelectSchedule: (s: ScheduleItem) => void
}) {
  const today = new Date()
  const rows = getMonthCalendarRows(year, month)

  // Map dayOfWeek (1=Mon..6=Sat,0=Sun) to JS day (0=Sun,1=Mon..6=Sat)
  // dayOfWeek in seed: 1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // JS Date.getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const getSchedulesForDate = (date: Date) => {
    const jsDow = date.getDay() // 0=Sun..6=Sat
    // Convert: seed 1=Mon..6=Sat; js 1=Mon..6=Sat,0=Sun → same for Mon-Sat, 0 for Sun
    const seedDow = jsDow === 0 ? 0 : jsDow
    return schedules
      .filter((s) => s.dayOfWeek === seedDow)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title))
  }

  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

  return (
    <div
      className="overflow-hidden"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      {/* Day headers */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border-default)" }}
      >
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="py-2 text-xs font-semibold text-center"
            style={{ color: "var(--text-tertiary)", backgroundColor: "var(--bg-secondary)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      {rows.map((week, ri) => (
        <div
          key={ri}
          className="grid"
          style={{ gridTemplateColumns: "repeat(7, 1fr)", borderBottom: ri < rows.length - 1 ? "1px solid var(--border-default)" : undefined }}
        >
          {week.map((date, ci) => {
            if (!date) {
              return (
                <div
                  key={ci}
                  className="min-h-[80px] p-2"
                  style={{ backgroundColor: "var(--bg-secondary)", borderLeft: ci > 0 ? "1px solid var(--border-default)" : undefined }}
                />
              )
            }
            const inMonth = date.getMonth() === month
            const isToday = isSameDay(date, today)
            const dayItems = getSchedulesForDate(date)

            return (
              <div
                key={ci}
                className="min-h-[132px] p-2 text-left"
                onClick={() => dayItems.length > 0 && onDayClick(date, dayItems)}
                style={{
                  backgroundColor: isToday ? "var(--color-primary-soft)" : "var(--bg-elevated)",
                  borderLeft: ci > 0 ? "1px solid var(--border-default)" : undefined,
                  cursor: dayItems.length > 0 ? "pointer" : "default",
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    dayItems.length > 0 && onDayClick(date, dayItems)
                  }}
                  className="mb-2 inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold transition-colors focus:outline-none"
                  style={{
                    backgroundColor: isToday ? "var(--color-primary)" : "transparent",
                    color: isToday ? "var(--text-on-primary)" : inMonth ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {date.getDate()}
                </button>
                <div className="flex flex-col gap-1">
                  {dayItems.map((s) => {
                    const colors = getTypeColor(s.type)
                    const compactMonthly = scheduleDurationMinutes(s) < 45
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectSchedule(s)
                        }}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] leading-tight transition-colors focus:outline-none"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.dot}30`,
                        }}
                        title={s.title}
                      >
                        <span className="shrink-0 text-[11px]">{colors.icon}</span>
                        <span className="shrink-0 font-medium opacity-75">{s.startTime.slice(0, 5)}</span>
                        <span className="truncate font-medium">{s.title}</span>
                        {!compactMonthly && s.instructorName ? (
                          <span className="truncate opacity-65">· {s.instructorName}</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── DayScheduleDialog ─────────────────────────────────────────────────────────

function DayScheduleDialog({
  date,
  schedules,
  open,
  onClose,
  onSelectSchedule,
}: {
  date: Date | null
  schedules: ScheduleItem[]
  open: boolean
  onClose: () => void
  onSelectSchedule: (s: ScheduleItem) => void
}) {
  if (!date) return null
  const dateLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAYS_KO[date.getDay()]})`
  // Sort by start time
  const sorted = [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>{dateLabel} 일정</DialogTitle>
          <DialogDescription>{sorted.length}개 일정</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 mt-2">
          {sorted.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-tertiary)" }}>일정이 없습니다.</p>
          ) : (
            sorted.map((s) => {
              const colors = getTypeColor(s.type)
              return (
                <button
                  key={s.id}
                  onClick={() => { onClose(); onSelectSchedule(s) }}
                  className="w-full text-left rounded-lg px-3 py-2.5 text-sm transition-all duration-150 hover:shadow-sm hover:-translate-y-px focus:outline-none"
                  style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.dot}30` }}
                >
                  <div className="flex items-center gap-2">
                    <span>{colors.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{s.title}</div>
                      <div className="text-xs opacity-70 mt-0.5 flex items-center gap-1.5">
                        <span>{formatTimeRange(s.startTime, s.endTime)}</span>
                        {s.instructor ? <span>· {s.instructor.name}{s.instructorRole ? ` (${instructorRoleLabel(s.instructorRole)})` : ""}</span> : null}
                        {!s.instructor && !s.instructorName ? <span>· 담당 미지정</span> : null}
                        {typeof s.studentCount === "number" && s.studentCount > 0 ? <span>· 학생 {s.studentCount}명</span> : null}
                        {s.room && <span>· {s.room}</span>}
                      </div>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${colors.dot}20`, color: colors.text }}>
                      {colors.label}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Legend ────────────────────────────────────────────────────────────────────

function Legend({ schedules }: { schedules: ScheduleItem[] }) {
  const usedTypes = Array.from(new Set(schedules.map((s) => s.type)))
  const allTypes = Object.keys(TYPE_COLORS)
  const displayTypes = usedTypes.length > 0 ? usedTypes : allTypes

  return (
    <div className="flex flex-wrap gap-2">
      {displayTypes.map((type) => {
        const c = TYPE_COLORS[type] ?? TYPE_COLORS.regular
        return (
          <div
            key={type}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: c.bg, color: c.text }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
            {c.label}
          </div>
        )
      })}
    </div>
  )
}

// ─── InstructorList ────────────────────────────────────────────────────────────

function InstructorList({ schedules }: { schedules: ScheduleItem[] }) {
  const instructorMap = new Map<string, { name: string; subject: string; role: string | null; count: number }>()
  for (const s of schedules) {
    const instructorId = s.instructor?.id ?? s.instructorId
    const instructorName = s.instructor?.name ?? s.instructorName
    if (instructorId && instructorName) {
      const existing = instructorMap.get(instructorId)
      if (existing) {
        existing.count++
      } else {
        instructorMap.set(instructorId, {
          name: instructorName,
          subject: s.instructor?.subject ?? s.instructorSubject ?? "영역 미지정",
          role: s.instructorRole ?? null,
          count: 1,
        })
      }
    }
  }
  const instructors = Array.from(instructorMap.values())
  if (instructors.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {instructors.map((inst, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: `hsl(${(i * 67) % 360}, 60%, 55%)` }}
          />
          {inst.name}
          <span style={{ color: "var(--text-tertiary)" }}>· {instructorRoleLabel(inst.role)} · {inst.subject}</span>
        </div>
      ))}
    </div>
  )
}

// ─── SchedulePage ──────────────────────────────────────────────────────────────

export function SchedulePage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { setPanelContent, openPanel } = usePanel()
  const navigate = useNavigate()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const activeOrgId = useActiveOrgId(orgPrefix)
  const [searchParams, setSearchParams] = useSearchParams()

  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [dayDialogDate, setDayDialogDate] = useState<Date | null>(null)
  const [dayDialogSchedules, setDayDialogSchedules] = useState<ScheduleItem[]>([])
  const [newScheduleOpen, setNewScheduleOpen] = useState(false)
  const [quickInstructorId, setQuickInstructorId] = useState("")
  const [detailStartsEditing, setDetailStartsEditing] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: "일정" }])
  }, [setBreadcrumbs])

  const { data: schedules = [], isLoading, isError } = useQuery({
    queryKey: activeOrgId ? queryKeys.schedules.list(activeOrgId) : [],
    queryFn: () => schedulesApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  })

  const { data: studentSchedules = [] } = useQuery({
    queryKey: ["student-schedules", activeOrgId],
    enabled: !!activeOrgId,
    queryFn: () => api.get<StudentScheduleRow[]>(`/organizations/${activeOrgId}/student-schedules`),
  })

  const { data: cases = [] } = useQuery<any[]>({
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

  const { data: instructorOptions = [] } = useQuery<InstructorOption[]>({
    queryKey: ["instructors", activeOrgId, "schedule-page"],
    enabled: !!activeOrgId,
    queryFn: () => instructorsApi.list(activeOrgId!),
  })

  const instructorFilterId = searchParams.get("instructor")
  const queryClient = useQueryClient()
  const activeSchedules = useMemo(() => schedules as ScheduleItem[], [schedules])
  const filteredSchedules = useMemo(() => {
    return activeSchedules.filter((schedule) => {
      if (typeFilter && schedule.type !== typeFilter) return false
      if (instructorFilterId) {
        const scheduleInstructorId = schedule.instructor?.id ?? schedule.instructorId
        if (scheduleInstructorId !== instructorFilterId) return false
      }
      return true
    })
  }, [activeSchedules, instructorFilterId, typeFilter])

  const weekDates = getWeekDates(currentDate)
  const unassignedSchedules = useMemo(
    () => activeSchedules.filter((item) => !item.instructor?.id && !item.instructorName),
    [activeSchedules],
  )
  const counselingCount = useMemo(
    () => activeSchedules.filter((item) => item.type === "counseling").length,
    [activeSchedules],
  )
  const linkedStudentTotal = useMemo(
    () => activeSchedules.reduce((sum, item) => sum + (item.studentCount ?? 0), 0),
    [activeSchedules],
  )
  const filteredInstructorName = useMemo(() => {
    if (!instructorFilterId) return null
    const found = activeSchedules.find((item) => (item.instructor?.id ?? item.instructorId) === instructorFilterId)
    return found?.instructor?.name ?? found?.instructorName ?? "선택된 직원/강사"
  }, [activeSchedules, instructorFilterId])

  const handlePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === "weekly") {
      d.setDate(d.getDate() - 7)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    setCurrentDate(d)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (viewMode === "weekly") {
      d.setDate(d.getDate() + 7)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    setCurrentDate(d)
  }

  const handleSelectSchedule = (s: ScheduleItem) => {
    setSelectedSchedule(s)
    setDetailStartsEditing(true)
    setDetailOpen(true)
  }

  const handleDayClick = (date: Date, daySchedules: ScheduleItem[]) => {
    setDayDialogDate(date)
    setDayDialogSchedules(daySchedules)
    setDayDialogOpen(true)
  }

  const moveScheduleMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      dayOfWeek,
      startTime,
      endTime,
    }: {
      scheduleId: string
      dayOfWeek: number
      startTime: string
      endTime: string
    }) => {
      if (!activeOrgId) throw new Error("Organization not selected")
      return schedulesApi.update(activeOrgId, scheduleId, {
        dayOfWeek,
        startTime,
        endTime,
      })
    },
    onSuccess: () => {
      if (!activeOrgId) return
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(activeOrgId) })
    },
  })

  const resizeScheduleMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      boundary,
      nextTime,
    }: {
      scheduleId: string
      boundary: "start" | "end"
      nextTime: string
    }) => {
      if (!activeOrgId) throw new Error("Organization not selected")
      const target = (schedules as ScheduleItem[]).find((item) => item.id === scheduleId)
      if (!target) throw new Error("Schedule not found")
      const nextStartTime = boundary === "start" ? nextTime : target.startTime
      const nextEndTime = boundary === "end" ? nextTime : target.endTime
      const startMinutes = timeToMinutes(nextStartTime)
      const endMinutes = timeToMinutes(nextEndTime)
      if (endMinutes - startMinutes < SLOT_MINUTES) {
        throw new Error("최소 15분 이상이어야 합니다.")
      }
      return schedulesApi.update(activeOrgId, scheduleId, {
        startTime: nextStartTime,
        endTime: nextEndTime,
      })
    },
    onSuccess: () => {
      if (!activeOrgId) return
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(activeOrgId) })
    },
  })

  const reassignInstructorMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      instructorId,
    }: {
      scheduleId: string
      instructorId: string | null
    }) => {
      if (!activeOrgId) throw new Error("Organization not selected")
      return schedulesApi.update(activeOrgId, scheduleId, {
        instructorId,
      })
    },
    onSuccess: () => {
      if (!activeOrgId) return
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(activeOrgId) })
    },
  })

  const handleMoveSchedule = (scheduleId: string, dayOfWeek: number, nextStartTime: string) => {
    const target = activeSchedules.find((schedule) => schedule.id === scheduleId)
    if (!target) return
    const durationMinutes =
      (parseHour(target.endTime) * 60 + parseMinute(target.endTime))
      - (parseHour(target.startTime) * 60 + parseMinute(target.startTime))
    moveScheduleMutation.mutate({
      scheduleId,
      dayOfWeek,
      startTime: nextStartTime,
      endTime: addMinutesToTime(nextStartTime, durationMinutes),
    })
  }

  const handleResizeSchedule = (scheduleId: string, boundary: "start" | "end", nextTime: string) => {
    resizeScheduleMutation.mutate({ scheduleId, boundary, nextTime })
  }

  const dateLabel = viewMode === "weekly"
    ? formatWeekLabel(weekDates)
    : formatMonthLabel(currentDate)
  const selectedTypeLabel = typeFilter ? (TYPE_COLORS[typeFilter]?.label ?? "전체") : "전체"

  useEffect(() => {
    if (!selectedSchedule) {
      setQuickInstructorId("")
      return
    }
    setQuickInstructorId(selectedSchedule.instructorId ?? "")
  }, [selectedSchedule?.id, selectedSchedule?.instructorId])

  useEffect(() => {
    if (!selectedSchedule) return
    const refreshed = activeSchedules.find((item) => item.id === selectedSchedule.id)
    if (!refreshed) return
    const currentSnapshot = JSON.stringify({
      id: selectedSchedule.id,
      title: selectedSchedule.title,
      instructorId: selectedSchedule.instructorId,
      dayOfWeek: selectedSchedule.dayOfWeek,
      startTime: selectedSchedule.startTime,
      endTime: selectedSchedule.endTime,
      room: selectedSchedule.room,
    })
    const nextSnapshot = JSON.stringify({
      id: refreshed.id,
      title: refreshed.title,
      instructorId: refreshed.instructorId,
      dayOfWeek: refreshed.dayOfWeek,
      startTime: refreshed.startTime,
      endTime: refreshed.endTime,
      room: refreshed.room,
    })
    if (currentSnapshot !== nextSnapshot) {
      setSelectedSchedule(refreshed)
    }
  }, [activeSchedules, selectedSchedule])

  const panelContent = useMemo(() => {
    if (!selectedSchedule) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>핵심 연결</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              담당 직원, 연결 학생, 관련 케이스와 후속 작업을 같은 구조로 확인합니다.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>전체 일정</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{activeSchedules.length}개</p>
            </div>
            <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--status-warning-soft)" }}>
              <p className="text-xs" style={{ color: "var(--color-warning)" }}>상담 일정</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: "var(--color-warning)" }}>{counselingCount}개</p>
            </div>
            <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--status-danger-soft)" }}>
              <p className="text-xs" style={{ color: "var(--color-danger)" }}>담당 미지정</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: "var(--color-danger)" }}>{unassignedSchedules.length}개</p>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>운영 연결 상태</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>연결 학생</p>
                <p className="mt-1 font-semibold" style={{ color: "var(--text-primary)" }}>{linkedStudentTotal}명</p>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>필터 상태</p>
                <p className="mt-1 font-semibold" style={{ color: "var(--text-primary)" }}>{filteredInstructorName ?? "전체 일정"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>일정 유형</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.values(TYPE_COLORS).slice(0, 6).map((item) => (
                <span key={item.label} className="rounded-full px-2.5 py-1 text-xs font-medium opacity-80" style={{ backgroundColor: item.bg, color: item.text }}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {unassignedSchedules.length > 0 ? (
            <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--status-danger-soft)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--color-danger)" }}>우선 확인</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                담당 미지정 일정이 {unassignedSchedules.length}개 있습니다. 담당 직원/강사를 연결해야 실제 운영에 바로 쓸 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="border-0 text-white"
                  style={{ backgroundColor: "var(--color-danger)" }}
                  onClick={() => {
                    setSelectedSchedule(unassignedSchedules[0] ?? null)
                    setDetailStartsEditing(true)
                    setDetailOpen(true)
                  }}
                >
                  미지정 일정 열기
                </Button>
                {instructorFilterId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearchParams((current) => {
                      const next = new URLSearchParams(current)
                      next.delete("instructor")
                      return next
                    })}
                  >
                    필터 해제
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    const selectedStudentIds = Array.from(
      new Set(
        (studentSchedules as StudentScheduleRow[])
          .filter((item) => item.scheduleId === selectedSchedule.id)
          .map((item) => item.studentId)
      )
    )
    const linkedCaseCount = (cases as any[]).filter((item) => selectedStudentIds.includes(String(item.studentId ?? ""))).length
    const linkedCases = (cases as any[]).filter((item) => selectedStudentIds.includes(String(item.studentId ?? ""))).slice(0, 3)
    const typeInfo = getTypeColor(selectedSchedule.type)

    return (
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selectedSchedule.title}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {typeInfo.label} · {formatTimeRange(selectedSchedule.startTime, selectedSchedule.endTime)}
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>담당 직원/강사</p>
            <p className="mt-1 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{selectedSchedule.instructor?.name ?? selectedSchedule.instructorName ?? "미지정"}</p>
            {selectedSchedule.instructorSubject || selectedSchedule.instructorStatus ? (
              <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                {instructorRoleLabel(selectedSchedule.instructorRole)} · {selectedSchedule.instructorSubject ?? "영역 미지정"} · {selectedSchedule.instructorStatus ?? "상태 미지정"}
              </p>
            ) : null}
            {selectedSchedule.instructor?.id ? (
              <button
                type="button"
                className="mt-2 text-xs font-medium"
                style={{ color: "var(--color-primary)" }}
                onClick={() => orgPrefix && navigate(`/${orgPrefix}/instructors?detail=${selectedSchedule.instructor?.id}`)}
              >
                직원/강사 상세로 이동
              </button>
            ) : (
              <p className="mt-2 text-xs font-medium" style={{ color: "var(--color-danger)" }}>담당 직원/강사를 지정해야 실제 운영 일정으로 쓰기 쉽습니다.</p>
            )}
          </div>
          <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>연결 학생</p>
            <p className="mt-1 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{selectedSchedule.studentCount ?? selectedStudentIds.length}명</p>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-secondary)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>운영 연결</p>
          <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <div className="flex items-center justify-between gap-3">
              <span>일정 유형</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{typeInfo.label}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>강의실</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{selectedSchedule.room ?? "미지정"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>관련 케이스</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{linkedCaseCount}건</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>담당 직원/강사 빠른 변경</p>
          <div className="mt-3 space-y-3">
            <select
              value={quickInstructorId}
              onChange={(event) => setQuickInstructorId(event.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)" }}
            >
              <option value="">담당 미지정</option>
              {instructorOptions.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name} · {instructorRoleLabel((instructor as any).role ?? null)}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="border-0 text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
                disabled={reassignInstructorMutation.isPending || quickInstructorId === (selectedSchedule.instructorId ?? "")}
                onClick={() =>
                  reassignInstructorMutation.mutate({
                    scheduleId: selectedSchedule.id,
                    instructorId: quickInstructorId || null,
                  })
                }
              >
                {reassignInstructorMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                담당 저장
              </Button>
              {selectedSchedule.instructorId ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reassignInstructorMutation.isPending}
                  onClick={() =>
                    reassignInstructorMutation.mutate({
                      scheduleId: selectedSchedule.id,
                      instructorId: null,
                    })
                  }
                >
                  담당 해제
                </Button>
              ) : null}
            </div>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              오른쪽 패널에서 바로 재배정하고, 필요하면 상세 수정으로 이어집니다.
            </p>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>바로 실행</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button size="sm" variant="outline" className="justify-start" onClick={() => setDetailOpen(true)}>
              일정 상세/수정
            </Button>
            <Button size="sm" variant="outline" className="justify-start" onClick={() => setNewScheduleOpen(true)}>
              후속 일정 추가
            </Button>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>관련 케이스 바로가기</p>
          <div className="mt-3 space-y-2">
            {linkedCases.length > 0 ? linkedCases.map((item: any) => (
                  <button
                key={item.id}
                type="button"
                onClick={() => orgPrefix && navigate(`/${orgPrefix}/cases/${item.id}`)}
                className="w-full rounded-xl px-3 py-2 text-left transition-colors"
                style={{ backgroundColor: "var(--bg-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>{item.identifier ?? item.type ?? "케이스"}</p>
              </button>
            )) : (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>연결된 케이스가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    )
  }, [activeSchedules.length, cases, counselingCount, filteredInstructorName, instructorFilterId, linkedStudentTotal, navigate, orgPrefix, selectedSchedule, setSearchParams, studentSchedules, unassignedSchedules])

  const panelContentKey = useMemo(
    () =>
      JSON.stringify({
        selectedScheduleId: selectedSchedule?.id ?? null,
        scheduleCount: (schedules as ScheduleItem[]).length,
        studentScheduleCount: (studentSchedules as StudentScheduleRow[]).length,
        caseCount: (cases as any[]).length,
      }),
    [cases, schedules, selectedSchedule?.id, studentSchedules],
  )

  useEffect(() => {
    openPanel()
  }, [openPanel])

  useEffect(() => {
    setPanelContent(panelContent)
    return () => setPanelContent(null)
  }, [panelContentKey, setPanelContent])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <WorkspaceHeader
        title="일정"
        description="수업, 상담, 보강, 차량, 행정 일정을 한 화면에서 운영합니다."
        action={
          <Button className="gap-2" onClick={() => setNewScheduleOpen(true)}>
            <Plus size={15} />
            일정 추가
          </Button>
        }
      />

      <WorkspacePanel className="overflow-hidden">
        <div className="border-b p-4 md:p-5 space-y-4" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCurrentDate(new Date())}
              style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
            >
              <CalendarDays size={13} />
              오늘
            </Button>

            <div
              className="inline-flex rounded-lg border p-1"
              style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-muted)" }}
            >
              {(["weekly", "monthly"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: viewMode === mode ? "var(--bg-elevated)" : "transparent",
                    color: viewMode === mode ? "var(--text-primary)" : "var(--text-tertiary)",
                    boxShadow: viewMode === mode ? "var(--shadow-xs)" : "none",
                  }}
                >
                  {mode === "weekly" ? "주간" : "월간"}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="rounded-lg p-1.5 transition-colors"
                style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                aria-label="이전"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[200px] px-3 py-1.5 text-center text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {dateLabel}
              </span>
              <button
                onClick={handleNext}
                className="rounded-lg p-1.5 transition-colors"
                style={{ backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
                aria-label="다음"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                >
                  일정 유형
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {selectedTypeLabel}
                  </span>
                  <ChevronDown size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuRadioGroup value={typeFilter ?? "__all__"} onValueChange={(value) => setTypeFilter(value === "__all__" ? null : value)}>
                  <DropdownMenuRadioItem value="__all__">전체 ({(schedules as any[]).length})</DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  {Object.entries(TYPE_COLORS).map(([type, tone]) => {
                    const count = (schedules as ScheduleItem[]).filter((item) => item.type === type).length
                    if (count === 0) return null
                    return (
                      <DropdownMenuRadioItem key={type} value={type}>
                        <span className="mr-2">{tone.icon}</span>
                        {tone.label} ({count})
                      </DropdownMenuRadioItem>
                    )
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {filteredInstructorName ? (
              <div
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-muted)", color: "var(--text-secondary)" }}
              >
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{filteredInstructorName}</span>
                <span>담당 일정만 표시 중</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-1"
                  onClick={() => setSearchParams((current) => {
                    const next = new URLSearchParams(current)
                    next.delete("instructor")
                    return next
                  })}
                >
                  필터 해제
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: "var(--text-tertiary)" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">일정을 불러오는 중...</span>
          </div>
        ) : isError ? (
          <div className="p-4 md:p-5">
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor: "var(--status-danger-soft)",
                backgroundColor: "var(--status-danger-soft)",
                color: "var(--color-danger)",
              }}
            >
              일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-4 md:p-5">
            {viewMode === "weekly" ? (
              <WeeklyView
                schedules={filteredSchedules}
                weekDates={weekDates}
                onSelectSchedule={handleSelectSchedule}
                onMoveSchedule={handleMoveSchedule}
                onResizeSchedule={handleResizeSchedule}
              />
            ) : (
              <MonthlyView
                schedules={filteredSchedules}
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                onDayClick={handleDayClick}
                onSelectSchedule={handleSelectSchedule}
              />
            )}

            <div className="border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
                    담당 직원/강사
                  </p>
                  <InstructorList schedules={schedules as ScheduleItem[]} />
                </div>
                <p className="max-w-md text-xs leading-6" style={{ color: "var(--text-tertiary)" }}>
                  일정 추가와 담당 변경은 이 화면에서 바로 처리하고, 세부 수정은 선택한 일정 패널에서 이어갑니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </WorkspacePanel>

      {/* New schedule dialog */}
      <NewScheduleDialog orgId={activeOrgId} open={newScheduleOpen} onClose={() => setNewScheduleOpen(false)} />

      {/* Schedule detail dialog */}
      <ScheduleDetailDialog
        orgId={activeOrgId}
        schedule={selectedSchedule}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailStartsEditing(false)
        }}
        startInEditMode={detailStartsEditing}
      />

      {/* Day schedule dialog (monthly view) */}
      <DayScheduleDialog
        date={dayDialogDate}
        schedules={dayDialogSchedules}
        open={dayDialogOpen}
        onClose={() => setDayDialogOpen(false)}
        onSelectSchedule={handleSelectSchedule}
      />
    </div>
  )
}
