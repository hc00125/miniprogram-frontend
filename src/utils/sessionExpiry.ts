// The current server issues access tokens only: no refresh credential/endpoint.
// Never replay a request here (especially payments, withdrawals or order creation).
export const SESSION_EXPIRED_EVENT = 'session:expired'
const LOGIN_PAGE = '/pages/client/login/index'
const RETURN_KEY = 'session_login_return'
const PROFILE_PAGE = '/pages/client/profile/index'
const expiredScopes = new Set<string>()

export function isAuthenticationFailure(statusCode: number, data: any) {
  if (statusCode === 401) return true
  if (statusCode !== 403) return false
  if (['not_authenticated', 'authentication_failed', 'token_not_valid'].includes(data?.code)) return true
  // These exact DRF/legacy authentication messages also arrive as 403 because
  // the deployed authenticators do not implement authenticate_header().
  return [
    '身份认证信息未提供。',
    'Authentication credentials were not provided.',
    '登录已过期，请重新登录',
    'Given token not valid for any token type'
  ].includes(data?.detail)
}

export function handleSessionExpiry(statusCode: number, data: any, url: string, tokenKey: string, sentToken: string) {
  if (/\/(wechat-login|login)\/?(?:\?|$)/.test(url) || !isAuthenticationFailure(statusCode, data)) return null
  const error = { ...data, statusCode, handled: true }
  // A late failure from the previous session must not clear a newly logged-in one.
  const current = uni.getStorageSync(tokenKey) || ''
  if (current && current !== sentToken) return error
  const keys = tokenKey === 'admin_token'
    ? ['admin_token', 'admin']
    : ['token', 'client_profile', 'player', 'boss', 'player_application', 'player_online_status']
  keys.forEach(key => uni.removeStorageSync(key))
  uni.$emit(SESSION_EXPIRED_EVENT, tokenKey)
  if (expiredScopes.has(tokenKey)) return error
  expiredScopes.add(tokenKey)
  uni.showModal({
    title: '登录提示',
    content: '登录已过期，请重新登录',
    confirmText: '重新登录',
    cancelText: '暂不登录',
    success: (res) => {
      if (!res.confirm) return
      const pages = getCurrentPages()
      const page = pages[pages.length - 1] as any
      if (`/${page?.route}` === LOGIN_PAGE) return
      // Only restore known read-only entry pages; never restore checkout arguments
      // or auto-resume any payment/withdrawal/order submission.
      const route = `/${page?.route}`
      const safePages = [PROFILE_PAGE, '/pages/client/wallet/index', '/pages/player/earnings/index']
      uni.setStorageSync(RETURN_KEY, safePages.includes(route) ? route : PROFILE_PAGE)
      uni.redirectTo({ url: LOGIN_PAGE })
    }
  })
  return error
}

export function clearSessionReturn() {
  uni.removeStorageSync(RETURN_KEY)
}

export function finishSessionLogin() {
  expiredScopes.clear()
  const target = uni.getStorageSync(RETURN_KEY) || PROFILE_PAGE
  clearSessionReturn()
  return target as string
}
