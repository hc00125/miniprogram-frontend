function toQueryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function toPageUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  return `${path}${toQueryString(params)}`
}

/**
 * 打开二级页面并保留当前页面。
 * 适用于订单详情、账号信息、陪玩申请等需要返回的页面。
 */
export function openPage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.navigateTo({ url: toPageUrl(path, params) })
}

/**
 * 替换当前流程页面。
 * 适用于登录完成、提交成功、下单成功等不应返回旧表单的场景。
 */
export function replacePage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.redirectTo({ url: toPageUrl(path, params) })
}

/**
 * 清空页面栈并进入指定页面。
 */
export function relaunch(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.reLaunch({ url: toPageUrl(path, params) })
}

/**
 * 兼容旧调用：go 仅用于普通二级页面。
 * 新代码应优先使用 openPage，使跳转语义更清楚。
 */
export function go(path: string, params: Record<string, string | number | undefined | null> = {}) {
  openPage(path, params)
}

/**
 * 兼容旧调用：新代码应优先使用 replacePage。
 */
export function replace(path: string, params: Record<string, string | number | undefined | null> = {}) {
  replacePage(path, params)
}

/**
 * 5 个底部主导航目标。
 * home 和 order 共用首页页面，通过 tab 参数切换内部 swiper。
 */
export type MainTab = 'home' | 'order' | 'query' | 'players' | 'profile'

interface MainRoute {
  path: string
  params?: Record<string, string>
}

const MAIN_ROUTES: Record<MainTab, MainRoute> = {
  home: {
    path: '/pages/boss/home/index',
    params: { tab: 'home' }
  },
  order: {
    path: '/pages/boss/home/index',
    params: { tab: 'order' }
  },
  query: {
    path: '/pages/boss/query/index'
  },
  players: {
    path: '/pages/player/list/index'
  },
  profile: {
    path: '/pages/client/profile/index'
  }
}

/**
 * 切换底部一级主页面。
 *
 * 一级页面之间不应该使用 navigateTo，否则每次点击底部导航都会
 * 向微信小程序页面栈压入一个新页面。这里统一使用 reLaunch，确保
 * 主导航切换后页面栈始终只有一个根页面。
 */
export function switchMainTab(tab: MainTab) {
  const route = MAIN_ROUTES[tab]
  relaunch(route.path, route.params)
}

/**
 * 兼容旧调用。新代码统一使用 switchMainTab。
 */
export function goMain(tab: MainTab = 'home') {
  switchMainTab(tab)
}

/**
 * 兼容现有页面代码。
 * 此函数虽然保留旧名称，但不再使用 navigateTo，避免主页面反复堆栈。
 */
export function navigateToTab(tab: 'query' | 'players' | 'profile') {
  switchMainTab(tab)
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}

/**
 * Navigate back to the nearest page matching routePath in the stack.
 * If not found, navigate back to the first page (stack bottom).
 * Avoids page accumulation from repeated replace() calls in workspace pages.
 */
export function backToRoute(routePath: string) {
  const targetRoute = routePath.replace(/^\//, '').split('?')[0]
  const pages = getCurrentPages()
  const currentRoutes = pages.map((p) => (p as any).route || '')
  for (let i = currentRoutes.length - 2; i >= 0; i--) {
    if (currentRoutes[i] === targetRoute) {
      const delta = currentRoutes.length - 1 - i
      uni.navigateBack({ delta })
      return
    }
  }
  replacePage(routePath)
}
