import { shouldSuppressIOSPurchaseFallbackToast } from '@/utils/purchaseAvailability'

const navigationMessages: Record<string, string> = {
  '服务条款页面建设中': '/pages/legal/privacy/index'
}

export function toast(title: string, icon: UniApp.ShowToastOptions['icon'] = 'none') {
  const normalizedTitle = String(title || '').trim()
  if (!normalizedTitle || shouldSuppressIOSPurchaseFallbackToast(normalizedTitle)) return
  const target = navigationMessages[normalizedTitle]
  if (target) {
    uni.navigateTo({ url: target })
    return
  }
  uni.showToast({ title: normalizedTitle, icon, duration: 1800 })
}

export function success(title: string) {
  toast(title, 'success')
}

function firstValidationMessage(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstValidationMessage(item)
      if (message) return message
    }
    return ''
  }
  if (typeof value === 'object') {
    if (typeof value.detail === 'string') return value.detail
    for (const [key, item] of Object.entries(value)) {
      if (key === 'statusCode' || key === 'code' || key === 'handled') continue
      const message = firstValidationMessage(item)
      if (message) return message
    }
  }
  return ''
}

export function getErrorMessage(error: any, fallback: string) {
  if (!error) return fallback
  if (error.handled || error.data?.handled) return ''
  if (typeof error === 'string') return error
  if (typeof error.detail === 'string') return error.detail
  if (error.data && typeof error.data.detail === 'string') return error.data.detail

  const validationMessage = firstValidationMessage(
    error.data && typeof error.data === 'object' ? error.data : error
  )
  if (validationMessage) return validationMessage

  if (typeof error.errMsg === 'string') return error.errMsg
  if (typeof error.message === 'string') return error.message
  return fallback
}

export function confirm(content: string, title = '确认操作') {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title,
      content,
      confirmColor: '#2f8f46',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false)
    })
  })
}
