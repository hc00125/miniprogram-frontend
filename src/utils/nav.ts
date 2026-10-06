function encodeQueryValue(value: string | number) {
  // 微信小程序页面参数在部分运行环境中不会自动还原 %2C。
  // 购物车批量结算使用逗号分隔多个 cartItemId，因此保留逗号本身，
  // 避免结算页把“1%2C2”误认为一个购物车项 ID。
  return encodeURIComponent(String(value)).replace(/%2C/gi, ',')
}

function toQueryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeQueryValue(value as string | number)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function toPageUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  return `${path}${toQueryString(params)}`
}

// `query` remains a compatibility destination for existing order links, but is
// now a normal page; only the five entries in pages.json use native switchTab.
export type MainTab = 'home' | 'order' | 'rankings' | 'query' | 'players' | 'profile'

const mainTabPaths: Record<MainTab, string> = {
  home: '/pages/boss/home/index',
  order: '/pages/shop/category/index',
  rankings: '/pages/client/rankings/index',
  query: '/pages/boss/query/index',
  players: '/pages/player/list/index',
  profile: '/pages/client/profile/index'
}

const mainTabPathSet = new Set(Object.entries(mainTabPaths).filter(([key]) => key !== 'query').map(([, path]) => path))

function normalizePath(path: string) {
  return path.split('?')[0]
}

function isMainTab(value: unknown): value is MainTab {
  return typeof value === 'string' && value in mainTabPaths
}

function resolvePage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  const normalized = normalizePath(path)
  if (normalized === mainTabPaths.home && isMainTab(params.tab)) {
    const { tab, ...pageParams } = params
    return { path: mainTabPaths[tab], params: pageParams }
  }
  return { path, params }
}

function isMainTabPath(path: string) {
  return mainTabPathSet.has(normalizePath(path))
}

/** Switch to a main tab page via native tabBar. */
function switchMainTab(path: string) {
  uni.switchTab({ url: normalizePath(path) })
}

export function go(path: string, params: Record<string, string | number | undefined | null> = {}) {
  const target = resolvePage(path, params)
  if (isMainTabPath(target.path)) {
    switchMainTab(target.path)
    return
  }
  uni.navigateTo({ url: toPageUrl(target.path, target.params) })
}

export function replace(path: string, params: Record<string, string | number | undefined | null> = {}) {
  const target = resolvePage(path, params)
  if (isMainTabPath(target.path)) {
    switchMainTab(target.path)
    return
  }
  uni.redirectTo({ url: toPageUrl(target.path, target.params) })
}

export function relaunch(path: string, params: Record<string, string | number | undefined | null> = {}) {
  const target = resolvePage(path, params)
  if (isMainTabPath(target.path)) {
    switchMainTab(target.path)
    return
  }
  uni.reLaunch({ url: toPageUrl(target.path, target.params) })
}

export function goMain(tab: MainTab = 'home') {
  go(mainTabPaths[tab])
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

export function navigateToTab(tab: 'rankings' | 'query' | 'players' | 'profile') {
  goMain(tab)
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}
