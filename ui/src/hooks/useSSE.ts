// v0.2.0
import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

export function useSSE(orgId: string | null) {
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const retryDelayRef = useRef(5000)

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
      clearReconnectTimer()
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null
        connect()
      }, retryDelayRef.current)
    }

    const connect = () => {
      if (disposed) return
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        scheduleReconnect()
        return
      }

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
      retryDelayRef.current = 5000
      connect()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !esRef.current) {
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
