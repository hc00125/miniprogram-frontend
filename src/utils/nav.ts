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
 * 5 个底部 tab 的目标值。
 * home 内部 swiper 索引与之一致。
 */
export type MainTab = 'home' | 'order' | 'query' | 'players' | 'profile'

const tabParam: Record<MainTab, string> = {
  home: 'home',
  order: 'order',
  query: 'query',
  players: 'players',
  profile: 'profile'
}

export function goMain(tab: MainTab = 'home') {
  // query / players / profile 改用 navigateTo，让 navbar 显示返回箭头
  // 而不是 reLaunch 默认的"首页"图标
  if (tab === 'home' || tab === 'order') {
    relaunch('/pages/boss/home/index', { tab: tabParam[tab] })
    return
  }
  if (tab === 'query') {
    uni.navigateTo({ url: '/pages/boss/query/index' })
    return
  }
  if (tab === 'players') {
    uni.navigateTo({ url: '/pages/player/list/index' })
    return
  }
  uni.navigateTo({ url: '/pages/client/profile/index' })
}

/**
 * 用于 query / players / profile 页面之间切换 tab。
 * 使用 navigateTo 让 navbar 显示返回箭头，避免微信原生的"首页"图标。
 * 目标页面在 onLoad 中通过 tab 参数自动跳转 swiper/状态。
 */
export function navigateToTab(tab: 'query' | 'players' | 'profile') {
  const pathMap: Record<string, string> = {
    query: '/pages/boss/query/index',
    players: '/pages/player/list/index',
    profile: '/pages/client/profile/index'
  }
  uni.navigateTo({ url: pathMap[tab] })
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}
