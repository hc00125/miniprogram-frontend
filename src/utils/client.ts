import { getClientProfileApi, getPlayerApplyStatusApi, submitPlayerApplicationApi } from '@/api/client'

export type PlayerApplyStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface VipTierInfo {
  id: number
  code: string
  name: string
  min_consumption: string
  benefits: string[]
  feature_codes: string[]
  badge_color: string
}

export interface VipPrivateKookRoom {
  feature_code: 'private_kook_room'
  unlock_diamonds: number
  unlocked: boolean
  configured: boolean
  active: boolean
  available: boolean
  status: 'locked' | 'pending_configuration' | 'disabled' | 'active'
  room_number: string
}

export interface VipSnapshot {
  cumulative_consumption: string
  current_tier: VipTierInfo | null
  next_tier: VipTierInfo | null
  remaining_to_next: string
  progress_percent: number
  private_kook_room?: VipPrivateKookRoom
}

export interface ClientProfile {
  id?: number
  code?: string
  openid?: string
  open_id?: string
  wechat_openid?: string
  nickname: string
  avatarUrl?: string
  avatar_url?: string
  role?: string
  player_status: PlayerApplyStatus
  cumulative_consumption?: string | number
  vip?: VipSnapshot | null
  application?: PlayerApplication | null
  player?: {
    id: number
    name: string
    type_id: number
    type_name: string
    contact_wechat?: string
    bio?: string
    audio_intro_url?: string
    audio_intro_title?: string
    is_online: boolean
    total_orders: number
    avg_rating: number
    rating_count?: number
    can_accept_orders?: boolean
    can_be_designated?: boolean
    is_publicly_visible?: boolean
    can_withdraw?: boolean
  } | null
}

export interface PlayerApplication {
  id?: number
  nickname?: string
  avatar_url?: string
  name: string
  real_name: string
  type_id?: number
  type_name?: string
  contact_wechat: string
  bio: string
  audio_intro_url?: string
  audio_intro_title?: string
  status: PlayerApplyStatus
  submitted_at: string
  reviewed_at?: string | null
  reject_reason?: string
  remark?: string
}

const PROFILE_KEY = 'client_profile'
const APPLICATION_KEY = 'player_application'

export function isTemporaryAvatarUrl(url?: string) {
  if (!url) return false
  return /(__tmp__|wxfile:\/\/tmp|^http:\/\/tmp|^https?:\/\/127\.0\.0\.1:\d+\/__tmp__)/i.test(url)
}

export function normalizeAvatarUrl(url?: string) {
  const value = (url || '').trim()
  if (!value || isTemporaryAvatarUrl(value)) return ''
  return value
}

export function shouldUploadAvatarUrl(url?: string) {
  const value = (url || '').trim()
  return Boolean(value) && (isTemporaryAvatarUrl(value) || !/^https?:\/\//i.test(value))
}

function normalizeProfile(profile: ClientProfile): ClientProfile {
  const avatarUrl = normalizeAvatarUrl(profile.avatarUrl || profile.avatar_url)
  const vip = profile.vip
    ? {
        ...profile.vip,
        progress_percent: Math.max(0, Math.min(100, Number(profile.vip.progress_percent || 0))),
        current_tier: profile.vip.current_tier
          ? {
              ...profile.vip.current_tier,
              benefits: profile.vip.current_tier.benefits || [],
              feature_codes: profile.vip.current_tier.feature_codes || []
            }
          : null,
        next_tier: profile.vip.next_tier
          ? {
              ...profile.vip.next_tier,
              benefits: profile.vip.next_tier.benefits || [],
              feature_codes: profile.vip.next_tier.feature_codes || []
            }
          : null,
        private_kook_room: profile.vip.private_kook_room
          ? {
              ...profile.vip.private_kook_room,
              unlock_diamonds: Number(profile.vip.private_kook_room.unlock_diamonds || 20000),
              room_number: String(profile.vip.private_kook_room.room_number || '')
            }
          : undefined
      }
    : null
  return {
    ...profile,
    avatarUrl,
    avatar_url: avatarUrl,
    cumulative_consumption: profile.cumulative_consumption ?? vip?.cumulative_consumption ?? 0,
    vip,
    player: profile.player || null,
    application: profile.application || null
  }
}

export function getClientProfile(): ClientProfile | null {
  const value = uni.getStorageSync(PROFILE_KEY)
  if (!value) return null
  return normalizeProfile(value as ClientProfile)
}

export function saveClientProfile(profile: ClientProfile) {
  uni.setStorageSync(PROFILE_KEY, normalizeProfile(profile))
}

export function ensureClientProfile() {
  const profile = getClientProfile()
  if (profile) return profile
  const guest: ClientProfile = {
    nickname: '微信用户',
    avatarUrl: '',
    avatar_url: '',
    player_status: 'none',
    cumulative_consumption: 0,
    vip: null
  }
  saveClientProfile(guest)
  return guest
}

export async function syncClientProfile() {
  const profile = normalizeProfile(await getClientProfileApi())
  saveClientProfile(profile)
  if (profile.player) {
    uni.setStorageSync('player', profile.player)
    uni.setStorageSync('player_online_status', profile.player.is_online ? '1' : '0')
  }
  if (profile.application) uni.setStorageSync(APPLICATION_KEY, profile.application)
  return profile
}

export function setPlayerOnlineStatus(online: boolean) {
  uni.setStorageSync('player_online_status', online ? '1' : '0')
  const player = uni.getStorageSync<any>('player')
  if (player) {
    uni.setStorageSync('player', { ...player, is_online: online })
  }
  const profile = getClientProfile()
  if (profile?.player) {
    saveClientProfile({ ...profile, player: { ...profile.player, is_online: online } })
  }
}

export function getPlayerOnlineStatus(): boolean {
  const value = uni.getStorageSync<string>('player_online_status')
  if (value === '' || value === null || value === undefined) {
    const player = uni.getStorageSync<any>('player')
    return Boolean(player?.is_online)
  }
  return value === '1' || value === true
}

export function getPlayerApplication(): PlayerApplication | null {
  const value = uni.getStorageSync(APPLICATION_KEY)
  if (!value) return null
  return value as PlayerApplication
}

export async function syncPlayerApplyStatus() {
  const status = await getPlayerApplyStatusApi()
  const current = ensureClientProfile()
  const profile = normalizeProfile({
    ...current,
    player_status: status.player_status,
    application: status.application,
    player: status.player
  })
  saveClientProfile(profile)
  if (status.player) uni.setStorageSync('player', status.player)
  if (status.application) uni.setStorageSync(APPLICATION_KEY, status.application)
  else uni.removeStorageSync(APPLICATION_KEY)
  return status
}

export async function submitPlayerApplication(application: Pick<PlayerApplication, 'name' | 'real_name' | 'type_id' | 'contact_wechat' | 'bio' | 'audio_intro_url' | 'audio_intro_title'>) {
  const payload = await submitPlayerApplicationApi(application)
  uni.setStorageSync(APPLICATION_KEY, payload)
  const profile = ensureClientProfile()
  saveClientProfile({
    ...profile,
    player_status: 'pending',
    application: payload,
    player: profile.player || null
  })
  return payload
}

export async function isApprovedPlayer() {
  try {
    const status = await syncPlayerApplyStatus()
    return status.player_status === 'approved'
  } catch {
    return getClientProfile()?.player_status === 'approved'
  }
}
