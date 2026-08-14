export const IOS_PURCHASE_DISABLED_MESSAGE = 'iOS端当前暂不提供在线购买'

export type ClientPlatform = 'ios' | 'android' | 'other'

let cachedPlatform: ClientPlatform | null = null
let noticeVisible = false
let suppressFallbackToastUntil = 0

const IOS_PURCHASE_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_IOS_PURCHASE_ENABLED || 'false').toLowerCase()
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

export function isIOSDevice() {
  return getClientPlatform() === 'ios'
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

/**
 * iOS 豁免判定：钱包余额付款（/pay/balance/create）不涉及新充值，
 * 仅消费已有钻石，允许 iOS 端使用；微信官方支付仍保持禁用。
 * 下单/续单接口（/boss/order 等）仅创建订单不产生支付渠道，iOS 放行。
 */
export function isIOSExemptRequest(method: string, url: string) {
  if (String(method).toUpperCase() !== 'POST') return false
  const path = String(url || '').split('?')[0]
  return path === '/pay/balance/create'
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
