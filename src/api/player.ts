import api from '@/utils/request'

export interface PlayerLoginResult {
  token: string
  player: {
    id: number
    name: string
    type_id: number
    type_name: string
  }
  expires_at: string
}

export interface PlayerRatingItem {
  id: number
  rating: number
  comment: string
  package_name: string
  created_at: string
}

export interface PlayerRatingsResult {
  player_id: number
  player_name: string
  summary: {
    average_rating: number
    rating_count: number
    total_orders: number
  }
  results: PlayerRatingItem[]
}

export interface DesignationInvitation {
  order_no: string
  package_name: string
  addon_name?: string | null
  required_players: number
  current_players: number
  total_price_per_hour: number
  total_amount?: number
  booked_hours: number
  boss_note?: string | null
  created_at: string
  is_designated: true
  fulfillment_mode?: 'public' | 'targeted' | string
  target_player_name_snapshot?: string
  designation_id: number
  designation_status: 'pending'
  designation_status_text: string
  designation_expires_at: string
  can_accept_designation: boolean
  permission_block_reason?: string
  can_grab: false
}

export interface PlayerPermissionState {
  can_accept_orders: boolean
  can_be_designated: boolean
  is_publicly_visible: boolean
  can_withdraw: boolean
}

export interface PlayerProfileUpdateRequest {
  id: number
  bio: string
  audio_intro_url: string
  audio_intro_title: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  status_text: string
  reject_reason?: string
  submitted_at: string
  reviewed_at?: string | null
}

export interface EscortQualificationApplication {
  id: number
  experience: string
  evidence_urls: string[]
  status: 'pending' | 'approved' | 'rejected'
  status_text: string
  reject_reason?: string
  review_note?: string
  submitted_at: string
  reviewed_at?: string | null
}

export interface EscortQualificationResult {
  qualification: {
    status: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended'
    status_text: string
    has_qualification: boolean
    review_note?: string
    reviewed_at?: string | null
    can_submit: boolean
  }
  pending_application: EscortQualificationApplication | null
  latest_application: EscortQualificationApplication | null
  application_notice: string
  message?: string
}

export interface PlayerProfileSettingsResult {
  player: {
    id: number
    name: string
    type_id: number
    type_name: string
    contact_wechat?: string
    bio: string
    audio_intro_url: string
    audio_intro_title: string
    is_online: boolean
    total_orders: number
    avg_rating: number
    rating_count: number
    can_accept_orders: boolean
    can_be_designated: boolean
    is_publicly_visible: boolean
    can_withdraw: boolean
    escort_status?: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended'
    escort_status_text?: string
    has_escort_qualification?: boolean
  }
  permissions: PlayerPermissionState
  pending_update: PlayerProfileUpdateRequest | null
  latest_update: PlayerProfileUpdateRequest | null
  review_notice: string
  message?: string
}

export interface RoomEntryConfirmResult {
  message: string
  room_join_status: 'pending' | 'confirmed' | 'late_confirmed' | 'overdue' | 'waived'
  room_join_status_text: string
  room_join_confirmed_at?: string | null
  room_join_deadline?: string | null
  was_late?: boolean
}

export interface PlayerOrderNoticeConfig {
  enabled: boolean
  template_id: string
  page: string
  available_count?: number
}

export function loginPlayer(name: string, type_id: number) { return api.post<PlayerLoginResult>('/player/login', { name, type_id }) }
export function getCurrentPlayer() { return api.get<any>('/player/me') }
export function getPublicPlayerRatings(playerId: number) { return api.get<PlayerRatingsResult>(`/player/${playerId}/ratings`) }
export function getMyPlayerRatings() { return api.get<PlayerRatingsResult>('/player/ratings/me') }
export function getPlayerOrderNoticeConfig() { return api.get<PlayerOrderNoticeConfig>('/player/order-notice-config') }
export function confirmPlayerOrderNoticeSubscription(templateId: string, accepted: boolean) { return api.post<PlayerOrderNoticeConfig>('/player/order-notice-subscription', { template_id: templateId, accepted }) }
export function updatePlayerOnlineStatus(is_online: boolean) { return api.post<{ id: number; name: string; is_online: boolean; status: string }>('/player/online-status', { is_online }) }
export function logoutPlayer() { return api.post('/player/logout') }
export function getPlayerProfileSettings() { return api.get<PlayerProfileSettingsResult>('/player/profile-settings') }
export function submitPlayerProfileUpdate(payload: { bio: string; audio_intro_url: string; audio_intro_title: string }) {
  return api.post<PlayerProfileSettingsResult>('/player/profile-settings', payload)
}
export function getEscortQualification() { return api.get<EscortQualificationResult>('/player/escort-qualification') }
export function submitEscortQualification(payload: { experience: string; evidence_urls: string[] }) {
  return api.post<EscortQualificationResult>('/player/escort-qualification', payload)
}
export function getAvailableOrders() { return api.get<any[]>('/player/available-orders') }
export function getDesignationInvitations() { return api.get<DesignationInvitation[]>('/player/designation-invitations') }
export function acceptDesignation(orderNo: string) { return api.post<{ message: string; order_no: string; status: string }>(`/player/order/${orderNo}/designation/accept`) }
export function declineDesignation(orderNo: string) { return api.post<{ message: string; order_no: string; status: string }>(`/player/order/${orderNo}/designation/decline`) }
export function grabOrder(order_no: string, player_id: number) { return api.post('/player/grab', { order_no, player_id }) }
export function getMyOrders() { return api.get<any[]>('/player/my-orders').then(list => list.filter(order => order.order_type !== 'renewal')) }
export function getPlayerOrder(orderNo: string) { return api.get<any>(`/player/order/${orderNo}`) }
export function setPlayerOrderKookRoom(orderNo: string, kook_room_number: string) { return api.post<{ order_no: string; kook_room_number: string; message: string }>(`/player/order/${orderNo}/kook-room`, { kook_room_number }) }
export function confirmPlayerRoomEntry(orderNo: string) { return api.post<RoomEntryConfirmResult>(`/player/order/${orderNo}/room-entry/confirm`) }
export function startTimer(order_no: string, player_id: number) { return api.post('/player/start-timer', { order_no, player_id }) }
export function completeOrder(order_no: string, player_id: number) { return api.post('/player/complete', { order_no, player_id }) }
export function pausePlayerOrder(orderNo: string) { return api.post(`/player/order/${orderNo}/pause`) }
export function resumePlayerOrder(orderNo: string) { return api.post(`/player/order/${orderNo}/resume`) }
