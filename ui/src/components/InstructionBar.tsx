import { useRef, useEffect, type KeyboardEvent } from "react"
import { Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AgentMention {
  id: string
  name: string
}

interface InstructionBarProps {
  /** Controlled value */
  value?: string
  onChange?: (value: string) => void
  onSubmit?: () => void
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  agents?: AgentMention[]
  className?: string
}

export function InstructionBar({
  value = "",
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  placeholder = "오케스트레이터에게 지시하기...",
  agents = [],
  className,
}: InstructionBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit?.()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div
      className={cn("rounded-xl overflow-hidden relative", className)}
      style={{
        backgroundColor: "var(--bg-base)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border-default)",
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "조직을 선택해 주세요" : placeholder}
        rows={1}
        disabled={loading || disabled}
        className="w-full resize-none border-0 bg-transparent p-4 pr-14 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[52px] max-h-[200px] overflow-y-auto"
        style={{
          color: "var(--text-primary)",
          scrollbarWidth: "none",
        }}
      />

      {/* Submit button */}
      <div className="absolute right-3 bottom-3">
        <Button
          size="icon"
          onClick={onSubmit}
          disabled={!value.trim() || loading || disabled}
          className="h-8 w-8 rounded-lg border-0 text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "var(--color-teal-500)" }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} className="fill-current" />
          )}
        </Button>
      </div>

      {/* Loading state footer */}
      {loading && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs"
          style={{
            borderTop: "1px solid var(--border-default)",
            color: "var(--text-tertiary)",
          }}
        >
          <Loader2 size={12} className="animate-spin" />
          분석 중...
        </div>
      )}
    </div>
  )
}
