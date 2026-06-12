<template>
  <view class="club-page status-page">
    <!-- 顶部状态条：克制而清晰 -->
    <view class="status-strip">
      <view class="strip-indicator">
        <view class="indicator-pulse"></view>
        <view class="indicator-dot"></view>
      </view>
      <text class="strip-text">系统正在为您匹配优质陪玩</text>
      <text class="strip-link">匹配中</text>
    </view>

    <!-- 等待中主视觉：呼吸感强，留白充足 -->
    <view class="waiting-hero">
      <view class="hero-ambient">
        <view class="ambient-ring ambient-ring--one"></view>
        <view class="ambient-ring ambient-ring--two"></view>
        <view class="ambient-ring ambient-ring--three"></view>
      </view>
      <view class="hero-content">
        <view class="hero-headline">
          <text class="headline-main">正在为你匹配陪玩</text>
          <text class="headline-sub">优质陪玩在线接单中，请稍候片刻</text>
        </view>
        <view class="hero-meta">
          <view class="meta-block">
            <text class="meta-label">订单号</text>
            <text class="meta-value">{{ orderNo || '加载中' }}</text>
          </view>
          <view class="meta-divider"></view>
          <view class="meta-block">
            <text class="meta-label">已等待</text>
            <text class="meta-value meta-value--accent">{{ waitTime || '00:00' }}</text>
          </view>
        </view>
        <view class="hero-tagline">平台保障中 · 严格审核 · 安全放心</view>
      </view>
    </view>

    <!-- 接单进度区：头像渐次浮现 + 数量对比 -->
    <view v-if="orderInfo" class="progress-card">
      <view class="progress-head">
        <view class="progress-title-wrap">
          <text class="progress-eyebrow">接单进度</text>
          <view class="progress-count">
            <text class="count-ready">{{ readyCount }}</text>
            <text class="count-sep">/</text>
            <text class="count-total">{{ requiredCount }}</text>
            <text class="count-unit">位陪玩</text>
          </view>
        </view>
        <button class="refresh-link" @tap="checkOrder">
          <text class="refresh-icon">↻</text>
          <text>刷新</text>
        </button>
      </view>

      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progressPercent }"></view>
      </view>

      <view class="slot-track">
        <view v-for="player in players" :key="player.id" class="slot-item slot-item--ready">
          <view class="slot-avatar-wrap">
            <view class="slot-avatar">{{ player.name?.[0] || '陪' }}</view>
            <view class="slot-badge">✓</view>
          </view>
          <text class="slot-name">{{ player.name }}</text>
          <text class="slot-tag">{{ player.type_name || '已接单' }}</text>
        </view>
        <view v-for="item in waitingSlots" :key="item" class="slot-item slot-item--waiting">
          <view class="slot-avatar-wrap">
            <view class="slot-avatar slot-avatar--empty">
              <view class="waiting-dot"></view>
              <view class="waiting-dot"></view>
              <view class="waiting-dot"></view>
            </view>
          </view>
          <text class="slot-name slot-name--muted">匹配中</text>
          <text class="slot-tag slot-tag--muted">等待接单</text>
        </view>
      </view>
    </view>

    <!-- 订单信息：信息层级清晰，重要信息靠左 -->
    <view v-if="orderInfo" class="order-card">
      <view class="order-head">
        <text class="order-eyebrow">订单信息</text>
        <text class="club-status" :class="statusClass(orderInfo.status)">{{ orderInfo.status }}</text>
      </view>

      <view class="order-grid">
        <view class="info-row">
          <text class="info-label">选择套餐</text>
          <text class="info-value">{{ orderInfo.package_name || '待确认' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">需要陪玩</text>
          <text class="info-value">{{ requiredCount }} 人</text>
        </view>
        <view v-if="orderInfo.game_id" class="info-row">
          <text class="info-label">游戏ID/房间号</text>
          <text class="info-value">{{ orderInfo.game_id }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预订时长</text>
          <text class="info-value">{{ bookedHoursText }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">下单时间</text>
          <text class="info-value">{{ createdTimeText }}</text>
        </view>
      </view>

      <view class="amount-strip">
        <view class="amount-left">
          <text class="amount-label">预计费用</text>
          <text v-if="orderInfo.total_price_per_hour" class="amount-unit">/小时</text>
        </view>
        <text class="amount-value">{{ amountText }}</text>
        <view class="amount-shield">
          <text class="shield-icon">盾</text>
          <text class="shield-text">平台保障</text>
        </view>
      </view>
    </view>

    <!-- 底部操作：清晰的主次层次 -->
    <view class="footer-actions">
      <button class="club-btn club-btn--ghost" @tap="goMain('home')">返回首页</button>
      <button class="club-btn club-btn--primary" @tap="checkOrder">刷新状态</button>
      <button v-if="orderInfo?.status === '待接单'" class="club-btn club-btn--warn" @tap="handleCancel">取消订单</button>
      <button v-if="orderInfo?.status === '进行中'" class="club-btn club-btn--primary" @tap="goProgress">查看进度</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cancelOrder, getOrder } from '@/api/boss'
import { formatDateTime } from '@/utils/format'
import { replace, relaunch } from '@/utils/nav'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const waitTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null
let waitTimer: ReturnType<typeof setInterval> | null = null
let prevPlayerCount = 0

const waitingSlots = computed(() => {
  if (!orderInfo.value) return []
  const count = Math.max(0, orderInfo.value.required_players - (orderInfo.value.players?.length || 0))
  return Array.from({ length: count }, (_, index) => index)
})

const readyCount = computed(() => orderInfo.value?.players?.length || 0)
const players = computed(() => orderInfo.value?.players || [])
const requiredCount = computed(() => orderInfo.value?.required_players || 0)

const progressPercent = computed(() => {
  if (!requiredCount.value) return '0%'
  return `${Math.min(100, (readyCount.value / requiredCount.value) * 100)}%`
})

const bookedHoursText = computed(() => {
  const hours = Number(orderInfo.value?.booked_hours || 1)
  return `${hours}小时`
})

const createdTimeText = computed(() => {
  if (!orderInfo.value?.created_at) return '待确认'
  return formatDateTime(orderInfo.value.created_at)
})

const amountText = computed(() => {
  const amount = orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour
  if (!amount) return '待确认'
  return `¥${Number(amount).toFixed(2)}`
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

function updateWaitTime() {
  if (!orderInfo.value?.created_at) {
    waitTime.value = ''
    return
  }
  const diffSec = Math.floor((Date.now() - new Date(orderInfo.value.created_at).getTime()) / 1000)
  const minutes = Math.floor(diffSec / 60)
  const seconds = String(diffSec % 60).padStart(2, '0')
  waitTime.value = `${minutes}:${seconds}`
}

async function checkOrder() {
  if (!orderNo.value) return
  try {
    const res = await getOrder(orderNo.value)
    const newCount = res.players?.length || 0
    if (newCount > prevPlayerCount && prevPlayerCount > 0) toast('有打手接单了')
    prevPlayerCount = newCount
    orderInfo.value = res
    updateWaitTime()

    if (res.status === '进行中') {
      stopTimers()
      replace('/pages/boss/in-progress/index', { orderNo: orderNo.value })
    } else if (res.status === '已取消') {
      stopTimers()
      toast('订单已被取消')
      goMain('home')
    }
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  }
}

function goProgress() {
  replace('/pages/boss/in-progress/index', { orderNo: orderNo.value })
}

async function handleCancel() {
  const ok = await confirm('确定要取消这个订单吗？')
  if (!ok) return
  try {
    await cancelOrder(orderNo.value)
    success('订单已取消')
    stopTimers()
    goMain('home')
  } catch (error) {
    toast(getErrorMessage(error, '取消失败'))
  }
}

function stopTimers() {
  if (timer) clearInterval(timer)
  if (waitTimer) clearInterval(waitTimer)
  timer = null
  waitTimer = null
}

onLoad((query) => {
  orderNo.value = String(query?.orderNo || '')
})

onMounted(() => {
  checkOrder()
  timer = setInterval(checkOrder, 5000)
  waitTimer = setInterval(updateWaitTime, 1000)
})

onUnmounted(stopTimers)

// 避开模板编译器的 e.unref 自动包装
const goMain = (tab = 'home') => relaunch('/pages/boss/home/index', { tab })
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.status-page {
  min-height: 100vh;
  padding: 20rpx 24rpx 220rpx;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(216, 161, 68, 0.10), transparent 36%),
    radial-gradient(ellipse at 88% 14%, rgba(47, 155, 99, 0.10), transparent 32%),
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
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  z-index: 1;
}

.indicator-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(47, 155, 99, 0.36);
  animation: pulse 1.8s ease-out infinite;
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
}

.strip-link {
  color: #1f7c4b;
  font-size: 23rpx;
  font-weight: 800;
  letter-spacing: 0;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(47, 155, 99, 0.10);
  border: 1px solid rgba(47, 155, 99, 0.14);
}

/* ========== 等待中主视觉 ========== */
.waiting-hero {
  position: relative;
  min-height: 320rpx;
  margin-top: 22rpx;
  padding: 36rpx 32rpx 32rpx;
  overflow: hidden;
  border: 1px solid rgba(47, 155, 99, 0.10);
  border-radius: 28rpx;
  background:
    radial-gradient(circle at 8% 18%, rgba(255, 255, 255, 0.96), transparent 36%),
    radial-gradient(circle at 92% 28%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(135deg, #f1f7f1 0%, #f8fcf7 56%, #edf6f0 100%);
  box-shadow: 0 16rpx 40rpx rgba(31, 124, 75, 0.08);
}

.hero-ambient {
  position: absolute;
  right: -120rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 420rpx;
  height: 420rpx;
  pointer-events: none;
}

.ambient-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(47, 155, 99, 0.12);
}

.ambient-ring--one {
  animation: ring-breathe 4.2s ease-in-out infinite;
}

.ambient-ring--two {
  inset: 50rpx;
  border-color: rgba(216, 161, 68, 0.16);
  animation: ring-breathe 4.2s ease-in-out infinite 1.4s;
}

.ambient-ring--three {
  inset: 100rpx;
  border-color: rgba(47, 155, 99, 0.18);
  animation: ring-breathe 4.2s ease-in-out infinite 2.8s;
}

@keyframes ring-breathe {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.08); opacity: 1; }
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.hero-headline {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.headline-main {
  color: #14291f;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -0.5rpx;
}

.headline-sub {
  color: #5d675d;
  font-size: 25rpx;
  line-height: 1.42;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 18rpx 22rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(42, 63, 48, 0.06);
}

.meta-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.meta-label {
  color: #828a7e;
  font-size: 21rpx;
  font-weight: 700;
  letter-spacing: 0.3rpx;
}

.meta-value {
  color: #1e2a22;
  font-size: 26rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-value--accent {
  color: #1f7c4b;
  font-size: 30rpx;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace;
}

.meta-divider {
  width: 1px;
  height: 36rpx;
  background: rgba(42, 63, 48, 0.10);
}

.hero-tagline {
  color: #4d6e5d;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0.4rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.hero-tagline::before {
  content: '';
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #1f7c4b;
  flex-shrink: 0;
}

/* ========== 接单进度卡 ========== */
.progress-card,
.order-card {
  margin-top: 22rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
  overflow: hidden;
}

.progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  padding: 26rpx 28rpx 20rpx;
}

.progress-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.progress-eyebrow {
  color: #5a6b5b;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 0.3rpx;
}

.progress-count {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  color: #14291f;
}

.count-ready {
  font-size: 44rpx;
  font-weight: 900;
  color: #1f7c4b;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.count-sep {
  font-size: 30rpx;
  font-weight: 700;
  color: #aab1a5;
  margin: 0 2rpx;
}

.count-total {
  font-size: 30rpx;
  font-weight: 800;
  color: #5a6b5b;
  font-variant-numeric: tabular-nums;
}

.count-unit {
  margin-left: 6rpx;
  color: #5a6b5b;
  font-size: 24rpx;
  font-weight: 700;
}

.refresh-link {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  height: 50rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #f3f7f1;
  color: #1f7c4b;
  font-size: 23rpx;
  font-weight: 800;
  border: 1px solid rgba(47, 155, 99, 0.12);
}

.refresh-icon {
  font-size: 26rpx;
  line-height: 1;
}

.progress-bar {
  position: relative;
  margin: 0 28rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(47, 155, 99, 0.10);
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #5fb78a, #1f7c4b);
  border-radius: 999rpx;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slot-track {
  padding: 26rpx 28rpx 30rpx;
  display: flex;
  gap: 14rpx;
  overflow-x: auto;
}

.slot-item {
  flex: 0 0 138rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.slot-avatar-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
}

.slot-avatar {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 36rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(31, 124, 75, 0.22);
}

.slot-item--ready .slot-avatar {
  animation: avatar-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes avatar-pop {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.slot-avatar--empty {
  background: linear-gradient(135deg, #f4eee2, #e6dcc9);
  color: #b39c75;
  box-shadow: inset 0 0 0 1px rgba(176, 134, 60, 0.20);
  flex-direction: row;
  gap: 4rpx;
}

.waiting-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #b39c75;
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.waiting-dot:nth-child(2) { animation-delay: 0.2s; }
.waiting-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.slot-badge {
  position: absolute;
  right: -2rpx;
  bottom: -2rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #1f7c4b;
  color: #fff;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #fff;
  box-sizing: border-box;
}

.slot-name {
  max-width: 130rpx;
  color: #14291f;
  font-size: 25rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-name--muted {
  color: #828a7e;
  font-weight: 600;
}

.slot-tag {
  padding: 3rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(47, 155, 99, 0.10);
  color: #1f7c4b;
  font-size: 20rpx;
  font-weight: 700;
}

.slot-tag--muted {
  background: rgba(176, 134, 60, 0.10);
  color: #b39c75;
}

/* ========== 订单信息卡 ========== */
.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
  border-bottom: 1px solid rgba(42, 63, 48, 0.06);
}

.order-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.order-grid {
  padding: 12rpx 28rpx 6rpx;
}

.info-row {
  min-height: 64rpx;
  display: grid;
  grid-template-columns: 168rpx 1fr;
  align-items: center;
  gap: 18rpx;
  border-bottom: 1px dashed rgba(42, 63, 48, 0.06);
}

.info-row:last-child {
  border-bottom: 0;
}

.info-label {
  color: #828a7e;
  font-size: 25rpx;
  font-weight: 600;
}

.info-value {
  min-width: 0;
  color: #1e2a22;
  font-size: 27rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount-strip {
  margin: 14rpx 20rpx 22rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #f4faf3 0%, #fffaf0 100%);
  border: 1px solid rgba(47, 155, 99, 0.10);
}

.amount-left {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.amount-label {
  color: #5a6b5b;
  font-size: 24rpx;
  font-weight: 700;
}

.amount-unit {
  color: #aab1a5;
  font-size: 20rpx;
  font-weight: 600;
}

.amount-value {
  margin-left: auto;
  margin-right: 14rpx;
  color: #1f7c4b;
  font-size: 38rpx;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5rpx;
}

.amount-shield {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(216, 161, 68, 0.14);
  border: 1px solid rgba(216, 161, 68, 0.20);
}

.shield-icon {
  width: 24rpx;
  height: 24rpx;
  border-radius: 6rpx;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 16rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shield-text {
  color: #a87520;
  font-size: 20rpx;
  font-weight: 800;
}

/* ========== 底部操作 ========== */
.footer-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  padding: 16rpx;
  display: flex;
  gap: 14rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -4rpx 24rpx rgba(38, 69, 54, 0.08);
  border: 1px solid rgba(42, 63, 48, 0.06);
  z-index: 10;
}

.footer-actions .club-btn {
  flex: 1;
  min-width: 0;
  min-height: 78rpx;
  padding: 0 16rpx;
  border-radius: 20rpx;
  font-size: 27rpx;
  font-weight: 800;
  line-height: 78rpx;
}

.club-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  box-shadow: 0 12rpx 24rpx rgba(31, 124, 75, 0.22);
}

.club-btn--service {
  color: #a87520;
  background: #fffdf8;
  border: 1px solid rgba(216, 161, 68, 0.48);
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .indicator-pulse,
  .ambient-ring,
  .slot-item--ready .slot-avatar,
  .waiting-dot {
    animation: none;
  }
}
</style>
