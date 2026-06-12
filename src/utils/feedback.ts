export function toast(title: string, icon: UniApp.ShowToastOptions['icon'] = 'none') {
  uni.showToast({ title, icon, duration: 1800 })
}

export function success(title: string) {
  toast(title, 'success')
}

export function getErrorMessage(error: any, fallback: string) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error.detail === 'string') return error.detail
  if (error.data && typeof error.data.detail === 'string') return error.data.detail
  if (typeof error.errMsg === 'string') return error.errMsg
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
