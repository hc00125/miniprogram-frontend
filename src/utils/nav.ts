function toQueryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function toPageUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  return `${path}${toQueryString(params)}`
}

export function go(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.navigateTo({ url: toPageUrl(path, params) })
}

export function replace(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.redirectTo({ url: toPageUrl(path, params) })
}

export function relaunch(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.reLaunch({ url: toPageUrl(path, params) })
}

/**
 * 5 个底部主入口。
 * home / order 在首页 swiper 内切换，query / players / profile 是独立页面。
 * 主入口之间统一使用 reLaunch，避免 navigateTo 导致页面栈不断堆积。
 */
export type MainTab = 'home' | 'order' | 'query' | 'players' | 'profile'

const homeTabs: Record<'home' | 'order', string> = {
  home: 'home',
  order: 'order'
}

const standaloneMainTabPaths: Record<'query' | 'players' | 'profile', string> = {
  query: '/pages/boss/query/index',
  players: '/pages/player/list/index',
  profile: '/pages/client/profile/index'
}

export function goMain(tab: MainTab = 'home') {
  if (tab === 'home' || tab === 'order') {
    relaunch('/pages/boss/home/index', { tab: homeTabs[tab] })
    return
  }
  relaunch(standaloneMainTabPaths[tab])
}

/**
 * 用于 query / players / profile 页面之间切换主入口。
 * 这里不能用 navigateTo，否则每次点击底部导航都会新增页面栈。
 */
export function navigateToTab(tab: 'query' | 'players' | 'profile') {
  relaunch(standaloneMainTabPaths[tab])
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}
