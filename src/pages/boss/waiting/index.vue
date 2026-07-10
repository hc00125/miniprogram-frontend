<template>
  <view class="waiting-page">
    <view class="status-bar">
      <view class="status-pulse"></view>
      <view class="status-copy"><text>正在匹配陪玩</text><text>系统会自动刷新接单进度</text></view>
      <text class="status-tag">匹配中</text>
    </view>

    <view class="hero-card">
      <text class="hero-eyebrow">ORDER MATCHING</text>
      <text class="hero-title">正在为你组建队伍</text>
      <text class="hero-sub">优质陪玩在线接单中，请稍候片刻</text>
      <view class="hero-meta">
        <view><text>订单号</text><text>{{ orderNo || '加载中' }}</text></view>
        <view><text>已等待</text><text>{{ waitTime || '00:00' }}</text></view>
      </view>
    </view>

    <view v-if="orderInfo" class="card progress-card">
      <view class="card-head">
        <view><text class="card-title">接单进度</text><text class="card-sub">{{ readyCount }}/{{ requiredCount }} 位陪玩已就位</text></view>
        <button class="mini-btn" @tap="checkOrder">刷新</button>
      </view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progressPercent }"></view></view>
      <scroll-view scroll-x class="player-track" show-scrollbar="false">
        <view v-for="player in players" :key="player.id" class="player-item ready">
          <image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="player-avatar player-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <text class="player-name">{{ player.name }}</text>
          <text class="player-type">{{ player.type_name || '已接单' }}</text>
        </view>
        <view v-for="item in waitingSlots" :key="item" class="player-item waiting">
          <view class="player-avatar waiting-avatar"><text></text><text></text><text></text></view>
          <text class="player-name">匹配中</text>
          <text class="player-type">等待接单</text>
        </view>
      </scroll-view>
    </view>

    <view v-if="orderInfo" class="card detail-card">
      <view class="card-head"><view><text class="card-title">订单信息</text><text class="card-sub">重要信息独立展示，便于核对</text></view><text class="order-status">{{ orderInfo.status }}</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_display_name || orderInfo.spec_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view class="info-row"><text>需要陪玩</text><text>{{ requiredCount }}人</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view v-if="orderInfo.kook_room_number" class="info-row kook-row" @tap="copyRoom">
        <text>KOOK房间号</text><text>{{ orderInfo.kook_room_number }} · 复制</text>
      </view>
      <view class="info-row"><text>预订时长</text><text>{{ bookedHoursText }}</text></view>
      <view class="info-row"><text>下单时间</text><text>{{ createdTimeText }}</text></view>
      <view class="amount-row"><text>预计费用</text><text>{{ amountText }}</text></view>
    </view>

    <view class="footer-actions">
      <button class="ghost-btn" @tap="goMain('home')">返回首页</button>
      <button class="primary-btn" @tap="checkOrder">刷新状态</button>
      <button v-if="orderInfo?.status === '待接单'" class="danger-btn" @tap="handleCancel">取消订单</button>
      <button v-if="orderInfo?.status === '进行中'" class="primary-btn" @tap="goProgress">查看进度</button>
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

const players = computed(() => orderInfo.value?.players || [])
const readyCount = computed(() => players.value.length)
const requiredCount = computed(() => orderInfo.value?.required_players || 0)
const waitingSlots = computed(() => Array.from({ length: Math.max(0, requiredCount.value - readyCount.value) }, (_, index) => index))
const progressPercent = computed(() => requiredCount.value ? `${Math.min(100, readyCount.value / requiredCount.value * 100)}%` : '0%')
const bookedHoursText = computed(() => `${Number(orderInfo.value?.booked_hours || 1)}小时`)
const createdTimeText = computed(() => orderInfo.value?.created_at ? formatDateTime(orderInfo.value.created_at) : '待确认')
const amountText = computed(() => {
  const amount = orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour
  return amount ? `¥${Number(amount).toFixed(2)}` : '待确认'
})

function updateWaitTime() {
  if (!orderInfo.value?.created_at) { waitTime.value = ''; return }
  const diff = Math.max(0, Math.floor((Date.now() - new Date(orderInfo.value.created_at).getTime()) / 1000))
  waitTime.value = `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}`
}

async function checkOrder() {
  if (!orderNo.value) return
  try {
    const res = await getOrder(orderNo.value)
    const count = res.players?.length || 0
    if (count > prevPlayerCount && prevPlayerCount > 0) toast('有陪玩接单了')
    prevPlayerCount = count
    orderInfo.value = res
    updateWaitTime()
    if (res.status === '进行中') {
      stopTimers()
      replace('/pages/boss/in-progress/index', { orderNo: orderNo.value })
    } else if (res.status === '待支付' || res.status === '已完成') {
      stopTimers()
      replace('/pages/boss/payment/index', { orderNo: orderNo.value })
    } else if (res.status === '已取消') {
      stopTimers()
      toast('订单已取消')
      goMain('home')
    }
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  }
}

function copyRoom() {
  const room = orderInfo.value?.kook_room_number
  if (!room) return
  uni.setClipboardData({ data: room, success: () => success('KOOK房间号已复制') })
}
function goProgress() { replace('/pages/boss/in-progress/index', { orderNo: orderNo.value }) }
async function handleCancel() {
  if (!(await confirm('确定要取消这个订单吗？'))) return
  try {
    await cancelOrder(orderNo.value)
    success('订单已取消')
    stopTimers()
    goMain('home')
  } catch (error) { toast(getErrorMessage(error, '取消失败')) }
}
function stopTimers() {
  if (timer) clearInterval(timer)
  if (waitTimer) clearInterval(waitTimer)
  timer = null
  waitTimer = null
}
onLoad(query => { orderNo.value = String(query?.orderNo || '') })
onMounted(() => {
  checkOrder()
  timer = setInterval(checkOrder, 5000)
  waitTimer = setInterval(updateWaitTime, 1000)
})
onUnmounted(stopTimers)
const goMain = (tab = 'home') => relaunch('/pages/boss/home/index', { tab })
</script>

<style lang="scss" scoped>
.waiting-page { min-height: 100vh; padding: 20rpx 24rpx 220rpx; box-sizing: border-box; color: #172116; background: radial-gradient(ellipse at 12% 0%, rgba(216,161,68,.10), transparent 36%), radial-gradient(ellipse at 88% 14%, rgba(47,155,99,.10), transparent 32%), linear-gradient(180deg, #fbf7ef, #f7f3ea 48%, #fffaf2); }
.status-bar { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 22rpx; border-radius: 22rpx; border: 1rpx solid rgba(216,161,68,.18); background: rgba(255,252,244,.94); }
.status-pulse { width: 16rpx; height: 16rpx; border-radius: 50%; background: #2f9b63; box-shadow: 0 0 0 8rpx rgba(47,155,99,.12); }
.status-copy { flex: 1; }
.status-copy text { display: block; }
.status-copy text:first-child { font-size: 25rpx; font-weight: 900; }
.status-copy text:last-child { margin-top: 4rpx; color: #7d877a; font-size: 20rpx; }
.status-tag, .order-status { padding: 7rpx 14rpx; border-radius: 999rpx; color: #a87520; font-size: 21rpx; font-weight: 900; background: #fff5d9; }
.hero-card, .card { margin-top: 22rpx; border-radius: 28rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 36rpx rgba(39,61,42,.06); }
.hero-card { padding: 34rpx 28rpx; background: linear-gradient(135deg, #fffaf0, #eef8f1); }
.hero-eyebrow, .hero-title, .hero-sub { display: block; }
.hero-eyebrow { color: #a87520; font-size: 21rpx; font-weight: 900; }
.hero-title { margin-top: 12rpx; font-size: 40rpx; font-weight: 900; }
.hero-sub { margin-top: 9rpx; color: #687665; font-size: 24rpx; }
.hero-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 26rpx; }
.hero-meta view { padding: 18rpx; border-radius: 18rpx; background: rgba(255,255,255,.66); }
.hero-meta text { display: block; }
.hero-meta text:first-child { color: #879083; font-size: 20rpx; }
.hero-meta text:last-child { margin-top: 6rpx; font-size: 24rpx; font-weight: 900; word-break: break-all; }
.card { padding: 26rpx; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20rpx; margin-bottom: 20rpx; }
.card-title, .card-sub { display: block; }
.card-title { font-size: 30rpx; font-weight: 900; }
.card-sub { margin-top: 6rpx; color: #879083; font-size: 21rpx; }
.mini-btn { min-width: 104rpx; height: 58rpx; margin: 0; padding: 0 18rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 22rpx; font-weight: 900; background: #eef8f1; }
.mini-btn::after { border: none; }
.progress-track { height: 12rpx; overflow: hidden; border-radius: 999rpx; background: #edf1ea; }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #5fc68a, #1f7c4b); transition: width .3s ease; }
.player-track { margin-top: 22rpx; white-space: nowrap; }
.player-item { width: 144rpx; display: inline-flex; flex-direction: column; align-items: center; margin-right: 14rpx; padding: 16rpx 10rpx; border-radius: 22rpx; background: #f7faf4; vertical-align: top; box-sizing: border-box; }
.player-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; }
.player-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 28rpx; font-weight: 900; background: #2f9b63; }
.waiting-avatar { display: flex; align-items: center; justify-content: center; gap: 5rpx; background: #eef1ec; }
.waiting-avatar text { width: 7rpx; height: 7rpx; border-radius: 50%; background: #a7afa4; }
.player-name { max-width: 126rpx; margin-top: 9rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 23rpx; font-weight: 900; }
.player-type { margin-top: 4rpx; color: #879083; font-size: 19rpx; }
.info-row, .amount-row { min-height: 68rpx; display: flex; align-items: center; justify-content: space-between; gap: 24rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 25rpx; }
.info-row > text:first-child { flex-shrink: 0; color: #7d877a; }
.info-row > text:last-child { flex: 1; text-align: right; font-weight: 800; word-break: break-all; }
.kook-row > text:last-child { color: #1f7c4b; }
.amount-row { margin-top: 8rpx; border-bottom: 0; }
.amount-row text:first-child { font-weight: 900; }
.amount-row text:last-child { color: #a87520; font-size: 33rpx; font-weight: 900; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(24rpx + env(safe-area-inset-bottom)); z-index: 20; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.footer-actions button { height: 82rpx; margin: 0; border-radius: 999rpx; font-size: 26rpx; font-weight: 900; }
.footer-actions button::after { border: none; }
.ghost-btn { color: #1f7c4b; background: #fff; border: 1rpx solid rgba(47,155,99,.18); }
.primary-btn { color: #fff; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.danger-btn { color: #fff; background: #c35b4e; }
</style>
