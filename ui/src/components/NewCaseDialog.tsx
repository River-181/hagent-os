import { useContext, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { casesApi } from "@/api/cases"
import { agentsApi } from "@/api/agents"
import { queryKeys } from "@/lib/queryKeys"
import { useOrganization } from "@/context/OrganizationContext"
import { ToastContext } from "@/components/ToastContext"
import { cn } from "@/lib/utils"
import { Loader2, Paperclip, Tag, X } from "lucide-react"

// ─── constants ─────────────────────────────────────────────────────────────

const caseTypes = [
  { value: "complaint", label: "민원" },
  { value: "refund", label: "환불" },
  { value: "makeup", label: "보강" },
  { value: "inquiry", label: "문의" },
  { value: "churn", label: "이탈" },
  { value: "schedule", label: "일정" },
]

const severityOptions = [
  { value: "immediate", label: "즉시", color: "var(--color-danger)" },
  { value: "same_day", label: "당일", color: "#eab308" },
  { value: "normal", label: "일반", color: "var(--text-secondary)" },
  { value: "low", label: "낮음", color: "var(--text-tertiary)" },
]

// Agent list is fetched from API in the component

// ─── initial state ──────────────────────────────────────────────────────────

function defaultForm() {
  return {
    type: "",
    title: "",
    description: "",
    severity: "normal",
    agentId: "",
  }
}

// ─── component ──────────────────────────────────────────────────────────────

interface NewCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  casesCount?: number
}

export function NewCaseDialog({ open, onOpenChange, casesCount = 0 }: NewCaseDialogProps) {
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const { selectedOrgId } = useOrganization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useContext(ToastContext)
  const titleRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState<{ title?: string }>({})

  // Fetch real agents
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedOrgId ?? ""),
    queryFn: () => agentsApi.list(selectedOrgId!),
    enabled: !!selectedOrgId && open,
  })

  const nextId = `C-${String(casesCount + 1).padStart(3, "0")}`

  const create = useMutation({
    mutationFn: () =>
      casesApi.create(selectedOrgId!, {
        type: form.type || undefined,
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
        agentId: form.agentId || undefined,
      }),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(selectedOrgId ?? "") })
      toast?.success("케이스가 등록되었습니다.")
      onOpenChange(false)
      setForm(defaultForm())
      setErrors({})
      navigate(`/${orgPrefix}/cases/${created.id}`)
    },
    onError: () => {
      toast?.error("케이스 등록에 실패했습니다.")
    },
  })

  function validate(): boolean {
    const newErrors: typeof errors = {}
    if (!form.title.trim()) newErrors.title = "제목을 입력해주세요."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    create.mutate()
  }

  function handleDiscard() {
    setForm(defaultForm())
    setErrors({})
    onOpenChange(false)
  }

  const isDirty = !!(form.type || form.title || form.description || form.agentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden"
        style={{
          backgroundColor: "var(--bg-base)",
          border: "1px solid var(--border-default)",
          borderRadius: 14,
        }}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              케이스
            </DialogTitle>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            <span className="font-mono">{nextId}</span>
            <span className="mx-1">›</span>
            새 케이스
          </p>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 pt-3 pb-1 space-y-3">
          {/* Title */}
          <Input
            ref={titleRef}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="제목을 입력하세요..."
            className={cn(
              "border-0 border-b rounded-none px-0 text-base font-medium focus-visible:ring-0 focus-visible:border-b-2",
              errors.title && "border-b-red-500"
            )}
            style={{
              color: "var(--text-primary)",
              backgroundColor: "transparent",
              borderColor: errors.title ? undefined : "var(--border-default)",
            }}
            autoFocus
          />
          {errors.title && (
            <p className="text-xs -mt-2" style={{ color: "var(--color-danger)" }}>
              {errors.title}
            </p>
          )}

          {/* Assignee + Type */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select
                value={form.agentId}
                onValueChange={(v) => setForm((f) => ({ ...f, agentId: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="에이전트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(agents as any[]).map((a: any) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="설명을 입력하세요..."
            rows={3}
            className="resize-none text-sm border focus-visible:ring-1"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-1 px-5 py-2"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          {/* Status / severity pills */}
          <div className="flex items-center gap-1 flex-1 flex-wrap">
            {severityOptions.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border transition-colors",
                  form.severity === s.value
                    ? "border-transparent font-semibold"
                    : "border-transparent hover:bg-[var(--bg-tertiary)]"
                )}
                style={{
                  color: form.severity === s.value ? s.color : "var(--text-tertiary)",
                  backgroundColor:
                    form.severity === s.value
                      ? `${s.color}18`
                      : undefined,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
            title="라벨"
          >
            <Tag size={14} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
            title="첨부파일"
          >
            <Paperclip size={14} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="text-xs hover:underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isDirty ? "초안 삭제" : "닫기"}
          </button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || !form.title.trim()}
            size="sm"
            className="gap-1.5 text-xs"
            style={{ backgroundColor: "var(--color-teal-500)", color: "#fff" }}
          >
            {create.isPending && <Loader2 size={13} className="animate-spin" />}
            케이스 등록
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
