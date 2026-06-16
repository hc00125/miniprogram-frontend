function toQueryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function toPageUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  return `${path}${toQueryString(params)}`
}

export type MainTab = 'home' | 'order' | 'query' | 'players' | 'profile'

const mainTabPaths: Record<MainTab, string> = {
  home: '/pages/boss/home/index',
  order: '/pages/boss/order/index',
  query: '/pages/boss/query/index',
  players: '/pages/player/list/index',
  profile: '/pages/client/profile/index'
}

const mainTabPathSet = new Set(Object.values(mainTabPaths))

function normalizePath(path: string) {
  return path.split('?')[0]
}

function isMainTabPath(path: string) {
  return mainTabPathSet.has(normalizePath(path))
}

function switchMainTab(path: string) {
  uni.switchTab({ url: normalizePath(path) })
}

export function go(path: string, params: Record<string, string | number | undefined | null> = {}) {
  if (isMainTabPath(path)) {
    switchMainTab(path)
    return
  }
  uni.navigateTo({ url: toPageUrl(path, params) })
}

export function replace(path: string, params: Record<string, string | number | undefined | null> = {}) {
  if (isMainTabPath(path)) {
    switchMainTab(path)
    return
  }
  uni.redirectTo({ url: toPageUrl(path, params) })
}

export function relaunch(path: string, params: Record<string, string | number | undefined | null> = {}) {
  if (isMainTabPath(path)) {
    switchMainTab(path)
    return
  }
  uni.reLaunch({ url: toPageUrl(path, params) })
}

export function goMain(tab: MainTab = 'home') {
  switchMainTab(mainTabPaths[tab])
}

export function navigateToTab(tab: 'query' | 'players' | 'profile') {
  goMain(tab)
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}
