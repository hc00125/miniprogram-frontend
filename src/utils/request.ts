const DEFAULT_BASE_URL = 'https://api.huc125.cn/api'

export const BASE_URL = import.meta.env.VITE_BASE_URL || DEFAULT_BASE_URL

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

const PLAYER_PREFIXES = ['/player/', '/chat/', '/client/']
const ADMIN_PREFIXES = ['/admin/']
const BOSS_PREFIXES = ['/boss/', '/pay/']

function getStorageString(key: string) {
  const value = uni.getStorageSync(key)
  return typeof value === 'string' ? value : ''
}

function getTokenByUrl(url: string) {
  if (PLAYER_PREFIXES.some(prefix => url.startsWith(prefix))) {
    return getStorageString('token')
  }
  if (ADMIN_PREFIXES.some(prefix => url.startsWith(prefix))) {
    return getStorageString('admin_token')
  }
  if (BOSS_PREFIXES.some(prefix => url.startsWith(prefix))) {
    return getStorageString('token') || getStorageString('admin_token')
  }
  return getStorageString('admin_token') || getStorageString('token')
}

function resolveUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function normalizeErrorData(data: any, statusCode: number) {
  if (typeof data === 'string' && /<\/?[a-z][\s\S]*>/i.test(data)) {
    return { statusCode, detail: `请求失败（${statusCode}）` }
  }
  if (data && typeof data === 'object') return { statusCode, ...data }
  return data || { statusCode }
}

function handleRoomEntryTimeout(statusCode: number, data: any) {
  if (statusCode !== 410 || data?.code !== 'ROOM_ENTRY_TIMEOUT_REQUEUED') return false
  uni.showToast({
    title: data?.detail || '进入超时，订单已转入公共抢单大厅',
    icon: 'none',
    duration: 2600
  })
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/player/grab/index' })
  }, 900)
  return true
}

function request<T>(method: RequestMethod, url: string, data?: any, header: Record<string, string> = {}) {
  return new Promise<T>((resolve, reject) => {
    const token = getTokenByUrl(url)
    uni.request({
      url: resolveUrl(url),
      method,
      data,
      header: {
        ...header,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        const statusCode = res.statusCode || 0
        if (statusCode >= 200 && statusCode < 300) {
          resolve(res.data as T)
          return
        }
        const errorData = normalizeErrorData(res.data, statusCode)
        if (handleRoomEntryTimeout(statusCode, errorData)) {
          reject(errorData)
          return
        }
        if (statusCode === 401 || statusCode === 403) {
          if (url.startsWith('/player/')) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('player')
            uni.redirectTo({ url: '/pages/client/login/index' })
          } else if (url.startsWith('/admin/')) {
            uni.removeStorageSync('admin_token')
            uni.removeStorageSync('admin')
          } else if (url.startsWith('/boss/') || url.startsWith('/pay/')) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('admin_token')
            uni.removeStorageSync('boss')
            uni.removeStorageSync('player')
          }
        }
        reject(errorData)
      },
      fail: reject
    })
  })
}

export const api = {
  get<T>(url: string, data?: any) {
    return request<T>('GET', url, data)
  },
  post<T>(url: string, data?: any) {
    return request<T>('POST', url, data)
  },
  put<T>(url: string, data?: any) {
    return request<T>('PUT', url, data)
  },
  patch<T>(url: string, data?: any) {
    return request<T>('PATCH', url, data)
  },
  delete<T>(url: string, data?: any) {
    return request<T>('DELETE', url, data)
  }
}

export default api
