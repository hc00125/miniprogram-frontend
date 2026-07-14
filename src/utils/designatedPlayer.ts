import { getStorage, removeStorage, setStorage } from '@/utils/storage'

export const DESIGNATED_PLAYER_STORAGE_KEY = 'designated_player_selection'

export interface DesignatedPlayerSelection {
  id: number
  name: string
  type_name: string
  avatar_url?: string
  is_online?: boolean
}

export function saveDesignatedPlayer(player: DesignatedPlayerSelection) {
  setStorage(DESIGNATED_PLAYER_STORAGE_KEY, player)
}

export function getDesignatedPlayer() {
  const player = getStorage<DesignatedPlayerSelection>(DESIGNATED_PLAYER_STORAGE_KEY)
  if (!player || !Number(player.id)) return null
  return player
}

export function clearDesignatedPlayer() {
  removeStorage(DESIGNATED_PLAYER_STORAGE_KEY)
}
