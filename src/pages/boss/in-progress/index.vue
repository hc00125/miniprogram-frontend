<template>
  <view class="progress-page">
    <view class="status-bar">
      <view class="live-dot" :class="{ waiting: orderInfo?.status === '待开打' }"></view>
      <view class="status-copy"><text>{{ statusTitle }}</text><text>{{ statusSub }}</text></view>
      <text class="live-tag">{{ orderInfo?.status || '加载中' }}</text>
    </view>

    <view class="hero-card">
      <text class="hero-eyebrow">SERVICE PROGRESS</text>
      <text class="hero-title">{{ heroTitle }}</text>
      <view class="timer-card">
        <text>{{ orderInfo?.status === '待开打' ? '当前阶段' : '服务时长' }}</text>
        <text>{{ orderInfo?.status === '待开打' ? '等待开打' : duration }}</text>
        <text>{{ durationStatus }}</text>
      </view>
      <view class="hero-meta">
        <view><text>订单号</text><text>{{ orderNo || '加载中' }}</text></view>
        <view><text>开始时间</text><text>{{ startTimeText }}</text></view>
      </view>
    </view>

    <view v-if="orderInfo?.paid" class="amount-card">
      <view><text>已支付金额</text><text><text class="amount-currency">¥</text>{{ paidAmount }}</text><text>{{ orderInfo.status === '待开打' ? '付款完成，等待陪玩开打' : '本单已完成付款' }}</text></view>
      <view class="shield">盾</view>
    </view>

    <view v-if="orderInfo" class="card">
      <view class="card-head">
        <view><text class="card-title">服务阵容</text><text class="card-sub">{{ orderInfo.players?.length || 0 }}位陪玩已接单</text></view>
        <button class="mini-btn" @tap="checkOrder">刷新</button>
      </view>
      <scroll-view scroll-x class="player-track" show-scrollbar="false">
        <view v-for="player in orderInfo.players" :key="player.id" class="player-card">
          <image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="player-avatar player-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <view class="player-main"><text>{{ player.name }}</text><text>{{ player.type_name || '陪玩' }}</text><text>{{ player.status || '已接单' }}</text></view>
        </view>
      </scroll-view>
    </view>

    <view v-if="orderInfo" class="card detail-card">
      <view class="card-head"><view><text class="card-title">订单信息</text><text class="card-sub">房间号和游戏ID分开显示</text></view><text class="order-status">{{ orderInfo.status }}</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_display_name || orderInfo.spec_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view v-if="orderInfo.kook_room_number" class="info-row kook-row" @tap="copyRoom"><text>KOOK房间号</text><text>{{ orderInfo.kook_room_number }} · 复制</text></view>
      <view class="info-row"><text>预订时长</text><text>{{ bookedHoursText }}</text></view>
      <view class="info-row"><text>订单金额</text><text>¥{{ paidAmount }}</text></view>
    </view>

    <view v-if="orderInfo" class="card flow-card">
      <text class="card-title standalone-title">订单流程</text>
      <view class="flow-list">
        <view class="flow-item done"><text>✓</text><view><text>1. 派单</text><text>订单已发布到抢单大厅</text></view></view>
        <view class="flow-item" :class="stepClass('接单')"><text>{{ stepIcon('接单', '2') }}</text><view><text>2. 接单</text><text>{{ orderInfo.players?.length || 0 }}/{{ orderInfo.required_players }} 位陪玩已就位</text></view></view>
        <view class="flow-item" :class="stepClass('付款')"><text>{{ stepIcon('付款', '3') }}</text><view><text>3. 付款</text><text>{{ orderInfo.paid ? `已支付 ¥${paidAmount}` : '等待老板付款' }}</text></view></view>
        <view class="flow-item" :class="stepClass('开打')"><text>{{ stepIcon('开打', '4') }}</text><view><text>4. 开打</text><text>{{ orderInfo.status === '待开打' ? '等待陪玩确认开打' : orderInfo.status === '进行中' ? duration : '等待前序步骤完成' }}</text></view></view>
        <view class="flow-item" :class="stepClass('完成')"><text>{{ stepIcon('完成', '5') }}</text><view><text>5. 完成</text><text>{{ orderInfo.status === '已完成' ? '服务已完成' : '服务结束后完成订单' }}</text></view></view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="ghost-btn" @tap="goMain('home')">返回首页</button>
      <button class="primary-btn" @tap="checkOrder">刷新状态</button>
      <button v-if="orderInfo?.status === '待支付'" class="primary-btn wide" @tap="goPayment">去付款 ¥{{ paidAmount }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrder } from '@/api/boss'
import { formatDateTime as formatDateTimeValue, formatDuration } from '@/utils/format'
import { replace, relaunch } from '@/utils/nav'
import { getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const duration = ref('00:00:00')
let orderTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null

const startTimeText = computed(() => formatOrderTime(orderInfo.value?.start_time))
const bookedHoursText = computed(() => `${Number(orderInfo.value?.booked_hours || 1)}小时`)
const paidAmount = computed(() => Number(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0).toFixed(2))
const statusTitle = computed(() => orderInfo.value?.status === '待开打' ? '付款完成，等待开打' : '服务正在进行中')
const statusSub = computed(() => orderInfo.value?.status === '待开打' ? '陪玩填写房间号并确认开打后开始计时' : '请保持游戏内在线，订单状态会自动刷新')
const heroTitle = computed(() => orderInfo.value?.status === '待开打' ? '队伍已就位，准备开打' : '服务进行中')
const durationStatus = computed(() => {
  if (orderInfo.value?.status === '待开打') return '已付款 · 等待陪玩操作'
  if (orderInfo.value?.is_paused) return '已暂停'
  return orderInfo.value?.timer_started_at ? '服务中' : '等待开始'
})

function formatOrderTime(value?: string) { return value ? formatDateTimeValue(value) : '待确认' }

function updateDuration() {
  if (!orderInfo.value?.timer_started_at) {
    duration.value = orderInfo.value?.status === '待开打' ? '等待开打' : '00:00:00'
    return
  }
  const start = new Date(orderInfo.value.timer_started_at).getTime()
  const end = orderInfo.value.end_time
    ? new Date(orderInfo.value.end_time).getTime()
    : orderInfo.value.is_paused && orderInfo.value.last_paused_at
      ? new Date(orderInfo.value.last_paused_at).getTime()
      : Date.now()
  duration.value = formatDuration(Math.max(0, Math.floor((end - start) / 1000) - (orderInfo.value.paused_duration || 0)))
}

function stepRank(status: string) {
  return {
    '待接单': 1,
    '待支付': 2,
    '待开打': 3,
    '进行中': 4,
    '已完成': 5,
  }[status] || 0
}

function targetRank(step: string) {
  return { '接单': 2, '付款': 3, '开打': 4, '完成': 5 }[step] || 0
}

function stepClass(step: string) {
  const current = stepRank(orderInfo.value?.status)
  const target = targetRank(step)
  if (current > target || (step === '完成' && current === 5)) return 'done'
  if (current === target || (step === '接单' && current === 1)) return 'active'
  return ''
}

function stepIcon(step: string, fallback: string) {
  return stepClass(step) === 'done' ? '✓' : fallback
}

async function checkOrder() {
  if (!orderNo.value) return
  try {
    const res = await getOrder(orderNo.value)
    orderInfo.value = res
    updateDuration()
    if (res.status === '待支付') {
      stopTimers()
      replace('/pages/boss/payment/index', { orderNo: orderNo.value })
    } else if (res.status === '已完成') {
      stopTimers()
      replace('/pages/boss/payment/index', { orderNo: orderNo.value })
    } else if (res.status === '已取消') {
      stopTimers()
      toast('订单已取消')
      goMain('home')
    }
  } catch (error) { toast(getErrorMessage(error, '订单加载失败')) }
}

function copyRoom() {
  const room = orderInfo.value?.kook_room_number
  if (!room) return
  uni.setClipboardData({ data: room, success: () => success('KOOK房间号已复制') })
}
function goPayment() { replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
function stopTimers() {
  if (orderTimer) clearInterval(orderTimer)
  if (durationTimer) clearInterval(durationTimer)
  orderTimer = null
  durationTimer = null
}
onLoad(query => { orderNo.value = String(query?.orderNo || '') })
onMounted(() => {
  checkOrder()
  orderTimer = setInterval(checkOrder, 5000)
  durationTimer = setInterval(updateDuration, 1000)
})
onUnmounted(stopTimers)
const goMain = (tab = 'home') => relaunch('/pages/boss/home/index', { tab })
</script>

<style lang="scss" scoped>
.progress-page { min-height: 100vh; padding: 20rpx 24rpx 220rpx; box-sizing: border-box; color: #172116; background: radial-gradient(ellipse at 12% 0%, rgba(216,161,68,.10), transparent 36%), radial-gradient(ellipse at 88% 14%, rgba(47,155,99,.10), transparent 32%), linear-gradient(180deg, #fbf7ef, #f7f3ea 48%, #fffaf2); }
.status-bar { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 22rpx; border-radius: 22rpx; border: 1rpx solid rgba(47,155,99,.18); background: rgba(246,252,247,.95); }
.live-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #ef5b5b; box-shadow: 0 0 0 8rpx rgba(239,91,91,.12); }
.live-dot.waiting { background: #d8a144; box-shadow: 0 0 0 8rpx rgba(216,161,68,.12); }
.status-copy { flex: 1; }
.status-copy text { display: block; }
.status-copy text:first-child { font-size: 25rpx; font-weight: 900; }
.status-copy text:last-child { margin-top: 4rpx; color: #7d877a; font-size: 20rpx; }
.live-tag { padding: 7rpx 14rpx; border-radius: 999rpx; color: #c43232; font-size: 20rpx; font-weight: 900; background: rgba(239,91,91,.10); }
.hero-card, .card { margin-top: 22rpx; border-radius: 28rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 36rpx rgba(39,61,42,.06); }
.hero-card { padding: 32rpx 28rpx; background: linear-gradient(135deg, #f1f7f1, #fffaf0); }
.hero-eyebrow, .hero-title { display: block; }
.hero-eyebrow { color: #1f7c4b; font-size: 21rpx; font-weight: 900; }
.hero-title { margin-top: 10rpx; font-size: 40rpx; font-weight: 900; }
.timer-card { margin-top: 24rpx; padding: 26rpx; border-radius: 24rpx; text-align: center; color: #fff; background: linear-gradient(135deg, #5fb78a, #1f7c4b); }
.timer-card text { display: block; }
.timer-card text:first-child { color: rgba(255,255,255,.75); font-size: 21rpx; }
.timer-card text:nth-child(2) { margin-top: 6rpx; font-family: monospace; font-size: 52rpx; font-weight: 900; }
.timer-card text:last-child { margin-top: 6rpx; font-size: 21rpx; font-weight: 800; }
.hero-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 18rpx; }
.hero-meta view { padding: 16rpx; border-radius: 18rpx; background: rgba(255,255,255,.72); }
.hero-meta text { display: block; }
.hero-meta text:first-child { color: #879083; font-size: 20rpx; }
.hero-meta text:last-child { margin-top: 5rpx; font-size: 23rpx; font-weight: 900; word-break: break-all; }
.amount-card { margin-top: 22rpx; padding: 28rpx; display: flex; align-items: center; justify-content: space-between; border-radius: 28rpx; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); box-shadow: 0 14rpx 36rpx rgba(31,124,75,.16); }
.amount-card view:first-child text { display: block; }
.amount-card view:first-child text:first-child { color: rgba(255,255,255,.72); font-size: 22rpx; }
.amount-card view:first-child text:nth-child(2) { margin-top: 5rpx; font-size: 54rpx; font-weight: 900; }
.amount-currency { display: inline !important; margin-right: 4rpx; font-size: 28rpx !important; }
.amount-card view:first-child text:last-child { margin-top: 5rpx; color: rgba(255,255,255,.72); font-size: 20rpx; }
.shield { width: 70rpx; height: 70rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,.15); font-weight: 900; }
.card { padding: 26rpx; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; margin-bottom: 20rpx; }
.card-title, .card-sub { display: block; }
.card-title { font-size: 30rpx; font-weight: 900; }
.standalone-title { margin-bottom: 20rpx; }
.card-sub { margin-top: 6rpx; color: #879083; font-size: 21rpx; }
.order-status { padding: 7rpx 14rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 21rpx; font-weight: 900; background: #eef8f1; }
.mini-btn { min-width: 104rpx; height: 58rpx; margin: 0; padding: 0 18rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 22rpx; font-weight: 900; background: #eef8f1; }
.mini-btn::after { border: none; }
.player-track { white-space: nowrap; }
.player-card { width: 280rpx; display: inline-flex; align-items: center; gap: 14rpx; margin-right: 14rpx; padding: 18rpx; border-radius: 22rpx; background: #f7faf4; box-sizing: border-box; vertical-align: top; }
.player-avatar { width: 70rpx; height: 70rpx; flex-shrink: 0; border-radius: 50%; }
.player-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 28rpx; font-weight: 900; background: #2f9b63; }
.player-main { flex: 1; min-width: 0; }
.player-main text { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.player-main text:first-child { font-size: 24rpx; font-weight: 900; }
.player-main text:nth-child(2) { margin-top: 4rpx; color: #1f7c4b; font-size: 20rpx; }
.player-main text:last-child { margin-top: 5rpx; color: #879083; font-size: 19rpx; }
.info-row { min-height: 68rpx; display: flex; align-items: center; justify-content: space-between; gap: 24rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 25rpx; }
.info-row > text:first-child { flex-shrink: 0; color: #7d877a; }
.info-row > text:last-child { flex: 1; text-align: right; font-weight: 800; word-break: break-all; }
.kook-row > text:last-child { color: #1f7c4b; }
.flow-list { display: flex; flex-direction: column; gap: 16rpx; }
.flow-item { display: flex; align-items: center; gap: 14rpx; color: #9aa197; }
.flow-item > text { width: 50rpx; height: 50rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-weight: 900; background: #c8cec6; }
.flow-item view text { display: block; }
.flow-item view text:first-child { color: #687665; font-size: 24rpx; font-weight: 900; }
.flow-item view text:last-child { margin-top: 4rpx; font-size: 20rpx; }
.flow-item.done > text { background: #2f9b63; }
.flow-item.active > text { background: #d8a144; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(24rpx + env(safe-area-inset-bottom)); z-index: 20; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.footer-actions button { height: 82rpx; margin: 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 900; }
.footer-actions button::after { border: none; }
.footer-actions .wide { grid-column: 1 / -1; }
.ghost-btn { color: #1f7c4b; background: #fff; border: 1rpx solid rgba(47,155,99,.18); }
.primary-btn { color: #fff; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
</style>
