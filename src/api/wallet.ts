import api from '@/utils/request'
import type { MiniPaymentRequest } from '@/api/pay'

export interface WalletOverview {
  balance: string
  recharged_total: string
  spent_total: string
}

export interface RechargePackage {
  id: number
  amount: string
}

export type RechargeStatus = 'created' | 'paying' | 'paid' | 'credited' | 'closed' | 'failed' | string

export interface RechargeQueryResult {
  recharge_no: string
  status: RechargeStatus
  amount: string
  /** credited 后返回最新余额 */
  balance?: string
}

export type WalletEntryType = 'recharge' | 'order_payment' | 'refund_in' | 'admin_adjust' | string

export interface WalletTransactionItem {
  id: number
  entry_type: WalletEntryType
  amount: string
  balance_after: string
  note: string
  created_at: string
}

export interface BalancePaymentResult {
  payment_no: string
  order_no: string
  status: string
  amount: string
  balance: string
}

export function getWalletOverview() {
  return api.get<WalletOverview>('/client/wallet/overview')
}

export function getRechargePackages() {
  return api.get<{ results: RechargePackage[] }>('/client/wallet/recharge/packages')
}

export function createRecharge(product_id: number, code: string) {
  return api.post<MiniPaymentRequest & { recharge_no: string }>('/client/wallet/recharge/create', { product_id, code })
}

export function queryRecharge(recharge_no: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/query/${recharge_no}`)
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
  return api.post<any>(`/client/wallet/recharge/mock/${recharge_no}/success`)
}
