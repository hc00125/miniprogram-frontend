export interface MiniPaymentRequest {
  signData: string
  signature: string
  mode: 'short_series_goods' | 'short_series_coin' | string
  paySig: string
  payment_no: string
  order_no?: string
  checkout_order_no?: string
  amount?: number
  status?: string
  virtual?: boolean
  virtual_env?: number
  product_id?: string
  mock?: boolean
  timeStamp?: string
  nonceStr?: string
  package?: string
  signType?: string
  prepay_id?: string
}

export interface VirtualPaymentReconcileResult {
  found: boolean
  payment_no?: string
  order_no?: string
  checkout_order_no?: string
  status?: string
  order_status?: string
  paid_at?: string | null
  detail?: string
}

import api from '@/utils/request'

function requestWechatLoginCode() {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result: any) => {
        const code = String(result?.code || '')
        if (code) resolve(code)
        else reject({ detail: '微信登录凭证获取失败，请重新进入小程序后重试' })
      },
      fail: reject
    })
  })
}

function isWechatLoginCodeUsed(error: any) {
  const code = String(error?.wechat_code ?? error?.errCode ?? error?.code ?? '')
  const detail = String(error?.detail ?? error?.errMsg ?? error?.message ?? '')
  return code === '40163' || /(?:^|\D)40163(?:\D|$)|code\s*been\s*used/i.test(detail)
}

export async function finalizeCoinCheckout(rechargeNo: string) {
  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = await requestWechatLoginCode()
    try {
      return await api.post<any>(`/pay/wechat/virtual/finalize/${rechargeNo}`, { code })
    } catch (error: any) {
      lastError = error
      if (!isWechatLoginCodeUsed(error)) throw error
    }
  }
  throw lastError || { detail: '微信登录凭证连续失效，请重新进入小程序后重试' }
}

export function createMiniProgramPayment(order_no: string, code?: string, openid?: string) {
  return api.post<MiniPaymentRequest>('/pay/wechat/virtual/create', { order_no, code, openid })
}

/**
 * 兼容两代支付：
 * - 历史 short_series_goods：直接返回 Payment 查询结果；
 * - 新 short_series_coin 订单充值：充值 credited 后立刻用 fresh wx.login code
 *   调 finalize，让后端 currency_pay 扣官方钻石并完成业务订单。
 */
export async function queryVirtualPayment(payment_no: string) {
  const result = await api.post<any>(`/pay/wechat/virtual/query/${payment_no}`)
  if (result?.checkout_order_no && result?.status === 'credited') {
    return finalizeCoinCheckout(payment_no)
  }
  return result
}

export function queryVirtualPaymentByOrder(order_no: string) {
  return api.post<VirtualPaymentReconcileResult>(`/pay/wechat/virtual/query-order/${order_no}`)
}

/**
 * 用户在 Apple/微信收银台成功后杀掉小程序时的恢复入口。
 * 重新打开待支付订单会先主动查微信充值单；若已 credited，则自动使用新的
 * wx.login code 完成 currency_pay，避免“钱已扣但业务订单仍待支付”。
 */
export async function reconcileVirtualCheckoutByOrder(order_no: string) {
  const result = await queryVirtualPaymentByOrder(order_no)
  if (result?.found && result?.payment_no && result?.status === 'credited') {
    return finalizeCoinCheckout(result.payment_no)
  }
  return result
}

export function closeVirtualPayment(payment_no: string) {
  return api.post<{ payment_no: string; status: string }>(`/pay/wechat/virtual/close/${payment_no}`)
}

export function createPayment(_order_no: string, _channel: 'wechat' | 'alipay') {
  return Promise.reject({ detail: '当前订单必须使用小程序虚拟支付' })
}

export function getPaymentStatus(payment_no: string) {
  return api.get<any>(`/pay/status/${payment_no}`)
}

export function mockPaymentSuccess(payment_no: string) {
  return api.post<any>(`/pay/mock/${payment_no}/success`)
}
