import api from '@/utils/request'

export interface CartOrderBatchPayload {
  boss_wechat: string
  game_id?: string | null
  cart_item_ids: number[]
  boss_note?: string | null
  booked_hours?: number
}

export interface CartOrderBatchItemResult {
  order_no: string
  package_name: string
  status: string
  required_players: number
  total_amount: number
}

export interface CartOrderBatchResult {
  order_count: number
  order_nos: string[]
  total_amount: number
  orders: CartOrderBatchItemResult[]
  message: string
}

export function createCartOrderBatch(payload: CartOrderBatchPayload) {
  return api.post<CartOrderBatchResult>('/boss/orders/batch', payload)
}
