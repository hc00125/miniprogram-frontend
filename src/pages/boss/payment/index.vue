<template>
  <view class="payment-page">
    <view class="status-card" :class="{ 'status-card--paid': paidClass }">
      <view class="status-dot"></view>
      <view class="status-main">
        <text class="status-title">{{ stripText }}</text>
        <text class="status-sub">订单号 {{ orderNo }}</text>
      </view>
      <text class="status-pill">{{ payStatusText }}</text>
    </view>

    <view v-if="orderInfo" class="amount-card">
      <text class="amount-label">{{ paidClass ? '已支付金额' : '待支付金额' }}</text>
      <view class="amount-row">
        <text>¥</text>
        <text>{{ orderAmount }}</text>
      </view>
      <view class="secure-tip">
        <text class="secure-icon">盾</text>
        <text>本订单使用微信官方小程序虚拟支付</text>
      </view>
    </view>

    <view v-if="orderInfo" class="detail-card">
      <view class="card-head">
        <text>订单明细</text>
        <text class="order-status">{{ orderInfo.status }}</text>
      </view>
      <view class="info-row">
        <text>套餐</text>
        <text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text>
      </view>
      <view v-if="orderInfo.kook_room_number" class="info-row">
        <text>KOOK房间号</text>
        <text class="copy-text" @tap="copyText(orderInfo.kook_room_number)">{{ orderInfo.kook_room_number }} · 复制</text>
      </view>
      <view v-if="orderInfo.addon_name" class="info-row">
        <text>附加项</text>
        <text>{{ orderInfo.addon_name }}</text>
      </view>
      <view v-if="orderInfo.booked_hours" class="info-row">
        <text>预订时长</text>
        <text>{{ orderInfo.booked_hours }} 小时</text>
      </view>
      <view v-if="orderInfo.duration_minutes" class="info-row">
        <text>实际服务</text>
        <text>{{ Math.floor(orderInfo.duration_minutes / 60) }}小时 {{ orderInfo.duration_minutes % 60 }}分钟</text>
      </view>
      <view class="info-row info-row--total">
        <text>应付总额</text>
        <text>¥{{ orderAmount }}</text>
      </view>
    </view>

    <view v-if="orderInfo?.players?.length" class="players-card">
      <view class="card-head">
        <text>服务阵容</text>
        <text>{{ orderInfo.players.length }}位陪玩</text>
      </view>
      <scroll-view scroll-x class="players-track" show-scrollbar="false">
        <view v-for="player in orderInfo.players" :key="player.id" class="player-item">
          <image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="player-avatar player-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <text class="player-name">{{ player.name }}</text>
          <text class="player-type">{{ player.type_name || '陪玩' }}</text>
        </view>
      </scroll-view>
    </view>

    <view v-if="showPayPanel" class="virtual-pay-card">
      <view class="virtual-pay-head">
        <view class="wechat-icon">微</view>
        <view>
          <text class="virtual-pay-title">微信虚拟支付</text>
          <text class="virtual-pay-sub">官方支付能力 · 安全完成虚拟服务交易</text>
        </view>
      </view>

      <view class="virtual-notice">
        <text></text>
        <text>当前沙箱阶段仅支持已绑定微信道具的固定价格单商品订单。</text>
      </view>

      <button class="pay-button" :disabled="paying" @tap="payByWechat">
        {{ paying ? '正在拉起虚拟支付...' : `微信虚拟支付 ¥${orderAmount}` }}
      </button>
      <text class="pay-help">支付成功以微信服务器查询结果为准，请勿重复点击。</text>
    </view>

    <view v-if="paidClass" class="completed-card">
      <view class="completed-icon">✓</view>
      <text class="completed-title">订单已完成</text>
      <text class="completed-sub">支付已由微信虚拟支付确认，感谢使用偷吃电竞</text>
    </view>

    <view v-if="paidClass && orderInfo?.players?.length" class="rating-card">
      <view class="card-head">
        <text>评价陪玩</text>
        <text>您的评价将帮助其他老板</text>
      </view>
      <view v-for="player in orderInfo.players" :key="player.id" class="rating-item">
        <view class="rating-player">
          <image v-if="player.avatar_url" class="rating-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="rating-avatar rating-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <view>
            <text>{{ player.name }}</text>
            <text>{{ player.type_name || '陪玩' }}</text>
          </view>
        </view>
        <view class="stars">
          <text
            v-for="star in 5"
            :key="star"
            :class="{ active: (ratings[player.id] || 0) >= star }"
            @tap="ratings[player.id] = star"
          >★</text>
        </view>
      </view>
      <textarea
        v-model="ratingComment"
        class="rating-textarea"
        maxlength="60"
        placeholder="留下您的真实评价（可选）"
      />
      <button class="rating-button" :disabled="ratingSubmitting || ratingsSubmitted" @tap="submitRatings">
        {{ ratingsSubmitted ? '已评价' : (ratingSubmitting ? '提交中...' : '提交评价') }}
      </button>
    </view>

    <view v-if="loading" class="loading-state">订单加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getOrder, ratePlayer } from '@/api/boss'
import { createMiniProgramPayment, getPaymentStatus } from '@/api/pay'
import { getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const loading = ref(true)
const paying = ref(false)
const ratings = ref<Record<number, number>>({})
const ratingComment = ref('')
const ratingSubmitting = ref(false)
const ratingsSubmitted = ref(false)

const showPayPanel = computed(() => Boolean(
  orderInfo.value
  && !orderInfo.value.paid
  && orderInfo.value.status !== '已完成'
))

const orderAmount = computed(() =>
  Number(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0).toFixed(2)
)

const paidClass = computed(() => Boolean(
  orderInfo.value?.status === '已完成' || orderInfo.value?.paid
))

const payStatusText = computed(() => {
  if (!orderInfo.value) return '加载中'
  if (paidClass.value) return '已支付'
  return '待支付'
})

const stripText = computed(() => {
  if (!orderInfo.value) return '订单加载中'
  if (paidClass.value) return '订单支付完成'
  return '服务已完成，请使用微信虚拟支付'
})

async function fetchOrder() {
  if (!orderNo.value) return
  loading.value = true
  try {
    orderInfo.value = await getOrder(orderNo.value)
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  } finally {
    loading.value = false
  }
}

async function payByWechat() {
  if (!orderNo.value || paying.value) return
  paying.value = true
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录态获取失败，请重新进入小程序')

    const payParams = await createMiniProgramPayment(orderNo.value, loginResult.code)
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

    if (payParams.payment_no) await getPaymentStatus(payParams.payment_no)
    await fetchOrder()
    success('虚拟支付完成')
  } catch (error: any) {
    const errCode = Number(error?.errCode)
    if (errCode === -2 || /cancel/i.test(String(error?.errMsg || ''))) {
      toast('已取消支付')
    } else {
      toast(getErrorMessage(error, '虚拟支付失败，请稍后重试'))
    }
  } finally {
    paying.value = false
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

function copyText(value: string) {
  uni.setClipboardData({ data: value, success: () => success('已复制') })
}

onLoad((query) => {
  orderNo.value = String(query?.orderNo || '')
})

onShow(fetchOrder)
</script>

<style lang="scss" scoped>
.payment-page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(70rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background:
    radial-gradient(circle at 10% 0%, rgba(47, 155, 99, 0.12), transparent 30%),
    radial-gradient(circle at 90% 12%, rgba(216, 161, 68, 0.12), transparent 28%),
    #f7f3ea;
  color: #172116;
}

.status-card,
.amount-card,
.detail-card,
.players-card,
.virtual-pay-card,
.completed-card,
.rating-card {
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid rgba(39, 61, 42, 0.08);
  box-shadow: 0 14rpx 34rpx rgba(39, 61, 42, 0.06);
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 24rpx;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #d8a144;
  box-shadow: 0 0 0 8rpx rgba(216, 161, 68, 0.12);
}

.status-card--paid .status-dot { background: #2f9b63; box-shadow: 0 0 0 8rpx rgba(47, 155, 99, 0.12); }
.status-main { flex: 1; min-width: 0; }
.status-title { display: block; font-size: 27rpx; font-weight: 900; }
.status-sub { display: block; margin-top: 6rpx; color: #8a9286; font-size: 21rpx; }
.status-pill { padding: 7rpx 14rpx; border-radius: 999rpx; color: #a87520; font-size: 22rpx; font-weight: 900; background: #fff6df; }
.status-card--paid .status-pill { color: #1f7c4b; background: #eef8f1; }

.amount-card {
  padding: 36rpx 28rpx 30rpx;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72);
}
.amount-label { font-size: 24rpx; color: rgba(255,255,255,.78); }
.amount-row { display: flex; justify-content: center; align-items: baseline; gap: 8rpx; margin-top: 12rpx; }
.amount-row text:first-child { font-size: 38rpx; font-weight: 900; }
.amount-row text:last-child { font-size: 76rpx; line-height: 1; font-weight: 900; }
.secure-tip { display: inline-flex; align-items: center; gap: 10rpx; margin-top: 24rpx; padding: 10rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.12); font-size: 22rpx; }
.secure-icon { display: flex; align-items: center; justify-content: center; width: 34rpx; height: 34rpx; border-radius: 50%; background: rgba(255,255,255,.18); font-size: 18rpx; }

.detail-card,
.players-card,
.virtual-pay-card,
.rating-card { padding: 26rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.card-head text:first-child { font-size: 30rpx; font-weight: 900; }
.card-head text:last-child { color: #8a9286; font-size: 22rpx; }
.order-status { color: #1f7c4b !important; font-weight: 900; }
.info-row { min-height: 70rpx; display: flex; align-items: center; justify-content: space-between; gap: 24rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 25rpx; }
.info-row > text:first-child { flex-shrink: 0; color: #7d877a; }
.info-row > text:last-child { flex: 1; text-align: right; font-weight: 700; word-break: break-all; }
.info-row--total { border-bottom: 0; }
.info-row--total > text:last-child { color: #a87520; font-size: 31rpx; font-weight: 900; }
.copy-text { color: #1f7c4b; }

.players-track { white-space: nowrap; }
.player-item { width: 150rpx; display: inline-flex; flex-direction: column; align-items: center; margin-right: 14rpx; padding: 18rpx 10rpx; border-radius: 22rpx; background: #f7faf4; box-sizing: border-box; vertical-align: top; }
.player-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #e8efe7; }
.player-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 30rpx; font-weight: 900; background: #2f9b63; }
.player-name { max-width: 130rpx; margin-top: 10rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 24rpx; font-weight: 900; }
.player-type { margin-top: 4rpx; color: #8a9286; font-size: 20rpx; }

.virtual-pay-card { border-color: rgba(47,155,99,.18); }
.virtual-pay-head { display: flex; align-items: center; gap: 18rpx; }
.wechat-icon { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #fff; font-size: 29rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #16954d); }
.virtual-pay-title { display: block; font-size: 30rpx; font-weight: 900; }
.virtual-pay-sub { display: block; margin-top: 6rpx; color: #7d877a; font-size: 22rpx; }
.virtual-notice { display: flex; gap: 12rpx; margin-top: 22rpx; padding: 18rpx; border-radius: 18rpx; color: #78643a; font-size: 22rpx; line-height: 1.5; background: #fff8e8; }
.virtual-notice text:first-child { width: 10rpx; height: 10rpx; flex-shrink: 0; margin-top: 11rpx; border-radius: 50%; background: #d8a144; }
.virtual-notice text:last-child { flex: 1; }
.pay-button { width: 100%; height: 92rpx; margin-top: 22rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: #fff; font-size: 30rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #15934c); box-shadow: 0 12rpx 26rpx rgba(31, 156, 81, .22); }
.pay-button::after { border: none; }
.pay-button[disabled] { opacity: .62; }
.pay-help { display: block; margin-top: 14rpx; color: #9aa197; font-size: 21rpx; text-align: center; }

.completed-card { display: flex; flex-direction: column; align-items: center; padding: 36rpx 28rpx; text-align: center; }
.completed-icon { width: 90rpx; height: 90rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-size: 48rpx; font-weight: 900; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.completed-title { margin-top: 18rpx; font-size: 34rpx; font-weight: 900; }
.completed-sub { margin-top: 10rpx; color: #7d877a; font-size: 23rpx; line-height: 1.5; }

.rating-item { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid rgba(39,61,42,.07); }
.rating-player { display: flex; align-items: center; gap: 12rpx; }
.rating-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: #e8efe7; }
.rating-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; background: #2f9b63; }
.rating-player view text { display: block; }
.rating-player view text:first-child { font-size: 25rpx; font-weight: 900; }
.rating-player view text:last-child { margin-top: 4rpx; color: #8a9286; font-size: 20rpx; }
.stars { display: flex; gap: 6rpx; }
.stars text { color: #d9ded7; font-size: 34rpx; }
.stars text.active { color: #e1ac3f; }
.rating-textarea { width: 100%; min-height: 130rpx; margin-top: 18rpx; padding: 18rpx; border-radius: 18rpx; background: #f7faf4; box-sizing: border-box; font-size: 25rpx; }
.rating-button { width: 100%; height: 78rpx; margin-top: 16rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: #2f9b63; }
.rating-button::after { border: none; }

.loading-state { padding: 80rpx 20rpx; color: #8a9286; text-align: center; font-size: 26rpx; }
</style>
