export interface MiniPaymentRequest {
  signData: string
  signature: string
  mode: 'short_series_goods' | 'short_series_coin' | string
  paySig: string
  payment_no: string
  order_no?: string
  amount?: number
  status?: string
  virtual?: boolean
  virtual_env?: number
  product_id?: string
  /** 后端处于模拟支付模式时返回 true（此时无 signData 等签名字段） */
  mock?: boolean
  // 兼容旧版支付页的字段
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
  status?: string
  order_status?: string
  paid_at?: string | null
  detail?: string
}

import api from '@/utils/request'

export function createMiniProgramPayment(order_no: string, code?: string, openid?: string) {
  return api.post<MiniPaymentRequest>('/pay/wechat/virtual/create', { order_no, code, openid })
}

export function queryVirtualPayment(payment_no: string) {
  return api.post<any>(`/pay/wechat/virtual/query/${payment_no}`)
}

export function queryVirtualPaymentByOrder(order_no: string) {
  return api.post<VirtualPaymentReconcileResult>(`/pay/wechat/virtual/query-order/${order_no}`)
}

/** 用户主动放弃支付时关闭 'paying' 状态的虚拟支付单，释放余额支付通道；其他状态幂等返回现状。 */
export function closeVirtualPayment(payment_no: string) {
  return api.post<{ payment_no: string; status: string }>(`/pay/wechat/virtual/close/${payment_no}`)
}

/**
 * 虚拟商品支付已切换到官方小程序虚拟支付，禁止支付页再创建普通微信支付单。
 * 保留函数签名是为了兼容可能尚未清理的旧调用。
 */
export function createPayment(_order_no: string, _channel: 'wechat' | 'alipay') {
  return Promise.reject({ detail: '当前订单必须使用小程序虚拟支付' })
}

export function getPaymentStatus(payment_no: string) {
  return api.get<any>(`/pay/status/${payment_no}`)
}

export function mockPaymentSuccess(payment_no: string) {
  return api.post<any>(`/pay/mock/${payment_no}/success`)
}
