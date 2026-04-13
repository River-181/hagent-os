// v0.4.0
import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useBreadcrumbs } from "@/context/BreadcrumbContext"
import { useOrganization } from "@/context/OrganizationContext"
import { schedulesApi } from "@/api/schedules"
import { api } from "@/api/client"
import { queryKeys } from "@/lib/queryKeys"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Loader2, Plus, CalendarDays, Pencil, Trash2 } from "lucide-react"

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
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"]
const WEEK_DAYS = ["월", "화", "수", "목", "금", "토"]
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

// dayOfWeek: 1=월,2=화,3=수,4=목,5=금,6=토 (matching seed data convention)
const DAY_INDEX_MAP: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }

// ─── Type color config ─────────────────────────────────────────────────────────

type ScheduleType = "regular" | "special" | "makeup" | "counseling" | "event" | "admin" | "legal" | "shuttle" | "leave"

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string; icon: string }> = {
  regular:    { bg: "#ccfbf1", text: "#0f766e", dot: "#14b8a6", label: "수업", icon: "📚" },
  special:    { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "특강", icon: "⭐" },
  makeup:     { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "보강", icon: "🔄" },
  counseling: { bg: "#fef9c4", text: "#854d0e", dot: "#ca8a04", label: "상담", icon: "💬" },
  event:      { bg: "#ede9fe", text: "#6d28d9", dot: "#8b5cf6", label: "이벤트", icon: "🎉" },
  admin:      { bg: "#f3f4f6", text: "#374151", dot: "#6b7280", label: "행정", icon: "📋" },
  legal:      { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "법정기한", icon: "⚖️" },
  shuttle:    { bg: "#e0e7ff", text: "#3730a3", dot: "#6366f1", label: "등하원", icon: "🚐" },
  leave:      { bg: "#fef3c7", text: "#92400e", dot: "#d97706", label: "휴가", icon: "🏖️" },
}

function getTypeColor(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.regular
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

function getWeekDates(baseDate: Date): Date[] {
  // Returns Mon–Sat of the week containing baseDate
  const day = baseDate.getDay() // 0=Sun
  const monday = new Date(baseDate)
  const offset = day === 0 ? -6 : 1 - day
  monday.setDate(baseDate.getDate() + offset)
  return Array.from({ length: 6 }, (_, i) => {
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
  schedule,
  open,
  onClose,
}: {
  schedule: ScheduleItem | null
  open: boolean
  onClose: () => void
}) {
  const { selectedOrgId } = useOrganization()
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
    queryKey: ["instructors", selectedOrgId],
    queryFn: () => api.get<InstructorOption[]>(`/organizations/${selectedOrgId}/instructors`),
    enabled: !!selectedOrgId && isEditing,
  })

  // Students and enrollment rows for this schedule
  const { data: allStudents = [] } = useQuery<StudentOption[]>({
    queryKey: ["students", selectedOrgId, "schedule-detail"],
    queryFn: () => api.get<StudentOption[]>(`/organizations/${selectedOrgId}/students`),
    enabled: !!selectedOrgId && !!schedule && (schedule.type === "regular" || schedule.type === "special" || schedule.type === "makeup"),
  })

  const { data: studentSchedules = [] } = useQuery<StudentScheduleRow[]>({
    queryKey: ["student-schedules", selectedOrgId, schedule?.id ?? ""],
    queryFn: () =>
      api.get<StudentScheduleRow[]>(`/organizations/${selectedOrgId}/student-schedules`),
    enabled: !!selectedOrgId && !!schedule && (schedule.type === "regular" || schedule.type === "special" || schedule.type === "makeup"),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      schedulesApi.update(selectedOrgId!, schedule!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(selectedOrgId ?? "") })
      setIsEditing(false)
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.remove(selectedOrgId!, schedule!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(selectedOrgId ?? "") })
      setConfirmDelete(false)
      onClose()
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
      <DialogContent className="max-w-md" style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
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
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
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
              <option value="">강사 미지정</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name} ({inst.subject})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="text-xs">취소</Button>
              <Button size="sm" disabled={!editTitle.trim() || updateMutation.isPending}
                onClick={handleSave}
                className="text-xs text-white" style={{ backgroundColor: "var(--color-teal-500)" }}>
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
                  <span className="text-xs w-14 shrink-0" style={{ color: "var(--text-tertiary)" }}>강사</span>
                  <span className="text-sm font-medium" style={{ color: "var(--color-teal-500)" }}>
                    {schedule.instructor.name}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>{schedule.instructor.subject}</span>
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
                style={{ backgroundColor: "rgba(239,68,68,0.06)", color: "#991b1b", border: "1px solid rgba(239,68,68,0.15)" }}>
                법정 기한입니다. 기한 내 처리하지 않으면 과태료가 부과될 수 있습니다.
                에이전트가 D-3일에 자동 알림을 보냅니다.
              </div>
            )}
            {isShuttle && (
              <div className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: "rgba(99,102,241,0.06)", color: "#3730a3", border: "1px solid rgba(99,102,241,0.15)" }}>
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
                style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p style={{ color: "#991b1b" }}>이 일정을 삭제하시겠습니까?</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} className="text-xs h-7">취소</Button>
                  <Button size="sm" disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    className="text-xs h-7 text-white" style={{ backgroundColor: "#ef4444" }}>
                    {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                    삭제 확인
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}
                  className="text-xs gap-1" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
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

function NewScheduleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedOrgId } = useOrganization()
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
    queryKey: ["instructors", selectedOrgId],
    queryFn: () => api.get<InstructorOption[]>(`/organizations/${selectedOrgId}/instructors`),
    enabled: !!selectedOrgId && open,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post(`/organizations/${selectedOrgId}/schedules`, {
      title, type, dayOfWeek, startTime: allDay ? "00:00" : startTime,
      endTime: allDay ? "23:59" : endTime, room: room || null,
      instructorId: instructorId || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(selectedOrgId ?? "") })
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
      <DialogContent style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
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
            <option value="">강사 미지정</option>
            {instructors.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name} ({inst.subject})</option>
            ))}
          </select>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">취소</Button>
            <Button size="sm" disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="text-xs text-white" style={{ backgroundColor: "var(--color-teal-500)" }}>
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
}: {
  schedules: ScheduleItem[]
  weekDates: Date[]
  onSelectSchedule: (s: ScheduleItem) => void
}) {
  const today = new Date()

  const getBlocksForCell = (dayOfWeek: number, hour: number) =>
    schedules.filter((s) => {
      const dow = s.dayOfWeek
      const startH = parseHour(s.startTime)
      return dow === dayOfWeek && startH === hour
    })

  return (
    <div
      className="rounded-xl overflow-auto"
      style={{
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <table className="border-collapse min-w-[640px] w-full">
        <thead>
          <tr>
            <th
              className="w-16 px-3 py-2 text-xs text-left"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-tertiary)",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              시간
            </th>
            {weekDates.map((date, idx) => {
              const isToday = isSameDay(date, today)
              const dow = idx + 1 // 1=Mon ... 6=Sat
              return (
                <th
                  key={dow}
                  className="px-2 py-2 text-xs font-semibold text-center"
                  style={{
                    backgroundColor: isToday ? "rgba(20,184,166,0.06)" : "var(--bg-secondary)",
                    color: isToday ? "#0f766e" : "var(--text-secondary)",
                    borderBottom: "1px solid var(--border-default)",
                    borderLeft: "1px solid var(--border-default)",
                    minWidth: 110,
                  }}
                >
                  <div>{WEEK_DAYS[idx]}</div>
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mt-0.5",
                      isToday && "font-bold"
                    )}
                    style={{
                      backgroundColor: isToday ? "#14b8a6" : "transparent",
                      color: isToday ? "#fff" : "inherit",
                    }}
                  >
                    {date.getDate()}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td
                className="px-3 py-2 text-xs align-top"
                style={{
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                {hour}:00
              </td>
              {weekDates.map((_, idx) => {
                const dow = idx + 1
                const blocks = getBlocksForCell(dow, hour)
                return (
                  <td
                    key={dow}
                    className="px-1.5 py-1.5 align-top"
                    style={{
                      borderBottom: "1px solid var(--border-default)",
                      borderLeft: "1px solid var(--border-default)",
                      backgroundColor: "var(--bg-elevated)",
                      minHeight: 48,
                    }}
                  >
                    {blocks.map((block) => {
                      const colors = getTypeColor(block.type)
                      const startH = parseHour(block.startTime)
                      const endH = parseHour(block.endTime)
                      const startM = parseMinute(block.startTime)
                      const endM = parseMinute(block.endTime)
                      const spanHours = (endH + endM / 60) - (startH + startM / 60)

                      return (
                        <button
                          key={block.id}
                          onClick={() => onSelectSchedule(block)}
                          className="w-full text-left rounded-md px-2 py-1.5 text-xs mb-1 transition-all duration-150 hover:shadow-sm hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-offset-1"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            minHeight: spanHours > 1 ? `${spanHours * 3}rem` : undefined,
                            border: `1px solid ${colors.dot}30`,
                            display: "block",
                          }}
                        >
                          <div className="flex items-center gap-1 font-semibold leading-tight">
                            <span className="text-[10px]">{colors.icon}</span>
                            <span className="truncate">{block.title}</span>
                          </div>
                          {block.instructor && (
                            <div className="mt-0.5 opacity-80">{block.instructor.name}</div>
                          )}
                          {block.room && <div className="opacity-60">{block.room}</div>}
                          {spanHours > 1 && (
                            <div className="opacity-60 mt-0.5">
                              {formatTimeRange(block.startTime, block.endTime)}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── MonthlyView ───────────────────────────────────────────────────────────────

function MonthlyView({
  schedules,
  year,
  month,
  onDayClick,
}: {
  schedules: ScheduleItem[]
  year: number
  month: number
  onDayClick: (date: Date, daySchedules: ScheduleItem[]) => void
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
    return schedules.filter((s) => s.dayOfWeek === seedDow)
  }

  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
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
              <button
                key={ci}
                onClick={() => dayItems.length > 0 && onDayClick(date, dayItems)}
                className="min-h-[100px] p-1.5 text-left transition-all duration-150 hover:bg-[rgba(20,184,166,0.03)] focus:outline-none"
                style={{
                  backgroundColor: isToday ? "rgba(20,184,166,0.04)" : "var(--bg-elevated)",
                  borderLeft: ci > 0 ? "1px solid var(--border-default)" : undefined,
                  cursor: dayItems.length > 0 ? "pointer" : "default",
                }}
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mb-1 font-medium",
                    isToday && "text-white"
                  )}
                  style={{
                    backgroundColor: isToday ? "#14b8a6" : "transparent",
                    color: !isToday ? (inMonth ? "var(--text-primary)" : "var(--text-tertiary)") : undefined,
                  }}
                >
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                  {dayItems.slice(0, 3).map((s, i) => {
                    const colors = getTypeColor(s.type)
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                        title={s.title}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
                        <span className="truncate">{s.title}</span>
                      </div>
                    )
                  })}
                  {dayItems.length > 3 && (
                    <span className="text-[10px] px-1" style={{ color: "var(--text-tertiary)" }}>
                      +{dayItems.length - 3}개 더
                    </span>
                  )}
                </div>
              </button>
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
      <DialogContent className="max-w-sm" style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)" }}>
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
                        {s.instructor && <span>· {s.instructor.name}</span>}
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
  const instructorMap = new Map<string, { name: string; subject: string; count: number }>()
  for (const s of schedules) {
    if (s.instructor) {
      const existing = instructorMap.get(s.instructor.id)
      if (existing) {
        existing.count++
      } else {
        instructorMap.set(s.instructor.id, { name: s.instructor.name, subject: s.instructor.subject, count: 1 })
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
          <span style={{ color: "var(--text-tertiary)" }}>· {inst.subject}</span>
        </div>
      ))}
    </div>
  )
}

// ─── SchedulePage ──────────────────────────────────────────────────────────────

export function SchedulePage() {
  const { setBreadcrumbs } = useBreadcrumbs()
  const { selectedOrgId } = useOrganization()

  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [dayDialogDate, setDayDialogDate] = useState<Date | null>(null)
  const [dayDialogSchedules, setDayDialogSchedules] = useState<ScheduleItem[]>([])
  const [newScheduleOpen, setNewScheduleOpen] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: "스케줄" }])
  }, [setBreadcrumbs])

  const { data: schedules = [], isLoading, isError } = useQuery({
    queryKey: selectedOrgId ? queryKeys.schedules.list(selectedOrgId) : [],
    queryFn: () => schedulesApi.list(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  const filteredSchedules = typeFilter
    ? (schedules as ScheduleItem[]).filter((s) => s.type === typeFilter)
    : (schedules as ScheduleItem[])

  const weekDates = getWeekDates(currentDate)

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
    setDetailOpen(true)
  }

  const handleDayClick = (date: Date, daySchedules: ScheduleItem[]) => {
    setDayDialogDate(date)
    setDayDialogSchedules(daySchedules)
    setDayDialogOpen(true)
  }

  const dateLabel = viewMode === "weekly"
    ? formatWeekLabel(weekDates)
    : formatMonthLabel(currentDate)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            일정 관리
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            수업, 상담, 등하원, 법정기한 등 모든 일정
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Today button */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setCurrentDate(new Date())}
            style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
          >
            <CalendarDays size={13} />
            오늘
          </Button>

          {/* Add schedule button */}
          <Button
            size="sm"
            className="text-xs gap-1.5 text-white"
            style={{ backgroundColor: "var(--color-teal-500)" }}
            onClick={() => setNewScheduleOpen(true)}
          >
            <Plus size={13} />
            일정 추가
          </Button>

          {/* View toggle */}
          <div
            className="flex rounded-lg overflow-hidden text-sm"
            style={{ border: "1px solid var(--border-default)" }}
          >
            {(["weekly", "monthly"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === mode ? "var(--color-primary-bg)" : "var(--bg-secondary)",
                  color: viewMode === mode ? "var(--color-teal-500)" : "var(--text-tertiary)",
                }}
              >
                {mode === "weekly" ? "주간" : "월간"}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
              style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              aria-label="이전"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="px-3 py-1.5 text-sm font-medium min-w-[200px] text-center"
              style={{ color: "var(--text-primary)" }}
            >
              {dateLabel}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg transition-colors hover:bg-opacity-80"
              style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              aria-label="다음"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "var(--text-tertiary)" }}>
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">일정을 불러오는 중...</span>
        </div>
      )}

      {isError && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {/* Type filter pills */}
      {!isLoading && !isError && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTypeFilter(null)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: !typeFilter ? "var(--color-teal-500)" : "var(--bg-tertiary)",
              color: !typeFilter ? "#fff" : "var(--text-secondary)",
            }}
          >
            전체 ({(schedules as any[]).length})
          </button>
          {Object.entries(TYPE_COLORS).map(([type, c]) => {
            const count = (schedules as ScheduleItem[]).filter((s) => s.type === type).length
            if (count === 0) return null
            const isActive = typeFilter === type
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(isActive ? null : type)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
                style={{
                  backgroundColor: isActive ? c.bg : "var(--bg-tertiary)",
                  color: isActive ? c.text : "var(--text-secondary)",
                  border: isActive ? `1px solid ${c.dot}40` : "1px solid transparent",
                }}
              >
                <span>{c.icon}</span>
                {c.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {viewMode === "weekly" ? (
            <WeeklyView
              schedules={filteredSchedules}
              weekDates={weekDates}
              onSelectSchedule={handleSelectSchedule}
            />
          ) : (
            <MonthlyView
              schedules={filteredSchedules}
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              onDayClick={handleDayClick}
            />
          )}

          {/* Bottom section */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                담당 강사
              </p>
              <InstructorList schedules={schedules as ScheduleItem[]} />
            </div>
            <div className="sm:text-right">
              <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>
                총 {(schedules as any[]).length}개 일정
                {typeFilter && ` (${filteredSchedules.length}개 필터됨)`}
              </p>
              <p className="text-xs" style={{ color: "var(--text-disabled)" }}>
                일정 추가/수정은 에이전트에게 지시하거나 대시보드에서 가능합니다.
              </p>
            </div>
          </div>
        </>
      )}

      {/* New schedule dialog */}
      <NewScheduleDialog open={newScheduleOpen} onClose={() => setNewScheduleOpen(false)} />

      {/* Schedule detail dialog */}
      <ScheduleDetailDialog
        schedule={selectedSchedule}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
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
