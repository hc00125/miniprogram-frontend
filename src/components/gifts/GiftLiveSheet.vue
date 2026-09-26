<template>
  <GiftInventorySend v-if="inventoryOpen" :recipient="recipient" @close="inventoryOpen = false" />
  <view v-else class="mask" @tap="close"><view class="sheet" @tap.stop>
    <view class="heading"><text>{{ browseOnly ? `礼物目录 · 对象 ${recipient.name}` : mode === 'direct' ? `送给 ${recipient.name}` : '购买入背包（不会赠送）' }}</text><button @tap="close">关闭</button></view>
    <view class="tabs"><button @tap="records">我的礼物</button><button v-if="cap?.inventory_read" data-action="open-stock" :disabled="busy || loading || pending" @tap="openStock">背包赠送</button><button v-if="!browseOnly" :disabled="busy || loading || pending" @tap="changeMode('direct')">购买后赠送</button><button v-if="!browseOnly" data-action="buy-inventory" :disabled="busy || loading || pending" @tap="changeMode('inventory')">购买入背包</button></view>
    <text v-if="cap && browseOnly && !cap.inventory_transfer_enabled" class="note">当前仅浏览，购买/赠送未开放</text>
    <text v-if="!browseOnly && !cap?.inventory_quote_supported" class="note">库存专用报价尚未提供：库存仅可查看，禁止赠送；收到礼物不进入可转赠背包。</text>
    <text v-else-if="!browseOnly" class="note">购买使用钻石；背包赠送不重复扣钻。</text>
    <text v-if="loading" class="note">正在加载礼物…</text>
    <text v-if="error" class="warning">{{ error }}</text>
    <text v-if="cap && !browseOnly" class="note">{{ cap.blockers.join(' · ') || (cap.purchase_enabled ? '按服务端限制报价，付款时再次校验' : '服务端未开放购买') }}</text>
    <view v-if="pending" class="recovery"><text>{{ result ? paymentLabel(result.payment_status) : '原交易待核对，勿重复支付' }}</text><text v-if="originalNo">原单 {{ originalNo }}</text><button data-action="recover" :disabled="busy" @tap="recover">只查询原交易</button><text>未找到记录不代表未扣款；结果未知请联系客服人工核对。</text></view>
    <scroll-view v-else scroll-y class="content">
      <GiftGrid v-if="!loading && !error && cap?.catalog_read" empty-text="暂无上架礼物，请管理员配置" :items="catalog" :selected-code="selected ? selected.code : ''" @select="select" />
      <view class="tabs"><button v-if="previous" :disabled="loading" @tap="loadCatalog(page - 1)">上一页</button><button v-if="next" :disabled="loading" @tap="loadCatalog(page + 1)">下一页</button></view>
    </scroll-view>
    <view v-if="!pending && !browseOnly" class="footer">
      <view class="tabs"><text>数量 {{ quantity }}</text><button :disabled="busy || quantity <= 1" @tap="changeQuantity(-1)">−</button><button :disabled="busy || !selected || !cap || !cap.max_quantity || quantity >= cap.max_quantity" @tap="changeQuantity(1)">＋</button></view>
      <text v-if="selected">目录合计 {{ selected.price_diamonds * quantity }} 钻石（以报价为准）</text>
      <text v-if="quote">服务端报价 {{ quote.total_diamonds }} 钻石 · 可用余额 {{ quote.available_diamonds }} 钻石</text>
      <text v-if="quote && !hasDiamonds(quote.available_diamonds, quote.total_diamonds)" class="warning">可用余额不足；充值后须重新报价并确认，不会自动支付。</text>
      <text v-if="quote && quote.blockers.length" class="warning">{{ quote.blockers.join(' · ') }}</text>
      <button data-action="quote" :disabled="busy || !canQuote" @tap="requestQuote">重新报价</button>
      <button v-if="quote" data-action="pay" class="primary" :disabled="busy || !canPay" @tap="pay">{{ quote.total_diamonds === 0 ? (mode === 'direct' ? '确认免费赠送' : '免费领取入背包') : `确认支付 ${quote.total_diamonds} 钻石${mode === 'direct' ? '并赠送' : '购买入背包'}` }}</button>
      <button v-if="quote && !hasDiamonds(quote.available_diamonds, quote.total_diamonds)" @tap="recharge">前往充值（返回不自动支付）</button>
      <text v-if="result">{{ paymentLabel(result.payment_status, result.amount_diamonds) }} · {{ result.purchase_no }}</text>
    </view>
    <button @tap="records">查看库存批次、购买与送收记录</button>
  </view></view>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onHide, onUnload } from '@dcloudio/uni-app'
import GiftGrid from '@/components/gifts/GiftGrid.vue'
import GiftInventorySend from '@/components/gifts/GiftInventorySend.vue'
import { getGiftCatalog, type GiftCatalogItem, type GiftRecipient } from '@/api/gifts'
import { readGiftCapabilities, hasDiamonds, paymentLabel, type Capabilities, type GiftQuote, type Purchase } from '@/api/giftCommerce'
import { createGiftCheckout, giftGate } from '@/utils/giftCheckout'
const props = defineProps<{recipient: GiftRecipient}>()
const emit = defineEmits<{(e:'close'):void}>()
const controller = createGiftCheckout(), cap = ref<Capabilities|null>(null), catalog = ref<GiftCatalogItem[]>([])
const selected = ref<GiftCatalogItem|null>(null), quantity = ref(1), quote = ref<GiftQuote|null>(null), result = ref<Purchase|null>(null)
const loading = ref(false), busy = ref(false), error = ref(''), pending = ref(false), originalNo = ref('')
const inventoryOpen = ref(false)
const page = ref(1), next = ref(false), previous = ref(false), mode = ref<'direct'|'inventory'>('direct')
let alive = true, generation = 0
const token = String(uni.getStorageSync('token') || '')
const current = (ticket: number) => alive && ticket === generation && token === String(uni.getStorageSync('token') || '')
const choice = () => ({gift_code:selected.value?.code || '',quantity:quantity.value,mode:mode.value,...(mode.value === 'direct' ? {recipient_id:Number(props.recipient.id)} : {})})
const browseOnly = computed(() => !(cap.value?.purchase_enabled && cap.value?.purchase_supported && cap.value?.quote_supported))
const canQuote = computed(() => { try { if (!selected.value || !cap.value) return false; giftGate(choice(),cap.value); return true } catch { return false } })
const canPay = computed(() => canQuote.value && !!quote.value && quote.value.can_submit && !quote.value.blockers.length && hasDiamonds(quote.value.available_diamonds,quote.value.total_diamonds) && quote.value.total_diamonds <= (cap.value?.max_diamonds || 0))
function invalidate() { generation++; controller.invalidate(); quote.value = null }
function syncRecovery() { const r = controller.recovery(); pending.value = !!r && ['unknown','processing'].includes(r.state); originalNo.value = r?.business_no || '' }
function close() { alive = false; invalidate(); emit('close') }
function openStock() { if(busy.value || loading.value || pending.value)return; invalidate(); inventoryOpen.value=true }
function records() { close(); uni.navigateTo({url:'/pages/client/gifts/index'}) }
function recharge() { close(); uni.navigateTo({url:'/pages/client/recharge/index'}) }
function select(item: GiftCatalogItem) { if (busy.value || pending.value) return; invalidate(); selected.value = item; quantity.value = 1; result.value = null }
async function changeMode(value:'direct'|'inventory') { if(busy.value || loading.value || pending.value || mode.value===value)return; invalidate(); mode.value=value; selected.value=null; quantity.value=1; cap.value=null; catalog.value=[]; error.value=''; result.value=null; await init() }
function changeQuantity(delta: number) { if (busy.value) return; const n=quantity.value+delta; if (n<1 || n>(cap.value?.max_quantity || 1)) return; invalidate(); quantity.value=n }
async function loadCatalog(target=1) {
  invalidate(); selected.value=null; loading.value=true; error.value=''; const ticket=generation
  try { const d=await getGiftCatalog(target); if(current(ticket)){ catalog.value=d.results;page.value=target;next.value=!!d.next;previous.value=!!d.previous } }
  catch(e:any){if(current(ticket)){catalog.value=[];error.value=e.detail || e.message || '目录读取失败'}}
  finally{if(current(ticket))loading.value=false}
}
async function init() {
  const ticket=generation;loading.value=true
  try { syncRecovery(); const d=await readGiftCapabilities(mode.value === 'direct' ? Number(props.recipient.id) : undefined); if(!current(ticket))return; cap.value=d; if(d.catalog_read)await loadCatalog() }
  catch(e:any){if(current(ticket))error.value=e.detail || e.message || '能力读取失败，禁止交易'}
  finally{if(alive)loading.value=false}
}
async function requestQuote() {
  if(busy.value || !canQuote.value || !cap.value)return
  invalidate();busy.value=true;error.value='';const ticket=generation
  try { const d=await controller.quote(choice(),cap.value);if(current(ticket))quote.value=d }
  catch(e:any){if(current(ticket))error.value=e.detail || e.message || '报价失败，请重新确认'}
  finally{if(current(ticket))busy.value=false}
}
async function pay() {
  if(busy.value || !canPay.value || !quote.value || !cap.value)return
  busy.value=true;error.value='';const ticket=generation
  try { const d=await controller.pay(quote.value,cap.value);if(current(ticket)){result.value=d;quote.value=null;pending.value=['created','processing','unknown'].includes(d.payment_status);originalNo.value=d.purchase_no;syncRecovery()} }
  catch(e:any){if(current(ticket)){quote.value=null;error.value=(e.detail || e.message || '付款响应未确认')+'；请查询原交易，勿重复支付';syncRecovery()} }
  finally{if(current(ticket))busy.value=false}
}
async function recover() {
  if(busy.value)return;busy.value=true;error.value='';const ticket=generation
  try{const d=await controller.recover();if(current(ticket)){result.value=d;pending.value=['created','processing','unknown'].includes(d.payment_status);originalNo.value=d.purchase_no;syncRecovery()}}
  catch(e:any){if(current(ticket))error.value=e.statusCode===404?'原交易暂未查到，不代表未扣款；保留原键，请人工核对':(e.detail || e.message || '查询失败；保留原交易')}
  finally{if(current(ticket))busy.value=false}
}
// Invalidate synchronously at page hide, before Vue's deferred unmount.
onHide(close); onUnload(close)
onScopeDispose(()=>{alive=false;invalidate()})
void init()
</script>
<style scoped>
.mask{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;background:rgba(23,33,22,.4)}.sheet{width:100%;max-height:90vh;overflow:auto;padding:24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#f7f3ea;color:#172116}.heading,.tabs{display:flex;align-items:center;justify-content:space-between;gap:16rpx}.heading{font-weight:800;font-size:30rpx}.note,.warning,.recovery text{display:block;font-size:24rpx;line-height:1.5;margin:12rpx 0;color:#687665}.warning{color:#9a6a16}.content{height:300rpx}.footer{display:flex;flex-direction:column;gap:12rpx;font-size:26rpx}button{min-height:88rpx;padding:16rpx 24rpx;margin:8rpx 0;border-radius:22rpx;background:#eef9ef;color:#1f7c4b;font-size:25rpx}button::after{border:0}button[disabled]{opacity:.5}.primary{background:#2f9b63;color:#fff;width:100%}
</style>
