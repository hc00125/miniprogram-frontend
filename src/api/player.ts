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

export function loginPlayer(name: string, type_id: number) {
  return api.post<PlayerLoginResult>('/player/login', { name, type_id })
}

export function getCurrentPlayer() {
  return api.get<any>('/player/me')
}

export function getPublicPlayerRatings(playerId: number) {
  return api.get<PlayerRatingsResult>(`/player/${playerId}/ratings`)
}

export function getMyPlayerRatings() {
  return api.get<PlayerRatingsResult>('/player/ratings/me')
}

export function updatePlayerOnlineStatus(is_online: boolean) {
  return api.post<{ id: number; name: string; is_online: boolean; status: string }>('/player/online-status', { is_online })
}

export function logoutPlayer() {
  return api.post('/player/logout')
}

export function getAvailableOrders() {
  return api.get<any[]>('/player/available-orders')
}

export function grabOrder(order_no: string, player_id: number) {
  return api.post('/player/grab', { order_no, player_id })
}

export function getMyOrders() {
  return api.get<any[]>('/player/my-orders').then(list => list.filter(order => order.order_type !== 'renewal'))
}

export function getPlayerOrder(orderNo: string) {
  return api.get<any>(`/player/order/${orderNo}`)
}

export function setPlayerOrderKookRoom(orderNo: string, kook_room_number: string) {
  return api.post<{ order_no: string; kook_room_number: string; message: string }>(`/player/order/${orderNo}/kook-room`, { kook_room_number })
}

export function startTimer(order_no: string, player_id: number) {
  return api.post('/player/start-timer', { order_no, player_id })
}

export function completeOrder(order_no: string, player_id: number) {
  return api.post('/player/complete', { order_no, player_id })
}

export function pausePlayerOrder(orderNo: string) {
  return api.post(`/player/order/${orderNo}/pause`)
}

export function resumePlayerOrder(orderNo: string) {
  return api.post(`/player/order/${orderNo}/resume`)
}
