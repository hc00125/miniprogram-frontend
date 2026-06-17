function toQueryString(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function toPageUrl(path: string, params: Record<string, string | number | undefined | null> = {}) {
  return `${path}${toQueryString(params)}`
}

export function openPage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.navigateTo({ url: toPageUrl(path, params) })
}

export function replacePage(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.redirectTo({ url: toPageUrl(path, params) })
}

export function relaunch(path: string, params: Record<string, string | number | undefined | null> = {}) {
  uni.reLaunch({ url: toPageUrl(path, params) })
}

export function go(path: string, params: Record<string, string | number | undefined | null> = {}) {
  openPage(path, params)
}

export function replace(path: string, params: Record<string, string | number | undefined | null> = {}) {
  replacePage(path, params)
}

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

export function switchMainTab(tab: MainTab) {
  const route = MAIN_ROUTES[tab]
  relaunch(route.path, route.params)
}

export function goMain(tab: MainTab = 'home') {
  switchMainTab(tab)
}

export function navigateToTab(tab: 'query' | 'players' | 'profile') {
  switchMainTab(tab)
}

export function back(delta = 1) {
  uni.navigateBack({ delta })
}

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
