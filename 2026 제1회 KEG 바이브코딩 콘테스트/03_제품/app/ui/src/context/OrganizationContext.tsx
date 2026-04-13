import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useQuery } from "@tanstack/react-query"
import { organizationsApi } from "@/api/organizations"
import { queryKeys } from "@/lib/queryKeys"

interface OrganizationContextValue {
  selectedOrgId: string | null
  setSelectedOrgId: (id: string) => void
  setSelectedOrgByPrefix: (prefix: string) => void
  organizations: any[]
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

const STORAGE_KEY = "hagent:selectedOrgId"

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: queryKeys.organizations.all,
    queryFn: () => organizationsApi.list(),
  })

  useEffect(() => {
    if (!selectedOrgId && organizations.length > 0) {
      setSelectedOrgIdState(organizations[0].id)
    }
  }, [organizations, selectedOrgId])

  const setSelectedOrgId = (id: string) => {
    setSelectedOrgIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const setSelectedOrgByPrefix = (prefix: string) => {
    const match = organizations.find((o) => o.prefix === prefix || o.slug === prefix)
    if (match && match.id !== selectedOrgId) {
      setSelectedOrgId(match.id)
    }
  }

  return (
    <OrganizationContext.Provider
      value={{ selectedOrgId, setSelectedOrgId, setSelectedOrgByPrefix, organizations, isLoading }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider")
  return ctx
}
