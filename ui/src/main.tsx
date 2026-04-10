import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { AppErrorBoundary } from "@/components/AppErrorBoundary"
import { ToastProvider } from "@/components/ToastContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { OrganizationProvider } from "@/context/OrganizationContext"
import { SidebarProvider } from "@/context/SidebarContext"
import { PanelProvider } from "@/context/PanelContext"
import { BreadcrumbProvider } from "@/context/BreadcrumbContext"
import { App } from "./App"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <ToastProvider>
              <OrganizationProvider>
                <SidebarProvider>
                  <PanelProvider>
                    <BreadcrumbProvider>
                      <App />
                    </BreadcrumbProvider>
                  </PanelProvider>
                </SidebarProvider>
              </OrganizationProvider>
            </ToastProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>
)
