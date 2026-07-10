import { queryVirtualPayment, type MiniPaymentRequest } from '@/api/pay'

declare const wx: any

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForServerConfirmation(paymentNo: string) {
  let latest: any = null
  for (let index = 0; index < 12; index += 1) {
    latest = await queryVirtualPayment(paymentNo)
    if (latest?.status === 'paid' || latest?.order_status === '已完成') return latest
    if (latest?.status === 'closed' || latest?.status === 'failed') {
      throw new Error('微信虚拟支付订单未完成，请重新支付')
    }
    await sleep(800)
  }
  throw new Error('微信已返回支付结果，服务器仍在确认中，请稍后刷新订单')
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

export async function requestWechatVirtualPayment(params: MiniPaymentRequest) {
  if (!params?.signData || !params?.paySig || !params?.signature || !params?.mode || !params?.payment_no) {
    throw new Error('虚拟支付参数不完整，请重新进入支付页面')
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

  return waitForServerConfirmation(params.payment_no)
}
