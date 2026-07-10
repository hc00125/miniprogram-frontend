<template>
  <view class="payment-page">
    <view class="status-card" :class="{ paid: paidClass }">
      <view class="status-dot"></view>
      <view class="status-main">
        <text class="status-title">{{ stripText }}</text>
        <text class="status-sub">订单号 {{ orderNo }}</text>
      </view>
      <text class="status-pill">{{ payStatusText }}</text>
    </view>

    <view v-if="orderInfo" class="amount-card">
      <text class="amount-label">{{ paidClass ? '已支付金额' : '待支付金额' }}</text>
      <view class="amount-row"><text>¥</text><text>{{ orderAmount }}</text></view>
      <view class="secure-tip"><text>盾</text><text>微信官方小程序虚拟支付</text></view>
    </view>

    <view v-if="loadError" class="error-card">
      <view class="error-icon">!</view>
      <view class="error-main">
        <text class="error-title">订单加载失败</text>
        <text class="error-detail">{{ loadError }}</text>
      </view>
      <button class="mini-button" @tap="fetchOrder">重新加载</button>
    </view>

    <view v-if="orderInfo" class="card detail-card">
      <view class="card-head"><text>订单明细</text><text>{{ orderInfo.status }}</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_name || orderInfo.spec_display_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view v-if="orderInfo.kook_room_number" class="info-row room-row" @tap="copyText(orderInfo.kook_room_number)">
        <text>KOOK房间号</text>
        <text>{{ orderInfo.kook_room_number }} · 复制</text>
      </view>
      <view v-if="orderInfo.addon_name" class="info-row"><text>附加项</text><text>{{ orderInfo.addon_name }}</text></view>
      <view v-if="orderInfo.booked_hours" class="info-row"><text>预订时长</text><text>{{ orderInfo.booked_hours }}小时</text></view>
      <view v-if="orderInfo.duration_minutes" class="info-row"><text>实际服务</text><text>{{ Math.floor(orderInfo.duration_minutes / 60) }}小时 {{ orderInfo.duration_minutes % 60 }}分钟</text></view>
      <view class="info-row total-row"><text>应付总额</text><text>¥{{ orderAmount }}</text></view>
    </view>

    <view v-if="orderInfo?.players?.length" class="card players-card">
      <view class="card-head"><text>服务阵容</text><text>{{ orderInfo.players.length }}位陪玩</text></view>
      <scroll-view scroll-x class="players-track" show-scrollbar="false">
        <view v-for="player in orderInfo.players" :key="player.id" class="player-item">
          <image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="player-avatar player-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <text class="player-name">{{ player.name }}</text>
          <text class="player-type">{{ player.type_name || '陪玩' }}</text>
        </view>
      </scroll-view>
    </view>

    <view v-if="payError" class="pay-error-card">
      <view class="pay-error-head">
        <view class="error-icon">!</view>
        <view class="error-main">
          <text class="error-title">{{ payError.title }}</text>
          <text class="error-detail">{{ payError.detail }}</text>
        </view>
      </view>
      <view v-if="payError.code" class="error-code" @tap="copyErrorInfo">
        <text>错误编号</text><text>{{ payError.code }} · 复制</text>
      </view>
      <text class="error-action">{{ payError.action }}</text>
      <view class="error-actions">
        <button class="ghost-button" @tap="copyErrorInfo">复制错误信息</button>
        <button class="retry-button" :disabled="paying" @tap="payByWechat">{{ paying ? '重试中...' : '重新尝试' }}</button>
      </view>
    </view>

    <view v-if="showPayPanel" class="card virtual-pay-card">
      <view class="virtual-head">
        <view class="wechat-icon">微</view>
        <view><text>微信虚拟支付</text><text>官方支付能力 · 服务器校验交易结果</text></view>
      </view>
      <view class="virtual-notice">
        <text></text>
        <text>支付前会核对微信道具、规格和订单金额。若失败，页面会显示具体原因与错误编号。</text>
      </view>
      <button class="pay-button" :disabled="paying" @tap="payByWechat">
        {{ paying ? '正在拉起虚拟支付...' : `微信虚拟支付 ¥${orderAmount}` }}
      </button>
      <text class="pay-help">支付成功以后微信服务器仍需数秒确认，请勿连续点击。</text>
    </view>

    <view v-if="paidClass" class="card completed-card">
      <view class="completed-icon">✓</view>
      <text class="completed-title">订单已完成</text>
      <text class="completed-sub">支付结果已经由微信服务器确认</text>
    </view>

    <view v-if="paidClass && orderInfo?.players?.length" class="card rating-card">
      <view class="card-head"><text>评价陪玩</text><text>帮助其他老板选择</text></view>
      <view v-for="player in orderInfo.players" :key="player.id" class="rating-item">
        <view class="rating-player">
          <image v-if="player.avatar_url" class="rating-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="rating-avatar rating-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <view><text>{{ player.name }}</text><text>{{ player.type_name || '陪玩' }}</text></view>
        </view>
        <view class="stars">
          <text v-for="star in 5" :key="star" :class="{ active: (ratings[player.id] || 0) >= star }" @tap="ratings[player.id] = star">★</text>
        </view>
      </view>
      <textarea v-model="ratingComment" class="rating-textarea" maxlength="60" placeholder="留下您的真实评价（选填）" />
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
import { createMiniProgramPayment } from '@/api/pay'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { requestWechatVirtualPayment } from '@/utils/virtual-payment'

type PayErrorState = {
  title: string
  detail: string
  action: string
  code: string
}

const orderNo = ref('')
const orderInfo = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const paying = ref(false)
const payError = ref<PayErrorState | null>(null)
const ratings = ref<Record<number, number>>({})
const ratingComment = ref('')
const ratingSubmitting = ref(false)
const ratingsSubmitted = ref(false)

const showPayPanel = computed(() => Boolean(orderInfo.value && !orderInfo.value.paid && orderInfo.value.status !== '已完成'))
const orderAmount = computed(() => Number(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0).toFixed(2))
const paidClass = computed(() => Boolean(orderInfo.value?.status === '已完成' || orderInfo.value?.paid))
const payStatusText = computed(() => !orderInfo.value ? '加载中' : paidClass.value ? '已支付' : '待支付')
const stripText = computed(() => !orderInfo.value ? '订单加载中' : paidClass.value ? '订单支付完成' : '服务已完成，请完成支付')

function extractCode(error: any) {
  return String(
    error?.error_id
    || error?.reference_id
    || error?.wechat_code
    || error?.errCode
    || error?.statusCode
    || ''
  )
}

function classifyPayError(error: any): PayErrorState {
  const detail = getErrorMessage(error, '虚拟支付失败，请稍后重试')
  const code = extractCode(error)
  const text = `${detail} ${error?.errMsg || ''}`.toLowerCase()

  if (/未绑定|绑定微信虚拟支付道具|product/.test(text)) {
    return { title: '商品暂不可支付', detail, action: '请联系管理员为当前商品规格绑定正确的微信虚拟道具。', code }
  }
  if (/金额|价格|不一致|price|fee/.test(text)) {
    return { title: '订单金额校验未通过', detail, action: '请确认订单仅包含一个固定价格规格，且没有额外加价或动态计费。', code }
  }
  if (/openid|登录态|session|重新登录|jscode/.test(text)) {
    return { title: '微信登录态已失效', detail, action: '请返回个人中心重新登录微信账号，然后再次进入订单支付页。', code }
  }
  if (/appkey|offer|配置|configuration/.test(text)) {
    return { title: '支付配置异常', detail, action: '请管理员检查沙箱AppKey、OfferID和虚拟支付环境配置。', code }
  }
  if (/尚未审核|道具状态|15010|15011|15013/.test(text)) {
    return { title: '微信道具暂不可用', detail, action: '请确认道具已通过开发版本审核，并使用开发版或体验版进行沙箱测试。', code }
  }
  if (Number(error?.statusCode) >= 500 || /内部错误|请求失败（500）/.test(text)) {
    return { title: '支付服务暂时异常', detail, action: '请稍后重试；如持续出现，请把错误编号提供给管理员查询服务器日志。', code }
  }
  return { title: '虚拟支付未完成', detail, action: '请检查网络后重试；若微信已扣款，请不要重复支付，先刷新订单状态。', code }
}

async function fetchOrder() {
  if (!orderNo.value) return
  loading.value = true
  loadError.value = ''
  try {
    orderInfo.value = await getOrder(orderNo.value)
    if (paidClass.value) payError.value = null
  } catch (error) {
    loadError.value = getErrorMessage(error, '订单加载失败')
  } finally {
    loading.value = false
  }
}

async function payByWechat() {
  if (!orderNo.value || paying.value) return
  payError.value = null
  paying.value = true
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录态获取失败，请重新进入小程序')
    const payParams = await createMiniProgramPayment(orderNo.value, loginResult.code)
    await requestWechatVirtualPayment(payParams)
    await fetchOrder()
    success('虚拟支付完成')
  } catch (error: any) {
    const errCode = Number(error?.errCode)
    if (errCode === -2 || /cancel/i.test(String(error?.errMsg || ''))) {
      toast('已取消支付')
    } else {
      payError.value = classifyPayError(error)
      toast(payError.value.title)
    }
  } finally {
    paying.value = false
  }
}

function copyErrorInfo() {
  if (!payError.value) return
  const text = [
    `订单号：${orderNo.value}`,
    `错误：${payError.value.title}`,
    `详情：${payError.value.detail}`,
    payError.value.code ? `错误编号：${payError.value.code}` : ''
  ].filter(Boolean).join('\n')
  uni.setClipboardData({ data: text, success: () => success('错误信息已复制') })
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

onLoad((query) => { orderNo.value = String(query?.orderNo || '') })
onShow(fetchOrder)
</script>

<style lang="scss" scoped>
.payment-page { min-height: 100vh; padding: 24rpx 24rpx calc(70rpx + env(safe-area-inset-bottom)); box-sizing: border-box; color: #172116; background: radial-gradient(circle at 10% 0%, rgba(47,155,99,.12), transparent 30%), radial-gradient(circle at 90% 12%, rgba(216,161,68,.12), transparent 28%), #f7f3ea; }
.card, .status-card, .amount-card, .error-card, .pay-error-card { margin-bottom: 20rpx; border-radius: 28rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.status-card { display: flex; align-items: center; gap: 16rpx; padding: 22rpx 24rpx; }
.status-dot { width: 16rpx; height: 16rpx; flex-shrink: 0; border-radius: 50%; background: #d8a144; box-shadow: 0 0 0 8rpx rgba(216,161,68,.12); }
.status-card.paid .status-dot { background: #2f9b63; box-shadow: 0 0 0 8rpx rgba(47,155,99,.12); }
.status-main { flex: 1; min-width: 0; }
.status-title, .status-sub { display: block; }
.status-title { font-size: 27rpx; font-weight: 900; }
.status-sub { margin-top: 6rpx; color: #8a9286; font-size: 21rpx; }
.status-pill { padding: 7rpx 14rpx; border-radius: 999rpx; color: #a87520; font-size: 22rpx; font-weight: 900; background: #fff6df; }
.paid .status-pill { color: #1f7c4b; background: #eef8f1; }
.amount-card { padding: 36rpx 28rpx 30rpx; text-align: center; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.amount-label { color: rgba(255,255,255,.78); font-size: 24rpx; }
.amount-row { display: flex; justify-content: center; align-items: baseline; gap: 8rpx; margin-top: 12rpx; }
.amount-row text:first-child { font-size: 38rpx; font-weight: 900; }
.amount-row text:last-child { font-size: 76rpx; line-height: 1; font-weight: 900; }
.secure-tip { display: inline-flex; align-items: center; gap: 10rpx; margin-top: 24rpx; padding: 10rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.12); font-size: 22rpx; }
.card { padding: 26rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.card-head text:first-child { font-size: 30rpx; font-weight: 900; }
.card-head text:last-child { color: #1f7c4b; font-size: 22rpx; font-weight: 900; }
.info-row { min-height: 70rpx; display: flex; align-items: center; justify-content: space-between; gap: 24rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 25rpx; }
.info-row > text:first-child { flex-shrink: 0; color: #7d877a; }
.info-row > text:last-child { flex: 1; text-align: right; font-weight: 700; word-break: break-all; }
.room-row > text:last-child { color: #1f7c4b; }
.total-row { border-bottom: 0; }
.total-row > text:last-child { color: #a87520; font-size: 31rpx; font-weight: 900; }
.players-track { white-space: nowrap; }
.player-item { width: 150rpx; display: inline-flex; flex-direction: column; align-items: center; margin-right: 14rpx; padding: 18rpx 10rpx; border-radius: 22rpx; background: #f7faf4; box-sizing: border-box; vertical-align: top; }
.player-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #e8efe7; }
.player-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 30rpx; font-weight: 900; background: #2f9b63; }
.player-name { max-width: 130rpx; margin-top: 10rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 24rpx; font-weight: 900; }
.player-type { margin-top: 4rpx; color: #8a9286; font-size: 20rpx; }
.virtual-pay-card { border-color: rgba(47,155,99,.18); }
.virtual-head { display: flex; align-items: center; gap: 18rpx; }
.virtual-head view:last-child text { display: block; }
.virtual-head view:last-child text:first-child { font-size: 30rpx; font-weight: 900; }
.virtual-head view:last-child text:last-child { margin-top: 6rpx; color: #7d877a; font-size: 22rpx; }
.wechat-icon { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #fff; font-size: 29rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #16954d); }
.virtual-notice { display: flex; gap: 12rpx; margin-top: 22rpx; padding: 18rpx; border-radius: 18rpx; color: #78643a; font-size: 22rpx; line-height: 1.5; background: #fff8e8; }
.virtual-notice text:first-child { width: 10rpx; height: 10rpx; flex-shrink: 0; margin-top: 11rpx; border-radius: 50%; background: #d8a144; }
.virtual-notice text:last-child { flex: 1; }
.pay-button { width: 100%; height: 92rpx; margin-top: 22rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: #fff; font-size: 30rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #15934c); box-shadow: 0 12rpx 26rpx rgba(31,156,81,.22); }
.pay-button::after, .mini-button::after, .ghost-button::after, .retry-button::after, .rating-button::after { border: none; }
.pay-button[disabled] { opacity: .62; }
.pay-help { display: block; margin-top: 14rpx; color: #9aa197; font-size: 21rpx; text-align: center; }
.error-card, .pay-error-card { padding: 24rpx; border-color: rgba(196,50,50,.17); background: #fff6f4; }
.error-card { display: flex; align-items: center; gap: 16rpx; }
.pay-error-head { display: flex; align-items: flex-start; gap: 16rpx; }
.error-icon { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-size: 28rpx; font-weight: 900; background: #c43232; }
.error-main { flex: 1; min-width: 0; }
.error-title, .error-detail, .error-action { display: block; }
.error-title { color: #8f2929; font-size: 27rpx; font-weight: 900; }
.error-detail { margin-top: 8rpx; color: #7c514d; font-size: 23rpx; line-height: 1.5; word-break: break-all; }
.error-code { display: flex; justify-content: space-between; gap: 20rpx; margin-top: 18rpx; padding: 16rpx 18rpx; border-radius: 16rpx; color: #8f2929; font-size: 22rpx; background: rgba(196,50,50,.07); }
.error-code text:last-child { flex: 1; text-align: right; font-weight: 900; word-break: break-all; }
.error-action { margin-top: 14rpx; color: #7d645f; font-size: 22rpx; line-height: 1.5; }
.error-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 20rpx; }
.ghost-button, .retry-button, .mini-button { height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; font-size: 24rpx; font-weight: 900; }
.ghost-button { color: #8f2929; background: #fff; border: 1rpx solid rgba(196,50,50,.20); }
.retry-button, .mini-button { color: #fff; background: #c43232; }
.mini-button { min-width: 150rpx; margin: 0; padding: 0 20rpx; }
.completed-card { display: flex; flex-direction: column; align-items: center; padding: 36rpx 28rpx; text-align: center; }
.completed-icon { width: 90rpx; height: 90rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-size: 48rpx; font-weight: 900; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.completed-title { margin-top: 18rpx; font-size: 34rpx; font-weight: 900; }
.completed-sub { margin-top: 10rpx; color: #7d877a; font-size: 23rpx; }
.rating-item { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 16rpx 0; border-bottom: 1rpx solid rgba(39,61,42,.07); }
.rating-player { display: flex; align-items: center; gap: 12rpx; }
.rating-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; }
.rating-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; background: #2f9b63; }
.rating-player view text { display: block; }
.rating-player view text:first-child { font-size: 25rpx; font-weight: 900; }
.rating-player view text:last-child { margin-top: 4rpx; color: #8a9286; font-size: 20rpx; }
.stars { display: flex; gap: 6rpx; }
.stars text { color: #d9ded7; font-size: 34rpx; }
.stars text.active { color: #e1ac3f; }
.rating-textarea { width: 100%; min-height: 130rpx; margin-top: 18rpx; padding: 18rpx; border-radius: 18rpx; background: #f7faf4; box-sizing: border-box; font-size: 25rpx; }
.rating-button { width: 100%; height: 78rpx; margin-top: 16rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: #2f9b63; }
.loading-state { padding: 80rpx 20rpx; color: #8a9286; text-align: center; font-size: 26rpx; }
</style>
