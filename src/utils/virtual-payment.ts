import { queryVirtualPayment } from '@/api/pay'

const VIRTUAL_PACKAGE_PREFIX = 'virtual_payment:'
const INSTALL_FLAG = '__tc_virtual_payment_bridge_installed__'

declare const wx: any

type RequestPaymentOptions = Record<string, any>

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseVirtualPayload(packageValue: string) {
  const encoded = packageValue.slice(VIRTUAL_PACKAGE_PREFIX.length)
  return JSON.parse(decodeURIComponent(encoded))
}

async function waitForServerConfirmation(paymentNo: string) {
  let latest: any = null
  for (let index = 0; index < 10; index += 1) {
    latest = await queryVirtualPayment(paymentNo)
    if (latest?.status === 'paid' || latest?.order_status === '已完成') return latest
    if (latest?.status === 'closed' || latest?.status === 'failed') {
      throw new Error('微信虚拟支付订单未完成，请重新支付')
    }
    await sleep(800)
  }
  throw new Error('微信已返回支付结果，服务器仍在确认中，请稍后刷新订单')
}

/**
 * 保持现有支付页面不变：当 uni.requestPayment 收到 virtual_payment: 前缀时，
 * 自动改用微信原生 requestVirtualPayment，并在成功后向后端查询确认。
 */
export function installVirtualPaymentBridge() {
  const uniApi = uni as any
  if (uniApi[INSTALL_FLAG]) return
  const originalRequestPayment = uniApi.requestPayment?.bind(uniApi)
  if (!originalRequestPayment) return

  uniApi[INSTALL_FLAG] = true
  uniApi.requestPayment = (options: RequestPaymentOptions) => {
    const packageValue = String(options?.package || '')
    if (!packageValue.startsWith(VIRTUAL_PACKAGE_PREFIX)) {
      return originalRequestPayment(options)
    }

    let payload: any
    try {
      payload = parseVirtualPayload(packageValue)
    } catch (error) {
      const result = { errMsg: 'requestVirtualPayment:fail 支付参数解析失败', error }
      options?.fail?.(result)
      options?.complete?.(result)
      return
    }

    const nativeApi = typeof wx !== 'undefined' && wx?.requestVirtualPayment
      ? wx
      : uniApi
    const requestVirtualPayment = nativeApi?.requestVirtualPayment
    if (typeof requestVirtualPayment !== 'function') {
      const result = {
        errMsg: 'requestVirtualPayment:fail 当前微信版本不支持小程序虚拟支付',
        errCode: -15000
      }
      options?.fail?.(result)
      options?.complete?.(result)
      return
    }

    requestVirtualPayment.call(nativeApi, {
      signData: payload.signData,
      paySig: payload.paySig,
      signature: payload.signature,
      mode: payload.mode,
      success: async (result: any) => {
        try {
          await waitForServerConfirmation(payload.payment_no)
          options?.success?.(result)
          options?.complete?.(result)
        } catch (error: any) {
          const failed = {
            errMsg: error?.message || 'requestVirtualPayment:fail 服务端确认失败',
            errCode: -15003,
            error
          }
          options?.fail?.(failed)
          options?.complete?.(failed)
        }
      },
      fail: (error: any) => {
        options?.fail?.(error)
        options?.complete?.(error)
      }
    })
  }
}
