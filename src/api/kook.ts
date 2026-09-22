import { BASE_URL } from '@/utils/request'
import { handleSessionExpiry } from '@/utils/sessionExpiry'

const ROOT = '/player/kook-binding'
export interface Binding { status: 'unbound' | 'pending' | 'awaiting_confirmation' | 'bound'; binding_version?: string; challenge_id?: string; masked_kook_user?: string; kook_display_name?: string; notifications_enabled: boolean }
export interface Challenge { challenge_id?: string; code?: string; expires_at: string; status: 'pending' | 'awaiting_confirmation' | 'confirmed' | 'expired' | 'cancelled'; confirmation_nonce?: string; masked_kook_user?: string; kook_display_name?: string }
export interface Delivery { delivery_id?: string; status: string; sent_at?: string; error_code?: string }
export interface Entry { state: string; safe_target: string; order_no?: string; expires_at: string | null }
function token() { return String(uni.getStorageSync('token') || '') }
// User-only adapter: never fall back to an administrator or replay a mutation.
function request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, data?: any): Promise<T> {
  const sentToken = token()
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}${path}`,
    method, data,
    header: sentToken ? { Authorization: `Bearer ${sentToken}` } : {},
    success: res => {
      if (sentToken !== token()) { reject({ code: 'STALE_SESSION', handled: true }); return }
      if (res.statusCode >= 200 && res.statusCode < 300) { resolve(res.data as T); return }
      const error = res.data && typeof res.data === 'object' ? res.data : {}
      reject(handleSessionExpiry(res.statusCode, error, path, 'token', sentToken) || { ...error as any, statusCode: res.statusCode })
    }, fail: () => reject({ code: 'NETWORK_ERROR' })
  }))
}
export const getChallenge = (id: string) => request<Challenge>('GET', `${ROOT}/challenges/${encodeURIComponent(id)}`)
export const confirmChallenge = (id: string, nonce: string, enabled: boolean) => request<Binding>('POST', `${ROOT}/challenges/${encodeURIComponent(id)}/confirm`, { confirmation_nonce: nonce, notifications_enabled: enabled })
export const cancelChallenge = (id: string) => request<void>('DELETE', `${ROOT}/challenges/${encodeURIComponent(id)}`)
export const setNotifications = (enabled: boolean) => request<Binding>('POST', ROOT, { notifications_enabled: enabled })
export const unbind = (version: string) => request<void>('DELETE', ROOT, { binding_version: version })
export const sendTest = (id: string) => request<Delivery>('POST', `${ROOT}/test-notification`, { request_id: id })
export const getTest = (id: string) => request<Delivery>('GET', `${ROOT}/test-notifications/${encodeURIComponent(id)}`)
export const getEntry = (intent: string) => request<Entry>('GET', `/player/kook-entry/${encodeURIComponent(intent)}`)
export const getBinding = () => request<Binding>('GET', ROOT)
export const createChallenge = (purpose: 'bind' | 'rebind') => request<Challenge>('POST', `${ROOT}/challenges`, { purpose })
