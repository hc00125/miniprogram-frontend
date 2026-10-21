import api from '@/utils/request'

export interface EarningsOverview {
  player_id: number
  player_name: string
  accepted_orders: number
  completed_orders: number
  default_commission_rate: number
  commission_policy?: string
  mini_ordinary_commission_rate?: number
  review_days: number
  min_withdrawal_amount: number
  pending_balance: number
  available_balance: number
  withdrawing_balance: number
  withdrawn_total: number
  debt_balance: number
  gross_total: number
  commission_total: number
  net_total: number
  reversed_total?: number
  debt_offset_total?: number
  can_withdraw: boolean
  withdrawal_block_reason?: string
}

export interface PlayerEarningItem {
  id: number
  order_no: string
  source: 'order' | 'surcharge'
  surcharge_no: string | null
  boss_name?: string | null
  package_name: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net_amount: number
  reversed_amount: number
  debt_offset_amount: number
  status: string
  status_text: string
  review_until: string
  available_at?: string | null
  available_amount: number
  withdrawing_amount: number
  withdrawn_amount: number
  freeze_reason?: string
  created_at: string
}

export interface WithdrawalItem {
  request_id: string | null
  diamond_amount: number | null
  diamond_balance_after: number | null
  target_profile_id: number | null
  actor_user_id: number | null
  withdrawal_no: string
  amount: number
  status: string
  status_text: string
  payment_method: string
  payment_method_text: string
  account_name: string
  account_no_masked: string
  request_note?: string
  reject_reason?: string
  admin_note?: string
  transfer_no?: string
  proof_url?: string
  reviewed_at?: string | null
  paid_at?: string | null
  created_at: string
}

export interface CashWithdrawalCreatePayload {
  amount: number
  payment_method: 'wechat' | 'alipay' | 'bank' | 'other'
  account_name: string
  account_no: string
  request_note?: string
}

export interface DiamondWithdrawalCreatePayload {
  payment_method: 'diamonds'
  amount: string
  request_id: string
  request_note?: string
}
export type WithdrawalCreatePayload = CashWithdrawalCreatePayload | DiamondWithdrawalCreatePayload

export function getEarningsOverview() {
  return api.get<EarningsOverview>('/player/earnings/overview')
}

export function getEarningSettlements() {
  return api.get<{ count: number; results: PlayerEarningItem[] }>('/player/earnings/settlements')
}

export function getWithdrawals() {
  return api.get<{ count: number; results: WithdrawalItem[] }>('/player/earnings/withdrawals')
}

export function createWithdrawal(payload: WithdrawalCreatePayload) {
  return api.post<WithdrawalItem>('/player/earnings/withdrawals', payload)
}

export function getDiamondWithdrawal(requestId: string) {
  return api.get<WithdrawalItem>(`/player/earnings/withdrawals/diamond/${requestId}`)
}
