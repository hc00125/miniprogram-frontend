import { getStorage, removeStorage, setStorage } from '@/utils/storage'

export const DESIGNATED_PLAYER_STORAGE_KEY = 'designated_player_selection'
export const MAX_DESIGNATED_PLAYERS = 3

export interface DesignatedPlayerSelection {
  id: number
  name: string
  type_id?: number
  type_name: string
  type_priority?: number
  avatar_url?: string
  is_online?: boolean
}

function normalizePlayer(player: DesignatedPlayerSelection | null | undefined) {
  if (!player || !Number(player.id)) return null
  return {
    ...player,
    id: Number(player.id),
    type_id: Number(player.type_id || 0) || undefined,
    type_priority: Number(player.type_priority || 0)
  }
}

function normalizePlayers(raw: unknown): DesignatedPlayerSelection[] {
  const source = Array.isArray(raw) ? raw : raw ? [raw] : []
  const seen = new Set<number>()
  const result: DesignatedPlayerSelection[] = []
  for (const item of source) {
    const player = normalizePlayer(item as DesignatedPlayerSelection)
    if (!player || seen.has(player.id)) continue
    seen.add(player.id)
    result.push(player)
  }
  return result.slice(0, MAX_DESIGNATED_PLAYERS)
}

export function saveDesignatedPlayers(players: DesignatedPlayerSelection[]) {
  const normalized = normalizePlayers(players)
  if (!normalized.length) {
    removeStorage(DESIGNATED_PLAYER_STORAGE_KEY)
    return []
  }
  setStorage(DESIGNATED_PLAYER_STORAGE_KEY, normalized)
  return normalized
}

export function getDesignatedPlayers() {
  return normalizePlayers(getStorage<DesignatedPlayerSelection[] | DesignatedPlayerSelection>(DESIGNATED_PLAYER_STORAGE_KEY))
}

export function addDesignatedPlayer(player: DesignatedPlayerSelection) {
  const current = getDesignatedPlayers()
  const normalized = normalizePlayer(player)
  if (!normalized) return { ok: false, players: current, message: '陪玩信息不完整' }
  if (current.some(item => item.id === normalized.id)) return { ok: true, players: current, message: '该陪玩已在指定阵容中' }
  const currentTypeId = Number(current[0]?.type_id || 0)
  const nextTypeId = Number(normalized.type_id || 0)
  if (current.length && (!currentTypeId || !nextTypeId || currentTypeId !== nextTypeId)) {
    return { ok: false, players: current, message: `当前阵容仅支持继续选择“${current[0].type_name}”` }
  }
  if (current.length >= MAX_DESIGNATED_PLAYERS) {
    return { ok: false, players: current, message: `最多指定${MAX_DESIGNATED_PLAYERS}名陪玩` }
  }
  const players = saveDesignatedPlayers([...current, normalized])
  return { ok: true, players, message: `已加入指定阵容（${players.length}人）` }
}

export function removeDesignatedPlayer(playerId: number) {
  return saveDesignatedPlayers(getDesignatedPlayers().filter(item => item.id !== Number(playerId)))
}

export function clearDesignatedPlayers() {
  removeStorage(DESIGNATED_PLAYER_STORAGE_KEY)
}

// 兼容旧页面调用；新功能统一使用数组接口。
export function saveDesignatedPlayer(player: DesignatedPlayerSelection) {
  return saveDesignatedPlayers([player])
}

export function getDesignatedPlayer() {
  return getDesignatedPlayers()[0] || null
}

export function clearDesignatedPlayer() {
  clearDesignatedPlayers()
}
