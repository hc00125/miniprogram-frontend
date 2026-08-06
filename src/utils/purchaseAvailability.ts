export const IOS_PURCHASE_DISABLED_MESSAGE = 'iOS端当前暂不提供在线购买'

export type ClientPlatform = 'ios' | 'android' | 'other'

let cachedPlatform: ClientPlatform | null = null
let noticeVisible = false

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

export function isPurchaseCreationRequest(method: string, url: string) {
  if (String(method).toUpperCase() !== 'POST') return false
  const path = String(url || '').split('?')[0]
  return (
    path === '/boss/order'
    || path === '/boss/listing-order'
    || path === '/boss/orders/batch'
    || /^\/boss\/order\/[^/]+\/renew$/.test(path)
    || path === '/client/wallet/recharge/create'
    || path === '/pay/create'
    || path === '/pay/balance/create'
    || path === '/pay/wechat/miniprogram/create'
    || path === '/pay/wechat/virtual/create'
  )
}

export function createIOSPurchaseDisabledError() {
  return {
    statusCode: 403,
    code: 'IOS_PURCHASE_DISABLED',
    detail: IOS_PURCHASE_DISABLED_MESSAGE,
    handled: true
  }
}

export function showIOSPurchaseDisabledNotice() {
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
