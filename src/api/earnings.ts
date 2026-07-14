import api from '@/utils/request'

export interface EarningsOverview {
  player_id: number
  player_name: string
  accepted_orders: number
  completed_orders: number
  default_commission_rate: number
  review_days: number
  min_withdrawal_amount: number
  pending_balance: number
  available_balance: number
  withdrawing_balance: number
  withdrawn_total: number
  gross_total: number
  commission_total: number
  net_total: number
  can_withdraw: boolean
  withdrawal_block_reason?: string
}

export interface PlayerEarningItem {
  id: number
  order_no: string
  package_name: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net_amount: number
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

export interface WithdrawalCreatePayload {
  amount: number
  payment_method: 'wechat' | 'alipay' | 'bank' | 'other'
  account_name: string
  account_no: string
  request_note?: string
}

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
