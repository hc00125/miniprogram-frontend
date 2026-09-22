<template>
  <view v-if="visible" class="surcharge-mask" @tap="close">
    <view class="surcharge-sheet" @tap.stop>
      <view class="surcharge-header">
        <text class="surcharge-title">整单额外加价</text>
        <button class="surcharge-close" aria-label="关闭加价面板" @tap="close">关闭</button>
      </view>
      <text class="surcharge-order">订单号 {{ state.order_no }}</text>
      <text class="surcharge-note">总人数 {{ state.player_count }} 人 · 不是每人加价</text>
      <scroll-view scroll-y class="surcharge-content">
        <text v-if="loading" class="surcharge-note">正在读取加价状态…</text>
        <text v-else-if="error" class="surcharge-warning">加价状态读取失败，请返回原订单查询；勿重复支付</text>
        <text v-else-if="!currentReadState" class="surcharge-note">加价状态尚未接入，请以原订单查询结果为准</text>
        <text v-if="blockedReason" class="surcharge-warning">{{ blockedReason }}</text>
        <text v-if="pending" class="surcharge-warning">{{ currentReadState?.payment_status === 'unknown' ? '付款结果未知' : '加价付款确认中' }}，请查询原加价单，勿重复支付</text>
        <button v-if="pending" data-action="query-original" class="surcharge-query" @tap="queryOriginal">返回原订单查询</button>
        <text class="surcharge-label">整单额外加价金额（钻石）</text>
        <view v-if="validPresets.length" class="surcharge-presets">
          <button v-for="amount in validPresets" :key="amount" data-action="preset" :disabled="pending || loading" @tap="inputAmount({ detail: { value: String(amount) } })">{{ amount }} 钻石</button>
        </view>
        <input :disabled="pending || loading" :value="amountInput" type="number" :maxlength="16" placeholder="请输入正整数钻额" aria-label="整单额外加价钻石" @input="inputAmount" />
        <text v-if="state.amount_diamonds === null" class="surcharge-note">请输入正整数钻额，不支持小数</text>
        <text class="surcharge-total">{{ state.amount_diamonds === null ? '拟扣款总额：待输入' : `拟扣款总额 ${state.amount_diamonds} 钻石` }}</text>
        <text class="surcharge-note">{{ balanceText }}</text>
        <text v-if="insufficient" class="surcharge-warning">余额不足；开放后充值须返回原订单重新确认，不会自动支付</text>
        <text v-if="returnedFromRecharge" class="surcharge-note">充值返回后请在原订单重新确认金额与资格，不会自动支付</text>
        <text class="surcharge-note">额外加价与原服务款分开；本面板不会扣款。</text>
      </scroll-view>
      <view class="surcharge-footer">
        <text class="surcharge-note">加价交易尚未接入，暂未开放</text>
        <button data-action="submit" class="surcharge-submit" :disabled="true">暂未开放</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import type { SurchargeReadState } from '@/api/surcharges'
import { createSurchargeIntent } from '@/utils/surchargeIntent'
const props = withDefaults(defineProps<{
  open: boolean; accountId: string; sessionKey: string; orderNo: string; playerCount: number
  balanceDiamonds?: number | null; readState?: SurchargeReadState | null
  loading?: boolean; error?: string; presets?: number[]; rechargeRevision?: number
}>(), { balanceDiamonds: null, readState: null, loading: false, error: '', presets: () => [], rechargeRevision: 0 })
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'query-original', target: { order_no: string; surcharge_no: string | null }): void
}>()
const intent = createSurchargeIntent()
const state = ref(intent.snapshot())
const amountInput = ref('')
const returnedFromRecharge = ref(false)
const update = () => { state.value = intent.snapshot() }
const visible = computed(() => props.open && Boolean(state.value.order_no) && state.value.account_id === props.accountId && state.value.session_key === props.sessionKey)
// Ignore stale host responses from another order/account/login. The host must
// tag replies using the session captured BEFORE requesting, not on completion.
const currentReadState = computed(() => {
  const read = props.readState
  return read && read.order_no === state.value.order_no && read.account_id === state.value.account_id
    && read.session_key === state.value.session_key ? read : null
})
const pending = computed(() => ['processing', 'unknown'].includes(currentReadState.value?.payment_status || ''))
const blockedReason = computed(() => currentReadState.value && !currentReadState.value.eligible
  ? currentReadState.value.blocked_reason || '当前订单不允许加价' : '')
function queryOriginal() {
  if (!visible.value || !pending.value) return
  emit('query-original', { order_no: state.value.order_no, surcharge_no: currentReadState.value?.surcharge_no || null })
}
const validPresets = computed(() => [...new Set(props.presets.filter(amount => Number.isSafeInteger(amount) && amount > 0))])
const balanceKnown = computed(() => typeof props.balanceDiamonds === 'number' && Number.isSafeInteger(props.balanceDiamonds) && props.balanceDiamonds >= 0)
const balanceText = computed(() => balanceKnown.value ? `可用余额 ${props.balanceDiamonds} 钻石` : '余额暂不可用')
const insufficient = computed(() => balanceKnown.value && state.value.amount_diamonds !== null && (props.balanceDiamonds as number) < state.value.amount_diamonds)
function close() { intent.close(); amountInput.value = ''; returnedFromRecharge.value = false; update(); emit('close') }
function inputAmount(event: { detail: { value: string } }) {
  if (pending.value || props.loading) return
  amountInput.value = event.detail.value
  intent.setAmount(amountInput.value); update()
}
watch(() => props.open, value => {
  returnedFromRecharge.value = false
  amountInput.value = ''
  if (value) intent.open(props.accountId, props.sessionKey, props.orderNo, props.playerCount)
  else intent.close()
  update()
}, { immediate: true, flush: 'sync' })
watch(() => [props.accountId, props.sessionKey, props.orderNo, props.playerCount], close, { flush: 'sync' })
watch(() => props.rechargeRevision, () => {
  if (!visible.value) return
  intent.rechargeReturned(); returnedFromRecharge.value = true; update()
}, { flush: 'sync' })
onScopeDispose(() => intent.close())
</script>

<style scoped>
.surcharge-mask { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-end; background: rgba(23,33,22,.4); }
.surcharge-sheet { width: 100%; max-height: 88vh; display: flex; flex-direction: column; box-sizing: border-box; border-radius: 32rpx 32rpx 0 0; background: #f7f3ea; color: #172116; padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); }
.surcharge-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.surcharge-title { font-size: 32rpx; font-weight: 800; }
.surcharge-close { display: flex; align-items: center; justify-content: center; min-width: 88rpx; min-height: 88rpx; background: transparent; font-size: 25rpx; }
.surcharge-order { font-size: 26rpx; overflow-wrap: anywhere; }
.surcharge-note { display: block; color: #687665; font-size: 24rpx; margin: 12rpx 0; }
.surcharge-content { height: 420rpx; min-height: 0; margin-top: 20rpx; }
.surcharge-label { display: block; font-size: 27rpx; margin: 16rpx 0; }
input { min-height: 88rpx; background: #fff; border-radius: 20rpx; padding: 0 24rpx; font-size: 30rpx; }
.surcharge-total { display: block; color: #1f7c4b; font-size: 29rpx; font-weight: 800; margin: 18rpx 0; }
.surcharge-warning { display: block; color: #9a6a16; font-size: 24rpx; margin: 12rpx 0; }
.surcharge-footer { flex-shrink: 0; }
.surcharge-submit { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 92rpx; padding: 20rpx; box-sizing: border-box; border-radius: 24rpx; background: #2f9b63; color: #fff; font-size: 29rpx; }
.surcharge-submit[disabled] { opacity: .56; background: #2f9b63; color: #fff; }
.surcharge-query { display: flex; align-items: center; justify-content: center; min-height: 88rpx; width: 100%; border-radius: 20rpx; background: #eef9ef; color: #1f7c4b; font-size: 26rpx; }
.surcharge-presets { display: flex; flex-wrap: wrap; gap: 16rpx; margin: 16rpx 0; }
.surcharge-presets button { display: flex; align-items: center; justify-content: center; min-height: 88rpx; padding: 16rpx 24rpx; border-radius: 20rpx; background: #eef9ef; color: #1f7c4b; font-size: 26rpx; }
button::after { border: 0; }
</style>
