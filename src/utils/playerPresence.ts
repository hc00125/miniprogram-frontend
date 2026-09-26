import { BASE_URL } from '@/utils/request'
import { getStorage, SESSION_CHANGED_EVENT } from '@/utils/storage'

export const PRESENCE_HEARTBEAT_MS = 600000
export const PRESENCE_UPDATED_EVENT = 'player-presence-updated'

type PresenceReply = { tracked: boolean; player_id?: number; presence_online?: boolean }

// This best-effort informational request never opens login/payment/error dialogs.
// Use only the captured user credential, never an administrator-token fallback.
function sendHeartbeat(token: string): Promise<PresenceReply> {
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL}/player/presence/heartbeat`,
    method: 'POST', data: {}, timeout: 8000,
    header: { Authorization: `Bearer ${token}` },
    success: res => res.statusCode === 200 ? resolve(res.data as PresenceReply) : reject(res.statusCode),
    fail: reject
  }))
}

let visible = false
let generation = 0
let pendingGeneration: number | null = null
let timer: ReturnType<typeof setInterval> | undefined
function stopTimer() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}
async function beat(ticket: number) {
  const token = getStorage<string>('token')
  if (!visible || ticket !== generation || !token || pendingGeneration === ticket) return
  pendingGeneration = ticket
  try {
    const reply = await sendHeartbeat(token)
    if (visible && ticket === generation && token === getStorage<string>('token') && reply.tracked && reply.presence_online === true) {
      uni.$emit(PRESENCE_UPDATED_EVENT, reply)
    }
  } catch {
    // Offline/expired credentials: no rapid retry; next foreground/10-minute tick retries.
  } finally {
    if (pendingGeneration === ticket) pendingGeneration = null
  }
}
function restart() {
  const ticket = ++generation
  stopTimer()
  if (!visible || !getStorage<string>('token')) return
  void beat(ticket)
  timer = setInterval(() => { void beat(ticket) }, PRESENCE_HEARTBEAT_MS)
}
export const playerPresence = {
  launch() { uni.$on(SESSION_CHANGED_EVENT, restart) },
  show() { if (!visible) { visible = true; restart() } },
  hide() { visible = false; generation++; stopTimer() }
}
