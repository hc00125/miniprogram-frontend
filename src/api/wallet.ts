import api from '@/utils/request'
import type { MiniPaymentRequest } from '@/api/pay'

export interface WalletOverview {
  /** 旧版人民币字段，仅用于兼容和排错。 */
  balance?: string
  recharged_total?: string
  spent_total?: string
  balance_yuan?: string
  recharged_total_yuan?: string
  spent_total_yuan?: string
  balance_diamonds: number
  recharged_total_diamonds: number
  spent_total_diamonds: number
  diamonds_per_yuan: number
}

export interface RechargePackage {
  id: number
  /** 旧字段。 */
  amount?: string
  pay_amount_yuan: string
  diamonds: number
}

export type RechargeStatus = 'created' | 'paying' | 'paid' | 'credited' | 'closed' | 'failed' | string

export interface RechargeQueryResult {
  recharge_no: string
  status: RechargeStatus
  /** 旧字段。 */
  amount?: string
  pay_amount_yuan: string
  diamonds: number
  diamonds_per_yuan: number
  balance?: string
  balance_diamonds?: number
  created_at?: string | null
  paid_at?: string | null
  credited_at?: string | null
}

export interface RechargeOrderListResult {
  count: number
  results: RechargeQueryResult[]
}

export type WalletEntryType = 'recharge' | 'order_payment' | 'refund_in' | 'admin_adjust' | string

export interface WalletTransactionItem {
  id: number
  entry_type: WalletEntryType
  /** 旧版人民币字段，仅用于兼容。 */
  amount?: string
  balance_after?: string
  amount_diamonds: number
  balance_after_diamonds: number
  note: string
  created_at: string
}

export interface BalancePaymentResult {
  payment_no: string
  order_no: string
  status: string
  amount?: string
  balance?: string
  amount_yuan: string
  balance_yuan: string
  amount_diamonds: number
  balance_diamonds: number
  diamonds_per_yuan: number
}

export function getWalletOverview() {
  return api.get<WalletOverview>('/client/wallet/overview')
}

export function getRechargePackages() {
  return api.get<{ diamonds_per_yuan: number; results: RechargePackage[] }>('/client/wallet/recharge/packages')
}

export function createRecharge(recharge_product_id: number, code: string) {
  return api.post<MiniPaymentRequest & {
    recharge_no: string
    pay_amount_yuan: string
    diamonds: number
    diamonds_per_yuan: number
  }>('/client/wallet/recharge/create', { recharge_product_id, code })
}

export function queryRecharge(recharge_no: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/query/${recharge_no}`)
}

export function getRechargeOrders(page = 1, pageSize = 20) {
  return api.get<RechargeOrderListResult>('/client/wallet/recharge/orders', {
    page,
    page_size: pageSize
  })
}

export function getWalletTransactions(page = 1, pageSize = 20) {
  return api.get<{ count: number; results: WalletTransactionItem[] }>('/client/wallet/transactions', {
    page,
    page_size: pageSize
  })
}

export function payOrderWithBalance(order_no: string) {
  return api.post<BalancePaymentResult>('/pay/balance/create', { order_no })
}

/** 仅开发环境可用（后端 ENABLE_MOCK_PAYMENT gate）。 */
export function mockRechargeSuccess(recharge_no: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/mock/${recharge_no}/success`)
}
