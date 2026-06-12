<template>
  <view class="club-page progress-page">
    <!-- 顶部状态条 -->
    <view class="status-strip">
      <view class="strip-indicator">
        <view class="indicator-pulse"></view>
        <view class="indicator-dot indicator-dot--live"></view>
      </view>
      <text class="strip-text">服务正在进行中，请保持游戏内在线</text>
      <text class="strip-link strip-link--live">LIVE</text>
    </view>

    <!-- 直播主视觉：带渐变环 + 倒计时 -->
    <view class="live-hero">
      <view class="hero-bg">
        <view class="hero-ring hero-ring--outer"></view>
        <view class="hero-ring hero-ring--inner"></view>
        <view class="hero-core">
          <text class="core-eyebrow">服务时长</text>
          <text class="core-time">{{ duration }}</text>
          <text class="core-status">{{ durationStatus }}</text>
        </view>
      </view>
      <view class="hero-info">
        <view class="hero-eyebrow">SERVICE IN PROGRESS</view>
        <view class="hero-title">队伍已就位，服务进行中</view>
        <view class="hero-meta">
          <view class="meta-block">
            <text class="meta-label">订单号</text>
            <text class="meta-value">{{ orderNo || '加载中' }}</text>
          </view>
          <view class="meta-divider"></view>
          <view class="meta-block">
            <text class="meta-label">开始时间</text>
            <text class="meta-value">{{ startTimeText }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 建议金额：突出展示 -->
    <view v-if="orderInfo?.timer_started_at && orderInfo?.status === '进行中'" class="amount-card">
      <view class="amount-left">
        <view class="amount-eyebrow">
          <text class="live-dot">●</text>
          <text>实时计费中</text>
        </view>
        <view class="amount-value-row">
          <text class="amount-currency">¥</text>
          <text class="amount-value">{{ suggestedAmount }}</text>
        </view>
        <text class="amount-hint">已超过基础时长 {{ overtimeHint }}</text>
      </view>
      <view class="amount-shield">
        <text class="shield-icon">盾</text>
        <view>
          <text class="shield-title">平台保障</text>
          <text class="shield-sub">透明计费</text>
        </view>
      </view>
    </view>

    <!-- 陪玩阵容：横滑卡片 -->
    <view v-if="orderInfo" class="players-card">
      <view class="players-head">
        <view>
          <text class="players-eyebrow">陪玩阵容</text>
          <text class="players-count">{{ orderInfo.players?.length || 0 }} 位陪玩在线服务</text>
        </view>
        <button class="refresh-link" @tap="checkOrder">
          <text class="refresh-icon">↻</text>
          <text>刷新</text>
        </button>
      </view>

      <scroll-view scroll-x class="players-track" show-scrollbar="false">
        <view v-for="player in orderInfo.players" :key="player.id" class="player-card">
          <view class="player-avatar">
            <text>{{ player.name?.[0] || '陪' }}</text>
            <view class="online-tag">在线</view>
          </view>
          <view class="player-info">
            <text class="player-name">{{ player.name }}</text>
            <text class="player-type">{{ player.type_name || '陪玩' }}</text>
            <view class="player-stats">
              <text class="stat">★ {{ player.avg_rating || '5.0' }}</text>
              <text class="stat-dot">·</text>
              <text class="stat">接单 {{ player.total_orders || 0 }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 订单信息 -->
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
        <view v-if="orderInfo.addon_name" class="info-row">
          <text class="info-label">附加项</text>
          <text class="info-value">{{ orderInfo.addon_name }}</text>
        </view>
        <view v-if="orderInfo.game_id" class="info-row">
          <text class="info-label">游戏ID/队伍码</text>
          <text class="info-value">{{ orderInfo.game_id }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预订时长</text>
          <text class="info-value">{{ bookedHoursText }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">基础价格</text>
          <text class="info-value info-value--accent">¥{{ orderInfo.total_price_per_hour || 0 }}/小时</text>
        </view>
      </view>
    </view>

    <!-- 服务流程：时间轴 -->
    <view v-if="orderInfo" class="flow-card">
      <view class="flow-eyebrow">服务流程</view>
      <view class="flow-track">
        <view class="flow-step flow-step--done">
          <view class="flow-node">
            <text>✓</text>
          </view>
          <view class="flow-label">
            <text class="flow-title">下单成功</text>
            <text class="flow-time">{{ formatOrderTime(orderInfo.created_at) }}</text>
          </view>
        </view>
        <view class="flow-line flow-line--done"></view>
        <view class="flow-step flow-step--done">
          <view class="flow-node">
            <text>✓</text>
          </view>
          <view class="flow-label">
            <text class="flow-title">队伍已就位</text>
            <text class="flow-time">{{ formatOrderTime(orderInfo.start_time) }}</text>
          </view>
        </view>
        <view class="flow-line" :class="orderInfo.status === '待支付' ? 'flow-line--done' : 'flow-line--active'"></view>
        <view class="flow-step" :class="orderInfo.status === '待支付' || orderInfo.status === '已完成' ? 'flow-step--done' : 'flow-step--active'">
          <view class="flow-node">
            <text v-if="orderInfo.status === '待支付' || orderInfo.status === '已完成'">✓</text>
            <text v-else class="flow-pulse"></text>
          </view>
          <view class="flow-label">
            <text class="flow-title">服务进行中</text>
            <text class="flow-time">{{ duration }}</text>
          </view>
        </view>
        <view class="flow-line"></view>
        <view class="flow-step">
          <view class="flow-node flow-node--idle">4</view>
          <view class="flow-label">
            <text class="flow-title">完成支付</text>
            <text class="flow-time">¥{{ suggestedAmount }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="footer-actions">
      <button class="club-btn club-btn--ghost" @tap="goMain('home')">返回首页</button>
      <button v-if="orderInfo?.status === '进行中' && orderInfo?.timer_started_at && !orderInfo?.is_paused" class="club-btn club-btn--warn" @tap="pauseTimer">暂停</button>
      <button v-if="orderInfo?.status === '进行中' && orderInfo?.is_paused" class="club-btn club-btn--primary" @tap="resumeTimer">继续</button>
      <button v-if="orderInfo?.status === '进行中'" class="club-btn club-btn--warn" @tap="handleCancel">取消</button>
      <button v-if="orderInfo?.status === '待支付'" class="club-btn club-btn--primary" @tap="goPayment">立即支付 ¥{{ suggestedAmount }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cancelOrder, getOrder, pauseOrder, resumeOrder } from '@/api/boss'
import { formatDateTime as formatDateTimeValue, formatDuration } from '@/utils/format'
import { go, replace, relaunch } from '@/utils/nav'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const duration = ref('00:00:00')
let orderTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null
let prevStatus = ''

const startTimeText = computed(() => {
  return formatOrderTime(orderInfo.value?.start_time)
})

const bookedHoursText = computed(() => {
  const hours = Number(orderInfo.value?.booked_hours || 1)
  return `${hours}小时`
})

const durationStatus = computed(() => {
  if (orderInfo.value?.is_paused) return '已暂停'
  if (!orderInfo.value?.timer_started_at) return '等待开始'
  return '服务中'
})

const overtimeHint = computed(() => {
  if (!orderInfo.value?.timer_started_at) return '按基础时长计费'
  const start = new Date(orderInfo.value.timer_started_at).getTime()
  const now = orderInfo.value.is_paused && orderInfo.value.last_paused_at
    ? new Date(orderInfo.value.last_paused_at).getTime()
    : Date.now()
  const effectiveMin = ((now - start) / 1000 - (orderInfo.value.paused_duration || 0)) / 60
  const bookedMin = (orderInfo.value.booked_hours || 1) * 60
  const extraMin = effectiveMin - bookedMin
  if (extraMin <= 0) return '尚未超出'
  if (extraMin < 1) return `${Math.round(extraMin * 60)}秒`
  return `${Math.floor(extraMin)}分钟${extraMin % 1 > 0 ? ' ' + Math.round((extraMin % 1) * 60) + '秒' : ''}`
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

function updateDuration() {
  if (!orderInfo.value?.timer_started_at) {
    duration.value = orderInfo.value?.status === '进行中' ? '等待开始' : '00:00:00'
    return
  }
  const start = new Date(orderInfo.value.timer_started_at).getTime()
  const end = orderInfo.value.end_time
    ? new Date(orderInfo.value.end_time).getTime()
    : orderInfo.value.is_paused && orderInfo.value.last_paused_at
      ? new Date(orderInfo.value.last_paused_at).getTime()
      : Date.now()
  const paused = orderInfo.value.paused_duration || 0
  duration.value = formatDuration(Math.floor((end - start) / 1000) - paused)
}

const suggestedAmount = computed(() => {
  if (!orderInfo.value?.timer_started_at) return Number(orderInfo.value?.total_price_per_hour || 0).toFixed(2)
  const start = new Date(orderInfo.value.timer_started_at).getTime()
  const now = orderInfo.value.is_paused && orderInfo.value.last_paused_at ? new Date(orderInfo.value.last_paused_at).getTime() : Date.now()
  const effectiveMin = ((now - start) / 1000 - (orderInfo.value.paused_duration || 0)) / 60
  const bookedMin = (orderInfo.value.booked_hours || 1) * 60
  const basePrice = orderInfo.value.total_price_per_hour || 0
  const extraMin = effectiveMin - bookedMin
  if (extraMin <= 29) return basePrice.toFixed(2)
  const extraHalf = Math.ceil((extraMin - 29) / 30)
  return (basePrice + extraHalf * basePrice * 0.5).toFixed(2)
})

async function checkOrder() {
  if (!orderNo.value) return
  try {
    const res = await getOrder(orderNo.value)
    orderInfo.value = res
    updateDuration()
    if (prevStatus && prevStatus !== res.status) {
      if (res.status === '待支付') {
        stopTimers()
        replace('/pages/boss/payment/index', { orderNo: orderNo.value })
      } else if (res.status === '已取消') {
        stopTimers()
        toast('订单已取消')
        goMain('home')
      }
    } else if (!prevStatus && res.status === '待支付') {
      stopTimers()
      replace('/pages/boss/payment/index', { orderNo: orderNo.value })
    }
    prevStatus = res.status
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  }
}

async function pauseTimer() {
  try {
    await pauseOrder(orderNo.value)
    success('计时已暂停')
    checkOrder()
  } catch (error) {
    toast(getErrorMessage(error, '暂停失败'))
  }
}

async function resumeTimer() {
  try {
    await resumeOrder(orderNo.value)
    success('计时已继续')
    checkOrder()
  } catch (error) {
    toast(getErrorMessage(error, '继续失败'))
  }
}

async function handleCancel() {
  const ok = await confirm('确定要取消当前进行中的订单吗？')
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

function goPayment() {
  replace('/pages/boss/payment/index', { orderNo: orderNo.value })
}

function stopTimers() {
  if (orderTimer) clearInterval(orderTimer)
  if (durationTimer) clearInterval(durationTimer)
  orderTimer = null
  durationTimer = null
}

onLoad((query) => {
  orderNo.value = String(query?.orderNo || '')
})

onMounted(() => {
  checkOrder()
  orderTimer = setInterval(checkOrder, 5000)
  durationTimer = setInterval(updateDuration, 1000)
})

onUnmounted(stopTimers)

// 避开模板编译器的 e.unref 自动包装
const goMain = (tab = 'home') => relaunch('/pages/boss/home/index', { tab })
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.progress-page {
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
  border: 1px solid rgba(47, 155, 99, 0.18);
  border-radius: 22rpx;
  background: linear-gradient(90deg, rgba(47, 155, 99, 0.06), rgba(47, 155, 99, 0.02));
  box-shadow: 0 8rpx 22rpx rgba(31, 124, 75, 0.06);
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
  background: linear-gradient(135deg, #ef5b5b, #c43232);
  z-index: 1;
  box-shadow: 0 0 0 4rpx rgba(239, 91, 91, 0.20);
}

.indicator-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(239, 91, 91, 0.40);
  animation: pulse 1.4s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.4); opacity: 0; }
}

.strip-text {
  flex: 1;
  color: #2a3a30;
  font-size: 25rpx;
  line-height: 1.36;
  font-weight: 600;
}

.strip-link {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(239, 91, 91, 0.10);
  border: 1px solid rgba(239, 91, 91, 0.20);
  color: #c43232;
  font-size: 20rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

/* ========== 直播主视觉 ========== */
.live-hero {
  position: relative;
  margin-top: 22rpx;
  padding: 32rpx 28rpx 26rpx;
  border: 1px solid rgba(47, 155, 99, 0.10);
  border-radius: 28rpx;
  background:
    radial-gradient(circle at 8% 18%, rgba(255, 255, 255, 0.96), transparent 36%),
    radial-gradient(circle at 92% 28%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(135deg, #f1f7f1 0%, #f8fcf7 56%, #edf6f0 100%);
  box-shadow: 0 16rpx 40rpx rgba(31, 124, 75, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  overflow: hidden;
}

.hero-bg {
  position: relative;
  width: 240rpx;
  height: 240rpx;
  margin: 0 auto;
  flex-shrink: 0;
  align-self: center;
}

.hero-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(47, 155, 99, 0.18);
}

.hero-ring--outer {
  border-top-color: #5fb78a;
  border-right-color: rgba(216, 161, 68, 0.50);
  animation: ring-rotate 4s linear infinite;
}

.hero-ring--inner {
  inset: 30rpx;
  border-color: rgba(47, 155, 99, 0.24);
  border-bottom-color: #1f7c4b;
  animation: ring-rotate 6s linear infinite reverse;
}

@keyframes ring-rotate {
  to { transform: rotate(360deg); }
}

.hero-core {
  position: absolute;
  inset: 50rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 25%, #5fb78a, #1f7c4b 72%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  box-shadow:
    inset 0 6rpx 18rpx rgba(255, 255, 255, 0.18),
    0 16rpx 30rpx rgba(31, 107, 75, 0.26);
}

.core-eyebrow {
  color: rgba(255, 255, 255, 0.72);
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

.core-time {
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.5rpx;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace;
}

.core-status {
  padding: 3rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.20);
  color: #fff;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 0.3rpx;
  margin-top: 2rpx;
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  text-align: center;
}

.hero-eyebrow {
  color: #1f7c4b;
  font-size: 20rpx;
  font-weight: 900;
  letter-spacing: 1.5rpx;
  text-align: center;
}

.hero-title {
  color: #14291f;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -0.5rpx;
  text-align: center;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 22rpx;
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
  text-align: left;
}

.meta-label {
  color: #828a7e;
  font-size: 21rpx;
  font-weight: 700;
  letter-spacing: 0.3rpx;
}

.meta-value {
  color: #1e2a22;
  font-size: 25rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-divider {
  width: 1px;
  height: 36rpx;
  background: rgba(42, 63, 48, 0.10);
}

/* ========== 建议金额 ========== */
.amount-card {
  margin-top: 22rpx;
  padding: 24rpx 26rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border: 1px solid rgba(216, 161, 68, 0.20);
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fff7e6 0%, #fffaf0 100%);
  box-shadow: 0 14rpx 32rpx rgba(216, 161, 68, 0.10);
}

.amount-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.amount-eyebrow {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: #a87520;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 0.3rpx;
}

.live-dot {
  color: #ef5b5b;
  font-size: 18rpx;
  animation: live-blink 1.4s ease-in-out infinite;
}

@keyframes live-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.amount-value-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  color: #1f2a22;
}

.amount-currency {
  color: #a87520;
  font-size: 30rpx;
  font-weight: 900;
}

.amount-value {
  color: #1f2a22;
  font-size: 56rpx;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -1rpx;
  font-variant-numeric: tabular-nums;
}

.amount-hint {
  color: #8b7649;
  font-size: 21rpx;
  font-weight: 600;
}

.amount-shield {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(216, 161, 68, 0.20);
}

.shield-icon {
  width: 38rpx;
  height: 38rpx;
  border-radius: 10rpx;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shield-title {
  display: block;
  color: #6d5215;
  font-size: 22rpx;
  font-weight: 900;
  line-height: 1.2;
}

.shield-sub {
  display: block;
  color: #a8884a;
  font-size: 19rpx;
  font-weight: 600;
}

/* ========== 陪玩阵容 ========== */
.players-card,
.order-card,
.flow-card {
  margin-top: 22rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
  overflow: hidden;
}

.players-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  padding: 24rpx 28rpx 18rpx;
}

.players-eyebrow {
  display: block;
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.players-count {
  display: block;
  margin-top: 4rpx;
  color: #5a6b5b;
  font-size: 22rpx;
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

.players-track {
  white-space: nowrap;
  padding: 8rpx 28rpx 26rpx;
}

.player-card {
  display: inline-flex;
  vertical-align: top;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 200rpx;
  margin-right: 14rpx;
  padding: 22rpx 16rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f7faf4 100%);
  border: 1px solid rgba(47, 155, 99, 0.10);
}

.player-avatar {
  position: relative;
  width: 92rpx;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 38rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(31, 124, 75, 0.20);
}

.online-tag {
  position: absolute;
  right: -6rpx;
  bottom: -2rpx;
  padding: 3rpx 10rpx;
  border-radius: 999rpx;
  background: #1f7c4b;
  color: #fff;
  font-size: 18rpx;
  font-weight: 800;
  border: 2rpx solid #fff;
  box-sizing: border-box;
}

.player-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.player-name {
  color: #14291f;
  font-size: 26rpx;
  font-weight: 900;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-type {
  color: #828a7e;
  font-size: 21rpx;
  font-weight: 600;
}

.player-stats {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;
  color: #a87520;
  font-size: 20rpx;
  font-weight: 800;
}

.stat-dot {
  color: #c4bba3;
}

/* ========== 订单信息 ========== */
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

.info-value--accent {
  color: #1f7c4b;
  font-weight: 900;
}

/* ========== 服务流程 ========== */
.flow-card {
  padding: 24rpx 28rpx 28rpx;
}

.flow-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  margin-bottom: 22rpx;
  display: block;
}

.flow-track {
  display: flex;
  align-items: flex-start;
  position: relative;
}

.flow-step {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  min-width: 100rpx;
}

.flow-node {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 8rpx 18rpx rgba(31, 124, 75, 0.20);
}

.flow-node--idle {
  background: #e8e4d8;
  color: #a89e89;
  box-shadow: none;
  font-size: 24rpx;
}

.flow-step--active .flow-node {
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  box-shadow: 0 8rpx 18rpx rgba(216, 161, 68, 0.20);
}

.flow-pulse {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #fff;
  animation: live-blink 1.2s ease-in-out infinite;
}

.flow-label {
  text-align: center;
  max-width: 100rpx;
}

.flow-title {
  display: block;
  color: #14291f;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1.2;
}

.flow-time {
  display: block;
  margin-top: 2rpx;
  color: #828a7e;
  font-size: 19rpx;
  font-weight: 700;
}

.flow-line {
  flex: 1;
  height: 4rpx;
  margin-top: 26rpx;
  background: rgba(47, 155, 99, 0.10);
  position: relative;
}

.flow-line--done {
  background: linear-gradient(90deg, #5fb78a, #1f7c4b);
}

.flow-line--active {
  background: linear-gradient(90deg, #1f7c4b 30%, rgba(47, 155, 99, 0.10) 100%);
  background-size: 200% 100%;
  animation: flow-shimmer 2s linear infinite;
}

@keyframes flow-shimmer {
  to { background-position: -200% 0; }
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
  min-height: 82rpx;
  padding: 0 16rpx;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 82rpx;
}

.club-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  box-shadow: 0 12rpx 24rpx rgba(31, 124, 75, 0.22);
}

@media (prefers-reduced-motion: reduce) {
  .indicator-pulse,
  .hero-ring--outer,
  .hero-ring--inner,
  .live-dot,
  .flow-pulse,
  .flow-line--active {
    animation: none;
  }
}
</style>
