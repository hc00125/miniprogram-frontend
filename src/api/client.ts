import api, { BASE_URL } from '@/utils/request'
import type { ClientProfile, PlayerApplication } from '@/utils/client'
import { getStorage } from '@/utils/storage'

export interface WechatLoginPayload {
  code: string
  nickname?: string
  avatar_url?: string
}

export interface WechatLoginResult {
  token: string
  profile: ClientProfile
}

export interface ApplyStatusResult {
  player_status: ClientProfile['player_status']
  application: PlayerApplication | null
  player: ClientProfile['player'] | null
}

export interface AvatarUploadResult {
  avatar_url: string
  profile?: ClientProfile
}

function resolveApiUrl(path: string) {
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

function parseUploadResponse(data: string | Record<string, any>): any {
  if (typeof data !== 'string') return data
  if (/<\/?[a-z][\s\S]*>/i.test(data)) {
    return { detail: '头像上传接口不存在或地址错误' }
  }
  try {
    return JSON.parse(data)
  } catch {
    return { detail: data }
  }
}

function normalizeAvatarUploadResult(data: any): AvatarUploadResult {
  const avatarUrl = data?.avatar_url || data?.url || data?.profile?.avatar_url || ''
  return {
    ...data,
    avatar_url: avatarUrl
  }
}

export function wechatLogin(payload: WechatLoginPayload) {
  return api.post<WechatLoginResult>('/client/wechat-login', payload)
}

export function getClientProfileApi() {
  return api.get<ClientProfile>('/client/profile')
}

export function updateClientProfileApi(payload: Partial<Pick<ClientProfile, 'nickname' | 'avatar_url'>>) {
  return api.put<ClientProfile>('/client/profile', payload)
}

export function uploadClientAvatarApi(filePath: string) {
  return new Promise<AvatarUploadResult>((resolve, reject) => {
    const token = getStorage<string>('token')
    uni.uploadFile({
      url: resolveApiUrl('/client/avatar'),
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        const data = parseUploadResponse(res.data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeAvatarUploadResult(data))
          return
        }
        reject(data)
      },
      fail: reject
    })
  })
}

export function submitPlayerApplicationApi(payload: Pick<PlayerApplication, 'name' | 'type_id' | 'contact_wechat' | 'bio'>) {
  return api.post<PlayerApplication>('/player/apply', payload)
}

export function getPlayerApplyStatusApi() {
  return api.get<ApplyStatusResult>('/player/apply/status')
}
