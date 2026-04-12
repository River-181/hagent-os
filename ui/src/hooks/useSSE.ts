// v0.2.0
import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

export function useSSE(orgId: string | null) {
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const retryDelayRef = useRef(5000)
  const reconnectEpochRef = useRef(0)

  useEffect(() => {
    if (!orgId) return

    let disposed = false

    const invalidateOrgQueries = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.schedules.list(orgId) })
    }

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const invalidatePendingReconnect = () => {
      reconnectEpochRef.current += 1
      clearReconnectTimer()
    }

    const closeEventSource = (target?: EventSource | null) => {
      if (target) {
        target.close()
      }
      if (!target || esRef.current === target) {
        esRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (disposed) return
      const epoch = ++reconnectEpochRef.current
      clearReconnectTimer()
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null
        if (disposed || epoch !== reconnectEpochRef.current) return
        connect()
      }, retryDelayRef.current)
    }

    const hasActiveEventSource = () => {
      const es = esRef.current
      return es !== null && es.readyState !== EventSource.CLOSED
    }

    const connect = () => {
      if (disposed) return
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        scheduleReconnect()
        return
      }

      if (hasActiveEventSource()) {
        return
      }

      invalidatePendingReconnect()
      closeEventSource(esRef.current)

      const es = new EventSource(`/api/organizations/${orgId}/events/sse`)
      esRef.current = es

      es.onopen = () => {
        retryDelayRef.current = 5000
        clearReconnectTimer()
        invalidateOrgQueries()
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const type = data.type as string

          if (type?.startsWith("agent.")) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(orgId) })
          }
          if (type?.startsWith("case.")) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.list(orgId) })
          }
          if (type?.startsWith("approval.")) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(orgId) })
          }
          if (type?.startsWith("activity.")) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(orgId) })
          }
          if (type?.startsWith("case.") || type?.startsWith("approval.") || type?.startsWith("agent.")) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(orgId) })
          }
          void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(orgId) })
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        closeEventSource(es)
        if (disposed) return

        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30000)
        scheduleReconnect()
      }
    }

    const handleOnline = () => {
      if (disposed) return
      retryDelayRef.current = 5000
      connect()
    }

    const handleVisibilityChange = () => {
      if (disposed) return
      if (document.visibilityState === "visible" && !hasActiveEventSource()) {
        retryDelayRef.current = 5000
        connect()
      }
    }

    connect()
    window.addEventListener("online", handleOnline)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      disposed = true
      clearReconnectTimer()
      window.removeEventListener("online", handleOnline)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      closeEventSource(esRef.current)
    }
  }, [orgId, queryClient])
}
