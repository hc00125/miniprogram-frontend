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

export function loginPlayer(name: string, type_id: number) {
  return api.post<PlayerLoginResult>('/player/login', { name, type_id })
}

export function getCurrentPlayer() {
  return api.get<any>('/player/me')
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
  return api.get<any[]>('/player/my-orders')
}

export function getPlayerOrder(orderNo: string) {
  return api.get<any>(`/player/order/${orderNo}`)
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
