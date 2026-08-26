import api from '@/utils/request'
import type { MiniPaymentRequest } from '@/api/pay'

export interface WalletOverview {
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
  amount?: string
  pay_amount_yuan: string
  diamonds: number
  quick_amount?: boolean
}

export interface RechargeConfig {
  diamonds_per_yuan: number
  effective_diamonds_per_yuan?: number
  min_amount_yuan: string
  max_amount_yuan: string
  amount_step_yuan: string
  client_platform: string
  platform_fee_percent?: string
  target_net_margin_percent?: string
  custom_amount_enabled?: boolean
  allowed_amounts_yuan?: string[] | null
  ios_diamonds_per_yuan?: string | null
  results: RechargePackage[]
}

export type RechargeStatus = 'created' | 'paying' | 'paid' | 'credited' | 'closed' | 'failed' | string

export interface RechargeQueryResult {
  recharge_no: string
  status: RechargeStatus
  amount?: string
  pay_amount_yuan: string
  diamonds: number
  diamonds_per_yuan: number
  balance?: string
  balance_diamonds?: number
  recharge_product_id?: number | null
  client_platform?: string
  platform_fee_percent?: string | null
  estimated_platform_fee_yuan?: string | null
  estimated_settlement_yuan?: string | null
  expires_at?: string | null
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
  /** 本次实际同步从微信官方 coin 账户扣除的钻石。 */
  wechat_coin_diamonds?: number
}

type RechargeCreateResult = MiniPaymentRequest & {
  recharge_no: string
  pay_amount_yuan: string
  diamonds: number
  diamonds_per_yuan: number
  client_platform?: string
  platform_fee_percent?: string
  estimated_platform_fee_yuan?: string
  estimated_settlement_yuan?: string
}

function isWechatLoginCodeUsed(error: any) {
  const code = String(error?.wechat_code ?? error?.errCode ?? error?.code ?? '')
  const detail = String(error?.detail ?? error?.errMsg ?? error?.message ?? '')
  return code === '40163'
    || code === 'WECHAT_LOGIN_CODE_USED'
    || /(?:^|\D)40163(?:\D|$)|code\s*been\s*used/i.test(detail)
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function requestWechatLoginCode() {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result: any) => {
        const code = String(result?.code || '')
        if (code) {
          resolve(code)
          return
        }
        reject({
          code: 'WECHAT_LOGIN_CODE_MISSING',
          detail: '微信登录凭证获取失败，请重新进入小程序后重试'
        })
      },
      fail: reject
    })
  })
}

async function getDistinctWechatLoginCode(previousCode = '') {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await wait(180 * attempt)
    const code = await requestWechatLoginCode()
    if (!previousCode || code !== previousCode) return code
  }
  throw {
    code: 'WECHAT_LOGIN_CODE_NOT_REFRESHED',
    detail: '微信未返回新的登录凭证，请关闭并重新进入小程序后重试'
  }
}

function postRechargeCreate(amountYuan: number | string, code: string) {
  return api.post<RechargeCreateResult>('/client/wallet/recharge/create', {
    amount_yuan: amountYuan,
    code
  })
}

export function getWalletOverview() {
  return api.get<WalletOverview>('/client/wallet/overview')
}

export function getRechargePackages() {
  return api.get<RechargeConfig>('/client/wallet/recharge/packages')
}

export async function createRecharge(amountYuan: number | string, _legacyCode?: string) {
  let previousCode = ''
  let lastError: any = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = await getDistinctWechatLoginCode(previousCode)
    previousCode = code
    try {
      return await postRechargeCreate(amountYuan, code)
    } catch (error: any) {
      lastError = error
      if (!isWechatLoginCodeUsed(error)) throw error
    }
  }

  throw {
    ...(lastError || {}),
    code: 'WECHAT_LOGIN_CODE_USED',
    wechat_code: 40163,
    detail: '微信连续返回已使用的登录凭证，请关闭并重新进入小程序后重试'
  }
}

export function queryRecharge(rechargeNo: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/query/${rechargeNo}`)
}

export function cancelRecharge(rechargeNo: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/cancel/${rechargeNo}`)
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

/**
 * 钻石余额支付。每次都获取 fresh wx.login code：
 * - 纯历史/人工余额时后端会忽略 code；
 * - short_series_coin 充值形成的余额会先同步 pending 退款，再 currency_pay 扣官方 coin。
 * 40163 时自动换新 code 重试，后端使用确定性 coin order_id 保证远端幂等。
 */
export async function payOrderWithBalance(orderNo: string) {
  let previousCode = ''
  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = await getDistinctWechatLoginCode(previousCode)
    previousCode = code
    try {
      return await api.post<BalancePaymentResult>('/pay/balance/create', { order_no: orderNo, code })
    } catch (error: any) {
      lastError = error
      if (!isWechatLoginCodeUsed(error)) throw error
    }
  }
  throw lastError || new Error('钻石支付失败')
}

export function mockRechargeSuccess(rechargeNo: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/mock-success/${rechargeNo}`)
}
