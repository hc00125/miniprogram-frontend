<template>
  <view class="club-page orders-page">
    <view class="brand-poster header-card">
      <view>
        <view class="eyebrow">PLAYER CENTER</view>
        <view class="title">我的接单与评价</view>
        <view class="sub">查看服务记录，以及老板对你的真实评分。</view>
      </view>
      <button class="club-btn club-btn--ghost" @tap="refreshAll">刷新</button>
    </view>

    <view class="club-card ratings-card">
      <view class="club-card__bd">
        <view class="rating-summary">
          <view>
            <text class="summary-score">{{ ratingSummary.rating_count ? ratingSummary.average_rating : '-' }}</text>
            <text class="summary-label">综合评分</text>
          </view>
          <view>
            <text class="summary-value">{{ ratingSummary.rating_count }}</text>
            <text class="summary-label">评价数量</text>
          </view>
          <view>
            <text class="summary-value">{{ ratingSummary.total_orders }}</text>
            <text class="summary-label">完成订单</text>
          </view>
        </view>

        <view class="rating-section-head">
          <text>最近评价</text>
          <text>仅展示你的订单评价</text>
        </view>
        <view v-if="ratings.length" class="rating-list">
          <view v-for="item in ratings" :key="item.id" class="rating-item">
            <view class="rating-head">
              <text class="stars">{{ starText(item.rating) }}</text>
              <text class="rating-date">{{ formatReviewDate(item.created_at) }}</text>
            </view>
            <text class="rating-comment">{{ item.comment || '老板未填写文字评价' }}</text>
            <text class="rating-package">{{ item.package_name || '陪玩服务' }}</text>
          </view>
        </view>
        <view v-else class="ratings-empty">暂无评价，完成订单并由老板评价后会显示在这里。</view>
      </view>
    </view>

    <view class="club-card">
      <view class="club-card__bd">
        <view v-if="orders.length" class="order-list">
          <view v-for="order in orders" :key="order.order_no" class="order-card" @tap="go('/pages/player/order-detail/index', { orderNo: order.order_no })">
            <view class="order-top">
              <text class="order-no">{{ order.order_no }}</text>
              <text class="club-status" :class="statusClass(order.status)">{{ order.status }}</text>
            </view>
            <view class="info-row"><text>套餐</text><text>{{ order.package_name }}</text></view>
            <view v-if="order.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ order.game_id }}</text></view>
            <view class="info-row"><text>价格</text><text class="amount">¥{{ order.total_amount || order.total_price_per_hour }}</text></view>
            <view class="order-bottom">
              <text>{{ formatOrderTime(order.created_at) }}</text>
              <button v-if="order.status === '进行中'" class="club-btn action-btn" @tap.stop="complete(order)">完成</button>
            </view>
          </view>
        </view>
        <view v-else class="club-empty">暂无订单</view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="club-btn club-btn--ghost" @tap="backToRoute('/pages/player/grab/index')">抢单大厅</button>
      <button class="club-btn club-btn--ghost" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { completeOrder, getMyOrders, getMyPlayerRatings, logoutPlayer, type PlayerRatingsResult } from '@/api/player'
import { formatDateTime as formatDateTimeValue } from '@/utils/format'
import { getStorage, removeStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain, replace, backToRoute } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const player = ref<any>(null)
const orders = ref<any[]>([])
const ratingData = ref<PlayerRatingsResult | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const ratings = computed(() => ratingData.value?.results || [])
const ratingSummary = computed(() => ratingData.value?.summary || {
  average_rating: 0,
  rating_count: 0,
  total_orders: 0
})

function statusClass(status: string) {
  return {
    'club-status--wait': status === '待接单',
    'club-status--run': status === '进行中',
    'club-status--pay': status === '待支付',
    'club-status--done': status === '已完成',
    'club-status--cancel': status === '已取消'
  }
}

function formatOrderTime(value: string) {
  return formatDateTimeValue(value)
}

function formatReviewDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function starText(value: number) {
  const count = Math.max(1, Math.min(5, Number(value || 0)))
  return `${'★'.repeat(count)}${'☆'.repeat(5 - count)}`
}

async function fetchOrders() {
  try {
    orders.value = await getMyOrders()
  } catch (error) {
    toast(getErrorMessage(error, '获取订单失败'))
  }
}

async function fetchRatings() {
  try {
    ratingData.value = await getMyPlayerRatings()
  } catch (error) {
    ratingData.value = null
    toast(getErrorMessage(error, '获取评价失败'))
  }
}

async function refreshAll() {
  await Promise.all([fetchOrders(), fetchRatings()])
}

async function complete(order: any) {
  const ok = await confirm('确定要标记订单完成吗？')
  if (!ok) return
  try {
    await completeOrder(order.order_no, player.value.id)
    success('已标记完成')
    await refreshAll()
  } catch (error) {
    toast(getErrorMessage(error, '操作失败'))
  }
}

async function handleLogout() {
  try { await logoutPlayer() } catch {}
  removeStorage('token')
  removeStorage('player')
  replace('/pages/client/login/index')
}

onMounted(async () => {
  if (!(await isApprovedPlayer())) {
    toast('请先成为陪玩师')
    replace('/pages/player/apply/index')
    return
  }
  const token = getStorage<string>('token')
  const playerInfo = getStorage<any>('player')
  if (!token) {
    replace('/pages/client/login/index')
    return
  }
  if (!playerInfo) {
    toast('陪玩师信息未同步，请刷新个人中心')
    goMain('profile')
    return
  }
  player.value = playerInfo
  await refreshAll()
  refreshTimer = setInterval(refreshAll, 10000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style lang="scss" scoped>
.orders-page { padding-bottom: 160rpx; }
.header-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.header-card > view, .header-card > button { position: relative; z-index: 1; }
.eyebrow { color: #a87520; font-size: 22rpx; font-weight: 900; }
.title { margin-top: 12rpx; color: #172116; font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: #687665; font-size: 24rpx; }
.ratings-card { margin-top: 22rpx; }
.rating-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }
.rating-summary > view { padding: 20rpx 10rpx; border-radius: 22rpx; text-align: center; background: #f7faf4; }
.summary-score, .summary-value, .summary-label { display: block; }
.summary-score { color: #a87520; font-size: 42rpx; font-weight: 900; }
.summary-value { color: #172116; font-size: 34rpx; font-weight: 900; }
.summary-label { margin-top: 6rpx; color: #8a9286; font-size: 21rpx; }
.rating-section-head { display: flex; justify-content: space-between; align-items: center; margin: 26rpx 0 14rpx; }
.rating-section-head text:first-child { color: #172116; font-size: 29rpx; font-weight: 900; }
.rating-section-head text:last-child { color: #8a9286; font-size: 21rpx; }
.rating-list { display: flex; flex-direction: column; gap: 14rpx; }
.rating-item { padding: 20rpx; border-radius: 20rpx; background: #f7faf4; border: 1rpx solid rgba(39,61,42,.06); }
.rating-head { display: flex; justify-content: space-between; align-items: center; gap: 14rpx; }
.stars { color: #e1ac3f; font-size: 26rpx; letter-spacing: 2rpx; }
.rating-date { color: #9aa197; font-size: 21rpx; }
.rating-comment { display: block; margin-top: 10rpx; color: #39423a; font-size: 25rpx; line-height: 1.5; }
.rating-package { display: block; margin-top: 8rpx; color: #8a9286; font-size: 21rpx; }
.ratings-empty { padding: 28rpx 20rpx; border-radius: 20rpx; color: #8a9286; text-align: center; font-size: 24rpx; background: #f7faf4; }
.order-list { display: flex; flex-direction: column; gap: 18rpx; }
.order-card { padding: 24rpx; border-radius: 30rpx; background: #fff; border: 1px solid rgba(37,49,35,.08); box-shadow: 0 10rpx 24rpx rgba(39, 61, 42, 0.06); }
.order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.order-no { color: #687665; font-size: 24rpx; font-family: monospace; }
.info-row { min-height: 58rpx; display: flex; justify-content: space-between; align-items: center; font-size: 26rpx; border-bottom: 1px solid rgba(37,49,35,.06); }
.info-row text:first-child { color: #687665; }
.amount { color: #a87520; font-weight: 900; }
.order-bottom { margin-top: 18rpx; display: flex; align-items: center; justify-content: space-between; color: #687665; font-size: 23rpx; }
.action-btn { min-width: 150rpx; height: 70rpx; font-size: 26rpx; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(28rpx + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
</style>
