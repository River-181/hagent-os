// v0.2.0
import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

export function useSSE(orgId: string | null) {
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!orgId) return

    let disposed = false

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const connect = () => {
      if (disposed) return

      const es = new EventSource(`/api/organizations/${orgId}/events/sse`)
      esRef.current = es

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
        es.close()
        if (esRef.current === es) {
          esRef.current = null
        }
        if (disposed) return

        clearReconnectTimer()
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, 5000)
      }
    }

    connect()

    return () => {
      disposed = true
      clearReconnectTimer()
      esRef.current?.close()
      esRef.current = null
    }
  }, [orgId, queryClient])
}
