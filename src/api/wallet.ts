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
  recharge_product_id?: number | null
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

type RechargeCreateResult = MiniPaymentRequest & {
  recharge_no: string
  pay_amount_yuan: string
  diamonds: number
  diamonds_per_yuan: number
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

function postRechargeCreate(rechargeProductId: number, code: string) {
  return api.post<RechargeCreateResult>('/client/wallet/recharge/create', {
    recharge_product_id: rechargeProductId,
    code
  })
}

export function getWalletOverview() {
  return api.get<WalletOverview>('/client/wallet/overview')
}

export function getRechargePackages() {
  return api.get<{ diamonds_per_yuan: number; results: RechargePackage[] }>('/client/wallet/recharge/packages')
}

/**
 * 创建充值单。页面传入的旧 code 仅为兼容参数，不再直接使用。每次真正创建前
 * 都重新调用 wx.login；遇到 40163 时获取一个与上次不同的 code 后重试，最多
 * 三次后端请求，避免无限循环。
 */
export async function createRecharge(rechargeProductId: number, _legacyCode?: string) {
  let previousCode = ''
  let lastError: any = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = await getDistinctWechatLoginCode(previousCode)
    previousCode = code
    try {
      return await postRechargeCreate(rechargeProductId, code)
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

export function payOrderWithBalance(orderNo: string) {
  return api.post<BalancePaymentResult>('/pay/balance/create', { order_no: orderNo })
}

/** 仅开发环境可用（后端 ENABLE_MOCK_PAYMENT gate）。 */
export function mockRechargeSuccess(rechargeNo: string) {
  return api.post<RechargeQueryResult>(`/client/wallet/recharge/mock/${rechargeNo}/success`)
}
