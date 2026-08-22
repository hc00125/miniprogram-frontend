<template>
  <view class="growth-page">
    <view class="summary-card">
      <text class="summary-eyebrow">VIP GROWTH</text>
      <text class="summary-title">累计成长钻石</text>
      <view class="summary-value"><text>💎</text><text>{{ diamonds(growthDiamonds) }}</text></view>
      <text class="summary-tip">只统计已支付且已完成的有效消费；成功退款后会扣回对应成长钻石。</text>
    </view>

    <view class="section-head">
      <text>累计钻石记录</text>
      <text v-if="totalCount">共{{ totalCount }}笔</text>
    </view>

    <view class="record-list">
      <view v-for="item in records" :key="item.id" class="record-card">
        <view class="record-icon" :class="Number(item.amount_diamonds) >= 0 ? 'record-icon--plus' : 'record-icon--minus'">
          {{ recordIcon(item) }}
        </view>
        <view class="record-main">
          <view class="record-line">
            <text class="record-title">{{ item.source_type_text || recordTypeText(item.source_type) }}</text>
            <text class="record-amount" :class="Number(item.amount_diamonds) >= 0 ? 'amount-plus' : 'amount-minus'">{{ amountText(item.amount_diamonds) }}</text>
          </view>
          <view class="record-line record-line--sub">
            <text>{{ dateTime(item.created_at) }}</text>
            <text>成长余额 💎{{ diamonds(item.balance_after_diamonds) }}</text>
          </view>
          <text v-if="item.order_no" class="record-order">订单号：{{ item.order_no }}</text>
          <text v-if="item.reason" class="record-note">{{ item.reason }}</text>
        </view>
      </view>

      <view v-if="!loading && !records.length" class="empty-card">暂无成长钻石记录。完成有效消费后会在这里展示。</view>
      <view v-if="loadingMore" class="list-foot">正在加载更多...</view>
      <view v-else-if="!loading && records.length && !hasMore" class="list-foot">已显示全部成长记录</view>
    </view>

    <view v-if="loading" class="loading-state">成长钻石记录加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { getGrowthRecords, type GrowthRecordItem } from '@/api/consumption'
import { formatDiamonds } from '@/utils/diamonds'
import { getErrorMessage, toast } from '@/utils/feedback'

const PAGE_SIZE = 20

const records = ref<GrowthRecordItem[]>([])
const totalCount = ref(0)
const growthDiamonds = ref(0)
const page = ref(1)
const loading = ref(true)
const loadingMore = ref(false)

const hasMore = computed(() => records.value.length < totalCount.value)

function diamonds(value: unknown) {
  try {
    return formatDiamonds(value ?? 0)
  } catch {
    return '--'
  }
}

function recordTypeText(type: string) {
  if (type === 'order') return '订单消费'
  if (type === 'refund') return '退款扣减'
  if (type === 'manual') return '人工调整'
  if (type === 'backfill') return '历史补录'
  return '成长调整'
}

function recordIcon(item: GrowthRecordItem) {
  if (item.source_type === 'refund') return '退'
  if (item.source_type === 'manual') return '调'
  if (item.source_type === 'backfill') return '补'
  return '消'
}

function amountText(value: unknown) {
  const amount = Number(value || 0)
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${prefix}💎${diamonds(Math.abs(amount))}`
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function reload() {
  loading.value = true
  try {
    const result = await getGrowthRecords(1, PAGE_SIZE)
    records.value = result.results || []
    totalCount.value = Number(result.count || 0)
    growthDiamonds.value = Number(result.growth_diamonds || 0)
    page.value = 1
  } catch (error) {
    toast(getErrorMessage(error, '成长钻石记录加载失败'))
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const result = await getGrowthRecords(nextPage, PAGE_SIZE)
    const existingIds = new Set(records.value.map(item => item.id))
    const fresh = (result.results || []).filter(item => !existingIds.has(item.id))
    records.value = [...records.value, ...fresh]
    totalCount.value = Number(result.count || 0)
    growthDiamonds.value = Number(result.growth_diamonds || growthDiamonds.value)
    page.value = nextPage
  } catch (error) {
    toast(getErrorMessage(error, '加载更多成长记录失败'))
  } finally {
    loadingMore.value = false
  }
}

onShow(() => {
  void reload()
})

onReachBottom(() => {
  void loadMore()
})
</script>

<style lang="scss" scoped>
.growth-page { min-height: 100vh; padding: 22rpx 24rpx 80rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 10% 0%, rgba(216,161,68,.14), transparent 30%), radial-gradient(circle at 90% 14%, rgba(47,155,99,.12), transparent 28%), #f7f3ea; }
.summary-card, .record-card, .empty-card { border-radius: 28rpx; border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.summary-card { padding: 30rpx; color: #fff; background: linear-gradient(135deg,#59655b,#26372d); }
.summary-eyebrow, .summary-title, .summary-tip { display: block; }
.summary-eyebrow { color: rgba(255,255,255,.62); font-size: 20rpx; font-weight: 900; letter-spacing: 3rpx; }
.summary-title { margin-top: 8rpx; font-size: 31rpx; font-weight: 900; }
.summary-value { margin-top: 22rpx; display: flex; align-items: baseline; gap: 8rpx; }
.summary-value text:first-child { font-size: 30rpx; }
.summary-value text:last-child { font-size: 62rpx; line-height: 1; font-weight: 900; }
.summary-tip { margin-top: 20rpx; color: rgba(255,255,255,.72); font-size: 22rpx; line-height: 1.65; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 28rpx 6rpx 14rpx; }
.section-head text:first-child { font-size: 30rpx; font-weight: 900; }
.section-head text:last-child { color: #879083; font-size: 21rpx; }
.record-list { display: flex; flex-direction: column; gap: 16rpx; }
.record-card { padding: 22rpx 24rpx; display: flex; align-items: flex-start; gap: 16rpx; background: rgba(255,255,255,.96); }
.record-icon { width: 68rpx; height: 68rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; color: #fff; font-size: 27rpx; font-weight: 900; }
.record-icon--plus { background: linear-gradient(135deg,#4fc083,#1f7c4b); }
.record-icon--minus { background: linear-gradient(135deg,#d66b5f,#a13d35); }
.record-main { flex: 1; min-width: 0; }
.record-line { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.record-line--sub { margin-top: 8rpx; color: #8b9389; font-size: 20rpx; }
.record-title { font-size: 27rpx; font-weight: 900; }
.record-amount { font-size: 29rpx; font-weight: 900; }
.amount-plus { color: #1f7c4b; }
.amount-minus { color: #a13d35; }
.record-order, .record-note { display: block; margin-top: 9rpx; color: #687665; font-size: 21rpx; line-height: 1.5; word-break: break-all; }
.record-note { color: #8a7152; }
.empty-card { padding: 60rpx 24rpx; color: #8a9286; text-align: center; font-size: 24rpx; background: rgba(255,255,255,.96); }
.list-foot { padding: 26rpx 0 10rpx; color: #9aa197; text-align: center; font-size: 21rpx; }
.loading-state { padding: 50rpx 20rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
</style>
