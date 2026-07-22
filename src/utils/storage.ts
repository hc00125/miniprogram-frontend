type StorageKey =
  | 'token'
  | 'player'
  | 'admin_token'
  | 'admin'
  | 'client_profile'
  | 'player_application'
  | 'player_online_status'
  | 'boss_wechat'
  | 'designated_player_selection'
  | 'designated_group_draft'

const playerAuthKeys: StorageKey[] = [
  'token',
  'player',
  'client_profile',
  'player_application',
  'player_online_status',
  'boss_wechat',
  'designated_player_selection',
  'designated_group_draft'
]

function removeStorageRaw(key: StorageKey) {
  uni.removeStorageSync(key)
}

export function getStorage<T = any>(key: StorageKey): T | '' {
  return uni.getStorageSync(key) as T | ''
}

export function setStorage(key: StorageKey, value: any) {
  uni.setStorageSync(key, value)
}

export function removeStorage(key: StorageKey) {
  if (key === 'token') {
    clearPlayerAuth()
    return
  }
  removeStorageRaw(key)
}

export function clearPlayerAuth() {
  playerAuthKeys.forEach(removeStorageRaw)
}

export function clearAdminAuth() {
  removeStorageRaw('admin_token')
  removeStorageRaw('admin')
}
