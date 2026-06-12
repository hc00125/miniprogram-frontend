type StorageKey = 'token' | 'player' | 'admin_token' | 'admin' | 'client_profile' | 'player_application' | 'boss_wechat'

export function getStorage<T = any>(key: StorageKey): T | '' {
  return uni.getStorageSync(key) as T | ''
}

export function setStorage(key: StorageKey, value: any) {
  uni.setStorageSync(key, value)
}

export function removeStorage(key: StorageKey) {
  uni.removeStorageSync(key)
}

export function clearPlayerAuth() {
  removeStorage('token')
  removeStorage('player')
  removeStorage('client_profile')
  removeStorage('player_application')
}

export function clearAdminAuth() {
  removeStorage('admin_token')
  removeStorage('admin')
}
