import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

interface PanelContextValue {
  panelContent: ReactNode
  panelVisible: boolean
  setPanelContent: (content: ReactNode) => void
  openPanel: () => void
  togglePanel: () => void
  closePanel: () => void
}

const PanelContext = createContext<PanelContextValue | null>(null)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panelContent, setPanelContentState] = useState<ReactNode>(null)
  const [panelVisible, setPanelVisible] = useState<boolean>(false)

  const setPanelContent = useCallback((content: ReactNode) => {
    setPanelContentState(content)
  }, [])

  const openPanel = useCallback(() => {
    setPanelVisible(true)
  }, [])

  const togglePanel = useCallback(() => {
    setPanelVisible((current) => !current)
  }, [])

  const closePanel = useCallback(() => {
    setPanelVisible(false)
  }, [])

  return (
    <PanelContext.Provider
      value={{ panelContent, panelVisible, setPanelContent, openPanel, togglePanel, closePanel }}
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
