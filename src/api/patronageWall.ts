import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { getPatronageCrowns, type PatronageCrown } from '@/api/patronage'

export interface PatronageWallEntry { player: OnlinePlayer; crowns: PatronageCrown[] }
export interface PatronageWallOptions {
  isCurrent?: () => boolean
  onProgress?: (completed: number, total: number) => void
}

/** Public players are currently returned as one complete, unpaginated array.
 * Crowns are read per player because the backend has no public aggregate route.
 * Publish only a complete result; a failed read must not look like an empty wall.
 */
export async function loadPatronageWall({ isCurrent = () => true, onProgress }: PatronageWallOptions = {}): Promise<PatronageWallEntry[]> {
  let stopped = false, failure: unknown
  function checkCurrent() {
    if (stopped) throw failure
    if (!isCurrent()) {
      stopped = true
      failure = new Error('冠名榜单加载已取消')
      throw failure
    }
  }
  checkCurrent()
  const response = await getPlayerList({})
  checkCurrent()
  if (!Array.isArray(response)) throw new Error('陪玩列表响应异常，请重试')
  const seen = new Set<number>(), players: OnlinePlayer[] = []
  for (const player of response) {
    if (!player || typeof player !== 'object' || Array.isArray(player) || !Number.isSafeInteger(player.id) || player.id <= 0) {
      throw new Error('陪玩列表响应异常，请重试')
    }
    if (player.is_archived === true || seen.has(player.id)) continue
    seen.add(player.id)
    players.push(player)
  }
  const results: (PatronageWallEntry | undefined)[] = new Array(players.length)
  let next = 0, completed = 0
  onProgress?.(completed, players.length)
  checkCurrent()
  async function worker() {
    try {
      while (next < players.length) {
        checkCurrent()
        const index = next++, player = players[index]
        const crowns = await getPatronageCrowns(player.id)
        checkCurrent()
        if (!Array.isArray(crowns)) throw new Error('冠名服务响应异常，请稍后重试')
        if (crowns.length) results[index] = { player, crowns }
        completed++
        onProgress?.(completed, players.length)
        checkCurrent()
      }
    } catch (error) {
      if (!stopped) { stopped = true; failure = error }
      throw failure
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, players.length) }, () => worker()))
  checkCurrent()
  // A grant read near the beginning may expire while the rest of the wall loads.
  // Recheck every entry against one completion time before exposing the result.
  const now = Date.now()
  return results.flatMap(entry => {
    if (!entry) return []
    const crowns = entry.crowns.filter(crown => Date.parse(crown.starts_at) <= now && Date.parse(crown.expires_at) > now)
    return crowns.length ? [{ player: entry.player, crowns }] : []
  })
}
