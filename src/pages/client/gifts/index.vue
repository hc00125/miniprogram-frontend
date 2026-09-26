<template>
  <view class="page">
    <text class="title">我的礼物与记录</text>
    <text v-if="!authenticated" class="note">请登录后查看本人记录</text><button v-if="!authenticated" @tap="login">前往登录</button>
    <view v-else>
      <text class="note">本页只读展示本人记录；购买或背包赠送，请在陪玩页面打开送礼面板。</text>
      <view class="tabs"><button v-for="tab in tabs" :key="tab.key" :data-action="tab.key" :class="{active:kind === tab.key}" :disabled="loading" @tap="change(tab.key)">{{ tab.label }}</button></view>
      <text v-if="kind === 'inventory'" class="note">按购买批次展示；送出时使用已有库存，不会再次扣钻石。</text>
      <text v-if="kind === 'received'" class="note">收到礼物不自动变为可转赠库存。</text>
      <text v-if="kind === 'earnings'" class="note">礼物净收益以鱼干即时入钱包，沿用收益中心已有提现。这里显示入账记录，当前可提现余额以钱包为准。</text>
      <view v-if="recoveryPending" class="card"><text>原购买结果待确认，勿重复支付</text><text>{{ recoveryNo || '已保存原幂等键，无单号时仍只读查询' }}</text><button data-action="recover" :disabled="recovering" @tap="recover">只查询原购买</button></view>
      <text v-if="recoveryMessage" class="note">{{ recoveryMessage }}</text>
      <button data-action="refresh" :disabled="loading" @tap="refresh(page)">{{ loading ? '读取中…' : '刷新本人记录' }}</button>
      <text v-if="error" class="warning">{{ error }}</text>
      <text v-if="data && !cards.length" class="note">本页暂无记录</text>
      <view v-for="card in cards" :key="card.id" class="card"><view class="gift-heading"><image v-if="card.image && !failedImages[card.image]" class="gift-image" :src="card.image" mode="aspectFit" @error="failedImages[card.image] = true" /><view v-else class="gift-placeholder">礼</view><text class="card-title">{{ card.title }}</text></view><text v-for="(line,index) in card.lines" :key="index">{{ line }}</text><text v-if="card.reference" class="record-reference">{{ card.reference }}</text></view>
      <view v-if="data" class="tabs"><button v-if="data.previous" data-action="previous" :disabled="loading" @tap="refresh(page - 1)">上一页</button><text>第 {{ page }} 页 · 共 {{ data.count }} 条</text><button v-if="data.next" data-action="next" :disabled="loading" @tap="refresh(page + 1)">下一页</button></view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { readGiftRecords, earningLabel, paymentLabel, type RecordKind, type RecordPage } from '@/api/giftCommerce'
import { createGiftCheckout } from '@/utils/giftCheckout'
import { giftTransferCard, giftInventoryCard, giftEarningCard, giftPurchaseCard } from '@/utils/giftRecordPresentation'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const tabs: {key:RecordKind;label:string}[]=[{key:'inventory',label:'我的背包'},{key:'purchase-records',label:'购买记录'},{key:'sent',label:'送出记录'},{key:'received',label:'收到记录'},{key:'earnings',label:'礼物收益'}]
const kind=ref<RecordKind>('inventory'),data=ref<RecordPage|null>(null),page=ref(1),loading=ref(false),error=ref(''),authenticated=ref(false)
const recoveryPending=ref(false),recoveryNo=ref(''),recoveryMessage=ref(''),recovering=ref(false)
const failedImages=ref<Record<string,boolean>>({})
let generation=0,visible=true,token='',controller:ReturnType<typeof createGiftCheckout>|null=null
const cards=computed(()=> (data.value?.results || []).map((r:any)=>{
  if(kind.value==='inventory')return giftInventoryCard(r)
  if(kind.value==='purchase-records')return giftPurchaseCard(r)
  if(kind.value==='earnings')return giftEarningCard(r)
  return giftTransferCard(r)
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
  try{const r=await controller.recover();if(current(ticket)){recoveryMessage.value=`${r.purchase_no} · ${paymentLabel(r.payment_status,r.amount_diamonds)}`;syncRecovery()}}
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
.page{min-height:100vh;padding:28rpx;background:#f7f3ea;color:#172116}.title{font-size:34rpx;font-weight:800}.tabs{display:flex;flex-wrap:wrap;align-items:center;gap:12rpx;margin:20rpx 0}.note,.warning{display:block;font-size:24rpx;line-height:1.6;margin:16rpx 0;color:#687665}.warning{color:#9a6a16}.card{display:flex;flex-direction:column;gap:12rpx;padding:24rpx;background:#fff;border-radius:24rpx;margin:16rpx 0;font-size:25rpx;overflow-wrap:anywhere}.gift-heading{display:flex;align-items:center;gap:20rpx}.gift-image,.gift-placeholder{width:88rpx;height:88rpx;flex-shrink:0;border-radius:20rpx;background:#eef9ef}.gift-placeholder{display:flex;align-items:center;justify-content:center;color:#1f7c4b;font-size:34rpx}.card-title{font-weight:800}.record-reference{font-size:21rpx;color:#7a8477;line-height:1.5;padding-top:12rpx;border-top:1rpx solid #eef0e9;word-break:break-all}button{min-height:88rpx;padding:16rpx 24rpx;border-radius:20rpx;background:#eef9ef;color:#1f7c4b;font-size:24rpx}.active{background:#2f9b63;color:#fff}button::after{border:0}button[disabled]{opacity:.5}
</style>
