<template>
  <view class="surcharge-payment">
    <view class="card"><text class="title">订单付款</text><text class="hint">原订单和整单加价一起支付，不需要再付一笔加购款。</text></view>
    <view v-if="order" class="card">
      <view class="row"><text>原单金额</text><text>¥{{ order.checkout.base_amount_yuan }}</text></view>
      <view class="row"><text>整单加价</text><text>¥{{ order.checkout.surcharge_amount_yuan }}</text></view>
      <view class="row strong"><text>本次确认合计</text><text>¥{{ order.checkout.total_amount_yuan }} · {{ order.checkout.total_amount_diamonds }}钻石等值</text></view>
      <text class="hint">加价均分净额为钻石等值，尚未结算为可提现鱼干。</text>
      <text class="hint">原订单号：{{ order.order_no }} · {{ statusText }}</text>
      <text v-if="order.checkout.refund" class="hint">本地钱包已退 ¥{{ order.checkout.refund.total_amount_yuan }}（原款 ¥{{ order.checkout.refund.base_amount_yuan }} + 加价 ¥{{ order.checkout.refund.surcharge_amount_yuan }}）· 退款号 {{ order.checkout.refund.refund_no }}</text>
      <text v-if="order.checkout.refund" class="hint">{{ remoteRefundText }}</text>
      <text v-if="order.checkout.attempt_id" class="hint">支付处理标识：{{ order.checkout.attempt_id }}</text>
      <view v-if="canPay" class="payment-methods">
        <button class="method" :class="{ selected: payMethod === 'balance' }" data-action="select-balance" @tap="payMethod = 'balance'">钻石余额支付 {{ payMethod === 'balance' ? '✓' : '' }}</button>
        <button v-if="wechatAvailable" class="method" :class="{ selected: payMethod === 'wechat' }" data-action="select-wechat" @tap="payMethod = 'wechat'">微信支付 {{ payMethod === 'wechat' ? '✓' : '' }}</button>
        <text class="hint">{{ payMethod === 'wechat' ? '微信付款后自动兑换钻石，用于支付本订单及加价。' : '使用钱包中的钻石，一次支付订单和加价。' }}</text>
        <text v-if="!wechatAvailable" class="hint">iOS端沿用原规则：先充值钻石，再用钻石付款。</text>
      </view>
      <button v-if="canPay" data-action="confirm-combined-payment" :disabled="working" @tap="confirmPayment">{{ working ? '处理中…' : payMethod === 'wechat' ? '微信支付 ¥' + order.checkout.total_amount_yuan : '钻石支付 ' + order.checkout.total_amount_diamonds + '钻' }}</button>
      <button v-if="canRetryWechat" data-action="retry-wechat-payment" :disabled="working" @tap="retryWechatPayment">继续微信支付 ¥{{ order.checkout.total_amount_yuan }}</button>
      <button v-if="showCancelOrder" class="cancel-order" data-action="cancel-order" :disabled="Boolean(cancelBlockReason)" @tap="cancelUnpaidOrder">取消订单</button>
      <text v-if="showCancelOrder && cancelBlockReason" class="hint">{{ cancelBlockReason }}</text>
      <button v-if="cancelledUnpaid" data-action="view-cancelled-order" @tap="viewCancelledOrder">查看已取消订单</button>
    </view>
    <view class="card"><text v-if="message" class="warning">{{ message }}</text><button data-action="read-original-key" :disabled="working" @tap="refresh">{{ working ? '正在查询…' : '查询付款状态' }}</button><text class="hint">取消微信收银台不等于取消订单。确认未付款后可继续支付；如果结果未确认，请先查询，避免重复付款。</text></view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, onScopeDispose } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { makeSurchargeIntent } from '@/utils/surchargeCheckoutIntent'
import { commerceRelease } from '@/utils/commerceRelease'
import { getClientProfile } from '@/utils/client'
import { getStorage, SESSION_CHANGED_EVENT } from '@/utils/storage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { confirm, getErrorMessage } from '@/utils/feedback'
import { replace } from '@/utils/nav'
import { getClientPlatform } from '@/utils/purchaseAvailability'
import { requestWechatVirtualPayment } from '@/utils/virtual-payment'
import { cancelSurchargeOrder, type SurchargeOrder } from '@/api/surchargeCheckout'
let generation = 0, visible = false, intent = newIntent(), redirectedOrder = ''
const key = ref(''), order = ref<SurchargeOrder|null>(null), working = ref(false), message = ref('')
const payMethod=ref<'balance'|'wechat'>('balance'), wechatAvailable=getClientPlatform()!=='ios'
const retryWechatReady=ref(false)
let confirmationTimer:ReturnType<typeof setTimeout>|null=null, refreshAttempts=0
function stopConfirmation(){if(confirmationTimer!==null)clearTimeout(confirmationTimer);confirmationTimer=null}
function scheduleConfirmation(){
  stopConfirmation()
  try{if(visible && !retryWechatReady.value && intent.state()?.payment_method==='wechat' && !['paid','failed','refunded','cancelled'].includes(effectiveStatus()) && refreshAttempts<20){
    refreshAttempts++;confirmationTimer=setTimeout(()=>{confirmationTimer=null;void refresh()},2500)
  }}catch{/* Invalid sessions cannot resume payment. */}
}
function identity(){return {account:String(getClientProfile()?.id||''),token:String(getStorage<string>('token')||'')}}
function newIntent(){return makeSurchargeIntent(identity)}
function valid(g:number,s:ReturnType<typeof identity>){const now=identity();return visible && g===generation && now.account===s.account && now.token===s.token && !!s.token}
function effectiveStatus(){
  if(order.value?.checkout.refund)return 'refunded'
  if(order.value && /cancel|取消/i.test(order.value.status))return 'cancelled'
  if(retryWechatReady.value && order.value?.checkout.payment_status==='created' && order.value.checkout.attempt_id===null)return 'cashier_cancelled'
  try {const local=intent.state();return local?.submitted===true && order.value?.checkout.payment_status==='created'?'unknown':order.value?.checkout.payment_status||'unknown'}
  catch{return 'unknown'}
}
function continuePaidOrder(){
  const current=order.value
  if(!visible || !current || effectiveStatus()!=='paid' || redirectedOrder===current.order_no)return
  const route=current.status==='待接单'?'/pages/boss/waiting/index'
    :['待开打','进行中'].includes(current.status)?'/pages/boss/in-progress/index'
    :current.status==='已完成'?'/pages/boss/payment/index':''
  if(route){redirectedOrder=current.order_no;replace(route,{orderNo:current.order_no})}
}
const statusText=computed(()=>({created:'待付款',cashier_cancelled:'已取消本次付款，可继续支付',processing:'原扣款处理中，请只查询',unknown:'结果未确认，请只查询原单',paid:'已完成支付',failed:'支付尝试已失败，当前单不可再试',refunded:'订单已取消，本地钱包退款已完成',cancelled:'订单已取消，退款状态待核对'}[effectiveStatus()]||'待核对'))
const remoteRefundText=computed(()=>({not_required:'无远端coin退款',prepared:'远端coin退款待发起，不代表微信已到账',dispatching:'远端coin退款处理中，不代表微信已到账',unknown:'远端coin退款结果未确认，微信是否到账请联系客服核对',succeeded:'远端coin退款已确认成功'} as Record<string,string>)[order.value?.checkout.refund?.remote_status||'']||'远端退款待核对')
const canPay=computed(()=>{try{const state=intent.state();return Boolean(commerceRelease.orderSurchargeQuoteSupported && visible && effectiveStatus()==='created' && !order.value?.checkout.refund && order.value?.checkout.attempt_id===null && state?.status==='created' && state.submitted===false && Number.isSafeInteger(state.required_players) && state.required_players===order.value?.checkout.surcharge?.required_players && !working.value)}catch{return false}})
const canRetryWechat=computed(()=>commerceRelease.orderSurchargeQuoteSupported && wechatAvailable && visible && !working.value && effectiveStatus()==='cashier_cancelled')
const showCancelOrder=computed(()=>commerceRelease.orderSurchargeQuoteSupported && visible && order.value?.status==='待支付' && !order.value.checkout.refund)
const cancelBlockReason=computed(()=>working.value?'正在处理，请稍候':canPay.value || effectiveStatus()==='cashier_cancelled'?'':'付款结果尚未确认，请先查询付款状态')
const cancelledUnpaid=computed(()=>order.value?.status==='已取消' && order.value.checkout.payment_status==='failed' && order.value.checkout.attempt_id===null && !order.value.checkout.refund)
function viewCancelledOrder(){if(cancelledUnpaid.value && order.value)replace('/pages/boss/payment/index',{orderNo:order.value.order_no})}
function invalidate(){stopConfirmation();visible=false;generation++;intent.close();order.value=null;working.value=false;retryWechatReady.value=false}
function sessionChanged(){invalidate();message.value='登录身份已变化，请重新查询本人原单'}
function expired(scope:string){if(scope==='token')sessionChanged()}
uni.$on(SESSION_CHANGED_EVENT,sessionChanged);uni.$on(SESSION_EXPIRED_EVENT,expired)
onScopeDispose(()=>{invalidate();uni.$off(SESSION_CHANGED_EVENT,sessionChanged);uni.$off(SESSION_EXPIRED_EVENT,expired)})
onLoad(q=>{key.value=String(q?.key||'')})
onShow(()=>{visible=true;generation++;refreshAttempts=0;intent=newIntent();order.value=null;message.value='';if(commerceRelease.orderSurchargeQuoteSupported)void refresh()})
onHide(invalidate);onUnload(invalidate)
async function refresh(){
  if(working.value || !commerceRelease.orderSurchargeQuoteSupported)return
  const g=generation,s=identity()
  try {const local=intent.state();if(!local||local.key!==key.value)throw new Error('页面标识与本人原单不一致，请从下单页查询')
    working.value=true;let result=await intent.refresh();if(!valid(g,s))return
    order.value=result
    if(intent.state()?.payment_method==='wechat' && (!['paid','failed','refunded','cancelled'].includes(effectiveStatus())
      || effectiveStatus()==='cancelled' && result.checkout.payment_status==='created' && result.checkout.attempt_id===null)){
      retryWechatReady.value=false
      const reconciled=await intent.reconcileWechat(loginCode);if(!valid(g,s))return
      retryWechatReady.value=reconciled?.retry_allowed===true
      result=await intent.refresh();if(!valid(g,s))return
    }
    order.value=result;const status=effectiveStatus();message.value=cancelledUnpaid.value?'订单已超时或取消，未付款。可以返回商城重新下单。':status==='cashier_cancelled'?'已确认本次微信付款关闭，未扣款。可以继续支付原订单。':status==='refunded'||status==='cancelled'?'该订单已取消；服务中或完单后复杂售后请通过现有客服渠道处理，不可重复付款。':status==='failed'?'原支付尝试已终止，当前单不能创建新attempt，请联系客服确认原单终结。':status==='paid'?'服务端确认已完成合计付款':status==='created'&&intent.state()?.submitted===false?'原单待支付，请核对合计后手动确认':'原扣款处理中或结果未知，不可重复付款，只能查询原attempt'
    continuePaidOrder()
  }catch(e:any){if(valid(g,s)){order.value=null;message.value=e?.statusCode===404?'原标识暂未查询到；404不保证未创建或未扣款，禁止换key重试，请联系客服。':getErrorMessage(e,'原单核对失败，请保留原标识')}}finally{if(valid(g,s)){working.value=false;scheduleConfirmation()}}
}
function loginCode(){return new Promise<string>((resolve,reject)=>uni.login({provider:'weixin',success:(r:any)=>r?.code?resolve(String(r.code)):reject(new Error('微信短期凭证获取失败')),fail:reject}))}
async function cancelUnpaidOrder(){
  if(!showCancelOrder.value || cancelBlockReason.value || !order.value)return
  const g=generation,s=identity(),orderNo=order.value.order_no,snapshot=JSON.stringify(order.value.checkout)
  working.value=true;stopConfirmation()
  try{
    const accepted=await confirm('取消后，原订单和整单加价将一并关闭。确定取消吗？','取消订单')
    if(!valid(g,s)||!accepted)return
    const checked=await intent.refresh()
    if(!valid(g,s))return
    order.value=checked
    if(intent.state()?.key!==key.value || checked.order_no!==orderNo || checked.status!=='待支付' || JSON.stringify(checked.checkout)!==snapshot)
      throw new Error('订单状态已变化，请重新查询后操作')
    let requestError:unknown=null
    try{await cancelSurchargeOrder(checked)}catch(e){requestError=e}
    if(!valid(g,s))return
    retryWechatReady.value=false
    // Even a lost POST response is resolved by the original-key GET, never by a new order.
    const result=await intent.refresh()
    if(!valid(g,s))return
    order.value=result
    if(cancelledUnpaid.value){message.value='订单已取消，未付款';viewCancelledOrder()}
    else message.value=requestError?getErrorMessage(requestError,'取消结果待确认，请查询原订单'):'服务端尚未确认取消，请查询原订单'
  }catch(e){if(valid(g,s))message.value=getErrorMessage(e,'取消结果待确认，请查询原订单')}
  finally{if(valid(g,s)){working.value=false;scheduleConfirmation()}}
}
function confirmPayment(){return processPayment(false)}
function retryWechatPayment(){return processPayment(true)}
async function processPayment(retry:boolean){
  if((retry?!canRetryWechat.value:!canPay.value)||working.value)return
  const g=generation,s=identity(),snapshot=JSON.stringify(order.value?.checkout),wechat=retry||payMethod.value==='wechat'
  let checkCancelled=false
  if(wechat&&!wechatAvailable)return
  working.value=true
  try {
    const accepted=await confirm(`确认一次支付 ¥${order.value!.checkout.total_amount_yuan}（原单 ¥${order.value!.checkout.base_amount_yuan} + 整单加价 ¥${order.value!.checkout.surcharge_amount_yuan}）？`,'合计付款')
    if(!valid(g,s)||!accepted||snapshot!==JSON.stringify(order.value?.checkout))return
    const code=await loginCode()
    if(!valid(g,s)||snapshot!==JSON.stringify(order.value?.checkout)||!code)return
    // Code only enters this request. No route, recovery record or retry stores it.
    if(wechat){
      retryWechatReady.value=false
      const params=await (retry?intent.retryWechat(code):intent.beginWechat(code))
      if(!valid(g,s))return
      await requestWechatVirtualPayment(params,{query:async()=>{
        if(!valid(g,s))throw new Error('页面已切换，请在原单继续核验')
        await intent.reconcileWechat(loginCode)
        if(!valid(g,s))throw new Error('页面已切换，请在原单继续核验')
        const checked=await intent.refresh()
        if(!valid(g,s))throw new Error('页面已切换，请在原单继续核验')
        return {status:checked.checkout.payment_status,order_status:checked.status}
      }})
    }else await intent.pay(code)
    if(!valid(g,s))return
    const result=await intent.refresh();if(!valid(g,s))return
    order.value=result;message.value=effectiveStatus()==='refunded'?'订单已取消，本地退款请按退款状态核对，不可重复付款':effectiveStatus()==='paid'?'服务端确认已完成合计付款':'已提交原单支付；处理中或结果未知，只查询原单，不要重复支付'
    continuePaidOrder()
  }catch(e:any){checkCancelled=Number(e?.errCode)===-2;if(valid(g,s))message.value=checkCancelled?'已取消微信收银台。原单仍保留，正在核对付款状态。':getErrorMessage(e,'支付结果待核对，请查询原单，不要重复支付')}finally{if(valid(g,s)){working.value=false;if(checkCancelled)await refresh();else scheduleConfirmation()}}
}
</script>
<style scoped>
.surcharge-payment{min-height:100vh;padding:26rpx;background:#f7f3ea;color:#172116;box-sizing:border-box}.card{margin-bottom:22rpx;padding:28rpx;border-radius:28rpx;background:#fffdf6;box-shadow:0 14rpx 36rpx rgba(39,61,42,.06)}.title{display:block;font-size:32rpx;font-weight:800}.hint{display:block;margin-top:16rpx;color:#687665;font-size:23rpx;line-height:1.6}.row{display:flex;justify-content:space-between;gap:20rpx;padding:15rpx 0;border-bottom:1rpx solid #e8efe6}.strong{color:#1f7c4b;font-weight:800}.warning{display:block;margin-bottom:18rpx;color:#9a6a16;font-size:24rpx}button{margin-top:22rpx;border-radius:32rpx;background:#1f7c4b;color:white;font-size:26rpx}button[disabled]{opacity:.5}
</style>
<style scoped>
button{display:flex;align-items:center;justify-content:center;width:100%;min-height:88rpx;padding:20rpx 24rpx;box-sizing:border-box;line-height:1.5}.payment-methods{margin-top:18rpx}.method{justify-content:space-between;background:#fffdf6;color:#53614f;border:2rpx solid #e3eade}.method.selected{background:#eef9ef;color:#1f7c4b;border-color:#1f7c4b}.method:after{border:0}
.cancel-order{background:#eef9ef;color:#1f7c4b;border:2rpx solid #dce8d8}.cancel-order:after{border:0}
</style>
