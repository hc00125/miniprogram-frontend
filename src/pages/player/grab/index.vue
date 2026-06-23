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
            <image v-if="playerAvatarUrl" class="card-avatar-img" :src="playerAvatarUrl" mode="aspectFill" />
            <text v-else>{{ player?.name?.[0] || '陪' }}</text>
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
          <button class="online-toggle" :class="`online-toggle--${online ? 'on' : 'off'}`" :disabled="onlineUpdating" @tap="toggleOnline">
            <view class="toggle-dot"></view>
            <text>{{ onlineUpdating ? '同步中' : (online ? '在线' : '离线') }}</text>
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
      <button class="club-btn club-btn--ghost" @tap="go('/pages/player/my-orders/index')">
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
import { getAvailableOrders, getCurrentPlayer, grabOrder as apiGrabOrder, logoutPlayer, updatePlayerOnlineStatus } from '@/api/player'
import { getStorage, removeStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { getClientProfile, isApprovedPlayer, normalizeAvatarUrl, setPlayerOnlineStatus, getPlayerOnlineStatus } from '@/utils/client'

const player = ref<any>(null)
const orders = ref<any[]>([])
const online = ref(getPlayerOnlineStatus())
const onlineUpdating = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let prevOrderCount = 0

const availableCount = computed(() => orders.value.filter(o => o.can_grab).length)
const playerAvatarUrl = computed(() => {
  const profile = getClientProfile()
  return normalizeAvatarUrl(player.value?.avatar_url || player.value?.avatarUrl || profile?.avatar_url || profile?.avatarUrl)
})
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

function stopOrderRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function startOrderRefresh() {
  await fetchOrders()
  stopOrderRefresh()
  refreshTimer = setInterval(fetchOrders, 10000)
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

async function toggleOnline() {
  if (onlineUpdating.value) return
  const nextOnline = !online.value
  onlineUpdating.value = true
  try {
    const res = await updatePlayerOnlineStatus(nextOnline)
    online.value = Boolean(res.is_online)
    setPlayerOnlineStatus(online.value)
    if (player.value) player.value = { ...player.value, is_online: online.value }
    if (!online.value) {
      stopOrderRefresh()
      toast('已离线，停止接单')
    } else {
      await startOrderRefresh()
      toast('已上线，开始接单')
    }
  } catch (error) {
    toast(getErrorMessage(error, '在线状态更新失败'))
  } finally {
    onlineUpdating.value = false
  }
}

async function handleLogout() {
  const ok = await confirm('确定退出登录吗？')
  if (!ok) return
  try {
    await logoutPlayer()
  } catch {}
  setPlayerOnlineStatus(false)
  removeStorage('token')
  removeStorage('player')
  replace('/pages/client/login/index')
}

onMounted(async () => {
  if (!(await isApprovedPlayer())) {
    toast('请先成为陪玩师')
    go('/pages/player/apply/index')
    return
  }
  const token = getStorage<string>('token')
  if (!token) {
    replace('/pages/client/login/index')
    return
  }
  try {
    const currentPlayer = await getCurrentPlayer()
    player.value = currentPlayer
    online.value = Boolean(currentPlayer?.is_online)
    setPlayerOnlineStatus(online.value)
  } catch (error) {
    const playerInfo = getStorage<any>('player')
    if (!playerInfo) {
      toast('陪玩师信息未同步，请刷新个人中心')
      replace('/pages/client/profile/index')
      return
    }
    player.value = playerInfo
    online.value = getPlayerOnlineStatus()
  }
  if (!player.value) {
    toast('陪玩师信息未同步，请刷新个人中心')
    replace('/pages/client/profile/index')
    return
  }
  if (!online.value) {
    await fetchOrders()
    return
  }
  await startOrderRefresh()
})

onUnmounted(() => {
  stopOrderRefresh()
})
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.grab-page {
  min-height: 100vh;
  padding: 20rpx 24rpx 200rpx;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(216, 161, 68, 0.10), transparent 36%),
    radial-gradient(ellipse at 88% 16%, rgba(47, 155, 99, 0.10), transparent 32%),
    linear-gradient(180deg, #fbf7ef 0%, #f7f3ea 48%, #fffaf2 100%);
}

/* ========== 顶部状态条 ========== */
.status-strip {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 24rpx;
  border: 1px solid rgba(216, 161, 68, 0.18);
  border-radius: 22rpx;
  background: rgba(255, 252, 244, 0.92);
  box-shadow: 0 8rpx 22rpx rgba(176, 134, 60, 0.06);
}

.strip-indicator {
  position: relative;
  width: 18rpx;
  height: 18rpx;
  flex-shrink: 0;
}

.indicator-dot {
  position: absolute;
  inset: 5rpx;
  border-radius: 50%;
  z-index: 1;
}

.indicator-dot--live {
  background: linear-gradient(135deg, #ef5b5b, #c43232);
  box-shadow: 0 0 0 4rpx rgba(239, 91, 91, 0.20);
}

.indicator-dot--idle {
  background: #aab1a5;
  box-shadow: none;
}

.indicator-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(239, 91, 91, 0.40);
  animation: pulse 1.6s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.4); opacity: 0; }
}

.strip-text {
  flex: 1;
  color: #4a4f48;
  font-size: 25rpx;
  line-height: 1.36;
  font-weight: 600;
}

.strip-link {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.strip-link--live {
  color: #c43232;
  background: rgba(239, 91, 91, 0.10);
  border: 1px solid rgba(239, 91, 91, 0.18);
}

.strip-link--idle {
  color: #5a6b5b;
  background: rgba(42, 63, 48, 0.08);
  border: 1px solid rgba(42, 63, 48, 0.16);
}

/* ========== 玩家身份卡 ========== */
.player-card {
  position: relative;
  margin-top: 22rpx;
  padding: 28rpx 30rpx 26rpx;
  border: 1px solid rgba(47, 155, 99, 0.12);
  border-radius: 28rpx;
  background: linear-gradient(135deg, #173426 0%, #1f7c4b 60%, #2f9b63 100%);
  box-shadow: 0 20rpx 44rpx rgba(23, 52, 38, 0.20);
  overflow: hidden;
}

.card-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.5;
}

.ambient-glow--left {
  top: -60rpx;
  left: -40rpx;
  width: 220rpx;
  height: 220rpx;
  background: radial-gradient(circle, rgba(216, 161, 68, 0.40), transparent 70%);
}

.ambient-glow--right {
  bottom: -80rpx;
  right: -60rpx;
  width: 280rpx;
  height: 280rpx;
  background: radial-gradient(circle, rgba(95, 183, 138, 0.50), transparent 70%);
}

.card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.card-avatar {
  width: 100rpx;
  height: 100rpx;
  flex-shrink: 0;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #173426;
  font-size: 40rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.card-avatar-img {
  width: 100%;
  height: 100%;
  display: block;
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.card-eyebrow {
  color: rgba(243, 215, 155, 0.88);
  font-size: 19rpx;
  font-weight: 900;
  letter-spacing: 1.5rpx;
}

.card-name {
  color: #fffaf0;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.16;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.20);
}

.card-type {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 4rpx;
  color: rgba(255, 255, 255, 0.84);
  font-size: 22rpx;
  font-weight: 700;
}

.type-tag {
  padding: 3rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(243, 215, 155, 0.22);
  color: #f3d79b;
  font-size: 20rpx;
  font-weight: 800;
}

.type-sep {
  color: rgba(255, 255, 255, 0.40);
}

.type-rating {
  color: #f3d79b;
  font-weight: 800;
}

.online-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  font-weight: 800;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.online-toggle--on {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.22);
}

.online-toggle--off {
  background: rgba(0, 0, 0, 0.30);
  color: rgba(255, 255, 255, 0.62);
  border-color: rgba(255, 255, 255, 0.16);
}

.toggle-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #5fb78a;
  box-shadow: 0 0 0 3rpx rgba(95, 183, 138, 0.30);
}

.online-toggle--off .toggle-dot {
  background: #aab1a5;
  box-shadow: none;
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1px 1fr 1px 1fr;
  align-items: center;
  padding: 18rpx 14rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.stat-value {
  color: #fff;
  font-size: 32rpx;
  font-weight: 900;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  color: rgba(255, 255, 255, 0.72);
  font-size: 21rpx;
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 40rpx;
  background: rgba(255, 255, 255, 0.16);
}

/* ========== 区块标题 ========== */
.section-head {
  margin: 28rpx 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.section-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  display: block;
}

.section-hint {
  display: block;
  margin-top: 2rpx;
  color: #5a6b5b;
  font-size: 21rpx;
  font-weight: 600;
}

.refresh-link {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.96);
  color: #1f7c4b;
  font-size: 24rpx;
  font-weight: 800;
  flex-shrink: 0;
  border: 1px solid rgba(47, 155, 99, 0.12);
}

.refresh-icon {
  font-size: 26rpx;
  line-height: 1;
}

/* ========== 订单列表 ========== */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.order-card {
  padding: 22rpx 24rpx 20rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12rpx 28rpx rgba(38, 69, 54, 0.06);
}

.order-card--locked {
  background: rgba(245, 243, 235, 0.96);
}

.order-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14rpx;
}

.order-no-wrap {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.order-no {
  color: #8b9788;
  font-size: 21rpx;
  font-weight: 600;
  font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace;
}

.order-time {
  color: #aab1a5;
  font-size: 19rpx;
  font-weight: 600;
}

.tag-row {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}

.tag {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 800;
}

.tag--green {
  background: rgba(47, 155, 99, 0.12);
  color: #1f7c4b;
}

.tag--gold {
  background: rgba(216, 161, 68, 0.14);
  color: #a87520;
}

.tag--gray {
  background: rgba(42, 63, 48, 0.08);
  color: #5a6b5b;
}

.order-title {
  margin-top: 12rpx;
  color: #14291f;
  font-size: 32rpx;
  font-weight: 900;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-card--locked .order-title {
  color: #5a6b5b;
}

.order-meta {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx 22rpx;
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #f7faf4 0%, #ffffff 100%);
  border: 1px solid rgba(47, 155, 99, 0.06);
}

.order-card--locked .order-meta {
  background: rgba(232, 232, 226, 0.60);
  border-color: rgba(42, 63, 48, 0.06);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-item--full {
  flex: 1 0 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
  margin-top: 2rpx;
  padding-top: 12rpx;
  border-top: 1px dashed rgba(42, 63, 48, 0.08);
}

.meta-label {
  color: #828a7e;
  font-size: 22rpx;
  font-weight: 600;
}

.meta-value {
  color: #14291f;
  font-size: 26rpx;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.meta-value--accent {
  color: #1f7c4b;
  font-size: 30rpx;
}

.meta-value--note {
  color: #5a6b5b;
  font-size: 24rpx;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.order-action-row {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.action-info-text {
  color: #828a7e;
  font-size: 21rpx;
  font-weight: 600;
}

.action-info-time {
  color: #1f7c4b;
  font-size: 24rpx;
  font-weight: 800;
}

.order-card--locked .action-info-time {
  color: #5a6b5b;
}

.grab-btn {
  min-width: 200rpx;
  min-height: 78rpx;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 900;
}

.grab-btn--ready {
  color: #fff;
  background: linear-gradient(135deg, #ff8a4c, #ef5b5b);
  box-shadow: 0 12rpx 24rpx rgba(239, 91, 91, 0.30);
}

.grab-btn--locked {
  color: #5a6b5b;
  background: #e8e8e2;
  box-shadow: none;
}

/* ========== 空状态 ========== */
.empty-state {
  margin-top: 22rpx;
  padding: 80rpx 32rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
}

.empty-orb {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.empty-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2rpx solid rgba(216, 161, 68, 0.20);
}

.empty-ring--outer {
  animation: empty-breathe 2.6s ease-in-out infinite;
}

.empty-ring--inner {
  inset: 26rpx;
  border-color: rgba(216, 161, 68, 0.32);
  animation: empty-breathe 2.6s ease-in-out infinite 0.6s;
}

@keyframes empty-breathe {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.06); opacity: 0.8; }
}

.empty-icon {
  position: relative;
  z-index: 1;
  width: 104rpx;
  height: 104rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #173426;
  font-size: 44rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx rgba(216, 161, 68, 0.20);
}

.empty-title {
  color: #14291f;
  font-size: 32rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.empty-sub {
  color: #5a6b5b;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

/* ========== 底部操作 ========== */
.footer-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
  z-index: 10;
}

.footer-actions .club-btn {
  min-height: 82rpx;
  font-size: 28rpx;
  font-weight: 800;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.footer-actions .club-btn--warn {
  background: linear-gradient(135deg, #ffb380, #ef5b5b);
  color: #fff;
  box-shadow: 0 10rpx 22rpx rgba(239, 91, 91, 0.22);
}

@media (prefers-reduced-motion: reduce) {
  .indicator-pulse,
  .empty-ring--outer,
  .empty-ring--inner {
    animation: none;
  }
}
</style>
