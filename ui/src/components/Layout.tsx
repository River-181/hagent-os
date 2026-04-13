import { useEffect } from "react"
import { Outlet, useNavigate, useParams } from "react-router-dom"
import { OrganizationRail } from "./OrganizationRail"
import { Sidebar } from "./Sidebar"
import { BreadcrumbBar } from "./BreadcrumbBar"
import { PropertiesPanel } from "./PropertiesPanel"
import { MobileTabBar } from "./MobileTabBar"
import { GlobalCommandPalette } from "./CommandPalette"
import { AssistantLauncher } from "./AssistantLauncher"
import { useSidebar } from "@/context/SidebarContext"
import { useOrganization } from "@/context/OrganizationContext"
import { useSSE } from "@/hooks/useSSE"

export function Layout() {
  const { sidebarOpen, isMobile, closeSidebar } = useSidebar()
  const { orgPrefix } = useParams<{ orgPrefix: string }>()
  const navigate = useNavigate()
  const { setSelectedOrgByPrefix, isLoading, selectedOrgId, organizations } = useOrganization()

  useSSE(selectedOrgId)

  useEffect(() => {
    if (!orgPrefix || isLoading) return

    const matchedOrganization = organizations.find(
      (organization) => organization.prefix === orgPrefix || organization.slug === orgPrefix,
    )

    if (matchedOrganization) {
      setSelectedOrgByPrefix(orgPrefix)
      return
    }

    if (organizations.length === 0) return

    const fallbackOrganization =
      organizations.find((organization) => organization.id === selectedOrgId) ?? organizations[0]

    if (fallbackOrganization?.prefix && fallbackOrganization.prefix !== orgPrefix) {
      navigate(`/${fallbackOrganization.prefix}/dashboard`, { replace: true })
    }
  }, [orgPrefix, isLoading, navigate, organizations, selectedOrgId, setSelectedOrgByPrefix])

  return (
    <div
      className="flex"
      style={{
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--bg-canvas)",
      }}
    >
      {/* Zone 0: Organization Rail */}
      {!isMobile && <OrganizationRail />}

      {/* Zone 1: Sidebar — desktop static, mobile overlay */}
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 flex"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeSidebar()
              }}
              style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            >
              <Sidebar />
            </div>
          )}
        </>
      ) : (
        sidebarOpen && <Sidebar />
      )}

      {/* Zone 2: Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <BreadcrumbBar />
        <main
          className="flex-1 overflow-x-hidden overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-canvas)",
            paddingBottom: isMobile ? 60 : 0,
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Zone 3: Properties panel (desktop only) */}
      {!isMobile && <PropertiesPanel />}

      {/* Mobile bottom tab bar */}
      {isMobile && <MobileTabBar />}

      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <GlobalCommandPalette />
      <AssistantLauncher />
    </div>
  )
}
