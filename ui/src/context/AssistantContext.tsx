import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

interface AssistantContextValue {
  open: boolean
  setOpen: (next: boolean) => void
  openAssistant: () => void
  closeAssistant: () => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openAssistant = useCallback(() => setOpen(true), [])
  const closeAssistant = useCallback(() => setOpen(false), [])

  return (
    <AssistantContext.Provider value={{ open, setOpen, openAssistant, closeAssistant }}>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider")
  return ctx
}
