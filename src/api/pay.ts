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
}

import api from '@/utils/request'

export function createMiniProgramPayment(order_no: string, code?: string, openid?: string) {
  return api.post<MiniPaymentRequest>('/pay/wechat/miniprogram/create', { order_no, code, openid })
}

export function createPayment(order_no: string, channel: 'wechat' | 'alipay') {
  return api.post<any>('/pay/create', { order_no, channel })
}

export function getPaymentStatus(payment_no: string) {
  return api.get<any>(`/pay/status/${payment_no}`)
}

export function mockPaymentSuccess(payment_no: string) {
  return api.post<any>(`/pay/mock/${payment_no}/success`)
}
