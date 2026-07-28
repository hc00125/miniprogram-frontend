import api from '@/utils/request'

export interface PlayerCancellationPreview {
  order_no: string
  stage: 'before_join' | 'in_service'
  stage_text: string
  used_free_chance: boolean
  fine_rmb: number | string
  fine_fish: number | string
  booked_hours: number | string
  suspended_until: string
  replacement_mode: 'public' | 'targeted'
  replacement_text: string
}

export interface OrderReplacementState {
  active: boolean
  mode?: 'public' | 'targeted'
  mode_text?: string
  status?: 'open' | 'cancel_requested' | 'resolved' | string
  status_text?: string
  missing_slots?: number
  resume_status?: string
  remaining_minutes?: number | null
  cancelled_player_name?: string
  required_player_type_id?: number | null
  required_player_type_name?: string
  current_designation_id?: number | null
  can_reassign?: boolean
  can_publish_public?: boolean
  can_request_cancel?: boolean
  created_at?: string
  updated_at?: string
}

export interface PlayerCancellationResult {
  message: string
  order_no: string
  record_id: number
  stage: 'before_join' | 'in_service'
  stage_text: string
  used_free_chance: boolean
  fine_rmb: number | string
  fine_fish: number | string
  deducted_fish: number | string
  debt_fish: number | string
  suspended_until: string
  replacement: OrderReplacementState
}

export function getPlayerCancellationPreview(orderNo: string) {
  return api.get<PlayerCancellationPreview>(`/player/order/${orderNo}/cancel-preview`)
}

export function cancelPlayerOrder(orderNo: string, reason: string) {
  return api.post<PlayerCancellationResult>(`/player/order/${orderNo}/cancel`, { reason })
}

export function getOrderReplacement(orderNo: string) {
  return api.get<OrderReplacementState>(`/boss/order/${orderNo}/replacement`)
}

export function publishOrderReplacement(orderNo: string) {
  return api.post<{ message: string; replacement: OrderReplacementState }>(`/boss/order/${orderNo}/replacement/public`)
}

export function reassignOrderReplacement(orderNo: string, playerId: number) {
  return api.post<{ message: string; replacement: OrderReplacementState }>(`/boss/order/${orderNo}/replacement/reassign`, { player_id: playerId })
}

export function requestCancelRemainingService(orderNo: string) {
  return api.post<{ message: string; replacement: OrderReplacementState }>(`/boss/order/${orderNo}/replacement/cancel-remaining`)
}
