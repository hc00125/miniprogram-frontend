import { BASE_URL } from '@/utils/request'
import { getClientPlatform, isIOSPurchaseEnabled } from '@/utils/purchaseAvailability'
import { handleSessionExpiry } from '@/utils/sessionExpiry'
import { validSurchargeSnapshot, type SurchargeQuote, type SurchargeQuoteRequest } from '@/api/surchargeQuote'
import type { MiniPaymentRequest } from '@/api/pay'

export type PaymentStatus = 'created' | 'processing' | 'unknown' | 'paid' | 'failed'
export interface CheckoutRefund {
  refund_no: string; local_status: 'succeeded'; base_amount_yuan: string; surcharge_amount_yuan: string
  total_amount_yuan: string; remote_status: 'not_required' | 'prepared' | 'dispatching' | 'unknown' | 'succeeded'
}
export interface CheckoutSnapshot {
  contract_version: 'surcharge-v2'; payment_status: PaymentStatus; idempotency_key: string; quote_version: string
  base_amount_yuan: string; surcharge_amount_yuan: string; total_amount_yuan: string; total_amount_diamonds: string
  attempt_id: string | null; surcharge: SurchargeQuote['surcharge']; blockers: string[]
  refund?: CheckoutRefund | null
}
export interface SurchargeOrder { order_no: string; status: string; total_price: number; checkout: CheckoutSnapshot }
const money = (v: unknown) => typeof v === 'string' && /^(?:0|[1-9]\d*)\.\d{2}$/.test(v)
const diamond = (v: unknown) => typeof v === 'string' && /^(?:0|[1-9]\d*)\.\d$/.test(v)
const units = (v: string) => BigInt(v.replace('.', ''))
export function validateCheckout(d: any, key: string, quote?: SurchargeQuote): CheckoutSnapshot {
  const c = d?.checkout
  if (!d || typeof d.order_no !== 'string' || !d.order_no || !c || c.contract_version !== 'surcharge-v2'
    || !['created','processing','unknown','paid','failed'].includes(c.payment_status)
    || c.idempotency_key !== key || !/^[a-f0-9]{64}$/.test(c.quote_version)
    || ![c.base_amount_yuan,c.surcharge_amount_yuan,c.total_amount_yuan].every(money)
    || !diamond(c.total_amount_diamonds) || units(c.base_amount_yuan) + units(c.surcharge_amount_yuan) !== units(c.total_amount_yuan)
    || units(c.total_amount_yuan) !== units(c.total_amount_diamonds)
    || !c.surcharge || !Number.isSafeInteger(c.surcharge.amount_diamonds) || c.surcharge.amount_diamonds < 1
    || !validSurchargeSnapshot(c.surcharge, c.surcharge.required_players)
    || units(c.surcharge_amount_yuan) !== units(c.surcharge.amount_yuan)
    || !Array.isArray(c.blockers) || !c.blockers.every((v: unknown) => typeof v === 'string')
    || !(c.attempt_id === null || typeof c.attempt_id === 'string' && c.attempt_id.length > 0)
    || ((c.payment_status === 'created') !== (c.attempt_id === null)
      && !(d.status === '已取消' && c.payment_status === 'failed' && c.attempt_id === null && !c.refund))
    || c.refund != null && (typeof c.refund.refund_no !== 'string' || !c.refund.refund_no
      || c.refund.local_status !== 'succeeded'
      || !['not_required','prepared','dispatching','unknown','succeeded'].includes(c.refund.remote_status)
      || ![c.refund.base_amount_yuan,c.refund.surcharge_amount_yuan,c.refund.total_amount_yuan].every(money)
      || units(c.refund.base_amount_yuan) !== units(c.base_amount_yuan)
      || units(c.refund.surcharge_amount_yuan) !== units(c.surcharge_amount_yuan)
      || units(c.refund.total_amount_yuan) !== units(c.total_amount_yuan))
    || quote && (c.quote_version !== quote.quote_version || c.base_amount_yuan !== quote.base_amount_yuan
      || c.surcharge_amount_yuan !== quote.surcharge_amount_yuan || c.total_amount_yuan !== quote.total_amount_yuan
      || c.total_amount_diamonds !== quote.total_amount_diamonds || c.surcharge.required_players !== quote.required_players
      || c.surcharge.policy_version !== quote.surcharge.policy_version || c.surcharge.commission_rate !== quote.surcharge.commission_rate
      || c.surcharge.amount_diamonds !== quote.surcharge.amount_diamonds || c.surcharge.amount_yuan !== quote.surcharge.amount_yuan
      || c.surcharge.amount_step_diamonds !== quote.surcharge.amount_step_diamonds
      || c.surcharge.per_person_gross_diamonds !== quote.surcharge.per_person_gross_diamonds
      || c.surcharge.per_person_commission_diamonds !== quote.surcharge.per_person_commission_diamonds
      || c.surcharge.per_person_net_diamonds !== quote.surcharge.per_person_net_diamonds)) throw new Error('加价合计或交易状态格式无效，请查询原单')
  return c
}
const sameSurcharge=(a:SurchargeQuote['surcharge'],b:SurchargeQuote['surcharge'])=>
  a.policy_version===b.policy_version && a.commission_rate===b.commission_rate && a.amount_diamonds===b.amount_diamonds
  && a.amount_yuan===b.amount_yuan && a.required_players===b.required_players && a.amount_step_diamonds===b.amount_step_diamonds
  && a.per_person_gross_diamonds===b.per_person_gross_diamonds && a.per_person_commission_diamonds===b.per_person_commission_diamonds
  && a.per_person_net_diamonds===b.per_person_net_diamonds
const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value))
function verifiedOrder(v:SurchargeOrder,key:string,quote?:SurchargeQuote):SurchargeOrder {
  const result=clone(v)
  validateCheckout(result,key,quote)
  return result
}
function clientRequest<T>(path: string, method: 'GET'|'POST', data: unknown, parse: (v:any)=>T, isPurchase=true): Promise<T> {
  const token = String(uni.getStorageSync('token') || '')
  if (!token) return Promise.reject(new Error('请先登录客户账号，不可使用管理员身份付款'))
  if (isPurchase && method === 'POST' && getClientPlatform() === 'ios' && !isIOSPurchaseEnabled()) return Promise.reject(new Error('iOS端虚拟支付当前未启用'))
  return new Promise((resolve,reject)=>uni.request({url:`${BASE_URL.replace(/\/$/,'')}${path}`,method,data,
    header:{Authorization:`Bearer ${token}`,'X-Client-Platform':getClientPlatform()},
    success:res=>{
      if (token !== String(uni.getStorageSync('token') || '')) { reject(new Error('登录会话已变化，请查询原单')); return }
      if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(parse(res.data)) } catch(e) { reject(e) } }
      else {const body=res.data && typeof res.data==='object'?res.data:{detail:'请求失败'}
        reject(handleSessionExpiry(res.statusCode,body,path,'token',token) || {...body as any,statusCode:res.statusCode})}
    }, fail:reject}))
}
export function createSurchargeOrder(payload: SurchargeQuoteRequest & {quote_version:string;idempotency_key:string}, quote:SurchargeQuote) {
  if (!quote.can_submit || quote.blockers.length || quote.surcharge.amount_diamonds <= 0
    || payload.surcharge_diamonds !== quote.surcharge.amount_diamonds || payload.quote_version !== quote.quote_version
    || !payload.idempotency_key || payload.idempotency_key.length > 100) return Promise.reject(new Error('报价不可提交，请重新报价'))
  const fixed=clone(quote), data=clone(payload)
  return clientRequest('/boss/order','POST',data,(v:SurchargeOrder)=>verifiedOrder(v,data.idempotency_key,fixed))
}
export function readSurchargeOrderByKey(key:string):Promise<SurchargeOrder> {
  if (!key || key.length > 100) return Promise.reject(new Error('原订单标识无效'))
  return clientRequest(`/boss/order/by-key?idempotency_key=${encodeURIComponent(key)}`,'GET',{},(v:SurchargeOrder)=>verifiedOrder(v,key))
}
export function cancelSurchargeOrder(order:SurchargeOrder):Promise<void> {
  const fixed=verifiedOrder(order,order.checkout.idempotency_key)
  if(fixed.status!=='待支付' || fixed.checkout.payment_status!=='created' || fixed.checkout.attempt_id!==null || fixed.checkout.refund)
    return Promise.reject(new Error('订单付款状态已变化，请先查询原单'))
  // Reuse the existing cancellation rules. Cancellation is not a new purchase.
  return clientRequest(`/boss/order/${encodeURIComponent(fixed.order_no)}/cancel`,'POST',
    {reason:'老板在支付前主动取消'},v=>{
      if(v?.order_no!==fixed.order_no)throw new Error('取消回复与原单不一致，请查询原单')
    },false)
}
export function paySurchargeOrder(order:SurchargeOrder,code?:string):Promise<{order_no:string;amount:string;checkout:CheckoutSnapshot}> {
  const fixed=verifiedOrder(order,order.checkout.idempotency_key)
  const before=fixed.checkout
  if (before.payment_status !== 'created' || before.attempt_id !== null) return Promise.reject(new Error('原付款已进入处理或失败状态，请只查询原单'))
  return clientRequest('/pay/balance/create','POST',code?{order_no:fixed.order_no,code}:{order_no:fixed.order_no},v=>{
    const result=verifiedOrder(v,before.idempotency_key) as SurchargeOrder & {amount:string}
    const after=result.checkout
    if (result.order_no !== fixed.order_no || after.quote_version !== before.quote_version || after.total_amount_yuan !== before.total_amount_yuan
      || after.base_amount_yuan !== before.base_amount_yuan || after.surcharge_amount_yuan !== before.surcharge_amount_yuan
      || !sameSurcharge(after.surcharge,before.surcharge) || result.amount !== before.total_amount_yuan
      || after.payment_status === 'created' || after.attempt_id === null) throw new Error('支付响应合计或状态不一致，请查询原单，不要再次付款')
    return result
  })
}

/** The ordinary coin endpoints, with the combined order/amount pinned. */
export function createSurchargeWechatPayment(order:SurchargeOrder,code:string,retryFrom=''):Promise<MiniPaymentRequest> {
  const fixed=verifiedOrder(order,order.checkout.idempotency_key)
  if(getClientPlatform()==='ios')return Promise.reject(new Error('iOS端请先充值钻石，再使用钻石付款'))
  if(!code || fixed.checkout.payment_status!=='created' || fixed.checkout.attempt_id!==null) return Promise.reject(new Error('请查询原订单，不可重复付款'))
  return clientRequest('/pay/wechat/virtual/create','POST',{order_no:fixed.order_no,code,...(retryFrom?{retry_from_payment_no:retryFrom}:{})},v=>{
    const signed=JSON.parse(v?.signData||'null')
    if(v?.mode!=='short_series_coin' || v.checkout_order_no!==fixed.order_no || v.order_no!==fixed.order_no
      || v.amount!==fixed.checkout.total_amount_yuan || typeof v.payment_no!=='string' || !v.payment_no
      || !v.paySig || !v.signature || signed?.outTradeNo!==v.payment_no || signed.currencyType!=='CNY'
      || !Number.isSafeInteger(signed.buyQuantity) || signed.buyQuantity<=0
      || !Number.isSafeInteger(v.wechat_coin_units_per_yuan) || v.wechat_coin_units_per_yuan<=0
      || signed.buyQuantity!==v.wechat_coin_units
      || retryFrom && (v.retry_from_payment_no!==retryFrom || v.payment_no===retryFrom)
      || BigInt(signed.buyQuantity)*BigInt(100)!==units(fixed.checkout.total_amount_yuan)*BigInt(v.wechat_coin_units_per_yuan))
      throw new Error('微信换钻金额或原单不一致，禁止拉起付款，请查询原单')
    return v
  })
}

export function querySurchargeWechat(order:SurchargeOrder,rechargeNo='',retryFrom=''):Promise<any> {
  const fixed=verifiedOrder(order,order.checkout.idempotency_key)
  return clientRequest(`/pay/wechat/virtual/query-order/${encodeURIComponent(fixed.order_no)}`,'POST',{},v=>{
    if(v?.found===false && v.order_no===fixed.order_no)return v
    if(v?.found!==true || (v.checkout_order_no||v.order_no)!==fixed.order_no
      || v.amount!==fixed.checkout.total_amount_yuan || !v.payment_no
      || !['created','paying','paid','credited','closed','failed','unknown','processing'].includes(v.status)
      || v.retry_allowed !== undefined && typeof v.retry_allowed !== 'boolean'
      || v.retry_allowed === true && (v.status!=='closed' || v.order_status!=='待支付' || v.paid_at || v.credited_at)
      || rechargeNo && v.status!=='paid' && v.payment_no!==rechargeNo
        && !(retryFrom===rechargeNo && v.retry_from_payment_no===retryFrom))
      throw new Error('微信付款状态与原单不一致，请联系客服核对')
    return v
  })
}

export function finalizeSurchargeWechat(order:SurchargeOrder,rechargeNo:string,code:string):Promise<any> {
  const fixed=verifiedOrder(order,order.checkout.idempotency_key)
  if(!rechargeNo || !code)return Promise.reject(new Error('原充值标识或微信凭证缺失'))
  return clientRequest(`/pay/wechat/virtual/finalize/${encodeURIComponent(rechargeNo)}`,'POST',{code},v=>{
    const result=verifiedOrder(v,fixed.checkout.idempotency_key)
    if(result.order_no!==fixed.order_no || result.checkout.quote_version!==fixed.checkout.quote_version
      || v.amount!==fixed.checkout.total_amount_yuan || result.checkout.total_amount_yuan!==fixed.checkout.total_amount_yuan
      || !sameSurcharge(result.checkout.surcharge,fixed.checkout.surcharge))throw new Error('合计付款仍待核对，请查询原单')
    return v
  })
}
