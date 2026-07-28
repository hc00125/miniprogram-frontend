<template>
  <view class="club-page orders-page">
    <view class="brand-poster header-card">
      <view>
        <view class="eyebrow">PLAYER CENTER</view>
        <view class="title">我的接单与评价</view>
        <view class="sub">查看服务记录，以及老板对你的真实评分。</view>
      </view>
      <button class="club-btn club-btn--ghost" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? '刷新中' : '刷新' }}</button>
    </view>

    <view class="notice-entry">
      <view class="notice-icon">铃</view>
      <view class="notice-main"><text>指定订单微信提醒</text><text>{{ orderNoticeAvailable ? `已获得 ${orderNoticeAvailable} 次提醒授权` : '开启后，老板支付指定订单会第一时间通知你' }}</text></view>
      <button class="club-btn club-btn--ghost" :loading="subscribing" :disabled="subscribing" @tap="enableOrderNotice">{{ orderNoticeAvailable ? '再次开启' : '开启提醒' }}</button>
    </view>

    <view class="wallet-entry" @tap="go('/pages/player/earnings/index')">
      <view class="wallet-icon">鱼</view>
      <view class="wallet-main">
        <text>鱼干收益中心</text>
        <text>查看工资、16%抽成、8天审核与提现记录</text>
      </view>
      <text class="wallet-arrow">›</text>
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
            <view class="info-row"><text>老板</text><text>{{ order.boss_name || '未设置昵称' }}</text></view>
            <view class="info-row"><text>套餐</text><text>{{ order.package_name }}</text></view>
            <view v-if="order.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ order.game_id }}</text></view>
            <view class="info-row"><text>价格</text><text class="amount">¥{{ order.total_amount || order.total_price_per_hour }}</text></view>
            <view class="order-bottom">
              <text>{{ formatOrderTime(order.created_at) }}</text>
              <text v-if="order.status === '待支付'" class="stage-tip">等待老板付款</text>
              <text v-else-if="order.status === '待开打'" class="stage-tip stage-tip--ready">进入详情确认开打</text>
              <text v-else-if="order.status === '进行中'" class="stage-tip stage-tip--ready">进入详情管理服务</text>
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
import { confirmPlayerOrderNoticeSubscription, getMyOrders, getMyPlayerRatings, getPlayerOrderNoticeConfig, logoutPlayer, type PlayerRatingsResult } from '@/api/player'
import { formatDateTime as formatDateTimeValue } from '@/utils/format'
import { getStorage, removeStorage } from '@/utils/storage'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain, replace, backToRoute } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const player = ref<any>(null)
const orders = ref<any[]>([])
const ratingData = ref<PlayerRatingsResult | null>(null)
const refreshing = ref(false)
const subscribing = ref(false)
const orderNoticeAvailable = ref(0)
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
    'club-status--pay': status === '待支付',
    'club-status--ready': status === '待开打',
    'club-status--run': status === '进行中',
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
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  }
}

async function fetchRatings() {
  try {
    ratingData.value = await getMyPlayerRatings()
    return true
  } catch (error) {
    ratingData.value = null
    toast(getErrorMessage(error, '评价刷新失败'))
    return false
  }
}

async function refreshAll() {
  const [ordersOk, ratingsOk] = await Promise.all([fetchOrders(), fetchRatings()])
  return ordersOk && ratingsOk
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await refreshAll()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

async function loadOrderNoticeConfig() {
  try {
    const config = await getPlayerOrderNoticeConfig()
    orderNoticeAvailable.value = Number(config.available_count || 0)
    return config
  } catch {
    return null
  }
}

async function enableOrderNotice() {
  if (subscribing.value) return
  subscribing.value = true
  try {
    const config = await loadOrderNoticeConfig()
    if (!config?.enabled || !config.template_id) return toast('通知模板尚未由后台配置')
    const accepted = await new Promise<boolean>(resolve => {
      uni.requestSubscribeMessage({
        tmplIds: [config.template_id],
        success: result => resolve(result[config.template_id] === 'accept'),
        fail: () => resolve(false)
      })
    })
    const result = await confirmPlayerOrderNoticeSubscription(config.template_id, accepted)
    orderNoticeAvailable.value = Number(result.available_count || 0)
    if (accepted) success('已开启指定订单提醒')
    else toast('你没有同意通知授权，可稍后再次开启')
  } catch (error) {
    toast(getErrorMessage(error, '开启提醒失败'))
  } finally {
    subscribing.value = false
  }
}

async function handleLogout() {
  try { await logoutPlayer() } catch {}
  removeStorage('token')
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
  await Promise.all([refreshAll(), loadOrderNoticeConfig()])
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
.notice-entry { margin-top:20rpx;padding:20rpx 22rpx;display:flex;align-items:center;gap:14rpx;border-radius:24rpx;background:#fff7df; }.notice-icon{width:60rpx;height:60rpx;display:flex;align-items:center;justify-content:center;border-radius:18rpx;color:#8b641d;background:#ffe8a8;font-size:24rpx;font-weight:900;}.notice-main{flex:1;min-width:0;}.notice-main text{display:block;}.notice-main text:first-child{color:#5d4314;font-size:27rpx;font-weight:900;}.notice-main text:last-child{margin-top:4rpx;color:#8b7750;font-size:20rpx;}.notice-entry button{margin:0;padding:0 18rpx;font-size:21rpx;}
.wallet-entry { margin-top: 20rpx; padding: 22rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-radius: 26rpx; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); box-shadow: 0 14rpx 30rpx rgba(31,124,75,.16); }
.wallet-icon { width: 70rpx; height: 70rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #fff; font-size: 28rpx; font-weight: 900; background: rgba(255,255,255,.14); }
.wallet-main { flex: 1; min-width: 0; }
.wallet-main text { display: block; }
.wallet-main text:first-child { font-size: 29rpx; font-weight: 900; }
.wallet-main text:last-child { margin-top: 5rpx; color: rgba(255,255,255,.72); font-size: 21rpx; }
.wallet-arrow { font-size: 42rpx; font-weight: 300; }
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
.order-card { padding: 24rpx; border-radius: 30rpx; background: #fff; border: 1px solid rgba(37,49,35,.08); box-shadow: 0 10rpx 24rpx rgba(39,61,42,.06); }
.order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.order-no { color: #687665; font-size: 24rpx; font-family: monospace; }
.club-status--ready { color: #8d651c; background: #fff4d5; }
.info-row { min-height: 58rpx; display: flex; justify-content: space-between; align-items: center; font-size: 26rpx; border-bottom: 1px solid rgba(37,49,35,.06); }
.info-row text:first-child { color: #687665; }
.amount { color: #a87520; font-weight: 900; }
.order-bottom { margin-top: 18rpx; display: flex; align-items: center; justify-content: space-between; color: #687665; font-size: 23rpx; }
.stage-tip { color: #a87520; font-weight: 800; }
.stage-tip--ready { color: #1f7c4b; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(28rpx + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
</style>
