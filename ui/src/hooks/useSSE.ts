// v0.2.0
import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

export function useSSE(orgId: string | null) {
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!orgId) return

    const es = new EventSource(`/api/organizations/${orgId}/events/sse`)
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const type = data.type as string

        // Invalidate relevant queries based on event type
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
        // Always refresh activity on any event
        void queryClient.invalidateQueries({ queryKey: queryKeys.activity.list(orgId) })
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es.close()
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null
        }
      }, 5000)
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [orgId, queryClient])
}
