export const IOS_PURCHASE_DISABLED_MESSAGE = 'iOS端虚拟支付当前未启用'

export type ClientPlatform = 'ios' | 'android' | 'other'

let cachedPlatform: ClientPlatform | null = null
let noticeVisible = false
let suppressFallbackToastUntil = 0

// 2026 起微信小程序虚拟支付支持 iOS。默认开启；若线上需要紧急熔断，
// 可显式设置 VITE_IOS_PURCHASE_ENABLED=false。
const IOS_PURCHASE_ENABLED = !['0', 'false', 'no', 'off'].includes(
  String(import.meta.env.VITE_IOS_PURCHASE_ENABLED || 'true').toLowerCase()
)

const FALLBACK_TOASTS = new Set([
  '支付未完成',
  '充值未完成',
  '创建订单失败',
  '钻石支付失败，请稍后重试'
])

export function getClientPlatform(): ClientPlatform {
  if (cachedPlatform) return cachedPlatform

  try {
    const info: any = typeof (uni as any).getDeviceInfo === 'function'
      ? (uni as any).getDeviceInfo()
      : uni.getSystemInfoSync()
    const source = [info?.platform, info?.osName, info?.system, info?.model]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (/\bios\b|iphone|ipad|ipod/.test(source)) cachedPlatform = 'ios'
    else if (/android/.test(source)) cachedPlatform = 'android'
    else cachedPlatform = 'other'
  } catch {
    cachedPlatform = 'other'
  }

  return cachedPlatform
}

/**
 * 历史支付页使用此函数决定是否隐藏“微信即时支付”。
 * 当 iOS 官方虚拟支付已开启时必须返回 false，让支付页走统一
 * short_series_coin → currency_pay 流程；真实平台识别始终使用
 * getClientPlatform()，因此后端仍能正确识别 iOS 并应用 iOS 渠道费率。
 */
export function isIOSDevice() {
  return getClientPlatform() === 'ios' && !IOS_PURCHASE_ENABLED
}

export function isIOSPurchaseEnabled() {
  return IOS_PURCHASE_ENABLED
}

export function isPurchaseCreationRequest(method: string, url: string) {
  if (String(method).toUpperCase() !== 'POST') return false
  const path = String(url || '').split('?')[0]
  return (
    path === '/client/wallet/recharge/create'
    || path === '/pay/create'
    || path === '/pay/wechat/miniprogram/create'
    || path === '/pay/wechat/virtual/create'
  )
}

export function isIOSExemptRequest(method: string, url: string) {
  if (String(method).toUpperCase() !== 'POST') return false
  const path = String(url || '').split('?')[0]
  return path === '/pay/balance/create'
    || path.startsWith('/pay/wechat/virtual/finalize/')
}

export function createIOSPurchaseDisabledError() {
  return {
    statusCode: 403,
    code: 'IOS_PURCHASE_DISABLED',
    detail: IOS_PURCHASE_DISABLED_MESSAGE,
    handled: true
  }
}

export function shouldSuppressIOSPurchaseFallbackToast(title: string) {
  return Date.now() < suppressFallbackToastUntil && FALLBACK_TOASTS.has(String(title || '').trim())
}

export function showIOSPurchaseDisabledNotice() {
  suppressFallbackToastUntil = Date.now() + 3000
  if (noticeVisible) return Promise.resolve(false)
  noticeVisible = true

  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '暂不支持购买',
      content: IOS_PURCHASE_DISABLED_MESSAGE,
      showCancel: false,
      confirmText: '我知道了',
      success: () => resolve(true),
      fail: () => resolve(false),
      complete: () => {
        noticeVisible = false
      }
    })
  })
}
