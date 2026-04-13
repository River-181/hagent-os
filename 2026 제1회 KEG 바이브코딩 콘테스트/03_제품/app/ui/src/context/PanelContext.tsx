import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

interface PanelContextValue {
  panelContent: ReactNode
  panelVisible: boolean
  setPanelContent: (content: ReactNode) => void
  togglePanel: () => void
  closePanel: () => void
}

const PanelContext = createContext<PanelContextValue | null>(null)

const STORAGE_KEY = "hagent:panel-visible"

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panelContent, setPanelContentState] = useState<ReactNode>(null)
  const [panelVisible, setPanelVisible] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "true"
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(panelVisible))
  }, [panelVisible])

  const setPanelContent = useCallback((content: ReactNode) => {
    setPanelContentState(content)
  }, [])

  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => !prev)
  }, [])

  const closePanel = useCallback(() => {
    setPanelVisible(false)
  }, [])

  return (
    <PanelContext.Provider
      value={{ panelContent, panelVisible, setPanelContent, togglePanel, closePanel }}
    >
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel(): PanelContextValue {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error("usePanel must be used within PanelProvider")
  return ctx
}
