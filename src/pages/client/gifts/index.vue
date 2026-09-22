<template>
  <view class="page">
    <text class="title">我的礼物与记录</text>
    <text v-if="!authenticated" class="note">请登录后查看本人记录</text><button v-if="!authenticated" @tap="login">前往登录</button>
    <view v-else>
      <view class="tabs"><button v-for="tab in tabs" :key="tab.key" :data-action="tab.key" :class="{active:kind === tab.key}" :disabled="loading" @tap="change(tab.key)">{{ tab.label }}</button></view>
      <text v-if="kind === 'inventory'" class="note">按库存批次展示，不是商品汇总。库存专用报价缺失，禁止赠送；不会再次扣钻石。</text>
      <text v-if="kind === 'received'" class="note">收到礼物不自动变为可转赠库存。</text>
      <text v-if="kind === 'earnings'" class="note">权益冻结不等于已计提或可提现。待计提金额为0不是已结算零收益。</text>
      <view v-if="recoveryPending" class="card"><text>原购买结果待确认，勿重复支付</text><text>{{ recoveryNo || '已保存原幂等键，无单号时仍只读查询' }}</text><button data-action="recover" :disabled="recovering" @tap="recover">只查询原购买</button></view>
      <text v-if="recoveryMessage" class="note">{{ recoveryMessage }}</text>
      <button data-action="refresh" :disabled="loading" @tap="refresh(page)">{{ loading ? '读取中…' : '刷新本人记录' }}</button>
      <text v-if="error" class="warning">{{ error }}</text>
      <text v-if="data && !cards.length" class="note">本页暂无记录</text>
      <view v-for="card in cards" :key="card.id" class="card"><text class="card-title">{{ card.title }}</text><text v-for="(line,index) in card.lines" :key="index">{{ line }}</text></view>
      <view v-if="data" class="tabs"><button v-if="data.previous" data-action="previous" :disabled="loading" @tap="refresh(page - 1)">上一页</button><text>第 {{ page }} 页 · 共 {{ data.count }} 条</text><button v-if="data.next" data-action="next" :disabled="loading" @tap="refresh(page + 1)">下一页</button></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { readGiftRecords, earningLabel, paymentLabel, type RecordKind, type RecordPage } from '@/api/giftCommerce'
import { createGiftCheckout } from '@/utils/giftCheckout'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const tabs: {key:RecordKind;label:string}[]=[{key:'inventory',label:'库存批次'},{key:'purchase-records',label:'购买记录'},{key:'sent',label:'送出记录'},{key:'received',label:'收到记录'},{key:'earnings',label:'礼物权益'}]
const kind=ref<RecordKind>('inventory'),data=ref<RecordPage|null>(null),page=ref(1),loading=ref(false),error=ref(''),authenticated=ref(false)
const recoveryPending=ref(false),recoveryNo=ref(''),recoveryMessage=ref(''),recovering=ref(false)
let generation=0,visible=true,token='',controller:ReturnType<typeof createGiftCheckout>|null=null
const cards=computed(()=> (data.value?.results || []).map((r:any)=>{
  if(kind.value==='inventory')return{id:String(r.lot_id),title:`${r.name} · 批次 ${r.lot_id}`,lines:[`商品 ${r.gift_code}`,`剩余 ${r.remaining} 件 · 可用 ${r.available} 件`,({active:'有效',frozen:'冻结',revoked:'已撤销'} as Record<string,string>)[r.status] || r.status]}
  if(kind.value==='purchase-records')return{id:r.purchase_no,title:r.purchase_no,lines:[`${r.amount_diamonds} 钻石 · ${paymentLabel(r.payment_status)}`,r.blockers.join(' · ')]}
  if(kind.value==='earnings')return{id:String(r.id),title:`礼物权益 ${r.id}`,lines:[earningLabel(r),`状态 ${r.status}`,r.blockers.join(' · ')]}
  return{id:r.transfer_no,title:r.transfer_no,lines:[`商品 ${r.gift_code} · ${r.quantity} 件`,`状态 ${r.status}`,r.created_at]}
}))
function reset(){generation++;data.value=null;loading.value=false;error.value='';page.value=1;recoveryPending.value=false;recoveryNo.value='';recoveryMessage.value='';recovering.value=false;controller?.invalidate();controller=null}
function current(ticket:number){return visible && ticket===generation && token===String(uni.getStorageSync('token') || '')}
function login(){uni.navigateTo({url:'/pages/client/login/index'})}
function syncRecovery(){const r=controller?.recovery();recoveryPending.value=!!r && ['unknown','processing'].includes(r.state);recoveryNo.value=r?.business_no || ''}
async function refresh(target=1){
  if(!visible || loading.value || !authenticated.value)return
  const ticket=++generation,tab=kind.value;loading.value=true;error.value='';data.value=null
  try{const d=await readGiftRecords(tab,target);if(current(ticket)){data.value=d;page.value=target}}
  catch(e:any){if(current(ticket))error.value=e.detail || e.message || '读取失败，请重试；不能以此判断未扣款'}
  finally{if(current(ticket))loading.value=false}
}
function change(tab:RecordKind){if(loading.value)return;kind.value=tab;void refresh(1)}
async function recover(){
  if(recovering.value || !controller)return
  recovering.value=true;const ticket=generation
  try{const r=await controller.recover();if(current(ticket)){recoveryMessage.value=`${r.purchase_no} · ${paymentLabel(r.payment_status)}`;syncRecovery()}}
  catch(e:any){if(current(ticket))recoveryMessage.value=e.statusCode===404?'原交易暂未查到，不代表未扣款；保留原键，请人工核对':(e.detail || e.message || '查询失败，勿重复支付')}
  finally{if(current(ticket))recovering.value=false}
}
function hide(){visible=false;reset();authenticated.value=false}
function expired(scope:string){if(scope==='token')hide()}
onShow(()=>{
  visible=true;reset();token=String(uni.getStorageSync('token') || '');authenticated.value=!!token && !!uni.getStorageSync('client_profile')?.id
  if(!authenticated.value)return
  try{controller=createGiftCheckout();syncRecovery()}catch(e:any){recoveryMessage.value=e.message || '恢复记录不可用，请联系平台';recoveryPending.value=true}
  return refresh(1)
})
onHide(hide);onUnload(hide);uni.$on(SESSION_EXPIRED_EVENT,expired)
onScopeDispose(()=>{hide();uni.$off(SESSION_EXPIRED_EVENT,expired)})
</script>
<style scoped>
.page{min-height:100vh;padding:28rpx;background:#f7f3ea;color:#172116}.title{font-size:34rpx;font-weight:800}.tabs{display:flex;flex-wrap:wrap;align-items:center;gap:12rpx;margin:20rpx 0}.note,.warning{display:block;font-size:24rpx;line-height:1.6;margin:16rpx 0;color:#687665}.warning{color:#9a6a16}.card{display:flex;flex-direction:column;gap:12rpx;padding:24rpx;background:#fff;border-radius:24rpx;margin:16rpx 0;font-size:25rpx;overflow-wrap:anywhere}.card-title{font-weight:800}button{min-height:88rpx;padding:16rpx 24rpx;border-radius:20rpx;background:#eef9ef;color:#1f7c4b;font-size:24rpx}.active{background:#2f9b63;color:#fff}button::after{border:0}button[disabled]{opacity:.5}
</style>
