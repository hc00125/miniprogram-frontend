<template>
  <view class="records-page">
    <view class="heading"><view><text class="title">我的冠名 / 包天</text><text class="muted">仅展示本人记录，支付结果以服务端为准</text></view><button class="refresh" data-action="refresh" :disabled="loading" @tap="loadPage(1)">刷新</button></view>
    <view v-if="!loggedIn" class="empty"><text>登录后查看本人的冠名与包天记录</text><button class="primary" data-action="login" @tap="openLogin">去登录</button></view>
    <view v-else-if="loading" class="empty">正在加载记录…</view>
    <view v-else-if="error" class="empty notice">{{ error }}</view>
    <view v-else-if="!records.length" class="empty">暂无冠名或包天记录</view>
    <view v-for="record in records" :key="record.purchase_no" class="record-card">
      <view class="row"><text class="record-title">{{ record.player_name }} · {{ record.package_name }}</text><text class="status" :class="{ paid: record.payment_status === 'paid' }">{{ patronagePaymentLabel(record.payment_status) }}</text></view>
      <text class="amount">{{ record.amount_diamonds }} 钻</text>
      <text class="muted">记录编号：{{ record.purchase_no }}</text>
      <text class="muted">创建时间：{{ displayDate(record.created_at) }}</text>
      <template v-if="record.payment_status === 'paid'">
        <text v-if="record.paid_at" class="muted">支付时间：{{ displayDate(record.paid_at) }}</text>
        <text v-if="record.starts_at" class="muted">冠名开始：{{ displayDate(record.starts_at) }}</text>
        <text v-if="record.expires_at" class="muted">冠名到期：{{ displayDate(record.expires_at) }}</text>
        <text v-if="record.bonus_naming_days" class="bonus">赠送 {{ record.bonus_naming_days }} 天冠名</text>
      </template>
      <text v-if="record.payment_status === 'unknown' || record.payment_status === 'processing'" class="notice">结果待确认，请刷新原记录查看，不要重复付款。</text>
    </view>
    <view v-if="loggedIn && !loading && !error" class="pagination">
      <button class="page-button" data-action="previous" :disabled="!hasPrevious" @tap="loadPage(page - 1)">上一页</button>
      <text class="muted">第 {{ page }} 页 · 共 {{ total }} 条</text>
      <button class="page-button" data-action="next" :disabled="!hasNext" @tap="loadPage(page + 1)">下一页</button>
    </view>
    <view class="record-card">
      <text class="muted">暂不提供自助退款，如有问题请找客服人工核实处理。</text>
      <button class="primary" data-action="support" @tap="openSupport">联系客服</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getPatronageRecords, patronagePaymentLabel, patronageSession, type PatronageRecord } from '@/api/patronage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { go } from '@/utils/nav'
const records = ref<PatronageRecord[]>([])
const page = ref(1), total = ref(0), hasNext = ref(false), hasPrevious = ref(false)
const loading = ref(false), loggedIn = ref(false), error = ref('')
let visible = false, generation = 0
function clear() { ++generation; records.value = []; total.value = 0; hasNext.value = false; hasPrevious.value = false; loading.value = false; error.value = '' }
function displayDate(value: string) { const d = new Date(value); return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '时间待确认' }
async function loadPage(target = 1) {
  if (!visible || loading.value || target < 1) return
  clear()
  const session = patronageSession(), current = generation
  loggedIn.value = Boolean(session)
  if (!session) return
  loading.value = true
  try {
    const result = await getPatronageRecords(target)
    if (!visible || current !== generation || session !== patronageSession()) return
    records.value = result.results; total.value = result.count; page.value = target
    hasNext.value = Boolean(result.next); hasPrevious.value = target > 1 && Boolean(result.previous)
  } catch {
    if (visible && current === generation && session === patronageSession()) error.value = '记录加载失败，请点击刷新重试'
  } finally { if (current === generation) loading.value = false }
}
function hide() { visible = false; clear() }
function expired(key: string) { if (key === 'token') { clear(); loggedIn.value = false } }
function openLogin() { go('/pages/client/login/index') }
function openSupport() { go('/pages/client/customer-service/index') }
onShow(() => { visible = true; clear(); return loadPage(1) })
onHide(hide); onUnload(hide)
uni.$on(SESSION_EXPIRED_EVENT, expired)
onUnmounted(() => { hide(); uni.$off(SESSION_EXPIRED_EVENT, expired) })
</script>
<style scoped>
.records-page{min-height:100vh;padding:28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));box-sizing:border-box;background:#f7f3ea;color:#172116}.heading,.row,.pagination{display:flex;align-items:center;justify-content:space-between;gap:18rpx}.heading{margin-bottom:24rpx}.title{display:block;font-size:34rpx;font-weight:800}.muted{display:block;margin-top:10rpx;font-size:22rpx;color:#687665;line-height:1.6;word-break:break-all}.refresh,.page-button{display:flex;align-items:center;justify-content:center;margin:0;padding:16rpx 20rpx;min-height:72rpx;box-sizing:border-box;border-radius:18rpx;background:#eaf5e6;color:#1f7c4b;font-size:24rpx;flex-shrink:0}.record-card,.empty{margin-bottom:20rpx;padding:28rpx;border-radius:26rpx;background:#fff;box-shadow:0 12rpx 26rpx rgba(39,61,42,.05)}.empty{color:#687665;font-size:26rpx;text-align:center;line-height:1.7}.record-title{font-size:28rpx;font-weight:800}.status{padding:8rpx 14rpx;border-radius:14rpx;background:#f7f3ea;color:#8f6535;font-size:22rpx;flex-shrink:0}.status.paid{color:#1f7c4b;background:#eaf5e6}.amount{display:block;margin:18rpx 0;color:#1f7c4b;font-size:34rpx;font-weight:800;word-break:break-all}.notice{display:block;margin-top:14rpx;color:#8f6535;font-size:24rpx;line-height:1.6}.bonus{display:block;margin-top:14rpx;color:#1f7c4b;font-size:24rpx}.pagination{margin-top:28rpx}.page-button[disabled]{background:#ecefe7;color:#9ba397}.primary{display:flex;align-items:center;justify-content:center;width:100%;min-height:84rpx;margin:24rpx 0 0;padding:20rpx;box-sizing:border-box;border-radius:22rpx;color:#fff;background:#1f7c4b;font-size:27rpx}button::after{border:0}
</style>
