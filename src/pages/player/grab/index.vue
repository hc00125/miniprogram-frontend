<template>
  <view class="club-page grab-page">
    <!-- 顶部状态条 -->
    <view class="status-strip">
      <view class="strip-indicator">
        <view class="indicator-pulse"></view>
        <view class="indicator-dot" :class="`indicator-dot--${online ? 'live' : 'idle'}`"></view>
      </view>
      <text class="strip-text">实时抢单中 · 优质订单优先派单给您</text>
      <text class="strip-link" :class="`strip-link--${online ? 'live' : 'idle'}`">{{ online ? 'LIVE' : 'OFF' }}</text>
    </view>

    <!-- 玩家身份卡 -->
    <view class="player-card">
      <view class="card-bg">
        <view class="ambient-glow ambient-glow--left"></view>
        <view class="ambient-glow ambient-glow--right"></view>
      </view>
      <view class="card-content">
        <view class="card-top">
          <view class="card-avatar">
            <text>{{ player?.name?.[0] || '陪' }}</text>
          </view>
          <view class="card-info">
            <view class="card-eyebrow">PLAYER HUB · 抢单大厅</view>
            <view class="card-name">{{ player?.name || '陪玩师' }}</view>
            <view class="card-type">
              <text class="type-tag">{{ player?.type_name || '陪玩' }}</text>
              <text class="type-sep">·</text>
              <text class="type-rating">★ {{ player?.avg_rating || '5.0' }}</text>
            </view>
          </view>
          <button class="online-toggle" :class="`online-toggle--${online ? 'on' : 'off'}`" @tap="toggleOnline">
            <view class="toggle-dot"></view>
            <text>{{ online ? '在线' : '离线' }}</text>
          </button>
        </view>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ availableCount }}</text>
            <text class="stat-label">可抢订单</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ todayCount }}</text>
            <text class="stat-label">今日已抢</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">¥{{ todayIncome }}</text>
            <text class="stat-label">本月预估</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 卡片标题 + 刷新 -->
    <view class="section-head">
      <view>
        <text class="section-eyebrow">可抢订单</text>
        <text class="section-hint">每 10 秒自动刷新</text>
      </view>
      <button class="refresh-link" @tap="fetchOrders">
        <text class="refresh-icon">↻</text>
        <text>刷新</text>
      </button>
    </view>

    <!-- 订单列表 -->
    <view v-if="orders.length" class="order-list">
      <view
        v-for="order in orders"
        :key="order.order_no"
        class="order-card"
        :class="`order-card--${order.can_grab ? 'ready' : 'locked'}`"
      >
        <view class="order-top">
          <view class="order-no-wrap">
            <text class="order-no">{{ order.order_no }}</text>
            <text class="order-time">{{ formatTime(order.created_at) }}</text>
          </view>
          <view class="tag-row">
            <text v-if="order.is_designated" class="tag tag--green">指定</text>
            <text v-if="order.is_custom" class="tag tag--gold">自定义</text>
            <text v-if="!order.can_grab" class="tag tag--gray">不可抢</text>
          </view>
        </view>

        <view class="order-title">{{ order.package_name || '套餐订单' }}</view>

        <view class="order-meta">
          <view class="meta-item">
            <text class="meta-label">人数</text>
            <text class="meta-value">{{ order.current_players || 0 }} / {{ order.required_players }} 人</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">价格</text>
            <text class="meta-value meta-value--accent">{{ order.is_custom ? '待定' : `¥${order.total_price_per_hour}/时` }}</text>
          </view>
          <view v-if="order.boss_note" class="meta-item meta-item--full">
            <text class="meta-label">老板备注</text>
            <text class="meta-value meta-value--note">{{ order.boss_note }}</text>
          </view>
        </view>

        <view class="order-action-row">
          <view class="action-info">
            <text class="action-info-text">距离发布</text>
            <text class="action-info-time">{{ relativeTime(order.created_at) }}</text>
          </view>
          <button
            class="club-btn grab-btn"
            :class="`grab-btn--${order.can_grab ? 'ready' : 'locked'}`"
            :disabled="!order.can_grab || order.grabbing"
            @tap.stop="grab(order)"
          >
            {{ order.grabbing ? '抢单中...' : (order.can_grab ? '立即抢单' : '不可抢') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <view class="empty-orb">
        <view class="empty-ring empty-ring--outer"></view>
        <view class="empty-ring empty-ring--inner"></view>
        <view class="empty-icon">单</view>
      </view>
      <text class="empty-title">暂无可抢订单</text>
      <text class="empty-sub">请保持在线状态，新订单会第一时间推送给您</text>
    </view>

    <!-- 底部操作 -->
    <view class="footer-actions">
      <button class="club-btn club-btn--ghost" @tap="replace('/pages/player/my-orders/index')">
        <text>我的订单</text>
      </button>
      <button class="club-btn club-btn--warn" @tap="handleLogout">
        <text>退出登录</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getAvailableOrders, grabOrder as apiGrabOrder, logoutPlayer } from '@/api/player'
import { getStorage, removeStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { isApprovedPlayer, setPlayerOnlineStatus, getPlayerOnlineStatus } from '@/utils/client'

const player = ref<any>(null)
const orders = ref<any[]>([])
const online = ref(getPlayerOnlineStatus())
let refreshTimer: ReturnType<typeof setInterval> | null = null
let prevOrderCount = 0

const availableCount = computed(() => orders.value.filter(o => o.can_grab).length)
const todayCount = computed(() => Math.floor(Math.random() * 5) + 1) // 演示数据
const todayIncome = computed(() => {
  // 演示数据：基于陪玩师类型估算
  const base = player.value?.price_extra || 0
  return ((base * 8) + 240).toString()
})

function formatTime(input: string) {
  if (!input) return '-'
  const d = new Date(input)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function relativeTime(input: string) {
  if (!input) return '-'
  const diff = Math.floor((Date.now() - new Date(input).getTime()) / 1000)
  if (diff < 60) return `${diff} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

async function fetchOrders() {
  try {
    const res = await getAvailableOrders()
    if (prevOrderCount > 0 && res.length > prevOrderCount) toast('有新订单')
    prevOrderCount = res.length
    orders.value = (res || []).map(order => ({ ...order, grabbing: false }))
  } catch (error) {
    toast(getErrorMessage(error, '获取订单失败'))
  }
}

async function grab(order: any) {
  if (!order.can_grab) return
  const ok = await confirm(`确定要抢这个订单吗？\n套餐：${order.package_name}`)
  if (!ok) return
  try {
    order.grabbing = true
    await apiGrabOrder(order.order_no, player.value.id)
    success('抢单成功')
    go('/pages/player/order-detail/index', { orderNo: order.order_no })
  } catch (error) {
    toast(getErrorMessage(error, '抢单失败'))
  } finally {
    order.grabbing = false
  }
}

function toggleOnline() {
  online.value = !online.value
  setPlayerOnlineStatus(online.value)
  if (!online.value) {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    toast('已离线，停止接单')
  } else {
    fetchOrders()
    refreshTimer = setInterval(fetchOrders, 10000)
    toast('已上线，开始接单')
  }
}

async function handleLogout() {
  const ok = await confirm('确定退出登录吗？')
  if (!ok) return
  try {
    await logoutPlayer()
  } catch {}
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
    replace('/pages/client/profile/index')
    return
  }
  player.value = playerInfo
  if (!online.value) {
    // 恢复为离线状态时，仅拉一次订单列表，不启动轮询
    await fetchOrders()
    return
  }
  await fetchOrders()
  refreshTimer = setInterval(fetchOrders, 10000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style lang="scss" scoped>
.grab-page { padding-bottom: 180rpx; }
.status-strip { margin-bottom: 22rpx; padding: 18rpx 22rpx; border-radius: 999rpx; background: rgba(255,255,255,0.78); border: 1px solid rgba(47,155,99,0.14); display: flex; align-items: center; gap: 12rpx; box-shadow: 0 10rpx 28rpx rgba(39, 61, 42, 0.07); }
.strip-indicator { position: relative; width: 34rpx; height: 34rpx; display: flex; align-items: center; justify-content: center; }
.indicator-pulse { position: absolute; width: 34rpx; height: 34rpx; border-radius: 50%; background: rgba(47,155,99,.16); animation: pulse 1.8s infinite; }
.indicator-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #c9b99d; z-index: 1; }
.indicator-dot--live { background: #2f9b63; }
.strip-text { flex: 1; color: #556052; font-size: 24rpx; font-weight: 800; }
.strip-link { font-size: 21rpx; font-weight: 900; color: #a98c58; }
.strip-link--live { color: #2f9b63; }
.player-card { position: relative; overflow: hidden; min-height: 330rpx; margin-bottom: 28rpx; border-radius: 38rpx; background: linear-gradient(145deg, #172116, #29402c 55%, #1f7c4b); box-shadow: 0 20rpx 50rpx rgba(23,33,22,.22); }
.card-bg { position: absolute; inset: 0; pointer-events: none; }
.ambient-glow { position: absolute; border-radius: 50%; filter: blur(46rpx); opacity: .46; }
.ambient-glow--left { left: -90rpx; top: -70rpx; width: 260rpx; height: 260rpx; background: #f1cc7b; }
.ambient-glow--right { right: -80rpx; bottom: -100rpx; width: 300rpx; height: 300rpx; background: #65c980; }
.card-content { position: relative; z-index: 1; padding: 34rpx 32rpx; color: #fff; }
.card-top { display: flex; align-items: center; gap: 20rpx; }
.card-avatar { width: 104rpx; height: 104rpx; border-radius: 30rpx; background: rgba(255,255,255,.16); display: flex; align-items: center; justify-content: center; font-size: 42rpx; font-weight: 900; border: 1px solid rgba(255,255,255,.18); }
.card-info { flex: 1; min-width: 0; }
.card-eyebrow { font-size: 21rpx; color: rgba(255,255,255,.68); font-weight: 800; letter-spacing: 1rpx; }
.card-name { margin-top: 8rpx; font-size: 40rpx; font-weight: 900; }
.card-type { margin-top: 10rpx; display: flex; align-items: center; gap: 10rpx; color: rgba(255,255,255,.82); font-size: 24rpx; }
.type-tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: rgba(255,255,255,.14); }
.online-toggle { min-width: 126rpx; height: 62rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; background: rgba(255,255,255,.16); color: #fff; font-size: 23rpx; font-weight: 900; border: 1px solid rgba(255,255,255,.18); }
.online-toggle--off { opacity: .72; }
.toggle-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #65c980; box-shadow: 0 0 14rpx rgba(101,201,128,.8); }
.online-toggle--off .toggle-dot { background: #c9b99d; box-shadow: none; }
.stats-row { margin-top: 34rpx; padding: 22rpx 0 4rpx; display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; align-items: center; background: rgba(255,255,255,.10); border-radius: 26rpx; border: 1px solid rgba(255,255,255,.12); }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-value { font-size: 34rpx; font-weight: 900; }
.stat-label { color: rgba(255,255,255,.68); font-size: 21rpx; }
.stat-divider { width: 1px; height: 56rpx; background: rgba(255,255,255,.14); }
.section-head { margin: 8rpx 2rpx 18rpx; display: flex; align-items: center; justify-content: space-between; }
.section-head > view { display: flex; flex-direction: column; gap: 4rpx; }
.section-eyebrow { color: #172116; font-size: 34rpx; font-weight: 900; }
.section-hint { color: #687665; font-size: 23rpx; }
.refresh-link { min-width: 124rpx; height: 62rpx; border-radius: 999rpx; background: #fff; color: #1f7c4b; display: flex; align-items: center; justify-content: center; gap: 8rpx; font-size: 24rpx; font-weight: 900; box-shadow: 0 10rpx 24rpx rgba(39,61,42,.08); }
.order-list { display: flex; flex-direction: column; gap: 20rpx; }
.order-card { padding: 26rpx; border-radius: 32rpx; background: #fff; border: 1px solid rgba(37,49,35,.08); box-shadow: 0 12rpx 30rpx rgba(39,61,42,.08); }
.order-card--locked { opacity: .72; }
.order-top, .order-action-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.order-no-wrap { display: flex; flex-direction: column; gap: 5rpx; }
.order-no { color: #172116; font-size: 27rpx; font-weight: 900; font-family: monospace; }
.order-time { color: #8b9387; font-size: 22rpx; }
.tag-row { display: flex; gap: 8rpx; }
.tag { padding: 7rpx 13rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; }
.tag--green { background: #eef9ef; color: #1f7c4b; }
.tag--gold { background: #fff4da; color: #a87520; }
.tag--gray { background: #f0f0ec; color: #8b9387; }
.order-title { margin-top: 18rpx; color: #172116; font-size: 35rpx; font-weight: 900; }
.order-meta { margin-top: 18rpx; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.meta-item { padding: 18rpx; border-radius: 22rpx; background: #f7faf4; display: flex; flex-direction: column; gap: 8rpx; }
.meta-item--full { grid-column: 1 / -1; }
.meta-label { color: #7a8275; font-size: 21rpx; font-weight: 800; }
.meta-value { color: #172116; font-size: 27rpx; font-weight: 900; }
.meta-value--accent { color: #a87520; }
.meta-value--note { font-weight: 700; line-height: 1.45; }
.order-action-row { margin-top: 22rpx; padding-top: 20rpx; border-top: 1px solid rgba(37,49,35,.07); }
.action-info { display: flex; flex-direction: column; gap: 4rpx; }
.action-info-text { color: #8b9387; font-size: 21rpx; }
.action-info-time { color: #172116; font-size: 25rpx; font-weight: 900; }
.grab-btn { min-width: 190rpx; height: 76rpx; }
.grab-btn--locked { background: #e4e4de; color: #888; }
.empty-state { margin-top: 60rpx; min-height: 520rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #687665; }
.empty-orb { position: relative; width: 190rpx; height: 190rpx; display: flex; align-items: center; justify-content: center; }
.empty-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(47,155,99,.16); }
.empty-ring--outer { width: 190rpx; height: 190rpx; }
.empty-ring--inner { width: 132rpx; height: 132rpx; }
.empty-icon { width: 86rpx; height: 86rpx; border-radius: 28rpx; background: #eef9ef; color: #1f7c4b; display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 900; }
.empty-title { margin-top: 24rpx; color: #172116; font-size: 34rpx; font-weight: 900; }
.empty-sub { margin-top: 10rpx; font-size: 24rpx; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(28rpx + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
@keyframes pulse { 0% { transform: scale(.75); opacity: .8; } 80%,100% { transform: scale(1.45); opacity: 0; } }
</style>
