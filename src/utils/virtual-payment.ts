import { queryVirtualPayment, type MiniPaymentRequest } from '@/api/pay'

declare const wx: any

const CONFIRMATION_PENDING_ERR_CODE = -15002

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class VirtualPaymentConfirmationPendingError extends Error {
  readonly errCode = CONFIRMATION_PENDING_ERR_CODE
  readonly paymentAccepted = true
  readonly paymentNo: string
  readonly latestStatus: any
  readonly lastError: unknown

  constructor(paymentNo: string, message: string, latestStatus: any = null, lastError: unknown = null) {
    super(message)
    this.name = 'VirtualPaymentConfirmationPendingError'
    this.paymentNo = paymentNo
    this.latestStatus = latestStatus
    this.lastError = lastError
  }
}

export function isVirtualPaymentConfirmationPending(error: any) {
  return Boolean(error?.paymentAccepted) || Number(error?.errCode) === CONFIRMATION_PENDING_ERR_CODE
}

export interface VirtualPaymentOptions {
  /** 自定义服务器确认查询（默认查订单虚拟支付；充值等场景可传入自己的查询函数）。 */
  query?: (no: string) => Promise<any>
}

async function waitForServerConfirmation(paymentNo: string, query: (no: string) => Promise<any> = queryVirtualPayment) {
  let latest: any = null
  let lastError: unknown = null

  for (let index = 0; index < 20; index += 1) {
    try {
      latest = await query(paymentNo)
      if (latest?.status === 'paid' || latest?.status === 'credited' || latest?.order_status === '已完成') return latest
      if (latest?.status === 'closed' || latest?.status === 'failed') {
        throw new VirtualPaymentConfirmationPendingError(
          paymentNo,
          '微信已返回付款成功，但服务器支付状态暂未同步，请勿重复支付',
          latest
        )
      }
    } catch (error) {
      if (isVirtualPaymentConfirmationPending(error)) throw error
      lastError = error
    }
    await sleep(index < 5 ? 800 : 1200)
  }

  throw new VirtualPaymentConfirmationPendingError(
    paymentNo,
    '微信付款已完成，服务器仍在确认订单状态，请勿重复支付',
    latest,
    lastError
  )
}

function getNativeVirtualPaymentApi() {
  const wxApi = typeof wx !== 'undefined' ? wx : undefined
  const uniApi = uni as any
  if (typeof wxApi?.requestVirtualPayment === 'function') {
    return { target: wxApi, fn: wxApi.requestVirtualPayment }
  }
  if (typeof uniApi?.requestVirtualPayment === 'function') {
    return { target: uniApi, fn: uniApi.requestVirtualPayment }
  }
  return null
}

export async function requestWechatVirtualPayment(params: MiniPaymentRequest, options?: VirtualPaymentOptions) {
  if (!params?.signData || !params?.paySig || !params?.signature || !params?.mode || !params?.payment_no) {
    const missing: string[] = []
    if (!params?.signData) missing.push('signData')
    if (!params?.paySig) missing.push('paySig')
    if (!params?.signature) missing.push('signature')
    if (!params?.mode) missing.push('mode')
    if (!params?.payment_no) missing.push('payment_no')
    console.error('[虚拟支付] 参数不完整，缺失字段:', missing, '完整参数:', JSON.stringify(params))
    throw new Error(`虚拟支付参数不完整（缺失: ${missing.join(', ')}），请重新进入支付页面`)
  }

  const api = getNativeVirtualPaymentApi()
  if (!api) {
    throw {
      errMsg: 'requestVirtualPayment:fail 当前微信版本不支持小程序虚拟支付',
      errCode: -15000
    }
  }

  await new Promise<void>((resolve, reject) => {
    api.fn.call(api.target, {
      signData: params.signData,
      paySig: params.paySig,
      signature: params.signature,
      mode: params.mode,
      success: () => resolve(),
      fail: reject
    })
  })

  return waitForServerConfirmation(params.payment_no, options?.query || queryVirtualPayment)
}
