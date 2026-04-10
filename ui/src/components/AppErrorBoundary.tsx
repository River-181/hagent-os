import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] page render failed", error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoDashboard = () => {
    const [, orgPrefix] = window.location.pathname.split("/")
    const fallbackPrefix = orgPrefix || "tanzania"
    window.location.assign(`/${fallbackPrefix}/dashboard`)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f7_100%)] px-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
            <AlertTriangle className="h-7 w-7 text-rose-600" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
            페이지 렌더링 중 오류가 발생했습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            흰 화면 대신 오류 화면을 표시했습니다. 새로고침 후에도 같은 문제가 반복되면 아래 오류 메시지를 기준으로 해당 페이지를 바로 수정할 수 있습니다.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Current Route</p>
            <p className="mt-2 break-all text-sm font-medium text-slate-900">{window.location.pathname}</p>
            {this.state.error?.message && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Error</p>
                <p className="mt-2 break-words font-mono text-xs leading-6 text-rose-700">
                  {this.state.error.message}
                </p>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={this.handleReload} className="bg-slate-900 text-white hover:bg-slate-800">
              <RefreshCcw className="h-4 w-4" />
              새로고침
            </Button>
            <Button variant="outline" onClick={this.handleGoDashboard}>
              대시보드로 이동
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
