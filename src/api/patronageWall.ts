import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { getPatronageCrowns, getPatronageWallSummary, type PatronageCrown } from '@/api/patronage'
import { getClientSessionGeneration } from '@/utils/sessionExpiry'

export interface PatronageWallEntry { player: Pick<OnlinePlayer, 'id' | 'name' | 'avatar_url' | 'type_name'>; crowns: PatronageCrown[] }
export interface PatronageWallUpdate {
  completed: number
  total: number
  complete: boolean
  fromCache: boolean
}
export interface PatronageWallOptions {
  isCurrent?: () => boolean
  onProgress?: (completed: number, total: number) => void
  onUpdate?: (entries: PatronageWallEntry[], update: PatronageWallUpdate) => void
  forceRefresh?: boolean
}

const CACHE_TTL_MS = 60_000, CONCURRENCY = 8
type Subscriber = Required<Pick<PatronageWallOptions, 'isCurrent'>> & Pick<PatronageWallOptions, 'onProgress' | 'onUpdate'> & {
  resolve: (entries: PatronageWallEntry[]) => void
  reject: (error: unknown) => void
}
interface Scan {
  key: string
  subscribers: Set<Subscriber>
  results: (PatronageWallEntry | undefined)[]
  completed: number
  total: number
  ready: boolean
  stopped: boolean
  failure?: unknown
}
let cacheGeneration = 0
let cache: { key: string; savedAt: number; total: number; entries: PatronageWallEntry[] } | undefined
let activeScan: Scan | undefined
// Also cap overlapping cancelled/refreshed scans: their HTTP reads cannot be aborted.
let occupiedSlots = 0
const slotWaiters: (() => void)[] = []
function crownSlot(): Promise<() => void> {
  return new Promise(resolve => {
    function occupy() {
      occupiedSlots++
      let released = false
      resolve(() => {
        if (released) return
        released = true
        occupiedSlots--
        slotWaiters.shift()?.()
      })
    }
    if (occupiedSlots < CONCURRENCY) occupy()
    else slotWaiters.push(occupy)
  })
}
function sessionKey() { return JSON.stringify([String(uni.getStorageSync('token') || ''), getClientSessionGeneration(), cacheGeneration]) }
function cancelled() { return new Error('冠名榜单加载已取消') }
// API payloads are JSON data. Copy nested player metadata as well as crown arrays.
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) }
function activeEntries(results: Scan['results'], now: number): PatronageWallEntry[] {
  const entries: PatronageWallEntry[] = []
  for (const entry of results) {
    if (!entry) continue
    const crowns = entry.crowns.filter(crown => Date.parse(crown.starts_at) <= now && Date.parse(crown.expires_at) > now)
    if (crowns.length) entries.push({ player: entry.player, crowns })
  }
  return entries
}
function rejectSubscriber(scan: Scan, subscriber: Subscriber, error: unknown) {
  if (scan.subscribers.delete(subscriber)) subscriber.reject(error)
}
function stop(scan: Scan, error: unknown) {
  if (scan.stopped) return
  scan.stopped = true
  scan.failure = error
  if (activeScan === scan) activeScan = undefined
  for (const subscriber of scan.subscribers) subscriber.reject(error)
  scan.subscribers.clear()
}
function checkScan(scan: Scan) {
  if (scan.stopped) throw scan.failure
  if (scan.key !== sessionKey()) { stop(scan, cancelled()); throw scan.failure }
  for (const subscriber of scan.subscribers) {
    try { if (!subscriber.isCurrent()) rejectSubscriber(scan, subscriber, cancelled()) }
    catch (error) { rejectSubscriber(scan, subscriber, error) }
  }
  if (!scan.subscribers.size) { stop(scan, cancelled()); throw scan.failure }
}
function publish(scan: Scan, complete: boolean, progress: boolean, finalEntries?: PatronageWallEntry[]) {
  checkScan(scan)
  let entries = finalEntries
  for (const subscriber of scan.subscribers) {
    try {
      if (scan.key !== sessionKey() || !subscriber.isCurrent()) { rejectSubscriber(scan, subscriber, cancelled()); continue }
      if (progress) subscriber.onProgress?.(scan.completed, scan.total)
      if (scan.key !== sessionKey() || !subscriber.isCurrent()) { rejectSubscriber(scan, subscriber, cancelled()); continue }
      if (subscriber.onUpdate) {
        entries ??= activeEntries(scan.results, Date.now())
        subscriber.onUpdate(copy(entries), { completed: scan.completed, total: scan.total, complete, fromCache: false })
      }
      if (scan.key !== sessionKey() || !subscriber.isCurrent()) rejectSubscriber(scan, subscriber, cancelled())
    } catch (error) { rejectSubscriber(scan, subscriber, error) }
  }
  checkScan(scan)
}

/** Call after a confirmed naming purchase or session transition, never a quote. */
export function invalidatePatronageWallCache() {
  cacheGeneration++
  cache = undefined
  if (activeScan) stop(activeScan, cancelled())
}

/** Prefer the complete public summary; only HTTP 404 permits per-player reads.
 * Compatibility updates stay partial until complete=true; resolve only a complete wall.
 * Only successful complete results are cached, in memory for the current session.
 */
export async function loadPatronageWall({ isCurrent = () => true, onProgress, onUpdate, forceRefresh = false }: PatronageWallOptions = {}): Promise<PatronageWallEntry[]> {
  if (!isCurrent()) throw cancelled()
  if (forceRefresh) invalidatePatronageWallCache()
  const key = sessionKey()
  if (cache && cache.key === key) {
    const now = Date.now()
    if (now >= cache.savedAt && now - cache.savedAt < CACHE_TTL_MS) {
      const entries = activeEntries(cache.entries, now), total = cache.total
      onProgress?.(total, total)
      if (key !== sessionKey() || !isCurrent()) throw cancelled()
      onUpdate?.(copy(entries), { completed: total, total, complete: true, fromCache: true })
      if (key !== sessionKey() || !isCurrent()) throw cancelled()
      return copy(entries)
    }
  }
  cache = undefined
  let scan = activeScan
  // A second visible entry joins the same scan and receives its current snapshot.
  if (scan && scan.key === key && !scan.stopped) {
    try { checkScan(scan) } catch { scan = undefined }
  } else scan = undefined
  const fresh = !scan
  if (!scan) {
    if (activeScan) stop(activeScan, cancelled())
    scan = { key, subscribers: new Set(), results: [], completed: 0, total: 0, ready: false, stopped: false }
    activeScan = scan
  }
  const selected = scan
  let subscriber: Subscriber
  const pending = new Promise<PatronageWallEntry[]>((resolve, reject) => {
    subscriber = { isCurrent, onProgress, onUpdate, resolve, reject }
    selected.subscribers.add(subscriber)
  })
  if (fresh) void runScan(selected)
  else if (selected.ready) {
    // Only notify the new subscriber; existing consumers already have this snapshot.
    try {
      if (key !== sessionKey() || !subscriber!.isCurrent()) throw cancelled()
      subscriber!.onProgress?.(selected.completed, selected.total)
      if (key !== sessionKey() || !subscriber!.isCurrent()) throw cancelled()
      subscriber!.onUpdate?.(copy(activeEntries(selected.results, Date.now())), { completed: selected.completed, total: selected.total, complete: false, fromCache: false })
      if (key !== sessionKey() || !subscriber!.isCurrent()) throw cancelled()
    } catch (error) { rejectSubscriber(selected, subscriber!, error) }
  }
  return pending
}

async function runScan(scan: Scan) {
  try {
    checkScan(scan)
    // New servers return the complete wall in one read. Only an explicit 404
    // permits the old per-player scan during the backend deployment transition.
    const summary = await getPatronageWallSummary()
    checkScan(scan)
    if (summary !== null) {
      scan.ready = true
      scan.total = scan.completed = summary.length
      scan.results = copy(summary)
      publish(scan, false, true)
      finishScan(scan)
      return
    }
    const response = await getPlayerList({})
    checkScan(scan)
    if (!Array.isArray(response)) throw new Error('陪玩列表响应异常，请重试')
    const seen = new Set<number>(), players: OnlinePlayer[] = []
    for (const player of response) {
      if (!player || typeof player !== 'object' || Array.isArray(player) || !Number.isSafeInteger(player.id) || player.id <= 0) throw new Error('陪玩列表响应异常，请重试')
      if (player.is_archived === true || seen.has(player.id)) continue
      seen.add(player.id)
      players.push(copy(player))
    }
    scan.ready = true
    scan.total = players.length
    scan.results = new Array(players.length)
    publish(scan, false, true)
    let next = 0
    async function worker() {
      try {
        while (next < players.length) {
          checkScan(scan)
          const index = next++, player = players[index], release = await crownSlot()
          let crowns: PatronageCrown[]
          try { checkScan(scan); crowns = await getPatronageCrowns(player.id) }
          finally { release() }
          checkScan(scan)
          if (!Array.isArray(crowns)) throw new Error('冠名服务响应异常，请稍后重试')
          if (crowns.length) scan.results[index] = { player, crowns: copy(crowns) }
          scan.completed++
          publish(scan, false, true)
        }
      } catch (error) { stop(scan, error); throw error }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, players.length) }, () => worker()))
    checkScan(scan)
    finishScan(scan)
  } catch (error) { stop(scan, error) }
}

function finishScan(scan: Scan) {
  // Recheck expiry at the same completion time for either loading path.
  const now = Date.now(), entries = activeEntries(scan.results, now)
  publish(scan, true, false, entries)
  cache = { key: scan.key, savedAt: now, total: scan.total, entries: copy(entries) }
  if (activeScan === scan) activeScan = undefined
  scan.stopped = true
  for (const subscriber of scan.subscribers) subscriber.resolve(copy(entries))
  scan.subscribers.clear()
}
