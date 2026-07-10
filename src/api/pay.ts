export interface MiniPaymentRequest {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
  payment_no?: string
  order_no?: string
  amount?: number
  status?: string
  prepay_id?: string
  virtual?: boolean
  virtual_env?: number
  product_id?: string
}

import api from '@/utils/request'

export function createMiniProgramPayment(order_no: string, code?: string, openid?: string) {
  return api.post<MiniPaymentRequest>('/pay/wechat/virtual/create', { order_no, code, openid })
}

export function queryVirtualPayment(payment_no: string) {
  return api.post<any>(`/pay/wechat/virtual/query/${payment_no}`)
}

/**
 * 虚拟商品支付已切换到官方小程序虚拟支付，禁止支付页再创建普通微信支付单。
 * 保留函数签名是为了兼容旧页面中的兜底调用。
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
