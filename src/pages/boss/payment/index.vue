<template>
  <view class="club-page payment-page">
    <!-- 顶部状态条 -->
    <view class="status-strip">
      <view class="strip-indicator">
        <view class="indicator-pulse"></view>
        <view class="indicator-dot" :class="paidClass ? 'indicator-dot--success' : 'indicator-dot--warn'"></view>
      </view>
      <text class="strip-text">{{ stripText }}</text>
      <text class="strip-link" :class="paidClass ? 'strip-link--success' : ''">{{ payStatusText }}</text>
    </view>

    <!-- 支付金额主视觉 -->
    <view v-if="orderInfo" class="amount-hero">
      <view class="amount-bg">
        <view class="ambient-glow ambient-glow--left"></view>
        <view class="ambient-glow ambient-glow--right"></view>
      </view>
      <view class="amount-content">
        <view class="amount-eyebrow">
          <text class="eyebrow-dot">●</text>
          <text>{{ orderInfo.status === '已完成' ? '支付完成 · 感谢使用' : '待支付金额' }}</text>
        </view>
        <view class="amount-row">
          <text class="amount-currency">¥</text>
          <text class="amount-value">{{ orderAmount }}</text>
        </view>
        <view class="amount-meta">
          <text>订单号 {{ orderNo }}</text>
          <text class="amount-meta-sep">·</text>
          <text>服务已结束</text>
        </view>
        <view class="amount-shield">
          <view class="shield-icon">盾</view>
          <view class="shield-text">
            <text class="shield-title">平台保障</text>
            <text class="shield-sub">服务满意后再付款 · 资金第三方监管</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 订单明细 -->
    <view v-if="orderInfo" class="detail-card">
      <view class="detail-head">
        <text class="detail-eyebrow">费用明细</text>
        <text class="detail-status" :class="statusClass(orderInfo.status)">{{ orderInfo.status }}</text>
      </view>
      <view class="detail-grid">
        <view class="info-row">
          <text class="info-label">选择套餐</text>
          <text class="info-value">{{ orderInfo.package_name || '待确认' }}</text>
        </view>
        <view v-if="orderInfo.addon_name" class="info-row">
          <text class="info-label">附加项</text>
          <text class="info-value">{{ orderInfo.addon_name }}</text>
        </view>
        <view v-if="orderInfo.duration_minutes" class="info-row">
          <text class="info-label">实际服务</text>
          <text class="info-value">{{ Math.floor(orderInfo.duration_minutes / 60) }} 小时 {{ orderInfo.duration_minutes % 60 }} 分钟</text>
        </view>
        <view v-if="orderInfo.booked_hours" class="info-row">
          <text class="info-label">预订时长</text>
          <text class="info-value">{{ orderInfo.booked_hours }} 小时</text>
        </view>
        <view class="info-row">
          <text class="info-label">应付总额</text>
          <text class="info-value info-value--accent">¥{{ orderAmount }}</text>
        </view>
      </view>
    </view>

    <!-- 陪玩阵容 -->
    <view v-if="orderInfo?.players?.length" class="players-card">
      <view class="players-head">
        <text class="players-eyebrow">服务阵容</text>
        <text class="players-count">{{ orderInfo.players.length }} 位陪玩</text>
      </view>
      <scroll-view scroll-x class="players-track" show-scrollbar="false">
        <view v-for="player in orderInfo.players" :key="player.id" class="player-card">
          <view class="player-avatar">
            <text>{{ player.name?.[0] || '陪' }}</text>
          </view>
          <view class="player-info">
            <text class="player-name">{{ player.name }}</text>
            <text class="player-type">{{ player.type_name || '陪玩' }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 支付方式 -->
    <view v-if="showPayPanel" class="pay-card">
      <view class="pay-head">
        <text class="pay-eyebrow">支付方式</text>
        <text class="pay-hint">推荐使用微信支付</text>
      </view>
      <view
        class="pay-option"
        :class="{ active: payMethod === 'wechat' }"
        @tap="payMethod = 'wechat'"
      >
        <view class="pay-option-icon pay-option-icon--wechat">
          <text>微</text>
        </view>
        <view class="pay-option-main">
          <text class="pay-option-title">微信支付</text>
          <text class="pay-option-sub">安全快捷 · 推荐</text>
        </view>
        <view class="pay-option-radio">
          <view class="radio-dot" v-if="payMethod === 'wechat'"></view>
        </view>
      </view>
      <view
        class="pay-option"
        :class="{ active: payMethod === 'manual' }"
        @tap="payMethod = 'manual'"
      >
        <view class="pay-option-icon pay-option-icon--manual">
          <text>客</text>
        </view>
        <view class="pay-option-main">
          <text class="pay-option-title">人工确认已支付</text>
          <text class="pay-option-sub">支付遇到问题？联系客服</text>
        </view>
        <view class="pay-option-radio">
          <view class="radio-dot" v-if="payMethod === 'manual'"></view>
        </view>
      </view>

      <view v-if="payment?.mock && payMethod === 'wechat'" class="mock-hint">
        <text class="mock-icon">测</text>
        <text>检测到当前为沙箱环境，可使用模拟支付</text>
      </view>

      <button
        v-if="payMethod === 'wechat'"
        class="club-btn club-btn--primary club-btn--xl"
        :disabled="paying"
        @tap="payByWechat"
      >
        <text class="pay-btn-icon">微</text>
        <text>{{ paying ? '拉起支付中...' : `确认支付 ¥${orderAmount}` }}</text>
      </button>
      <button
        v-else
        class="club-btn club-btn--primary club-btn--xl"
        :disabled="confirming"
        @tap="confirmPayment"
      >
        <text>{{ confirming ? '提交中...' : '提交人工确认' }}</text>
      </button>

      <button
        v-if="payment?.mock"
        class="mock-btn"
        :disabled="simulating"
        @tap="simulatePayment"
      >
        {{ simulating ? '处理中...' : '模拟支付成功（沙箱）' }}
      </button>
    </view>

    <!-- 已完成 -->
    <view v-if="orderInfo?.status === '已完成'" class="paid-card">
      <view class="paid-orb">
        <view class="paid-ring paid-ring--outer"></view>
        <view class="paid-ring paid-ring--inner"></view>
        <view class="paid-icon">✓</view>
      </view>
      <text class="paid-title">订单已完成</text>
      <text class="paid-sub">感谢使用偷吃电竞，期待再次为您服务</text>
    </view>

    <!-- 评价打手 -->
    <view v-if="orderInfo?.players?.length" class="rating-card">
      <view class="rating-head">
        <text class="rating-eyebrow">评价陪玩</text>
        <text class="rating-hint">您的评价将帮助其他玩家</text>
      </view>
      <view class="rating-list">
        <view v-for="player in orderInfo.players" :key="player.id" class="rating-item">
          <view class="rating-player">
            <view class="rating-avatar">{{ player.name?.[0] || '陪' }}</view>
            <view class="rating-player-info">
              <text class="rating-player-name">{{ player.name }}</text>
              <text class="rating-player-type">{{ player.type_name || '陪玩' }}</text>
            </view>
          </view>
          <view class="stars">
            <text
              v-for="star in 5"
              :key="star"
              class="star"
              :class="{ active: (ratings[player.id] || 0) >= star }"
              @tap="ratings[player.id] = star"
            >★</text>
          </view>
        </view>
      </view>
      <textarea
        v-model="ratingComment"
        class="rating-textarea"
        placeholder="留下您的真实评价（可选，60字内）"
        maxlength="60"
        placeholder-style="color: #aab1a5; font-size: 26rpx;"
      />
      <view class="rating-textarea-count">{{ ratingComment.length }} / 60</view>
      <button
        class="club-btn club-btn--primary"
        :disabled="ratingSubmitting || ratingsSubmitted"
        @tap="submitRatings"
      >
        {{ ratingsSubmitted ? '已评价' : (ratingSubmitting ? '提交中...' : '提交评价') }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { confirmSelfPayment, getOrder, ratePlayer } from '@/api/boss'
import { createMiniProgramPayment, createPayment, getPaymentStatus, mockPaymentSuccess } from '@/api/pay'
import { getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const payment = ref<any>(null)
const paying = ref(false)
const confirming = ref(false)
const simulating = ref(false)
const payMethod = ref<'wechat' | 'manual'>('wechat')
const ratings = ref<Record<number, number>>({})
const ratingComment = ref('')
const ratingSubmitting = ref(false)
const ratingsSubmitted = ref(false)

const showPayPanel = computed(() => orderInfo.value && !orderInfo.value.paid && orderInfo.value.status !== '已完成')

const orderAmount = computed(() =>
  Number(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0).toFixed(2)
)

const paidClass = computed(() => orderInfo.value?.status === '已完成' || orderInfo.value?.paid)

const payStatusText = computed(() => {
  if (!orderInfo.value) return '加载中'
  if (orderInfo.value.status === '已完成') return '已完成'
  if (orderInfo.value.paid) return '已支付'
  return '待支付'
})

const stripText = computed(() => {
  if (!orderInfo.value) return '订单加载中'
  if (orderInfo.value.status === '已完成') return '订单已完成，期待再次为您服务'
  if (orderInfo.value.paid) return '支付已确认，等待服务结算'
  return '服务已完成，请尽快支付以保障双方权益'
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

async function fetchOrder() {
  if (!orderNo.value) return
  orderInfo.value = await getOrder(orderNo.value)
}

async function payByWechat() {
  if (!orderNo.value) return
  paying.value = true
  try {
    const loginRes: any = await new Promise((resolve, reject) => uni.login({ provider: 'weixin', success: resolve, fail: reject }))
    const payParams = await createMiniProgramPayment(orderNo.value, loginRes.code)
    await new Promise<void>((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType as any,
        paySign: payParams.paySign,
        success: () => resolve(),
        fail: reject
      })
    })
    if (payParams.payment_no) payment.value = await getPaymentStatus(payParams.payment_no)
    await fetchOrder()
    success('支付完成')
  } catch (error) {
    try {
      payment.value = await createPayment(orderNo.value, 'wechat')
    } catch {}
    toast(getErrorMessage(error, '支付暂不可用，可提交人工确认'))
  } finally {
    paying.value = false
  }
}

async function simulatePayment() {
  if (!payment.value?.payment_no) return
  simulating.value = true
  try {
    payment.value = await mockPaymentSuccess(payment.value.payment_no)
    await fetchOrder()
    success('模拟支付成功')
  } catch (error) {
    toast(getErrorMessage(error, '模拟支付失败'))
  } finally {
    simulating.value = false
  }
}

async function confirmPayment() {
  confirming.value = true
  try {
    await confirmSelfPayment(orderNo.value, Number(orderAmount.value))
    await fetchOrder()
    success('已提交人工确认')
  } catch (error) {
    toast(getErrorMessage(error, '提交失败'))
  } finally {
    confirming.value = false
  }
}

async function submitRatings() {
  const playerIds = Object.keys(ratings.value).map(Number).filter(id => ratings.value[id] > 0)
  if (!playerIds.length) return toast('请至少给一位陪玩评分')
  ratingSubmitting.value = true
  try {
    for (const playerId of playerIds) {
      await ratePlayer(orderNo.value, playerId, ratings.value[playerId], ratingComment.value || null)
    }
    ratingsSubmitted.value = true
    success('评价成功')
  } catch (error) {
    toast(getErrorMessage(error, '评价失败'))
  } finally {
    ratingSubmitting.value = false
  }
}

onLoad((query) => {
  orderNo.value = String(query?.orderNo || '')
})

onMounted(async () => {
  try {
    await fetchOrder()
    if (showPayPanel.value) {
      try { payment.value = await createPayment(orderNo.value, 'wechat') } catch {}
    }
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.payment-page {
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
  z-index: 1;
}

.indicator-dot--warn {
  background: linear-gradient(135deg, #ef5b5b, #c43232);
  box-shadow: 0 0 0 4rpx rgba(239, 91, 91, 0.20);
}

.indicator-dot--success {
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  box-shadow: 0 0 0 4rpx rgba(47, 155, 99, 0.20);
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
  color: #c43232;
  font-size: 22rpx;
  font-weight: 800;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(239, 91, 91, 0.10);
  border: 1px solid rgba(239, 91, 91, 0.18);
}

.strip-link--success {
  color: #1f7c4b;
  background: rgba(47, 155, 99, 0.10);
  border-color: rgba(47, 155, 99, 0.18);
}

/* ========== 支付金额主视觉 ========== */
.amount-hero {
  position: relative;
  margin-top: 22rpx;
  padding: 36rpx 32rpx 30rpx;
  overflow: hidden;
  border: 1px solid rgba(47, 155, 99, 0.12);
  border-radius: 28rpx;
  background: linear-gradient(135deg, #173426 0%, #1f7c4b 60%, #2f9b63 100%);
  box-shadow: 0 20rpx 44rpx rgba(23, 52, 38, 0.20);
}

.amount-bg {
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
  top: -80rpx;
  left: -80rpx;
  width: 240rpx;
  height: 240rpx;
  background: radial-gradient(circle, rgba(216, 161, 68, 0.50), transparent 70%);
}

.ambient-glow--right {
  bottom: -100rpx;
  right: -100rpx;
  width: 280rpx;
  height: 280rpx;
  background: radial-gradient(circle, rgba(95, 183, 138, 0.60), transparent 70%);
}

.amount-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  align-items: center;
  text-align: center;
}

.amount-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.20);
  color: rgba(255, 255, 255, 0.92);
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 0.3rpx;
}

.eyebrow-dot {
  color: #f3d79b;
  font-size: 18rpx;
  animation: live-blink 1.4s ease-in-out infinite;
}

@keyframes live-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.amount-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  color: #fff;
}

.amount-currency {
  font-size: 36rpx;
  font-weight: 900;
  color: #f3d79b;
}

.amount-value {
  font-size: 88rpx;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2rpx;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.20);
}

.amount-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: rgba(255, 255, 255, 0.72);
  font-size: 22rpx;
  font-weight: 600;
}

.amount-meta-sep {
  color: rgba(255, 255, 255, 0.40);
}

.amount-shield {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
  padding: 14rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.20);
}

.shield-icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #173426;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shield-text {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  text-align: left;
}

.shield-title {
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
  line-height: 1.2;
}

.shield-sub {
  color: rgba(255, 255, 255, 0.72);
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.3;
}

/* ========== 通用卡片 ========== */
.detail-card,
.players-card,
.pay-card,
.rating-card {
  margin-top: 22rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
  overflow: hidden;
}

/* ========== 费用明细 ========== */
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
  border-bottom: 1px solid rgba(42, 63, 48, 0.06);
}

.detail-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.detail-status {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 800;
}

.detail-grid {
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
  font-size: 32rpx;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

/* ========== 陪玩阵容 ========== */
.players-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 24rpx 28rpx 14rpx;
}

.players-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.players-count {
  color: #5a6b5b;
  font-size: 22rpx;
  font-weight: 700;
}

.players-track {
  white-space: nowrap;
  padding: 4rpx 28rpx 26rpx;
}

.player-card {
  display: inline-flex;
  vertical-align: top;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  width: 156rpx;
  margin-right: 14rpx;
  padding: 18rpx 14rpx;
  border-radius: 20rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f7faf4 100%);
  border: 1px solid rgba(47, 155, 99, 0.10);
}

.player-avatar {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 32rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 22rpx rgba(31, 124, 75, 0.20);
}

.player-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.player-name {
  color: #14291f;
  font-size: 25rpx;
  font-weight: 900;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-type {
  color: #828a7e;
  font-size: 20rpx;
  font-weight: 600;
}

/* ========== 支付方式 ========== */
.pay-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 24rpx 28rpx 14rpx;
}

.pay-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.pay-hint {
  color: #5a6b5b;
  font-size: 22rpx;
  font-weight: 700;
}

.pay-option {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin: 0 18rpx 14rpx;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: #f7faf4;
  border: 1px solid rgba(36, 55, 39, 0.08);
  transition: all 0.2s ease;
}

.pay-option.active {
  background: #f0f9f0;
  border-color: rgba(47, 155, 99, 0.40);
  box-shadow: 0 8rpx 18rpx rgba(47, 155, 99, 0.10);
}

.pay-option-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 900;
  color: #fff;
  flex-shrink: 0;
}

.pay-option-icon--wechat {
  background: linear-gradient(135deg, #4ec269, #1a7e3c);
}

.pay-option-icon--manual {
  background: linear-gradient(135deg, #173426, #1f7c4b);
  color: #f3d79b;
}

.pay-option-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.pay-option-title {
  color: #14291f;
  font-size: 28rpx;
  font-weight: 800;
}

.pay-option-sub {
  color: #828a7e;
  font-size: 21rpx;
  font-weight: 600;
}

.pay-option-radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(36, 55, 39, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #fff;
  box-sizing: border-box;
}

.pay-option.active .pay-option-radio {
  border-color: #1f7c4b;
  border-width: 2rpx;
}

.radio-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
}

.mock-hint {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin: 6rpx 18rpx 14rpx;
  padding: 12rpx 16rpx;
  border-radius: 14rpx;
  background: rgba(216, 161, 68, 0.08);
  border: 1px dashed rgba(216, 161, 68, 0.30);
  color: #8b6a3b;
  font-size: 22rpx;
  font-weight: 700;
}

.mock-icon {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #fff;
  font-size: 18rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.club-btn--xl {
  margin: 4rpx 18rpx 14rpx;
  min-height: 96rpx;
  font-size: 32rpx;
  font-weight: 900;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.pay-btn-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.20);
  color: #fff;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mock-btn {
  margin: 0 18rpx 20rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: transparent;
  color: #8b6a3b;
  font-size: 25rpx;
  font-weight: 700;
  border: 1px dashed rgba(216, 161, 68, 0.40);
}

/* ========== 已完成 ========== */
.paid-card {
  margin-top: 22rpx;
  padding: 48rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  border: 1px solid rgba(47, 155, 99, 0.12);
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f0f9f0 0%, #ffffff 100%);
  box-shadow: 0 14rpx 36rpx rgba(47, 155, 99, 0.10);
}

.paid-orb {
  position: relative;
  width: 144rpx;
  height: 144rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paid-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2rpx solid rgba(47, 155, 99, 0.20);
}

.paid-ring--outer {
  animation: paid-breathe 2.4s ease-in-out infinite;
}

.paid-ring--inner {
  inset: 16rpx;
  border-color: rgba(47, 155, 99, 0.30);
  animation: paid-breathe 2.4s ease-in-out infinite 0.6s;
}

@keyframes paid-breathe {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.08); opacity: 0.8; }
}

.paid-icon {
  position: relative;
  z-index: 1;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 56rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx rgba(31, 124, 75, 0.22);
}

.paid-title {
  margin-top: 4rpx;
  color: #14291f;
  font-size: 36rpx;
  font-weight: 900;
  letter-spacing: -0.5rpx;
}

.paid-sub {
  color: #5a6b5b;
  font-size: 24rpx;
  font-weight: 600;
}

/* ========== 评价打手 ========== */
.rating-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 24rpx 28rpx 14rpx;
}

.rating-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
}

.rating-hint {
  color: #5a6b5b;
  font-size: 21rpx;
  font-weight: 700;
}

.rating-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  padding: 0 18rpx 8rpx;
}

.rating-item {
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f7faf4 100%);
  border: 1px solid rgba(36, 55, 39, 0.08);
}

.rating-player {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.rating-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 26rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rating-player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.rating-player-name {
  color: #14291f;
  font-size: 27rpx;
  font-weight: 800;
}

.rating-player-type {
  color: #828a7e;
  font-size: 21rpx;
  font-weight: 600;
}

.stars {
  margin-top: 14rpx;
  display: flex;
  gap: 8rpx;
  justify-content: center;
  padding: 4rpx 0;
  border-top: 1px dashed rgba(36, 55, 39, 0.06);
  padding-top: 14rpx;
}

.star {
  font-size: 44rpx;
  line-height: 1;
  color: #d6d9d0;
  transition: color 0.2s ease, transform 0.2s ease;
  padding: 0 4rpx;
}

.star.active {
  color: #d8a144;
}

.star:active {
  transform: scale(1.15);
}

.rating-textarea {
  margin: 4rpx 18rpx 0;
  width: calc(100% - 36rpx);
  min-height: 110rpx;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: #fffaf2;
  border: 1px solid rgba(216, 161, 68, 0.24);
  font-size: 26rpx;
  color: #14291f;
  line-height: 1.5;
  box-sizing: border-box;
}

.rating-textarea-count {
  margin: 6rpx 32rpx 0;
  text-align: right;
  color: #aab1a5;
  font-size: 21rpx;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .indicator-pulse,
  .eyebrow-dot,
  .paid-ring--outer,
  .paid-ring--inner {
    animation: none;
  }
}
</style>
