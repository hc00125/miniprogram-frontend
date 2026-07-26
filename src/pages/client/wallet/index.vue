<template>
  <view class="wallet-page">
    <view class="hero-card">
      <view class="hero-top">
        <view>
          <text class="eyebrow">CLIENT WALLET</text>
          <text class="hero-title">我的钱包</text>
          <text class="hero-sub">余额可直接支付陪玩订单，充值实时到账</text>
        </view>
        <button class="refresh-btn" @tap="reloadAll">刷新</button>
      </view>
      <view class="balance-block">
        <text>钱包余额</text>
        <view v-if="!overviewUnavailable"><text class="currency">¥</text><text>{{ money(overview?.balance) }}</text></view>
        <view v-else class="balance-error" @tap="reloadAll"><text>加载失败 · 点击重试</text></view>
        <button class="recharge-btn" @tap="goRecharge">立即充值</button>
      </view>
      <view class="total-grid">
        <view><text>{{ overviewUnavailable ? '--' : `¥${money(overview?.recharged_total)}` }}</text><text>累计充值</text></view>
        <view><text>{{ overviewUnavailable ? '--' : `¥${money(overview?.spent_total)}` }}</text><text>累计消费</text></view>
      </view>
    </view>

    <view class="section-head">
      <text>交易明细</text>
      <text v-if="totalCount">共{{ totalCount }}笔</text>
    </view>

    <view class="list-section">
      <view v-for="item in transactions" :key="item.id" class="card record-card">
        <view class="record-main">
          <view class="record-icon" :class="isIncome(item) ? 'record-icon--in' : 'record-icon--out'">
            {{ entryTypeText(item.entry_type).slice(0, 1) }}
          </view>
          <view class="record-body">
            <view class="record-line">
              <text class="record-title">{{ entryTypeText(item.entry_type) }}</text>
              <text class="record-amount" :class="isIncome(item) ? 'amount-in' : 'amount-out'">{{ amountText(item) }}</text>
            </view>
            <view class="record-line sub">
              <text class="record-time">{{ dateTime(item.created_at) }}</text>
              <text class="record-balance">余额 ¥{{ money(item.balance_after) }}</text>
            </view>
            <text v-if="item.note" class="record-note">{{ item.note }}</text>
          </view>
        </view>
      </view>

      <view v-if="!loading && !transactions.length" class="empty-card">暂无交易记录，充值或消费后会在这里展示。</view>
      <view v-if="loadingMore" class="list-foot">正在加载更多...</view>
      <view v-else-if="!loading && transactions.length && !hasMore" class="list-foot">已显示全部交易记录</view>
    </view>

    <view v-if="loading" class="loading-state">钱包数据加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import {
  getWalletOverview,
  getWalletTransactions,
  type WalletOverview,
  type WalletTransactionItem
} from '@/api/wallet'
import { getErrorMessage, toast } from '@/utils/feedback'
import { go } from '@/utils/nav'

const PAGE_SIZE = 20

const ENTRY_TYPE_TEXT: Record<string, string> = {
  recharge: '充值',
  order_payment: '订单支付',
  refund_in: '退款入账',
  admin_adjust: '人工调整'
}

const overview = ref<WalletOverview | null>(null)
const overviewLoadFailed = ref(false)
const transactions = ref<WalletTransactionItem[]>([])
const totalCount = ref(0)
const page = ref(1)
const loading = ref(true)
const loadingMore = ref(false)

const hasMore = computed(() => transactions.value.length < totalCount.value)
/** overview 拉取失败且从未成功加载：余额区展示"加载失败/点击重试"而非 ¥0.00。 */
const overviewUnavailable = computed(() => overviewLoadFailed.value && !overview.value)

function money(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2)
}

function entryTypeText(type: string) {
  return ENTRY_TYPE_TEXT[type] || type || '其他'
}

function isIncome(item: WalletTransactionItem) {
  return Number(item.amount || 0) > 0
}

function amountText(item: WalletTransactionItem) {
  const value = Number(item.amount || 0)
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function goRecharge() {
  go('/pages/client/recharge/index')
}

async function reloadAll() {
  loading.value = true
  try {
    const [overviewResult, transactionResult] = await Promise.allSettled([
      getWalletOverview(),
      getWalletTransactions(1, PAGE_SIZE)
    ])
    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
      overviewLoadFailed.value = false
    } else {
      // 保留已知余额不清空；从未加载成功时余额区展示重试入口。
      overviewLoadFailed.value = true
    }
    if (transactionResult.status === 'fulfilled') {
      transactions.value = transactionResult.value.results || []
      totalCount.value = Number(transactionResult.value.count || 0)
      page.value = 1
    } else {
      toast(getErrorMessage(transactionResult.reason, '钱包数据加载失败'))
    }
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const result = await getWalletTransactions(nextPage, PAGE_SIZE)
    // 新流水会推移分页 offset，追加页可能包含已展示的记录：按 id 去重，避免重复 key 与重复展示。
    const rawResults = result.results || []
    const existingIds = new Set(transactions.value.map(item => item.id))
    const freshResults = rawResults.filter(item => !existingIds.has(item.id))
    transactions.value = [...transactions.value, ...freshResults]
    totalCount.value = Number(result.count || 0)
    page.value = nextPage
    // 服务器已无更多数据但本地条数因去重少于 count 时，收敛 hasMore，避免触底后反复空拉。
    if (!rawResults.length) totalCount.value = transactions.value.length
  } catch (error) {
    toast(getErrorMessage(error, '加载更多交易记录失败'))
  } finally {
    loadingMore.value = false
  }
}

onShow(async () => {
  await reloadAll()
})
onReachBottom(() => {
  void loadMore()
})
</script>

<style lang="scss" scoped>
.wallet-page { min-height: 100vh; padding: 22rpx 24rpx 80rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 10% 0%, rgba(216,161,68,.14), transparent 30%), radial-gradient(circle at 90% 14%, rgba(47,155,99,.12), transparent 28%), #f7f3ea; }
.hero-card, .card, .empty-card { border-radius: 28rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.hero-card { padding: 30rpx; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.hero-top > view { flex: 1; min-width: 0; }
.eyebrow, .hero-title, .hero-sub { display: block; }
.eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.hero-title { margin-top: 8rpx; font-size: 40rpx; font-weight: 900; }
.hero-sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 22rpx; line-height: 1.5; }
.refresh-btn { min-width: 110rpx; height: 58rpx; margin: 0; padding: 0 20rpx; border-radius: 999rpx; color: #fff; font-size: 23rpx; font-weight: 900; background: rgba(255,255,255,.14); }
.refresh-btn::after, .recharge-btn::after { border: none; }
.balance-block { margin-top: 28rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(255,255,255,.12); }
.balance-block > text { display: block; color: rgba(255,255,255,.72); font-size: 22rpx; }
.balance-block > view { display: flex; align-items: baseline; gap: 10rpx; margin-top: 8rpx; }
.balance-block > view text:last-child { font-size: 64rpx; line-height: 1; font-weight: 900; }
.balance-block > view.balance-error text:last-child { font-size: 30rpx; line-height: 1.4; font-weight: 900; color: rgba(255,255,255,.88); text-decoration: underline; }
.currency { font-size: 26rpx; font-weight: 900; }
.recharge-btn { width: 100%; height: 80rpx; margin-top: 22rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: #1f7c4b; font-size: 27rpx; font-weight: 900; background: #fff; }
.total-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 18rpx; }
.total-grid view { padding: 18rpx 12rpx; border-radius: 20rpx; text-align: center; background: rgba(255,255,255,.10); }
.total-grid text { display: block; }
.total-grid text:first-child { font-size: 29rpx; font-weight: 900; }
.total-grid text:last-child { margin-top: 5rpx; color: rgba(255,255,255,.66); font-size: 20rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 26rpx 6rpx 14rpx; }
.section-head text:first-child { font-size: 30rpx; font-weight: 900; }
.section-head text:last-child { color: #879083; font-size: 21rpx; }
.list-section { display: flex; flex-direction: column; gap: 16rpx; }
.record-card { padding: 22rpx 24rpx; }
.record-main { display: flex; align-items: flex-start; gap: 16rpx; }
.record-icon { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 20rpx; color: #fff; font-size: 27rpx; font-weight: 900; }
.record-icon--in { background: linear-gradient(135deg, #4fc083, #1f7c4b); }
.record-icon--out { background: linear-gradient(135deg, #d8a144, #a87520); }
.record-body { flex: 1; min-width: 0; }
.record-line { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.record-line.sub { margin-top: 8rpx; }
.record-title { font-size: 27rpx; font-weight: 900; }
.record-amount { font-size: 30rpx; font-weight: 900; }
.amount-in { color: #1f7c4b; }
.amount-out { color: #a13d35; }
.record-time { color: #9aa197; font-size: 20rpx; }
.record-balance { color: #879083; font-size: 20rpx; }
.record-note { display: block; margin-top: 8rpx; color: #687665; font-size: 21rpx; line-height: 1.5; word-break: break-all; }
.empty-card { padding: 60rpx 24rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
.list-foot { padding: 26rpx 0 10rpx; color: #9aa197; text-align: center; font-size: 21rpx; }
.loading-state { padding: 50rpx 20rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
</style>
