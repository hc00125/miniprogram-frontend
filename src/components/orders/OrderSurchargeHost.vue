<template>
  <view v-if="commerceRelease.orderSurchargeReadSupported" class="surcharge-read">
    <button data-action="refresh" :disabled="loading || !orderNo" @tap.stop="refresh()">{{ loading ? '读取中…' : '查看整单加价记录' }}</button>
    <text v-if="error" class="note">{{ error }}</text>
    <view v-if="data">
      <text class="note">已到账加价 {{ data.paid_diamonds }} 钻石</text>
      <text class="note">确认中 {{ data.processing_diamonds }} 钻石（未计入到账）</text>
      <text class="note">已退回 {{ data.refunded_diamonds }} 钻石</text>
      <text class="note">整单额外加价，不是每人加价</text>
      <text class="note">{{ data.disabled_reason || (data.can_submit ? '服务端付款接口允许提交，但前端仍受以下安全限制' : '服务端当前不允许新增加价') }}</text>
      <text v-if="data.blockers && data.blockers.length" class="note">服务端限制：{{ data.blockers.join(' · ') }}</text>
      <text class="note">{{ data.min_amount_diamonds != null && data.max_amount_diamonds != null ? `服务端范围 ${data.min_amount_diamonds} 至 ${data.max_amount_diamonds} 钻石` : '服务端未提供完整金额范围，不代表无限额' }}</text>
      <text class="note">尚无可用余额报价，不能以钱包总余额替代；加价分配与退款尚未完成，当前禁止新付款。</text>
      <text v-if="!data.records.length" class="note">暂无加价记录</text>
      <view v-for="record in data.records" :key="record.surcharge_no" class="record"><text>{{ record.surcharge_no }}</text><text>{{ record.amount_diamonds }} 钻石 · {{ statusLabel(record.payment_status) }}</text><button data-action="query-surcharge" :disabled="loading || detailBusy" @tap="queryPayment(record.surcharge_no)">只查询此加价原单</button></view>
      <text v-if="detailMessage" class="note">{{ detailMessage }}</text>
      <view class="paging"><button v-if="data.previous" :disabled="loading" @tap="refresh(page - 1)">上一页</button><button v-if="data.next" :disabled="loading" @tap="refresh(page + 1)">下一页</button></view>
      <button @tap="open = true">查看加价说明</button>
    </view>
    <OrderSurchargeSheet v-if="data" :open="open" :account-id="accountId" :session-key="sessionKey" :order-no="orderNo" :player-count="data.required_players" :read-state="readState" :presets="data.amount_options_diamonds" @close="open = false" @query-original="refresh(page)" />
  </view>
</template>
<script setup lang="ts">
import { commerceRelease } from '@/utils/commerceRelease'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { readOrderSurcharge, type OrderSurchargeRead } from '@/api/commerceRead'
import OrderSurchargeSheet from '@/components/orders/OrderSurchargeSheet.vue'
import { readSurchargePayment } from '@/api/surchargeCommerce'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const props = defineProps<{ orderNo: string }>()
const data = ref<OrderSurchargeRead | null>(null), loading = ref(false), error = ref(''), open = ref(false), page = ref(1)
const accountId = ref(''), sessionKey = ref(''), detailMessage = ref(''), detailBusy = ref(false)
let generation = 0, visible = true, activeToken = ''
function reset() { generation++; detailMessage.value = ''; detailBusy.value = false; data.value = null; loading.value = false; error.value = ''; open.value = false; page.value = 1; sessionKey.value = String(generation) }
function sync() {
  const token = String(uni.getStorageSync('token') || ''), profile = uni.getStorageSync('client_profile')
  const account = token && profile?.id ? String(profile.id) : ''
  if (activeToken !== token || accountId.value !== account) { reset(); activeToken = token; accountId.value = account }
}
async function refresh(target = 1) {
  sync()
  if (!commerceRelease.orderSurchargeReadSupported || !visible || loading.value || !props.orderNo) return
  if (!accountId.value) { error.value = '请先登录后查看本人加价记录'; return }
  const ticket = ++generation, order = props.orderNo, token = activeToken
  loading.value = true; error.value = ''; open.value = false; detailMessage.value = ''; detailBusy.value = false
  try {
    const result = await readOrderSurcharge(order, target)
    if (!visible || ticket !== generation || order !== props.orderNo || token !== String(uni.getStorageSync('token') || '')) return
    data.value = result; page.value = target
  } catch (e: any) {
    if (ticket !== generation || !visible || token !== String(uni.getStorageSync('token') || '')) return
    data.value = null; error.value = e?.code === 'LOGIN_REQUIRED' ? '请先登录' : '加价记录读取失败，请重试；勿重复支付'
  } finally { if (ticket === generation) loading.value = false }
}
async function queryPayment(no: string) {
  sync()
  if (!visible || !accountId.value || loading.value || detailBusy.value || !data.value?.records.some(r => r.surcharge_no === no)) return
  const ticket = generation, order = props.orderNo, token = activeToken
  detailBusy.value = true; detailMessage.value = ''
  try {
    const r = await readSurchargePayment(order, no)
    if (visible && ticket === generation && order === props.orderNo && token === String(uni.getStorageSync('token') || '')) detailMessage.value = `${r.surcharge_no} · ${statusLabel(r.payment_status)} · ${r.blockers.join(' · ')}`
  } catch (e: any) {
    if (visible && ticket === generation && token === String(uni.getStorageSync('token') || '')) detailMessage.value = e.statusCode === 404 ? '暂未查到，不代表未扣款；请人工核对原单' : '原单查询失败，请重试；勿重复支付'
  } finally { if (ticket === generation) detailBusy.value = false }
}
const readState = computed(() => {
  if (!data.value) return null
  const pending = data.value.records.find(r => ['processing', 'unknown'].includes(r.payment_status))
  return { account_id: accountId.value, session_key: sessionKey.value, order_no: data.value.order_no,
    eligible: false, blocked_reason: data.value.disabled_reason || '加价交易暂未开放', payment_status: pending?.payment_status as 'processing' | 'unknown' || null, surcharge_no: pending?.surcharge_no || null }
})
function statusLabel(status: string) { return ({created:'已创建',processing:'付款确认中，勿重复支付',unknown:'付款结果未知，请人工核对并刷新原订单记录',paid:'已付款',failed:'未完成',partially_refunded:'部分退回',refunded:'已退回'} as Record<string,string>)[status] || '状态待确认' }
function hide() { visible = false; reset() }
function expire(scope: string) { if (scope === 'token') { reset(); accountId.value = ''; activeToken = '' } }
onShow(() => { visible = true; sync() })
onHide(hide); onUnload(hide)
uni.$on(SESSION_EXPIRED_EVENT, expire)
onScopeDispose(() => { hide(); uni.$off(SESSION_EXPIRED_EVENT, expire) })
watch(() => props.orderNo, reset, { flush: 'sync' })
</script>
<style scoped>
.surcharge-read{margin:20rpx 0;padding:20rpx;border-radius:24rpx;background:#fff;color:#172116}.note{display:block;margin:12rpx 0;font-size:24rpx;color:#687665}.record{display:flex;flex-direction:column;gap:8rpx;padding:16rpx 0;font-size:24rpx;border-bottom:1rpx solid #eef3e9}.paging{display:flex;gap:12rpx}button{display:flex;width:100%;min-height:88rpx;align-items:center;justify-content:center;padding:16rpx;box-sizing:border-box;border-radius:20rpx;color:#1f7c4b;background:#eef9ef;font-size:25rpx}button::after{border:0}
</style>
