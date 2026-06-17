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

/** Switch to a main tab page via native tabBar. */
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

/**
 * Navigate back to a target route if it exists in the page stack.
 * Falls back to redirectTo (or switchTab for main-tab targets).
 * Prevents page stack accumulation when jumping between sub-pages and tabs.
 */
export function backToRoute(routePath: string) {
  const targetRoute = normalizePath(routePath).replace(/^\//, '')
  const pages = getCurrentPages()
  const currentRoutes = pages.map((p) => (p as any).route || '')
  for (let i = currentRoutes.length - 2; i >= 0; i--) {
    if (currentRoutes[i] === targetRoute) {
      const delta = currentRoutes.length - 1 - i
      uni.navigateBack({ delta })
      return
    }
  }
  // Target not in stack: redirect to it
  if (isMainTabPath(routePath)) {
    switchMainTab(routePath)
  } else {
    uni.redirectTo({ url: normalizePath(routePath) })
  }
}

/** Direct navigateTo without main-tab detection. Prefer go() unless you need raw navigateTo. */
export function openPage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.navigateTo({ url: toPageUrl(path, params) })
}

/** Direct redirectTo without main-tab detection. Prefer replace() unless you need raw redirectTo. */
export function replacePage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.redirectTo({ url: toPageUrl(path, params) })
}

export function navigateToTab(tab: 'query' | 'players' | 'profile') {
  goMain(tab)
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}
