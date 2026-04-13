import { EventEmitter } from "events"

const emitter = new EventEmitter()
emitter.setMaxListeners(100)

let eventId = 0

export interface LiveEvent {
  id: number
  organizationId: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

export function publishEvent(
  organizationId: string,
  type: string,
  payload: Record<string, unknown>,
): LiveEvent {
  const event: LiveEvent = {
    id: ++eventId,
    organizationId,
    type,
    payload,
    createdAt: new Date().toISOString(),
  }
  emitter.emit(`org:${organizationId}`, event)
  return event
}

export function subscribeEvents(
  organizationId: string,
  listener: (event: LiveEvent) => void,
): () => void {
  const channel = `org:${organizationId}`
  emitter.on(channel, listener)
  return () => emitter.off(channel, listener)
}
