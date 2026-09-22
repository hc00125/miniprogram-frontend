import { quoteGift, purchaseGift, readGiftPurchase, readGiftPurchaseByKey, hasDiamonds, integer, type GiftSelection, type GiftQuote, type Capabilities, type Purchase } from '@/api/giftCommerce'
import { getClientPlatform, isIOSPurchaseEnabled } from '@/utils/purchaseAvailability'
import { getRecovery, saveRecovery, type CommerceRecovery } from '@/utils/commerceRecovery'
const defaults = {
  quoteGift, purchaseGift, readGiftPurchase, readGiftPurchaseByKey,
  login: (): Promise<string> => new Promise((resolve, reject) => uni.login({ provider: 'weixin', success: r => r.code ? resolve(r.code) : reject(new Error('微信登录失败，未发起付款')), fail: reject })),
  key: () => `gift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
export function giftGate(s: GiftSelection, c: Capabilities) {
  if (!c.purchase_enabled || !c.purchase_supported || !c.quote_supported || !c.policy_version || c.blockers.length
    || !integer(c.max_quantity,1) || !integer(c.max_diamonds,1) || !integer(c.daily_diamonds,1)
    || s.quantity > c.max_quantity || (s.mode === 'direct' && c.recipient_eligible !== true)) throw new Error('服务端限制尚未满足，禁止购买')
}
/** Instance-bound confirmation; durable journal is account-bound, never token/code-bound.
 * Any ambiguous POST error retains unknown. Recovery is exclusively GET. */
export function createGiftCheckout(deps = defaults) {
  const token = String(uni.getStorageSync('token') || ''), account = String(uni.getStorageSync('client_profile')?.id || '')
  let generation = 0, approved: string | null = null, busy = false
  const session = () => {
    if (!token || !account || token !== String(uni.getStorageSync('token') || '') || account !== String(uni.getStorageSync('client_profile')?.id || '')) throw new Error('登录状态已变化，请重新打开')
  }
  const recovery = () => { session(); return getRecovery(account,'gift') }
  const noPending = () => { const r = recovery(); if (r && ['unknown','processing'].includes(r.state)) throw new Error('原交易待核对，只能查询原交易') }
  function saveResult(result: Purchase, original: CommerceRecovery) {
    const state = result.payment_status === 'paid' || ['refunded','partially_refunded'].includes(result.payment_status) ? 'paid'
      : ['failed','cancelled'].includes(result.payment_status) ? 'failed' : result.payment_status === 'unknown' ? 'unknown' : 'processing'
    saveRecovery(account,{...original,business_no:result.purchase_no,state})
  }
  return {
    recovery,
    invalidate() { generation++; approved = null },
    async quote(s: GiftSelection, c: Capabilities) {
      session(); noPending(); giftGate(s,c); approved = null
      const ticket = ++generation, result = await deps.quoteGift(s)
      session(); if (ticket !== generation) throw new Error('选择已变化，请重新报价')
      approved = JSON.stringify(result); return { ...result, blockers: [...result.blockers] }
    },
    async pay(q: GiftQuote, c: Capabilities) {
      session(); noPending(); giftGate(q,c)
      if (getClientPlatform() === 'ios' && !isIOSPurchaseEnabled()) throw new Error('iOS端虚拟支付当前未启用，未发起付款')
      if (busy || !approved || JSON.stringify(q) !== approved || !q.can_submit || q.blockers.length
        || c.policy_version !== q.policy_version || q.total_diamonds > c.max_diamonds! || q.total_diamonds > c.daily_diamonds! || !hasDiamonds(q.available_diamonds,q.total_diamonds)) throw new Error('请重新报价并确认可用余额与限制')
      busy = true; const ticket = generation
      try {
        const code = await deps.login()
        session(); noPending(); if (ticket !== generation) throw new Error('面板已关闭，未发起付款')
        const original: CommerceRecovery = {kind:'gift',idempotency_key:deps.key(),business_no:'',state:'unknown'}
        saveRecovery(account,original) // Read-back verified before any money request.
        approved = null
        const result = await deps.purchaseGift(q,original.idempotency_key,code)
        // Even a hidden component may persist the original account's verified result;
        // never paint another session. Stale-session API errors retain unknown.
        saveResult(result,original); return result
      } finally { busy = false }
    },
    async recover() {
      session(); const original = recovery()
      if (!original) throw new Error('没有原交易恢复记录')
      const result = original.business_no ? await deps.readGiftPurchase(original.business_no) : await deps.readGiftPurchaseByKey(original.idempotency_key)
      session(); saveResult(result,original); return result
    }
  }
}
