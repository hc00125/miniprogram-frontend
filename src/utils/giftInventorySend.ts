import { quoteInventorySend, sendInventoryGift, readInventorySendByKey, integer, type InventorySelection, type InventoryQuote, type Capabilities, type Transfer } from '@/api/giftCommerce'
import { getRecovery, saveRecovery, type CommerceRecovery } from '@/utils/commerceRecovery'

export function inventoryGate(s: InventorySelection, c: Capabilities) {
  if (!c.inventory_transfer_enabled || !c.inventory_quote_supported || c.recipient_eligible !== true
    || !c.policy_version || c.blockers.length || !integer(c.max_quantity,1) || !integer(s.quantity,1)
    || s.quantity > c.max_quantity) throw new Error('库存赠送暂不可用，请核对收礼人和库存')
}
/** Stock is consumed once. Persist before POST; only original-key GET resolves it.
 * No purchase endpoint, payment method or WeChat login is called here. */
export function createInventorySend() {
  const token=String(uni.getStorageSync('token') || ''),account=String(uni.getStorageSync('client_profile')?.id || '')
  let generation=0, approved:string|null=null, busy=false
  const session=()=>{if(!token || !account || token!==String(uni.getStorageSync('token') || '') || account!==String(uni.getStorageSync('client_profile')?.id || ''))throw new Error('登录状态已变化，请重新打开')}
  const recovery=()=>{session();return getRecovery(account,'inventory_send')}
  const noPending=()=>{const r=recovery();if(r && ['unknown','processing'].includes(r.state))throw new Error('原赠送尚未确认，只能查询原记录')}
  async function readOriginal(original:CommerceRecovery):Promise<Transfer> {
    const result=await readInventorySendByKey(original.idempotency_key)
    session()
    if(original.business_no && result.transfer_no!==original.business_no)throw new Error('原赠送记录不一致，请联系平台核对')
    const state=['delivered','reversed'].includes(result.status)?'delivered':['failed','cancelled'].includes(result.status)?'failed':'unknown'
    saveRecovery(account,{...original,business_no:result.transfer_no,state})
    return result
  }
  return {
    recovery,
    invalidate(){generation++;approved=null},
    async quote(s:InventorySelection,c:Capabilities){
      session();noPending();inventoryGate(s,c);approved=null
      const ticket=++generation,result=await quoteInventorySend(s)
      session();if(ticket!==generation)throw new Error('选择已变化，请重新确认')
      approved=JSON.stringify(result);return {...result,blockers:[...result.blockers]}
    },
    async send(q:InventoryQuote,c:Capabilities){
      session();noPending();inventoryGate(q,c)
      if(busy || !approved || JSON.stringify(q)!==approved || !q.can_submit || q.blockers.length
        || q.policy_version!==c.policy_version || q.payment_diamonds!==0 || q.available_quantity<q.quantity)throw new Error('请重新确认赠送数量与收礼人')
      busy=true
      try {
        const original:CommerceRecovery={kind:'inventory_send',idempotency_key:`gift-send-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,business_no:'',state:'unknown'}
        saveRecovery(account,original);approved=null
        const result=await sendInventoryGift(q,original.idempotency_key)
        // POST success alone never opens a new send. Keep the original key until
        // a read-back verifies delivery; a hidden/expired session stays unknown.
        saveRecovery(account,{...original,business_no:result.transfer_no})
        session();return await readOriginal({...original,business_no:result.transfer_no})
      } finally {busy=false}
    },
    async recover(){session();const original=recovery();if(!original)throw new Error('没有原赠送记录');return readOriginal(original)}
  }
}
