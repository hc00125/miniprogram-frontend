<template>
  <view class="mask" @tap="close"><view class="sheet" @tap.stop>
    <view class="heading"><text>背包赠送 · {{ recipient.name }}</text><button @tap="close">返回</button></view>
    <text class="note">使用已有礼物，不扣钻石；收到的礼物不会进入可转赠背包。</text>
    <text v-if="loading" class="note">正在读取背包…</text>
    <text v-if="error" class="warning">{{ error }}</text>
    <text v-if="message" class="note">{{ message }}</text>
    <view v-if="pending" class="recovery"><text>原赠送结果待确认，请勿重复赠送</text><text v-if="originalNo">{{ originalNo }}</text><button data-action="recover-stock" :disabled="busy" @tap="recover">查询原赠送</button></view>
    <view v-else>
      <scroll-view scroll-y class="content">
        <text v-if="!loading && !error && !items.length" class="note">背包暂无可用礼物，可返回购买入背包。</text>
        <button v-for="item in items" :key="item.gift_code" data-action="select-stock" class="stock" :class="{selected:selected?.gift_code === item.gift_code}" :disabled="busy || loading || item.available <= 0" @tap="select(item)"><text>{{ item.name }}</text><text>可用 {{ item.available }} 件</text></button>
      </scroll-view>
      <view class="tabs"><button v-if="previous" :disabled="busy || loading" @tap="loadStock(page-1)">上一页</button><button v-if="next" :disabled="busy || loading" @tap="loadStock(page+1)">下一页</button></view>
      <view v-if="selected" class="footer">
        <view class="tabs"><text>{{ selected.name }} × {{ quantity }}</text><button :disabled="busy || quantity <= 1" @tap="changeQuantity(-1)">−</button><button :disabled="busy || quantity >= selected.available || quantity >= (cap?.max_quantity || 0)" @tap="changeQuantity(1)">＋</button></view>
        <text v-if="quote">送给 {{ recipient.name }} {{ quote.quantity }} 件 · 不扣钻石</text>
        <text v-if="quote?.blockers.length" class="warning">{{ quote.blockers.join(' · ') }}</text>
        <button data-action="quote-stock" :disabled="busy || loading || !canQuote" @tap="requestQuote">确认库存与数量</button>
        <button v-if="quote" data-action="send-stock" class="primary" :disabled="busy || !canSend" @tap="send">确认赠送 {{ quote.quantity }} 件</button>
      </view>
      <text v-if="cap && !cap.inventory_transfer_enabled" class="warning">库存赠送暂未开放</text>
    </view>
  </view></view>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onHide, onUnload } from '@dcloudio/uni-app'
import type { GiftRecipient } from '@/api/gifts'
import { readGiftCapabilities, readGiftRecords, type Capabilities, type InventoryQuote, type Lot } from '@/api/giftCommerce'
import { createInventorySend, inventoryGate } from '@/utils/giftInventorySend'
const props=defineProps<{recipient:GiftRecipient}>(),emit=defineEmits<{(e:'close'):void}>()
const controller=createInventorySend(),cap=ref<Capabilities|null>(null),lots=ref<Lot[]>([]),selected=ref<{gift_code:string;name:string;available:number}|null>(null)
const quote=ref<InventoryQuote|null>(null),quantity=ref(1),loading=ref(false),busy=ref(false),error=ref(''),message=ref(''),pending=ref(false),originalNo=ref('')
const page=ref(1),next=ref(false),previous=ref(false),token=String(uni.getStorageSync('token') || '')
let alive=true,generation=0
const current=(ticket:number)=>alive && ticket===generation && token===String(uni.getStorageSync('token') || '')
const items=computed(()=>{const grouped=new Map<string,{gift_code:string;name:string;available:number}>();for(const lot of lots.value){const old=grouped.get(lot.gift_code);grouped.set(lot.gift_code,{gift_code:lot.gift_code,name:lot.name,available:(old?.available || 0)+lot.available})}return [...grouped.values()]})
const choice=()=>({gift_code:selected.value?.gift_code || '',quantity:quantity.value,recipient_id:Number(props.recipient.id)})
const canQuote=computed(()=>{try{if(!selected.value || !cap.value)return false;inventoryGate(choice(),cap.value);return true}catch{return false}})
const canSend=computed(()=>canQuote.value && !!quote.value && quote.value.can_submit && !quote.value.blockers.length && quote.value.payment_diamonds===0 && quote.value.available_quantity>=quantity.value)
function invalidate(){generation++;controller.invalidate();quote.value=null}
function close(){alive=false;invalidate();emit('close')}
function syncRecovery(){const r=controller.recovery();pending.value=!!r && ['unknown','processing'].includes(r.state);originalNo.value=r?.business_no || ''}
function select(item:{gift_code:string;name:string;available:number}){if(busy.value || loading.value || pending.value)return;invalidate();selected.value={...item};quantity.value=1;message.value=''}
function changeQuantity(delta:number){if(busy.value)return;const value=quantity.value+delta;if(value<1 || value>(selected.value?.available || 0) || value>(cap.value?.max_quantity || 0))return;invalidate();quantity.value=value}
async function loadStock(target=1){
  invalidate();selected.value=null;loading.value=true;error.value='';const ticket=generation
  try{const d=await readGiftRecords('inventory',target);if(current(ticket)){lots.value=d.results as Lot[];page.value=target;next.value=!!d.next;previous.value=!!d.previous}}
  catch(e:any){if(current(ticket)){lots.value=[];error.value=e.detail || e.message || '背包读取失败'}}
  finally{if(current(ticket))loading.value=false}
}
async function init(){
  const ticket=generation;loading.value=true
  try{syncRecovery();const d=await readGiftCapabilities(Number(props.recipient.id));if(!current(ticket))return;cap.value=d;if(!pending.value && d.inventory_read)await loadStock()}
  catch(e:any){if(current(ticket))error.value=e.detail || e.message || '暂无法读取赠送能力'}
  finally{if(alive)loading.value=false}
}
async function requestQuote(){
  if(busy.value || !canQuote.value || !cap.value)return
  invalidate();busy.value=true;error.value='';const ticket=generation
  try{const d=await controller.quote(choice(),cap.value);if(current(ticket)){quote.value=d;if(selected.value)selected.value.available=d.available_quantity}}
  catch(e:any){if(current(ticket))error.value=e.detail || e.message || '库存确认失败'}
  finally{if(current(ticket))busy.value=false}
}
async function send(){
  if(busy.value || !canSend.value || !quote.value || !cap.value)return
  busy.value=true;error.value='';const ticket=generation
  try{const d=await controller.send(quote.value,cap.value);if(current(ticket)){syncRecovery();quote.value=null;message.value=d.status==='delivered'?'赠送成功，已更新背包':`原赠送状态：${d.status}`;if(!pending.value){busy.value=false;await loadStock(page.value)}}}
  catch(e:any){if(current(ticket)){quote.value=null;error.value=(e.detail || e.message || '赠送响应未确认')+'；请查询原赠送，勿重复提交';syncRecovery()}}
  finally{if(alive)busy.value=false}
}
async function recover(){
  if(busy.value)return;busy.value=true;error.value='';const ticket=generation
  try{const d=await controller.recover();if(current(ticket)){syncRecovery();message.value=d.status==='delivered'?'赠送成功，已更新背包':`原赠送状态：${d.status}`;if(!pending.value){busy.value=false;await loadStock(page.value)}}}
  catch(e:any){if(current(ticket))error.value=e.statusCode===404?'原赠送暂未查到，请保留原记录并联系客服，不要重复赠送':e.detail || e.message || '查询失败，请保留原赠送记录'}
  finally{if(alive)busy.value=false}
}
onHide(close);onUnload(close);onScopeDispose(()=>{alive=false;invalidate()});void init()
</script>
<style scoped>
.mask{position:fixed;inset:0;z-index:1001;display:flex;align-items:flex-end;background:rgba(23,33,22,.4)}.sheet{width:100%;box-sizing:border-box;max-height:90vh;overflow:auto;padding:24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#f7f3ea;color:#172116}.heading,.tabs,.stock{display:flex;align-items:center;justify-content:space-between;gap:16rpx}.heading{font-weight:800;font-size:30rpx}.note,.warning,.recovery text{display:block;font-size:24rpx;line-height:1.5;margin:12rpx 0;color:#687665}.warning{color:#9a6a16}.content{height:300rpx}.footer{display:flex;flex-direction:column;gap:12rpx;font-size:26rpx}button{min-height:88rpx;padding:16rpx 24rpx;margin:8rpx 0;border-radius:22rpx;background:#eef9ef;color:#1f7c4b;font-size:25rpx}button::after{border:0}button[disabled]{opacity:.5}.stock{width:100%;box-sizing:border-box}.selected{box-shadow:inset 0 0 0 2rpx #1f7c4b}.primary{display:flex;justify-content:center;background:#1f7c4b;color:#fff;width:100%}
</style>
