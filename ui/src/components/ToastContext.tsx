/**
 * ToastContext — accessible as @/components/ToastContext
 * Re-exports the context value from @/context/ToastContext so pages that
 * import ToastContext from either path get the same object.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { CheckCircle2, Info, XCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

interface ToastContextShape {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  addToast: (message: string, type?: ToastType) => void
}

interface Toast {
  id: string
  message: string
  type: ToastType
}

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 3500

// Named export so pages can `useContext(ToastContext)`
export const ToastContext = createContext<ToastContextShape | null>(null)

const toastIconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} />,
  error: <XCircle size={15} />,
  info: <Info size={15} />,
}
const toastColorMap: Record<ToastType, string> = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-teal-500)",
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  const color = toastColorMap[toast.type]
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, onRemove])

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl min-w-[260px] max-w-sm"
      style={{
        backgroundColor: "var(--bg-base)",
        border: `1px solid ${color}`,
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span style={{ color, marginTop: 1 }} className="shrink-0">
        {toastIconMap[toast.type]}
      </span>
      <p className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
        aria-label="닫기"
      >
        <X size={13} style={{ color: "var(--text-tertiary)" }} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }].slice(-MAX_TOASTS))
  }, [])

  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast])
  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast])
  const info = useCallback((msg: string) => addToast(msg, "info"), [addToast])

  return (
    <ToastContext.Provider value={{ addToast, success, error, info }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end"
          aria-live="polite"
          aria-label="알림"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextShape {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
